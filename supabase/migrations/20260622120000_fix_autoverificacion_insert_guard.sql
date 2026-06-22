-- Cierra un bypass de seguridad CONFIRMADO empíricamente: el rol `authenticated`
-- podía hacer INSERT directo (vía PostgREST) en `estudiantes`/`empresarios` con
-- estado_verificacion = 'verificado', saltándose la validación del administrador
-- (rompe RF-64 y RF-17).
--
-- Causa (tres patas):
--   1) `authenticated` tiene privilegio de columna sobre estado_verificacion en INSERT.
--   2) Las policies estudiantes_insert_own / empresarios_insert_own solo validaban id_usuario.
--   3) Los guards de columnas protegidas eran solo BEFORE UPDATE (no había guard en INSERT).
--
-- Fix en dos capas (defensa en profundidad):
--   1) Extender los guards a BEFORE INSERT: para el rol `authenticated`, forzar las
--      columnas de verificación/reputación a su valor seguro. service_role y las
--      funciones SECURITY DEFINER (p.ej. assign_my_role) no se ven afectadas porque
--      su current_user no es 'authenticated'.
--   2) Reforzar el WITH CHECK de las policies de INSERT para exigir estado_verificacion = 'pendiente'.
--
-- El alta legítima NO cambia: assign_my_role (SECURITY DEFINER) crea la fila de
-- estudiantes, y saveEmpresarioProfile no envía estado_verificacion (queda 'pendiente').
-- Idempotente: usa CREATE OR REPLACE / DROP ... IF EXISTS para poder re-aplicarse.

-- ============================ estudiantes ============================
create or replace function public.guard_estudiantes_protected_cols()
returns trigger
language plpgsql
set search_path to ''
as $fn$
begin
  if current_user is distinct from 'authenticated' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.estado_verificacion     := 'pendiente';
    new.verificado_at           := null;
    new.verificado_por          := null;
    new.reputacion              := null;
    new.proyectos_completados   := 0;
    new.participaciones_activas := 0;
  elsif tg_op = 'UPDATE' then
    new.id_usuario              := old.id_usuario;
    new.estado_verificacion     := old.estado_verificacion;
    new.verificado_at           := old.verificado_at;
    new.verificado_por          := old.verificado_por;
    new.reputacion              := old.reputacion;
    new.proyectos_completados   := old.proyectos_completados;
    new.participaciones_activas := old.participaciones_activas;
    new.titulo_fwd              := old.titulo_fwd;
  end if;

  return new;
end;
$fn$;

drop trigger if exists trg_guard_estudiantes_protected on public.estudiantes;
create trigger trg_guard_estudiantes_protected
  before insert or update on public.estudiantes
  for each row execute function public.guard_estudiantes_protected_cols();

drop policy if exists estudiantes_insert_own on public.estudiantes;
create policy estudiantes_insert_own on public.estudiantes
  for insert to public
  with check (id_usuario = (select auth.uid()) and estado_verificacion = 'pendiente');

-- ============================ empresarios ============================
create or replace function public.guard_empresarios_protected_cols()
returns trigger
language plpgsql
set search_path to ''
as $fn$
begin
  if current_user is distinct from 'authenticated' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.estado_verificacion := 'pendiente';
    new.verificado_at       := null;
    new.verificado_por      := null;
    new.reputacion          := null;
  elsif tg_op = 'UPDATE' then
    new.id_usuario          := old.id_usuario;
    new.estado_verificacion := old.estado_verificacion;
    new.verificado_at       := old.verificado_at;
    new.verificado_por      := old.verificado_por;
  end if;

  return new;
end;
$fn$;

drop trigger if exists trg_guard_empresarios_protected on public.empresarios;
create trigger trg_guard_empresarios_protected
  before insert or update on public.empresarios
  for each row execute function public.guard_empresarios_protected_cols();

drop policy if exists empresarios_insert_own on public.empresarios;
create policy empresarios_insert_own on public.empresarios
  for insert to public
  with check (id_usuario = (select auth.uid()) and estado_verificacion = 'pendiente');
