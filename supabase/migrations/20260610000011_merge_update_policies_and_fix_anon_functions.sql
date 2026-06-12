-- ============================================================
-- MIGRACIÓN 0011 — Merge UPDATE policies y fix [0028] anon functions
-- Fecha: 2026-06-10
-- Autor: Samir (A1)
--
-- [P1] multiple_permissive_policies en participaciones (2 UPDATE policies)
--      participaciones_update_egresado  (de 0010) +
--      participaciones_update_empresario (de migración anterior)
--      → un solo "participaciones_update"
--      Fixes adicionales detectados en la query:
--        · roles era {public} en la policy del empresario → ahora {authenticated}
--        · WITH CHECK nulo en la policy del empresario → ahora explícito:
--          el empresario no puede poner estado = 'retirada'
--
-- [P2] multiple_permissive_policies en entregables (2 UPDATE policies)
--      entregables_update_estudiante  (de migración anterior) +
--      entregables_update_empresario  (de 0010)
--      → un solo "entregables_update"
--      Fixes adicionales:
--        · roles era {public} en ambas → ahora {authenticated}
--        · WITH CHECK nulo en la del estudiante → ahora explícito:
--          el estudiante no puede auto-aprobar su propio entregable
--
-- [P3] [0028] anon_security_definer_function_executable
--      Migration 0009 hacía REVOKE FROM anon, pero las funciones mantienen
--      GRANT implícito vía 'public'. El patrón correcto es:
--        REVOKE FROM public  → elimina el grant heredado
--        GRANT TO authenticated → concede solo a usuarios con sesión
-- ============================================================


-- ============================================================
-- [P1] participaciones: merge → una sola policy UPDATE
-- ============================================================
drop policy if exists "participaciones_update_egresado"   on public.participaciones;
drop policy if exists "participaciones_update_empresario"  on public.participaciones;

create policy "participaciones_update"
  on public.participaciones for update
  to authenticated
  using (
    -- Egresado: solo sus propias participaciones en estado retractable
    (
      id_estudiante in (
        select id_estudiante from public.estudiantes
        where id_usuario = (select auth.uid())
      )
      and estado in ('enviada', 'en_revision')
    )
    or
    -- Empresario: participaciones de sus proyectos que aún no estén retiradas
    (
      estado <> 'retirada'
      and id_proyecto in (
        select p.id_proyecto
        from public.proyectos     p
        join public.empresarios   e on e.id_empresario = p.id_empresario
        where e.id_usuario = (select auth.uid())
      )
    )
  )
  with check (
    -- Egresado: la única transición permitida es a 'retirada'
    (
      estado = 'retirada'
      and id_estudiante in (
        select id_estudiante from public.estudiantes
        where id_usuario = (select auth.uid())
      )
    )
    or
    -- Empresario: no puede poner 'retirada' (esa transición es del egresado)
    (
      estado <> 'retirada'
      and id_proyecto in (
        select p.id_proyecto
        from public.proyectos     p
        join public.empresarios   e on e.id_empresario = p.id_empresario
        where e.id_usuario = (select auth.uid())
      )
    )
  );


-- ============================================================
-- [P2] entregables: merge → una sola policy UPDATE
-- ============================================================
drop policy if exists "entregables_update_estudiante" on public.entregables;
drop policy if exists "entregables_update_empresario" on public.entregables;

create policy "entregables_update"
  on public.entregables for update
  to authenticated
  using (
    -- Estudiante: sus entregables no aprobados (vía contratacion propia)
    (
      estado <> 'aprobado'
      and id_contratacion in (
        select c.id_contratacion
        from public.contrataciones  c
        join public.participaciones pa on pa.id_participacion = c.id_participacion
        where pa.id_estudiante in (
          select id_estudiante from public.estudiantes
          where id_usuario = (select auth.uid())
        )
      )
    )
    or
    -- Empresario: entregables no aprobados de sus proyectos
    (
      estado <> 'aprobado'
      and id_contratacion in (
        select c.id_contratacion
        from public.contrataciones  c
        join public.participaciones pa  on pa.id_participacion = c.id_participacion
        join public.proyectos       p   on p.id_proyecto       = pa.id_proyecto
        join public.empresarios     e   on e.id_empresario     = p.id_empresario
        where e.id_usuario = (select auth.uid())
      )
    )
  )
  with check (
    -- Estudiante: no puede auto-aprobarse
    (
      estado <> 'aprobado'
      and id_contratacion in (
        select c.id_contratacion
        from public.contrataciones  c
        join public.participaciones pa on pa.id_participacion = c.id_participacion
        where pa.id_estudiante in (
          select id_estudiante from public.estudiantes
          where id_usuario = (select auth.uid())
        )
      )
    )
    or
    -- Empresario: solo puede asignar estados de revisión
    (
      estado in ('en_revision', 'aprobado', 'con_cambios')
      and id_contratacion in (
        select c.id_contratacion
        from public.contrataciones  c
        join public.participaciones pa  on pa.id_participacion = c.id_participacion
        join public.proyectos       p   on p.id_proyecto       = pa.id_proyecto
        join public.empresarios     e   on e.id_empresario     = p.id_empresario
        where e.id_usuario = (select auth.uid())
      )
    )
  );


-- ============================================================
-- [P3] SECURITY DEFINER functions: patrón correcto REVOKE public + GRANT authenticated
--      REVOKE FROM anon (migration 0009) no anula el GRANT implícito
--      de 'public', que include anon. Hay que revocar el origen.
-- ============================================================
revoke execute on function public.get_my_role()               from public;
revoke execute on function public.get_my_account_status()     from public;
revoke execute on function public.assign_my_role(p_role text) from public;

grant execute on function public.get_my_role()               to authenticated;
grant execute on function public.get_my_account_status()     to authenticated;
grant execute on function public.assign_my_role(p_role text) to authenticated;
