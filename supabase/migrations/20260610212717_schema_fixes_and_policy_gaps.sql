-- ============================================================
-- MIGRACIÓN 0010 — Schema fixes, policy gaps y guard trigger
-- Fecha: 2026-06-10
-- Autor: Samir (A1)
--
-- Cierra los gaps identificados en el análisis
-- SRS ↔ Modelo XXI ↔ Migraciones:
--
-- [G1] empresarios.nombre_empresa NOT NULL → nullable
--      El Modelo XXI especifica que emprendedores pueden no
--      tener nombre registrado (factura a nombre de persona
--      física en usuarios). La constraint anterior rompía
--      el onboarding de tipo 'emprendedor'.
--
-- [G2] CHECKs faltantes en proyectos (NOT VALID):
--        · Ubicación obligatoria si modalidad != 'remoto'
--        · Plazo entre 5 y 15 días (RF-21)
--        · presupuesto_min <= presupuesto_max
--      NOT VALID = solo se validan filas nuevas/actualizadas,
--      no el histórico existente.
--
-- [G3] Policy UPDATE del egresado en participaciones
--      RF-31: puede retirar su postulación únicamente desde
--      estado 'enviada' o 'en_revision'. La policy restringe
--      el UPDATE a estado = 'retirada' exclusivamente.
--
-- [G4] Policy UPDATE del empresario en entregables
--      RF-44: el empresario aprueba o solicita cambios.
--      USING excluye filas con estado = 'aprobado':
--      una aprobación es irreversible a nivel de BD.
--
-- [G5] evaluaciones_insert: valida estado_periodo = 'finalizado'
--      RF-49: "únicamente tras finalizar el proyecto".
--      La policy anterior (0008) no validaba este estado.
--
-- [G6] Marketplace cerrado — solo usuarios autenticados
--      proyectos, proyecto_tecnologias y proyecto_categorias
--      dejaron de ser visibles para anon. Los proyectos en
--      'abierto'/'en_recepcion' son visibles a todos los
--      autenticados; el resto solo al empresario dueño o a
--      participantes del proyecto.
--
-- [G8] Guard trigger en participaciones
--      Congela carta_postulacion y planteamiento_solucion para
--      el rol 'authenticated' en UPDATEs. Impide que el
--      empresario sobreescriba la propuesta del egresado vía
--      PostgREST. service_role y postgres pasan sin restricción.
-- ============================================================


-- ============================================================
-- G1 — nombre_empresa nullable
-- ============================================================
alter table public.empresarios
  alter column nombre_empresa drop not null;


-- ============================================================
-- G2 — CHECKs faltantes en proyectos (NOT VALID)
-- ============================================================
alter table public.proyectos
  add constraint chk_proyectos_ubicacion
    check (
      modalidad = 'remoto'
      or (pais_proyecto is not null and ciudad_proyecto is not null)
    )
    not valid;

alter table public.proyectos
  add constraint chk_proyectos_plazo
    check (
      fecha_publicacion is null
      or fecha_cierre    is null
      or (fecha_cierre - fecha_publicacion) between interval '5 days' and interval '15 days'
    )
    not valid;

alter table public.proyectos
  add constraint chk_proyectos_presupuesto
    check (
      presupuesto_min is null
      or presupuesto_max is null
      or presupuesto_min <= presupuesto_max
    )
    not valid;


-- ============================================================
-- G3 — Policy UPDATE del egresado en participaciones
--      USING: solo filas propias en estado retractable
--      WITH CHECK: la transición destino es exclusivamente
--                  'retirada' (la columna motivo_retiro queda
--                   libre para que el egresado la complete)
-- ============================================================
drop policy if exists "participaciones_update_egresado" on public.participaciones;
create policy "participaciones_update_egresado"
  on public.participaciones for update
  to authenticated
  using (
    id_estudiante in (
      select id_estudiante from public.estudiantes
      where id_usuario = (select auth.uid())
    )
    and estado in ('enviada', 'en_revision')
  )
  with check (
    estado = 'retirada'
    and id_estudiante in (
      select id_estudiante from public.estudiantes
      where id_usuario = (select auth.uid())
    )
  );


-- ============================================================
-- G4 — Policy UPDATE del empresario en entregables
--      USING: excluye filas 'aprobado' (aprobación irreversible)
--      WITH CHECK: destinos válidos del empresario
-- ============================================================
drop policy if exists "entregables_update_empresario" on public.entregables;
create policy "entregables_update_empresario"
  on public.entregables for update
  using (
    estado <> 'aprobado'
    and id_contratacion in (
      select c.id_contratacion
      from public.contrataciones c
      join public.participaciones pa on pa.id_participacion = c.id_participacion
      join public.proyectos       p  on p.id_proyecto       = pa.id_proyecto
      join public.empresarios     e  on e.id_empresario     = p.id_empresario
      where e.id_usuario = (select auth.uid())
    )
  )
  with check (
    estado in ('en_revision', 'aprobado', 'con_cambios')
  );


-- ============================================================
-- G5 — evaluaciones_insert: solo tras contrato finalizado
--      Reemplaza la policy de 0008 que no validaba
--      contrataciones.estado_periodo. RF-49 es Must.
-- ============================================================
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
      from public.contrataciones  c
      join public.participaciones pa  on pa.id_participacion = c.id_participacion
      join public.proyectos       p   on p.id_proyecto       = pa.id_proyecto
      join public.empresarios     emp on emp.id_empresario   = p.id_empresario
      where c.id_contratacion = evaluaciones.id_contratacion
        and pa.id_estudiante  = evaluaciones.id_estudiante
        and emp.id_usuario    = (select auth.uid())
        and c.estado_periodo  = 'finalizado'
    )
  );


-- ============================================================
-- G6 — Marketplace cerrado: solo usuarios autenticados
--
-- proyectos: abierto/en_recepcion visible a todos los auth;
--            resto solo al dueño y participantes.
-- proyecto_tecnologias / proyecto_categorias: siguen
--            la misma lógica de visibilidad.
-- ============================================================

-- proyectos
drop policy if exists "proyectos_select_public_or_own" on public.proyectos;
create policy "proyectos_select_auth"
  on public.proyectos for select
  to authenticated
  using (
    estado in ('abierto', 'en_recepcion')
    or id_empresario in (
      select id_empresario from public.empresarios
      where id_usuario = (select auth.uid())
    )
    or id_proyecto in (
      select pa.id_proyecto
      from public.participaciones pa
      join public.estudiantes     e on e.id_estudiante = pa.id_estudiante
      where e.id_usuario = (select auth.uid())
    )
  );

-- proyecto_tecnologias
drop policy if exists "proy_tec_select_public_or_own" on public.proyecto_tecnologias;
create policy "proy_tec_select_auth"
  on public.proyecto_tecnologias for select
  to authenticated
  using (
    id_proyecto in (
      select id_proyecto from public.proyectos
      where estado in ('abierto', 'en_recepcion')
    )
    or id_proyecto in (
      select p.id_proyecto from public.proyectos p
      join public.empresarios e on e.id_empresario = p.id_empresario
      where e.id_usuario = (select auth.uid())
    )
    or id_proyecto in (
      select pa.id_proyecto
      from public.participaciones pa
      join public.estudiantes     e on e.id_estudiante = pa.id_estudiante
      where e.id_usuario = (select auth.uid())
    )
  );

-- proyecto_categorias
drop policy if exists "proy_cat_select_public" on public.proyecto_categorias;
create policy "proy_cat_select_auth"
  on public.proyecto_categorias for select
  to authenticated
  using (
    id_proyecto in (
      select id_proyecto from public.proyectos
      where estado in ('abierto', 'en_recepcion')
    )
    or id_proyecto in (
      select p.id_proyecto from public.proyectos p
      join public.empresarios e on e.id_empresario = p.id_empresario
      where e.id_usuario = (select auth.uid())
    )
    or id_proyecto in (
      select pa.id_proyecto
      from public.participaciones pa
      join public.estudiantes     e on e.id_estudiante = pa.id_estudiante
      where e.id_usuario = (select auth.uid())
    )
  );


-- ============================================================
-- G8 — Guard trigger en participaciones
--      Patrón idéntico a guard_usuarios_protected_cols (0006).
--      Congela los campos que pertenecen a la postulación del
--      egresado. Los campos de gestión (estado, retirada_at,
--      motivo_retiro, revision_iniciada_at, adjudicada_at, etc.)
--      quedan libres para ambos lados según sus policies.
-- ============================================================
create or replace function public.guard_participaciones_estudiante_cols()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user is distinct from 'authenticated' then
    return new;
  end if;

  new.id_participacion       := old.id_participacion;
  new.id_proyecto            := old.id_proyecto;
  new.id_estudiante          := old.id_estudiante;
  new.fecha_postulacion      := old.fecha_postulacion;
  new.carta_postulacion      := old.carta_postulacion;
  new.planteamiento_solucion := old.planteamiento_solucion;
  return new;
end;
$$;

drop trigger if exists trg_guard_participaciones_estudiante on public.participaciones;
create trigger trg_guard_participaciones_estudiante
  before update on public.participaciones
  for each row execute function public.guard_participaciones_estudiante_cols();

revoke execute on function public.guard_participaciones_estudiante_cols()
  from public, anon, authenticated;
