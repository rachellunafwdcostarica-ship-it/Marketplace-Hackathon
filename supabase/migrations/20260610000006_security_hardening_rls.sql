-- ============================================================
-- MIGRACIÓN 0006 — Endurecimiento de seguridad RLS
-- Fecha: 2026-06-10 (adaptada al modelo XXI el mismo día)
-- Autor: Samir (A1 — Infra / Data / Auth / Seguridad)
--
-- Cierra hallazgos de la auditoría de seguridad 2026-06-10,
-- re-aplicados sobre el esquema del modelo XXI (0001-0006).
--
-- [C1] ESCALACIÓN DE PRIVILEGIOS (crítico).
--      Las políticas *_update_own de usuarios/empresarios/estudiantes
--      (migración 0004) sólo validan auth.uid() = id_usuario, SIN
--      restringir columnas. Vía PostgREST un usuario autenticado podía:
--        · usuarios:    id_rol → administrador, nivel_admin → superadmin,
--                       estado_cuenta suspendida→activa,
--                       cantidad_strikes=0, limpiar bloqueado_hasta.
--        · empresarios: estado_verificacion → 'verificado'
--                       (única compuerta para publicar proyectos).
--        · estudiantes: estado_verificacion, reputacion, contadores.
--      Se cierra con triggers BEFORE UPDATE que CONGELAN esas columnas
--      para el rol 'authenticated'. service_role (admin, p.ej.
--      approveUser) y postgres (migraciones y funciones SECURITY
--      DEFINER como assign_my_role) pasan sin restricción.
--
-- [SEC] INSERCIÓN FORJADA. Se endurecen tres WITH CHECK de 0004:
--        · comentarios_entregables: cualquier autenticado podía
--          comentar CUALQUIER entregable (sólo validaba id_autor).
--        · participaciones: un egresado podía insertar con estado
--          distinto de 'enviada' (p.ej. 'contratada' = auto-adjudicarse
--          y disparar crear_contratacion_al_adjudicar).
--        · evaluaciones: un empresario podía evaluar contrataciones
--          ajenas o a un estudiante que no es de esa contratación
--          (envenena la reputación).
--
-- [VIS] BORRADORES PÚBLICOS. La política de SELECT de proyectos de
--        0004 sólo filtraba is_active = true, y proyectos nace con
--        estado 'borrador' + is_active true → los borradores eran
--        visibles para cualquiera vía PostgREST. Se excluyen del
--        público; el empresario dueño los sigue viendo.
--
-- [PERF] FKs consultadas por las políticas RLS sin índice → seq scans.
--        Se agregan sólo los que la 0005 del modelo XXI no cubre ya
--        (sus compuestos e índices de matching cubren el resto).
--
-- FUERA DE ESTE PR (coordinar; no es dominio exclusivo de A1):
--   · UNIQUE(id_proyecto, id_estudiante) en participaciones, validar
--     proyecto abierto al postular, máquina de estados de
--     participaciones/entregables, política UPDATE del estudiante
--     para 'retirada', política UPDATE del empresario para revisar
--     entregables  → Santiago (lib/applications) + Samir.
--   · Políticas de LECTURA de contrapartes (marketplace ve la empresa
--     del proyecto; empresa ve datos del postulante)  → decisión de
--     producto con Fressia/Errol.
--   · participaciones_update_empresario permite al empresario editar
--     campos del egresado (carta, planteamiento) — falta congelar
--     columnas por parte  → Santiago + Samir.
-- ============================================================


-- ============================================================
-- 1. GUARD — usuarios: congelar columnas sensibles en UPDATE
-- ============================================================
-- SECURITY INVOKER (default): así current_user refleja el rol real
-- del caller. Sólo se restringe a 'authenticated'; service_role,
-- postgres y supabase_admin pasan intactos.
create or replace function public.guard_usuarios_protected_cols()
returns trigger
language plpgsql
as $$
begin
  if current_user is distinct from 'authenticated' then
    return new;
  end if;

  new.id_usuario        := old.id_usuario;
  new.correo            := old.correo;
  new.id_rol            := old.id_rol;
  new.nivel_admin       := old.nivel_admin;
  new.estado_cuenta     := old.estado_cuenta;
  new.is_active         := old.is_active;
  new.cantidad_strikes  := old.cantidad_strikes;
  new.intentos_fallidos := old.intentos_fallidos;
  new.bloqueado_hasta   := old.bloqueado_hasta;
  new.suspendido_at     := old.suspendido_at;
  new.fecha_registro    := old.fecha_registro;
  new.ultimo_login_at   := old.ultimo_login_at;
  return new;
end;
$$;

drop trigger if exists trg_guard_usuarios_protected on public.usuarios;
create trigger trg_guard_usuarios_protected
  before update on public.usuarios
  for each row execute function public.guard_usuarios_protected_cols();


-- ============================================================
-- 2. GUARD — empresarios: congelar verificación
-- ============================================================
create or replace function public.guard_empresarios_protected_cols()
returns trigger
language plpgsql
as $$
begin
  if current_user is distinct from 'authenticated' then
    return new;
  end if;

  new.id_usuario          := old.id_usuario;
  new.estado_verificacion := old.estado_verificacion;
  new.verificado_at       := old.verificado_at;
  new.verificado_por      := old.verificado_por;
  return new;
end;
$$;

drop trigger if exists trg_guard_empresarios_protected on public.empresarios;
create trigger trg_guard_empresarios_protected
  before update on public.empresarios
  for each row execute function public.guard_empresarios_protected_cols();


-- ============================================================
-- 3. GUARD — estudiantes: congelar verificación, reputación y contadores
-- ============================================================
create or replace function public.guard_estudiantes_protected_cols()
returns trigger
language plpgsql
as $$
begin
  if current_user is distinct from 'authenticated' then
    return new;
  end if;

  new.id_usuario              := old.id_usuario;
  new.estado_verificacion     := old.estado_verificacion;
  new.verificado_at           := old.verificado_at;
  new.verificado_por          := old.verificado_por;
  new.reputacion              := old.reputacion;
  new.proyectos_completados   := old.proyectos_completados;
  new.participaciones_activas := old.participaciones_activas;
  new.titulo_fwd              := old.titulo_fwd;
  return new;
end;
$$;

drop trigger if exists trg_guard_estudiantes_protected on public.estudiantes;
create trigger trg_guard_estudiantes_protected
  before update on public.estudiantes
  for each row execute function public.guard_estudiantes_protected_cols();


-- ============================================================
-- 4. FIX — comentarios_entregables: sólo las partes pueden comentar
-- ============================================================
drop policy if exists "comentarios_entregables_insert" on public.comentarios_entregables;
create policy "comentarios_entregables_insert"
  on public.comentarios_entregables for insert
  with check (
    id_autor = auth.uid()
    and id_entregable in (
      select e.id_entregable
      from public.entregables e
      join public.contrataciones c  on c.id_contratacion  = e.id_contratacion
      join public.participaciones pa on pa.id_participacion = c.id_participacion
      where pa.id_estudiante in (
              select id_estudiante from public.estudiantes where id_usuario = auth.uid()
            )
         or pa.id_proyecto in (
              select p.id_proyecto
              from public.proyectos p
              join public.empresarios emp on emp.id_empresario = p.id_empresario
              where emp.id_usuario = auth.uid()
            )
    )
  );


-- ============================================================
-- 5. FIX — participaciones: el egresado sólo puede insertar 'enviada'
--    (impide auto-adjudicarse insertando estado='contratada', que
--    además dispararía crear_contratacion_al_adjudicar)
-- ============================================================
drop policy if exists "participaciones_insert_egresado" on public.participaciones;
create policy "participaciones_insert_egresado"
  on public.participaciones for insert
  with check (
    estado = 'enviada'
    and id_estudiante in (
      select id_estudiante from public.estudiantes where id_usuario = auth.uid()
    )
  );


-- ============================================================
-- 6. FIX — evaluaciones: el empresario sólo evalúa SUS contrataciones,
--    y el estudiante debe ser el de esa contratación
-- ============================================================
drop policy if exists "evaluaciones_insert_empresario" on public.evaluaciones;
create policy "evaluaciones_insert_empresario"
  on public.evaluaciones for insert
  with check (
    id_empresario in (
      select id_empresario from public.empresarios where id_usuario = auth.uid()
    )
    and exists (
      select 1
      from public.contrataciones c
      join public.participaciones pa on pa.id_participacion = c.id_participacion
      join public.proyectos p        on p.id_proyecto       = pa.id_proyecto
      join public.empresarios emp    on emp.id_empresario   = p.id_empresario
      where c.id_contratacion = evaluaciones.id_contratacion
        and pa.id_estudiante  = evaluaciones.id_estudiante
        and emp.id_usuario    = auth.uid()
    )
  );


-- ============================================================
-- 7. FIX — proyectos: los borradores no son públicos
-- ============================================================
drop policy if exists "proyectos_select_public_or_own" on public.proyectos;
create policy "proyectos_select_public_or_own"
  on public.proyectos for select
  using (
    (is_active = true and estado <> 'borrador')
    or id_empresario in (
      select id_empresario from public.empresarios where id_usuario = auth.uid()
    )
  );


-- ============================================================
-- 8. PERF — índices sobre FKs consultadas por RLS
--    Sólo los que 0005 (modelo XXI) no cubre:
--      · participaciones(id_estudiante|id_proyecto) → compuestos de 0005
--      · proyectos(id_area_negocio) → idx_proyectos_area
--      · notificaciones, consentimientos, conversaciones_ia,
--        evaluaciones(id_estudiante), proyecto_tecnologias y
--        habilidades_tecnicas → ya indexados en 0005
--    strikes(id_usuario) se mantiene: el de 0005 es parcial
--    (where revocado = false) y no sirve para el lookup general.
-- ============================================================
create index if not exists idx_proyectos_id_empresario
  on public.proyectos(id_empresario);
create index if not exists idx_entregables_id_contratacion
  on public.entregables(id_contratacion);
create index if not exists idx_comentarios_entregables_id_autor
  on public.comentarios_entregables(id_autor);
create index if not exists idx_evaluaciones_id_empresario
  on public.evaluaciones(id_empresario);
create index if not exists idx_evaluaciones_id_contratacion
  on public.evaluaciones(id_contratacion);
create index if not exists idx_strikes_id_usuario
  on public.strikes(id_usuario);
create index if not exists idx_reportes_id_reportante
  on public.reportes_moderacion(id_reportante);
