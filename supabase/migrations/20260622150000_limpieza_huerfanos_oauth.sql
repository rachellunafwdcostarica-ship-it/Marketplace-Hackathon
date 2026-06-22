-- Fase 2b: limpieza de cuentas OAuth huérfanas (RNF-16).
--
-- Un usuario que entra por OAuth (correo ya confirmado por el proveedor) pero
-- nunca completa el onboarding queda como "huérfano": fila en public.usuarios
-- con id_rol IS NULL y sin perfil (estudiantes/empresarios). Es inofensivo —el
-- middleware lo reenvía siempre a /onboarding y no entra a ningún panel— pero
-- infla las métricas de usuarios registrados. Este job lo borra tras 30 días.
--
-- IMPORTANTE: el criterio `id_rol IS NULL` solo matchea huérfanos OAuth. El
-- registro por contraseña (Camino A) asigna id_rol en el alta
-- (crearPerfilUsuario), así que una cuenta por contraseña nunca cae acá.
--
-- Para limpiar de verdad hay que borrar la fila de auth.users (cascada a
-- public.usuarios); borrar solo usuarios sería inútil (handle_new_user la
-- recrearía en el próximo login).
--
-- ARRANQUE EN DRY-RUN: el cron corre con p_dry_run = true → solo registra en
-- `auditoria` (RNF-05) los candidatos que borraría, SIN borrar. La activación
-- del borrado real (reprogramar con p_dry_run = false) es un paso separado y una
-- decisión explícita posterior, tras revisar que los candidatos sean correctos.

create extension if not exists pg_cron;

create or replace function public.limpiar_huerfanos_oauth(p_dry_run boolean default true)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_huerfano record;
  v_total integer := 0;
begin
  for v_huerfano in
    select u.id_usuario, u.correo, u.fecha_registro
    from public.usuarios u
    where u.id_rol is null
      and u.fecha_registro < now() - interval '30 days'
  loop
    -- Auditoría (RNF-05): un registro por candidato, en dry-run o real.
    -- id_actor = null: es una acción del sistema (el cron), no de un admin.
    insert into public.auditoria (
      id_actor, accion, entidad, id_entidad, valores_antes
    ) values (
      null,
      case when p_dry_run then 'huerfano_oauth_detectado'
           else 'huerfano_oauth_eliminado' end,
      'usuarios',
      v_huerfano.id_usuario,
      jsonb_build_object(
        'correo', v_huerfano.correo,
        'fecha_registro', v_huerfano.fecha_registro,
        'dry_run', p_dry_run
      )
    );

    if not p_dry_run then
      delete from auth.users where id = v_huerfano.id_usuario;
    end if;

    v_total := v_total + 1;
  end loop;

  return v_total;
end;
$$;

-- Solo el rol de servicio puede ejecutar la función (no la exponemos a anon /
-- authenticated vía REST).
revoke all on function public.limpiar_huerfanos_oauth(boolean) from public, anon, authenticated;

-- Job diario a las 03:00 UTC, en DRY-RUN. cron.schedule por nombre es
-- idempotente: reaplicar la migración reemplaza el job existente.
select cron.schedule(
  'limpiar-huerfanos-oauth',
  '0 3 * * *',
  $cron$ select public.limpiar_huerfanos_oauth(true); $cron$
);
