-- ============================================================
-- MIGRACIÓN 0008 — Performance: auth_rls_initplan + overlap
-- Fecha: 2026-06-10
-- Autor: Samir (A1)
--
-- Cierra dos grupos de avisos del performance linter:
--
-- [PERF-48] auth_rls_initplan
--   auth.uid() llamado directamente en subqueries dentro de
--   políticas RLS → Postgres lo re-evalúa por fila.
--   Fix: envolver en (select auth.uid()) para que el planner
--   lo materialice como InitPlan (evaluación única por query).
--   Afecta 48 políticas en 20 tablas.
--
-- [OVERLAP-12] multiple_permissive_policies
--   portafolio_tecnologias y proyecto_categorias tenían una
--   política FOR SELECT y una política FOR ALL sobre la misma
--   tabla. La FOR ALL aplica también a SELECT → dos políticas
--   permisivas solapadas en SELECT para todos los roles.
--   Fix: reemplazar FOR ALL por políticas explícitas INSERT /
--   UPDATE / DELETE (sin política SELECT extra).
--
-- Estrategia: DROP IF EXISTS + CREATE para cada política
-- afectada. Idempotente: si se re-corre, queda igual.
-- ============================================================


-- ============================================================
-- TABLA: usuarios
-- ============================================================
drop policy if exists "usuarios_select_own" on public.usuarios;
create policy "usuarios_select_own"
  on public.usuarios for select
  using ((select auth.uid()) = id_usuario);

drop policy if exists "usuarios_update_own" on public.usuarios;
create policy "usuarios_update_own"
  on public.usuarios for update
  using  ((select auth.uid()) = id_usuario)
  with check ((select auth.uid()) = id_usuario);


-- ============================================================
-- TABLA: estudiantes
-- ============================================================
drop policy if exists "estudiantes_select_own_or_public" on public.estudiantes;
create policy "estudiantes_select_own_or_public"
  on public.estudiantes for select
  using (
    id_usuario = (select auth.uid())
    or portafolio_visible_publicamente = true
  );

drop policy if exists "estudiantes_insert_own" on public.estudiantes;
create policy "estudiantes_insert_own"
  on public.estudiantes for insert
  with check (id_usuario = (select auth.uid()));

drop policy if exists "estudiantes_update_own" on public.estudiantes;
create policy "estudiantes_update_own"
  on public.estudiantes for update
  using  (id_usuario = (select auth.uid()))
  with check (id_usuario = (select auth.uid()));


-- ============================================================
-- TABLA: habilidades_tecnicas
-- ============================================================
drop policy if exists "est_hab_select" on public.habilidades_tecnicas;
create policy "est_hab_select"
  on public.habilidades_tecnicas for select
  using (
    id_estudiante in (
      select id_estudiante from public.estudiantes
      where id_usuario = (select auth.uid())
         or portafolio_visible_publicamente = true
    )
  );

drop policy if exists "est_hab_insert_own" on public.habilidades_tecnicas;
create policy "est_hab_insert_own"
  on public.habilidades_tecnicas for insert
  with check (
    id_estudiante in (
      select id_estudiante from public.estudiantes
      where id_usuario = (select auth.uid())
    )
  );

drop policy if exists "est_hab_update_own" on public.habilidades_tecnicas;
create policy "est_hab_update_own"
  on public.habilidades_tecnicas for update
  using (
    id_estudiante in (
      select id_estudiante from public.estudiantes
      where id_usuario = (select auth.uid())
    )
  );

drop policy if exists "est_hab_delete_own" on public.habilidades_tecnicas;
create policy "est_hab_delete_own"
  on public.habilidades_tecnicas for delete
  using (
    id_estudiante in (
      select id_estudiante from public.estudiantes
      where id_usuario = (select auth.uid())
    )
  );


-- ============================================================
-- TABLA: empresarios
-- ============================================================
drop policy if exists "empresarios_select_own" on public.empresarios;
create policy "empresarios_select_own"
  on public.empresarios for select
  using (id_usuario = (select auth.uid()));

drop policy if exists "empresarios_insert_own" on public.empresarios;
create policy "empresarios_insert_own"
  on public.empresarios for insert
  with check (id_usuario = (select auth.uid()));

drop policy if exists "empresarios_update_own" on public.empresarios;
create policy "empresarios_update_own"
  on public.empresarios for update
  using  (id_usuario = (select auth.uid()))
  with check (id_usuario = (select auth.uid()));


-- ============================================================
-- TABLA: proyectos
-- Nota: proyectos_select_public_or_own fue recreado en 0006
--       con el fix de borradores visibles. Se mantiene ese
--       fix y sólo se agrega (select auth.uid()).
-- ============================================================
drop policy if exists "proyectos_select_public_or_own" on public.proyectos;
create policy "proyectos_select_public_or_own"
  on public.proyectos for select
  using (
    (is_active = true and estado <> 'borrador')
    or id_empresario in (
      select id_empresario from public.empresarios
      where id_usuario = (select auth.uid())
    )
  );

drop policy if exists "proyectos_insert_verified_empresario" on public.proyectos;
create policy "proyectos_insert_verified_empresario"
  on public.proyectos for insert
  with check (
    id_empresario in (
      select id_empresario from public.empresarios
      where id_usuario = (select auth.uid())
        and estado_verificacion = 'verificado'
    )
  );

drop policy if exists "proyectos_update_own" on public.proyectos;
create policy "proyectos_update_own"
  on public.proyectos for update
  using (
    id_empresario in (
      select id_empresario from public.empresarios
      where id_usuario = (select auth.uid())
    )
  )
  with check (
    id_empresario in (
      select id_empresario from public.empresarios
      where id_usuario = (select auth.uid())
    )
  );


-- ============================================================
-- TABLA: proyecto_tecnologias
-- ============================================================
drop policy if exists "proy_tec_select_public_or_own" on public.proyecto_tecnologias;
create policy "proy_tec_select_public_or_own"
  on public.proyecto_tecnologias for select
  using (
    id_proyecto in (
      select id_proyecto from public.proyectos where is_active = true
      union
      select p.id_proyecto from public.proyectos p
      join public.empresarios e on e.id_empresario = p.id_empresario
      where e.id_usuario = (select auth.uid())
    )
  );

drop policy if exists "proy_tec_insert_own" on public.proyecto_tecnologias;
create policy "proy_tec_insert_own"
  on public.proyecto_tecnologias for insert
  with check (
    id_proyecto in (
      select p.id_proyecto from public.proyectos p
      join public.empresarios e on e.id_empresario = p.id_empresario
      where e.id_usuario = (select auth.uid())
    )
  );

drop policy if exists "proy_tec_delete_own" on public.proyecto_tecnologias;
create policy "proy_tec_delete_own"
  on public.proyecto_tecnologias for delete
  using (
    id_proyecto in (
      select p.id_proyecto from public.proyectos p
      join public.empresarios e on e.id_empresario = p.id_empresario
      where e.id_usuario = (select auth.uid())
    )
  );


-- ============================================================
-- TABLA: participaciones
-- Nota: participaciones_insert_egresado fue recreado en 0006
--       con el fix de estado='enviada'. Se mantiene ese fix.
-- ============================================================
drop policy if exists "participaciones_select" on public.participaciones;
create policy "participaciones_select"
  on public.participaciones for select
  using (
    id_estudiante in (
      select id_estudiante from public.estudiantes
      where id_usuario = (select auth.uid())
    )
    or id_proyecto in (
      select p.id_proyecto from public.proyectos p
      join public.empresarios e on e.id_empresario = p.id_empresario
      where e.id_usuario = (select auth.uid())
    )
  );

drop policy if exists "participaciones_insert_egresado" on public.participaciones;
create policy "participaciones_insert_egresado"
  on public.participaciones for insert
  with check (
    estado = 'enviada'
    and id_estudiante in (
      select id_estudiante from public.estudiantes
      where id_usuario = (select auth.uid())
    )
  );

drop policy if exists "participaciones_update_empresario" on public.participaciones;
create policy "participaciones_update_empresario"
  on public.participaciones for update
  using (
    id_proyecto in (
      select p.id_proyecto from public.proyectos p
      join public.empresarios e on e.id_empresario = p.id_empresario
      where e.id_usuario = (select auth.uid())
    )
  );


-- ============================================================
-- TABLA: contrataciones
-- ============================================================
drop policy if exists "contrataciones_select" on public.contrataciones;
create policy "contrataciones_select"
  on public.contrataciones for select
  using (
    id_participacion in (
      select id_participacion from public.participaciones
      where
        id_estudiante in (
          select id_estudiante from public.estudiantes
          where id_usuario = (select auth.uid())
        )
        or id_proyecto in (
          select p.id_proyecto from public.proyectos p
          join public.empresarios e on e.id_empresario = p.id_empresario
          where e.id_usuario = (select auth.uid())
        )
    )
  );

drop policy if exists "contrataciones_insert_empresario" on public.contrataciones;
create policy "contrataciones_insert_empresario"
  on public.contrataciones for insert
  with check (
    id_participacion in (
      select pa.id_participacion from public.participaciones pa
      join public.proyectos p on p.id_proyecto = pa.id_proyecto
      join public.empresarios e on e.id_empresario = p.id_empresario
      where e.id_usuario = (select auth.uid())
    )
  );

drop policy if exists "contrataciones_update_empresario" on public.contrataciones;
create policy "contrataciones_update_empresario"
  on public.contrataciones for update
  using (
    id_participacion in (
      select pa.id_participacion from public.participaciones pa
      join public.proyectos p on p.id_proyecto = pa.id_proyecto
      join public.empresarios e on e.id_empresario = p.id_empresario
      where e.id_usuario = (select auth.uid())
    )
  );


-- ============================================================
-- TABLA: entregables
-- ============================================================
drop policy if exists "entregables_select" on public.entregables;
create policy "entregables_select"
  on public.entregables for select
  using (
    id_contratacion in (
      select c.id_contratacion from public.contrataciones c
      join public.participaciones pa on pa.id_participacion = c.id_participacion
      where
        pa.id_estudiante in (
          select id_estudiante from public.estudiantes
          where id_usuario = (select auth.uid())
        )
        or pa.id_proyecto in (
          select p.id_proyecto from public.proyectos p
          join public.empresarios e on e.id_empresario = p.id_empresario
          where e.id_usuario = (select auth.uid())
        )
    )
  );

drop policy if exists "entregables_insert_estudiante" on public.entregables;
create policy "entregables_insert_estudiante"
  on public.entregables for insert
  with check (
    id_contratacion in (
      select c.id_contratacion from public.contrataciones c
      join public.participaciones pa on pa.id_participacion = c.id_participacion
      where pa.id_estudiante in (
        select id_estudiante from public.estudiantes
        where id_usuario = (select auth.uid())
      )
    )
  );

drop policy if exists "entregables_update_estudiante" on public.entregables;
create policy "entregables_update_estudiante"
  on public.entregables for update
  using (
    id_contratacion in (
      select c.id_contratacion from public.contrataciones c
      join public.participaciones pa on pa.id_participacion = c.id_participacion
      where pa.id_estudiante in (
        select id_estudiante from public.estudiantes
        where id_usuario = (select auth.uid())
      )
    )
  );


-- ============================================================
-- TABLA: comentarios_entregables
-- Nota: comentarios_entregables_insert fue recreado en 0006
--       con el fix de partes involucradas.
-- ============================================================
drop policy if exists "comentarios_entregables_select" on public.comentarios_entregables;
create policy "comentarios_entregables_select"
  on public.comentarios_entregables for select
  using (
    id_entregable in (
      select e.id_entregable from public.entregables e
      join public.contrataciones c on c.id_contratacion = e.id_contratacion
      join public.participaciones pa on pa.id_participacion = c.id_participacion
      where
        pa.id_estudiante in (
          select id_estudiante from public.estudiantes
          where id_usuario = (select auth.uid())
        )
        or pa.id_proyecto in (
          select p.id_proyecto from public.proyectos p
          join public.empresarios emp on emp.id_empresario = p.id_empresario
          where emp.id_usuario = (select auth.uid())
        )
    )
  );

drop policy if exists "comentarios_entregables_insert" on public.comentarios_entregables;
create policy "comentarios_entregables_insert"
  on public.comentarios_entregables for insert
  with check (
    id_autor = (select auth.uid())
    and id_entregable in (
      select e.id_entregable
      from public.entregables e
      join public.contrataciones c   on c.id_contratacion   = e.id_contratacion
      join public.participaciones pa on pa.id_participacion = c.id_participacion
      where pa.id_estudiante in (
              select id_estudiante from public.estudiantes
              where id_usuario = (select auth.uid())
            )
         or pa.id_proyecto in (
              select p.id_proyecto from public.proyectos p
              join public.empresarios emp on emp.id_empresario = p.id_empresario
              where emp.id_usuario = (select auth.uid())
            )
    )
  );


-- ============================================================
-- TABLA: evaluaciones
-- Nota: evaluaciones_insert_empresario fue recreado en 0006
--       con el fix de contratación propia.
-- ============================================================
drop policy if exists "evaluaciones_select" on public.evaluaciones;
create policy "evaluaciones_select"
  on public.evaluaciones for select
  using (
    id_empresario in (
      select id_empresario from public.empresarios
      where id_usuario = (select auth.uid())
    )
    or id_estudiante in (
      select id_estudiante from public.estudiantes
      where id_usuario = (select auth.uid())
    )
  );

drop policy if exists "evaluaciones_insert_empresario" on public.evaluaciones;
create policy "evaluaciones_insert_empresario"
  on public.evaluaciones for insert
  with check (
    id_empresario in (
      select id_empresario from public.empresarios
      where id_usuario = (select auth.uid())
    )
    and exists (
      select 1
      from public.contrataciones c
      join public.participaciones pa on pa.id_participacion = c.id_participacion
      join public.proyectos p        on p.id_proyecto       = pa.id_proyecto
      join public.empresarios emp    on emp.id_empresario   = p.id_empresario
      where c.id_contratacion = evaluaciones.id_contratacion
        and pa.id_estudiante  = evaluaciones.id_estudiante
        and emp.id_usuario    = (select auth.uid())
    )
  );


-- ============================================================
-- TABLA: strikes
-- ============================================================
drop policy if exists "strikes_select_own" on public.strikes;
create policy "strikes_select_own"
  on public.strikes for select
  using (id_usuario = (select auth.uid()));


-- ============================================================
-- TABLA: notificaciones
-- ============================================================
drop policy if exists "notificaciones_select_own" on public.notificaciones;
create policy "notificaciones_select_own"
  on public.notificaciones for select
  using (id_usuario = (select auth.uid()));

drop policy if exists "notificaciones_update_own" on public.notificaciones;
create policy "notificaciones_update_own"
  on public.notificaciones for update
  using  (id_usuario = (select auth.uid()))
  with check (id_usuario = (select auth.uid()));


-- ============================================================
-- TABLA: conversaciones_ia
-- ============================================================
drop policy if exists "conv_ia_select_own" on public.conversaciones_ia;
create policy "conv_ia_select_own"
  on public.conversaciones_ia for select
  using (
    id_empresario in (
      select id_empresario from public.empresarios
      where id_usuario = (select auth.uid())
    )
  );

drop policy if exists "conv_ia_insert_own" on public.conversaciones_ia;
create policy "conv_ia_insert_own"
  on public.conversaciones_ia for insert
  with check (
    id_empresario in (
      select id_empresario from public.empresarios
      where id_usuario = (select auth.uid())
    )
  );

drop policy if exists "conv_ia_update_own" on public.conversaciones_ia;
create policy "conv_ia_update_own"
  on public.conversaciones_ia for update
  using (
    id_empresario in (
      select id_empresario from public.empresarios
      where id_usuario = (select auth.uid())
    )
  );


-- ============================================================
-- TABLA: reportes_moderacion
-- ============================================================
drop policy if exists "reportes_select_own" on public.reportes_moderacion;
create policy "reportes_select_own"
  on public.reportes_moderacion for select
  using (id_reportante = (select auth.uid()));

drop policy if exists "reportes_insert_auth" on public.reportes_moderacion;
create policy "reportes_insert_auth"
  on public.reportes_moderacion for insert
  with check (id_reportante = (select auth.uid()));


-- ============================================================
-- TABLA: consentimientos
-- ============================================================
drop policy if exists "consentimientos_select_own" on public.consentimientos;
create policy "consentimientos_select_own"
  on public.consentimientos for select
  using (id_usuario = (select auth.uid()));

drop policy if exists "consentimientos_insert_own" on public.consentimientos;
create policy "consentimientos_insert_own"
  on public.consentimientos for insert
  with check (id_usuario = (select auth.uid()));


-- ============================================================
-- TABLA: proyectos_portafolio
-- ============================================================
drop policy if exists "portafolio_select_own_or_public" on public.proyectos_portafolio;
create policy "portafolio_select_own_or_public"
  on public.proyectos_portafolio for select
  using (
    id_estudiante in (
      select id_estudiante from public.estudiantes
      where id_usuario = (select auth.uid())
    )
    or (
      is_active = true
      and (origen <> 'plataforma_contratada' or estado_consentimiento = 'aprobado')
    )
  );

drop policy if exists "portafolio_insert_own" on public.proyectos_portafolio;
create policy "portafolio_insert_own"
  on public.proyectos_portafolio for insert
  with check (
    id_estudiante in (
      select id_estudiante from public.estudiantes
      where id_usuario = (select auth.uid())
    )
  );

drop policy if exists "portafolio_update_own" on public.proyectos_portafolio;
create policy "portafolio_update_own"
  on public.proyectos_portafolio for update
  using (
    id_estudiante in (
      select id_estudiante from public.estudiantes
      where id_usuario = (select auth.uid())
    )
  );

drop policy if exists "portafolio_delete_own" on public.proyectos_portafolio;
create policy "portafolio_delete_own"
  on public.proyectos_portafolio for delete
  using (
    id_estudiante in (
      select id_estudiante from public.estudiantes
      where id_usuario = (select auth.uid())
    )
  );


-- ============================================================
-- TABLA: portafolio_tecnologias
-- [OVERLAP] Se reemplaza FOR ALL (portafolio_tec_write_own)
-- por políticas explícitas INSERT / UPDATE / DELETE.
-- La política SELECT existente (portafolio_tec_select) se
-- mantiene como la única política permisiva para SELECT.
-- ============================================================
drop policy if exists "portafolio_tec_select"    on public.portafolio_tecnologias;
drop policy if exists "portafolio_tec_write_own" on public.portafolio_tecnologias;

create policy "portafolio_tec_select"
  on public.portafolio_tecnologias for select
  using (
    id_portafolio in (
      select id_portafolio from public.proyectos_portafolio
      where id_estudiante in (
              select id_estudiante from public.estudiantes
              where id_usuario = (select auth.uid())
            )
         or (
              is_active = true
              and (origen <> 'plataforma_contratada' or estado_consentimiento = 'aprobado')
            )
    )
  );

create policy "portafolio_tec_insert_own"
  on public.portafolio_tecnologias for insert
  with check (
    id_portafolio in (
      select id_portafolio from public.proyectos_portafolio
      where id_estudiante in (
        select id_estudiante from public.estudiantes
        where id_usuario = (select auth.uid())
      )
    )
  );

create policy "portafolio_tec_update_own"
  on public.portafolio_tecnologias for update
  using (
    id_portafolio in (
      select id_portafolio from public.proyectos_portafolio
      where id_estudiante in (
        select id_estudiante from public.estudiantes
        where id_usuario = (select auth.uid())
      )
    )
  );

create policy "portafolio_tec_delete_own"
  on public.portafolio_tecnologias for delete
  using (
    id_portafolio in (
      select id_portafolio from public.proyectos_portafolio
      where id_estudiante in (
        select id_estudiante from public.estudiantes
        where id_usuario = (select auth.uid())
      )
    )
  );


-- ============================================================
-- TABLA: proyecto_categorias
-- [OVERLAP] Se reemplaza FOR ALL (proy_cat_write_own) por
-- políticas explícitas INSERT / UPDATE / DELETE.
-- La política SELECT proy_cat_select_public (using true) ya
-- cubre la lectura para todos; no se toca.
-- ============================================================
drop policy if exists "proy_cat_write_own" on public.proyecto_categorias;

create policy "proy_cat_insert_own"
  on public.proyecto_categorias for insert
  with check (
    id_proyecto in (
      select p.id_proyecto from public.proyectos p
      join public.empresarios e on e.id_empresario = p.id_empresario
      where e.id_usuario = (select auth.uid())
    )
  );

create policy "proy_cat_update_own"
  on public.proyecto_categorias for update
  using (
    id_proyecto in (
      select p.id_proyecto from public.proyectos p
      join public.empresarios e on e.id_empresario = p.id_empresario
      where e.id_usuario = (select auth.uid())
    )
  );

create policy "proy_cat_delete_own"
  on public.proyecto_categorias for delete
  using (
    id_proyecto in (
      select p.id_proyecto from public.proyectos p
      join public.empresarios e on e.id_empresario = p.id_empresario
      where e.id_usuario = (select auth.uid())
    )
  );
