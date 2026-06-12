-- ============================================================
-- MIGRACIÓN 0000 — Event trigger: auto-habilitar RLS en public
-- Fecha: 2026-06-08 (recuperada el 2026-06-10)
--
-- Por qué existe este archivo:
--   Esta función + event trigger ya vivían en la base remota
--   (mgowuyflhiavquztxpqh) pero NUNCA estuvieron en una migración
--   commiteada — eran "drift" creado directo sobre la BD. La 0007
--   incluso los menciona como red de seguridad existente. Al
--   reconstruir el esquema desde cero se recuperan aquí para que
--   el repo sea la única fuente de verdad y no se pierdan en un
--   futuro `supabase db reset`.
--
-- Qué hace:
--   En cada CREATE TABLE dentro del esquema public, habilita RLS
--   automáticamente. Es una red de seguridad: refuerza §7.2 del
--   brief (RLS en TODAS las tablas) aunque una migración futura
--   olvide el `enable row level security` explícito.
--
-- Se crea ANTES de 0001 para que cubra toda la cadena de tablas.
-- Es idempotente: corre con datos descartables y se puede reaplicar.
-- ============================================================

create or replace function public.rls_auto_enable()
returns event_trigger
language plpgsql
security definer
set search_path to 'pg_catalog'
as $function$
declare
  cmd record;
begin
  for cmd in
    select *
    from pg_event_trigger_ddl_commands()
    where command_tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      and object_type in ('table','partitioned table')
  loop
     if cmd.schema_name is not null and cmd.schema_name in ('public') and cmd.schema_name not in ('pg_catalog','information_schema') and cmd.schema_name not like 'pg_toast%' and cmd.schema_name not like 'pg_temp%' then
      begin
        execute format('alter table if exists %s enable row level security', cmd.object_identity);
        raise log 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      exception
        when others then
          raise log 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      end;
     else
        raise log 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     end if;
  end loop;
end;
$function$;

drop event trigger if exists ensure_rls;
create event trigger ensure_rls
  on ddl_command_end
  execute function public.rls_auto_enable();

-- La función solo actua como event trigger; no debe ser invocable como RPC
-- (lint 0028/0029). Revocar EXECUTE no afecta el disparo del event trigger.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
