-- ============================================================
-- MIGRACIÓN 0007 — Limpieza de lints de seguridad (2026-06-10)
-- Autor: Samir (A1) — extendida tras adoptar el modelo XXI
--
-- Cierra los avisos del database linter de Supabase introducidos/
-- pendientes tras 0005 (XXI) y 0006:
--
--   [0011 function_search_path_mutable] — fija search_path en las
--      funciones-trigger guard_* (y de paso en set_updated_at, que
--      el linter ya marcaba desde 0001). Estas funciones no
--      referencian objetos de esquema, así que '' es seguro.
--      Las funciones-trigger de negocio de 0005 SÍ referencian
--      tablas sin calificar → se fija search_path = public.
--
--   [0028/0029 *_security_definer_function_executable] — las
--      funciones que SÓLO actúan como triggers no deben poder
--      invocarse vía PostgREST (/rest/v1/rpc/...). Se revoca EXECUTE
--      a public/anon/authenticated. Los triggers siguen disparándose
--      con normalidad: el motor no chequea EXECUTE al ejecutar un
--      trigger.
--
-- NO se tocan (intencionales / gestionadas por Supabase):
--   · get_my_role / get_my_account_status / assign_my_role:
--     SECURITY DEFINER RPC llamadas a propósito por la app
--     autenticada; inofensivas para anon (devuelven null o lanzan
--     'no_session').
--   · rls_auto_enable: event trigger gestionado por Supabase que
--     auto-habilita RLS en tablas nuevas de public (red de seguridad).
-- ============================================================

-- 1. search_path inmutable en funciones-trigger sin referencias a esquema
alter function public.guard_usuarios_protected_cols()    set search_path = '';
alter function public.guard_empresarios_protected_cols() set search_path = '';
alter function public.guard_estudiantes_protected_cols() set search_path = '';
alter function public.set_updated_at()                   set search_path = '';

-- 2. Las funciones-trigger no deben ser callable como RPC
revoke execute on function public.handle_new_user()                  from public, anon, authenticated;
revoke execute on function public.set_updated_at()                   from public, anon, authenticated;
revoke execute on function public.guard_usuarios_protected_cols()    from public, anon, authenticated;
revoke execute on function public.guard_empresarios_protected_cols() from public, anon, authenticated;
revoke execute on function public.guard_estudiantes_protected_cols() from public, anon, authenticated;

-- ============================================================
-- 3. Funciones-trigger de negocio de 0005 (modelo XXI)
--
--    SECURITY DEFINER es OBLIGATORIO aquí, no solo cosmético:
--    estas funciones corren con los permisos del caller
--    ('authenticated') y sus UPDATE/INSERT cruzados chocan con
--    RLS y con los guards de 0006. Sin definer:
--      · recalcular_reputacion: el empresario que evalúa no puede
--        actualizar estudiantes.reputacion (RLS: no es su fila, y
--        el guard congela la columna) → reputación nunca cambia.
--      · sync_contadores_estudiante: el guard congela
--        participaciones_activas/proyectos_completados → contadores
--        silenciosamente desactualizados.
--      · sync_postulaciones_pendientes: el egresado que postula no
--        puede actualizar proyectos del empresario (RLS) → contador
--        del dashboard de empresa queda en cero.
--    Con definer corren como postgres (dueño de las tablas →
--    bypass de RLS por ownership) y los guards los dejan pasar.
--    Se fija search_path = public (referencian tablas sin calificar)
--    y se revoca EXECUTE para que no sean invocables vía RPC.
-- ============================================================
alter function public.validar_cupo_participaciones()             security definer set search_path = public;
alter function public.validar_estado_proyecto_para_entregable()  security definer set search_path = public;
alter function public.actualizar_strikes()                       security definer set search_path = public;
alter function public.validar_nivel_admin()                      security definer set search_path = public;
alter function public.recalcular_reputacion()                    security definer set search_path = public;
alter function public.sync_contadores_estudiante()               security definer set search_path = public;
alter function public.sync_postulaciones_pendientes()            security definer set search_path = public;
alter function public.crear_contratacion_al_adjudicar()          security definer set search_path = public;

revoke execute on function public.validar_cupo_participaciones()            from public, anon, authenticated;
revoke execute on function public.validar_estado_proyecto_para_entregable() from public, anon, authenticated;
revoke execute on function public.actualizar_strikes()                      from public, anon, authenticated;
revoke execute on function public.validar_nivel_admin()                     from public, anon, authenticated;
revoke execute on function public.recalcular_reputacion()                   from public, anon, authenticated;
revoke execute on function public.sync_contadores_estudiante()              from public, anon, authenticated;
revoke execute on function public.sync_postulaciones_pendientes()           from public, anon, authenticated;
revoke execute on function public.crear_contratacion_al_adjudicar()         from public, anon, authenticated;
