-- ============================================================
-- Migración: incremento atómico de intentos de login fallido
--
-- Contexto:
--   signInWithPassword hacía read-then-write (leer intentos_fallidos,
--   calcular +1, escribir). Dos fallos concurrentes podían leer el mismo
--   N y escribir N+1 → incremento perdido.
--
--   Este RPC realiza un UPDATE atómico de una sola sentencia: no hay
--   ventana de lectura ni escritura separadas; la fila se bloquea para
--   escritura mientras dura el UPDATE y los callers concurrentes se
--   serializan a nivel Postgres.
--
-- Seguridad:
--   SECURITY INVOKER (no DEFINER): corre con los privilegios del caller,
--   que siempre es el admin client (service_role con bypassrls).
--
--   Postgres otorga EXECUTE a PUBLIC por defecto en funciones nuevas.
--   El REVOKE cierra el vector de DoS-de-lockout: un atacante no autenticado
--   no puede llamar register_failed_login('victima@correo') en bucle para
--   bloquear cuentas ajenas.
-- ============================================================

create or replace function public.register_failed_login(p_email text)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_max          integer;
  v_lock_minutes integer;
begin
  select coalesce(
    (select valor::int from public.configuracion_sistema
     where clave = 'intentos_login_max' limit 1), 5
  ) into v_max;

  select coalesce(
    (select valor::int from public.configuracion_sistema
     where clave = 'tiempo_bloqueo_minutos' limit 1), 30
  ) into v_lock_minutes;

  -- UPDATE único = atómico a nivel de fila.
  -- Si el correo no existe, la sentencia simplemente no actualiza filas (sin error).
  update public.usuarios
  set
    intentos_fallidos = intentos_fallidos + 1,
    bloqueado_hasta = case
      when intentos_fallidos + 1 >= v_max
        then now() + make_interval(mins => v_lock_minutes)
      else bloqueado_hasta
    end
  where correo = p_email;
end;
$$;

-- Cierre de seguridad: revocar el grant por defecto a PUBLIC,
-- luego otorgar solo a service_role (el único caller legítimo).
revoke execute on function public.register_failed_login(text) from public, anon, authenticated;
grant  execute on function public.register_failed_login(text) to service_role;
