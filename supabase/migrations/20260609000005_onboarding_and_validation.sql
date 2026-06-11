-- ============================================================
-- MIGRACIÓN 0005 — Onboarding, asignación de rol y validación
-- Fecha: 2026-06-09 (adaptada al modelo XXI el 2026-06-10)
--
-- Qué hace:
--   1. Hace usuarios.id_rol nullable — el trigger ya NO asigna
--      rol por defecto; el usuario lo elige en /onboarding.
--   2. Reescribe handle_new_user() para dejar id_rol = NULL.
--   3. Crea get_my_account_status() para leer estado_cuenta.
--   4. Crea assign_my_role(p_role text) — asigna el rol UNA
--      SOLA VEZ (permanente). Para egresados, crea también la
--      fila mínima en public.estudiantes.
--
-- Nota sobre el modelo XXI:
--   Los roles finales son administrador / egresado / empresario.
--   El rol del estudiante pasó de 'junior' a 'egresado'; los
--   antiguos 'moderador' y 'admin' ahora son valores de
--   usuarios.nivel_admin bajo el rol 'administrador'.
--
-- Nota sobre admin:
--   Los usuarios administrador se crean manualmente vía
--   service_role (bypasea RLS). No pasan por el flujo
--   OAuth → onboarding. Por eso assign_my_role rechaza
--   'administrador'.
--
-- Nota sobre empresarios:
--   La fila en public.empresarios NO se crea aquí porque los
--   campos nombre_empresa y tipo_empresario son NOT NULL sin
--   valor por defecto. El empresario los completa en su perfil.
-- ============================================================


-- ============================================================
-- 1. Hacer id_rol nullable
-- ============================================================
alter table public.usuarios
  alter column id_rol drop not null;


-- ============================================================
-- 2. Reescribir trigger — dejar id_rol = NULL
-- ============================================================
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_full_name  text;
  v_nombre     varchar(80);
  v_apellido   varchar(80);
begin
  v_full_name := coalesce(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    ''
  );
  v_nombre  := coalesce(nullif(split_part(v_full_name, ' ', 1), ''), split_part(new.email, '@', 1));
  v_apellido := coalesce(nullif(split_part(v_full_name, ' ', 2), ''), '');

  insert into public.usuarios (
    id_usuario,
    nombre,
    apellido_1,
    correo,
    foto_perfil,
    -- id_rol intencionalmente omitido: queda NULL hasta que el
    -- usuario elija su rol en /onboarding mediante assign_my_role().
    estado_cuenta,
    is_active
  ) values (
    new.id,
    v_nombre,
    v_apellido,
    new.email,
    new.raw_user_meta_data->>'avatar_url',
    'pendiente',
    true
  )
  on conflict (id_usuario) do nothing;

  return new;
end;
$$;
-- Nota: no se elimina ni recrea el trigger; basta reemplazar la función.


-- ============================================================
-- 3. get_my_account_status() — estado de la cuenta en sesión
--    Espejo de get_my_role(). Retorna NULL si no hay sesión
--    o el usuario aún no tiene fila en usuarios.
-- ============================================================
create or replace function public.get_my_account_status()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select u.estado_cuenta::text
  from public.usuarios u
  where u.id_usuario = auth.uid()
$$;


-- ============================================================
-- 4. assign_my_role(p_role text)
--
--    - Solo acepta 'egresado' o 'empresario' (nunca administrador).
--    - Actualiza id_rol SOLO si todavía es NULL (permanencia).
--    - Para 'egresado': crea también la fila mínima en estudiantes.
--    - Retorna TRUE si se asignó el rol, FALSE si ya lo tenía.
-- ============================================================
create or replace function public.assign_my_role(p_role text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id  uuid;
  v_id_rol   smallint;
  v_updated  integer;
begin
  -- Solo roles de usuario final (jamás administrador)
  if p_role not in ('egresado', 'empresario') then
    raise exception 'rol_invalido: el rol "%" no está permitido en onboarding', p_role
      using errcode = 'P0001';
  end if;

  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'no_session: se requiere una sesión activa'
      using errcode = 'P0002';
  end if;

  -- Resolver id_rol desde la tabla roles
  select id_rol into v_id_rol
  from public.roles
  where nombre_rol = p_role
  limit 1;

  if v_id_rol is null then
    raise exception 'rol_no_encontrado: no existe el rol "%" en la tabla roles', p_role
      using errcode = 'P0003';
  end if;

  -- Actualizar SOLO si id_rol todavía es NULL (garantiza permanencia a nivel BD)
  update public.usuarios
  set id_rol = v_id_rol
  where id_usuario = v_user_id
    and id_rol is null;

  get diagnostics v_updated = row_count;

  if v_updated = 0 then
    -- El usuario ya tenía un rol asignado — no se puede cambiar
    return false;
  end if;

  -- Para egresado: crear la fila mínima en estudiantes
  -- Los demás campos tienen defaults o son nullable.
  if p_role = 'egresado' then
    insert into public.estudiantes (id_usuario)
    values (v_user_id)
    on conflict (id_usuario) do nothing;
  end if;
  -- Para empresario: la fila en empresarios se crea cuando
  -- el usuario completa su perfil (campos NOT NULL requeridos).

  return true;
end;
$$;
