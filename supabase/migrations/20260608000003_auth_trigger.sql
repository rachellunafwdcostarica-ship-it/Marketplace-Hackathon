-- Trigger: al crear un usuario en auth.users, crea su registro en public.usuarios.
-- Usa 'junior' como rol por defecto; el onboarding lo puede cambiar.
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
    id_rol,
    estado_cuenta,
    is_active
  ) values (
    new.id,
    v_nombre,
    v_apellido,
    new.email,
    new.raw_user_meta_data->>'avatar_url',
    (select id_rol from public.roles where nombre_rol = 'junior' limit 1),
    'pendiente',
    true
  )
  on conflict (id_usuario) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
