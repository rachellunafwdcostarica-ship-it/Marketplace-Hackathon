-- Endurece el flujo OAuth/onboarding para que el rol efectivo nunca exista sin
-- su perfil correspondiente.
--
-- Contexto:
--   * OAuth crea una sesion antes de completar onboarding; en ese estado
--     usuarios.id_rol es NULL por diseno.
--   * La RPC legacy assign_my_role() seguia expuesta a authenticated y podia
--     asignar 'empresario' sin crear la fila obligatoria en empresarios.
--   * get_my_role() solo miraba usuarios.id_rol, asi que una cuenta a medio
--     crear podia verse como rol valido aunque no tuviera perfil.

create or replace function public.get_my_role()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select r.nombre_rol
  from public.usuarios u
  join public.roles r on r.id_rol = u.id_rol
  where u.id_usuario = auth.uid()
    and (
      r.nombre_rol = 'administrador'
      or (
        r.nombre_rol = 'egresado'
        and exists (
          select 1
          from public.estudiantes e
          where e.id_usuario = u.id_usuario
        )
      )
      or (
        r.nombre_rol = 'empresario'
        and exists (
          select 1
          from public.empresarios emp
          where emp.id_usuario = u.id_usuario
        )
      )
    )
$$;

revoke execute on function public.get_my_role() from public;
grant execute on function public.get_my_role() to authenticated;

create or replace function public.assign_my_role(p_role text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'assign_my_role_deprecated: use completarOnboarding/crearPerfilUsuario para crear rol y perfil juntos'
    using errcode = 'P0001';
end;
$$;

revoke execute on function public.assign_my_role(text) from public, anon, authenticated;
