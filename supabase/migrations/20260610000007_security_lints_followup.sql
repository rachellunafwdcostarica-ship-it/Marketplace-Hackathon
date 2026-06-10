-- ============================================================
-- MIGRACIÓN 0007 — Limpieza de lints de seguridad (2026-06-10)
-- Autor: Samir (A1)
--
-- Cierra los avisos del database linter de Supabase introducidos/
-- pendientes tras 0006:
--
--   [0011 function_search_path_mutable] — fija search_path en las
--      funciones-trigger guard_* (y de paso en set_updated_at, que
--      el linter ya marcaba desde 0001). Estas funciones no
--      referencian objetos de esquema, así que '' es seguro.
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

-- 1. search_path inmutable en funciones-trigger
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
