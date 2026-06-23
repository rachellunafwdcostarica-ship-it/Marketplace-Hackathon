-- ============================================================
-- MIGRACIÓN — Fix lint: search_path mutable en auto_set_estado_entregable_final
-- Fecha: 2026-06-22
--
-- El advisor de seguridad marca `function_search_path_mutable` en esta función.
-- El trigger sólo modifica campos de NEW (no referencia objetos de esquema), así
-- que se fija `search_path = ''` — mismo idioma que `set_updated_at()` y los
-- `guard_*` en 20260610000007. Cierra el lint sin cambiar el comportamiento.
-- ============================================================

alter function public.auto_set_estado_entregable_final() set search_path = '';
