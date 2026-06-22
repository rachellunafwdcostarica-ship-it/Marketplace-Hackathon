-- Activa el borrado real de huérfanos OAuth (RNF-16).
--
-- Reprograma el cron 'limpiar-huerfanos-oauth' con p_dry_run=false.
-- Sustituye el dry-run instalado en 20260622150000_limpieza_huerfanos_oauth.sql.
-- cron.schedule por nombre es idempotente: si el job ya existe lo reemplaza.
--
-- NO APLICAR hasta que:
--   1. Se hayan revisado los candidatos detectados en auditoria (ver abajo).
--   2. Samir dé señal explícita de aplicar.
--
-- Query de revisión de candidatos (SQL editor de Supabase, antes de aplicar):
--   select id_entidad,
--          valores_antes->>'correo'         as correo,
--          valores_antes->>'fecha_registro' as fecha_registro,
--          ocurrida_at
--   from public.auditoria
--   where accion = 'huerfano_oauth_detectado'
--   order by ocurrida_at desc;
--
-- Confirmar también que el cron dry-run ya está activo en remoto:
--   select jobname, schedule, command, active
--   from cron.job
--   where jobname = 'limpiar-huerfanos-oauth';

select cron.schedule(
  'limpiar-huerfanos-oauth',
  '0 3 * * *',
  $cron$ select public.limpiar_huerfanos_oauth(false); $cron$
);
