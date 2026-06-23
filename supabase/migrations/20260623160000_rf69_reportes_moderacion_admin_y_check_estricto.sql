-- ============================================================================
-- RF-69 Fase 1 — Hardening de reportes_moderacion
-- Fecha: 2026-06-23
--
-- NO es fundación del feature: la cola de moderación ya funciona sin esto
-- (el admin lee/resuelve con service role; el intake usa reportes_insert_auth;
-- "exactamente un objetivo" lo valida Zod en la app). Esta migración agrega
-- las garantías a nivel de base de datos (defense-in-depth).
--
-- Cambios:
--   (a) Política RLS SELECT para admin sobre reportes_moderacion.
--   (b) Política RLS UPDATE para admin (para resolver reportes).
--   (c) Endurece el CHECK: "al menos un objetivo" -> "exactamente uno".
--
-- Pre-flight (ya verificado en remoto el 2026-06-23): el conteo de filas con
-- != 1 objetivo dio 0, así que el CHECK estricto aplica limpio. Re-correr antes
-- de aplicar:
--   select count(*) from public.reportes_moderacion
--    where (case when id_reportado  is not null then 1 else 0 end)
--        + (case when id_proyecto   is not null then 1 else 0 end)
--        + (case when id_mensaje    is not null then 1 else 0 end)
--        + (case when id_entregable is not null then 1 else 0 end)
--        + (case when id_portafolio is not null then 1 else 0 end) <> 1;
--
-- Nota para Samir: el CHECK inline original es auto-nombrado por Postgres.
-- Se asume "reportes_moderacion_check"; el `drop ... if exists` lo hace seguro
-- aunque el nombre difiera (en ese caso quedaría el viejo + el nuevo, y el
-- estricto es el que liga). Verificar el nombre real en local con:
--   select constraint_name from information_schema.table_constraints
--    where table_name = 'reportes_moderacion' and constraint_type = 'CHECK';
--
-- NO requiere regenerar src/types/database.ts (RLS y CHECK no se reflejan en
-- los tipos generados).
-- ============================================================================

-- (a) admin puede LEER la cola de reportes
drop policy if exists "reportes_select_admin" on public.reportes_moderacion;
create policy "reportes_select_admin"
  on public.reportes_moderacion for select
  to authenticated
  using (
    exists (
      select 1 from public.usuarios u
      join public.roles r on u.id_rol = r.id_rol
      where u.id_usuario = (select auth.uid()) and r.nombre_rol = 'administrador'
    )
  );

-- (b) admin puede RESOLVER (update) un reporte
drop policy if exists "reportes_update_admin" on public.reportes_moderacion;
create policy "reportes_update_admin"
  on public.reportes_moderacion for update
  to authenticated
  using (
    exists (
      select 1 from public.usuarios u
      join public.roles r on u.id_rol = r.id_rol
      where u.id_usuario = (select auth.uid()) and r.nombre_rol = 'administrador'
    )
  )
  with check (
    exists (
      select 1 from public.usuarios u
      join public.roles r on u.id_rol = r.id_rol
      where u.id_usuario = (select auth.uid()) and r.nombre_rol = 'administrador'
    )
  );

-- (c) CHECK estricto: exactamente UN objetivo de la denuncia
alter table public.reportes_moderacion
  drop constraint if exists "reportes_moderacion_check";

alter table public.reportes_moderacion
  add constraint "reportes_moderacion_exactamente_uno_objetivo" check (
    (case when id_reportado  is not null then 1 else 0 end)
  + (case when id_proyecto   is not null then 1 else 0 end)
  + (case when id_mensaje    is not null then 1 else 0 end)
  + (case when id_entregable is not null then 1 else 0 end)
  + (case when id_portafolio is not null then 1 else 0 end)
  = 1
  );
