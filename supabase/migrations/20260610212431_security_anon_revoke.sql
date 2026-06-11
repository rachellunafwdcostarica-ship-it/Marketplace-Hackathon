-- ============================================================
-- MIGRACIÓN 0009 — Revocar EXECUTE desde anon en RPC públicas
-- Fecha: 2026-06-10
-- Autor: Samir (A1)
--
-- El linter marca get_my_role(), get_my_account_status() y
-- assign_my_role() como callable por 'anon' vía RPC:
--   [0028] anon_security_definer_function_executable
--
-- Estas funciones ya son inofensivas para anon:
--   · get_my_role / get_my_account_status → devuelven NULL
--     (auth.uid() = NULL cuando no hay sesión)
--   · assign_my_role → lanza 'no_session' explícitamente
--
-- Sin embargo, revocar de anon sigue siendo la práctica
-- correcta: reduce la superficie expuesta de la API y
-- elimina el aviso del linter.
--
-- NO se revoca de 'authenticated': la app llama a estas tres
-- funciones vía /rest/v1/rpc/ dentro del flujo autenticado
-- (middleware, onboarding). Eliminar ese acceso rompería la app.
--
-- El aviso [0029] authenticated_security_definer_function_executable
-- se deja intencionalmente: es el comportamiento esperado.
-- ============================================================

revoke execute on function public.get_my_role()                    from anon;
revoke execute on function public.get_my_account_status()          from anon;
revoke execute on function public.assign_my_role(p_role text)      from anon;
