-- ============================================================
-- MIGRACIÓN 20260609204156 — add_comentario_empresario_entregable
-- ============================================================
-- ⚠️ NOTA DE RECONCILIACIÓN (Samir, 2026-06-10)
--
-- Esta migración fue aplicada DIRECTAMENTE a la base remota
-- (mgowuyflhiavquztxpqh) por otra persona del equipo, sin commitear
-- el archivo. Quedó registrada en supabase_migrations.schema_migrations
-- pero NO estaba en supabase/migrations/. Se recupera aquí para que
-- el historial local refleje el remoto.
--
-- Dominio: `entregables` pertenece a Santiago (A3 — postulaciones/
-- entregables) y a Errol (A4 — revisión empresario). NO es de A1.
--
-- ⚠️ DISCREPANCIA DETECTADA: la migración está registrada en el
-- historial, pero la columna `comentario_empresario` NO existe
-- físicamente en `entregables` en el remoto (verificado 2026-06-10).
-- Santiago/Errol deben decidir si materializarla. El SQL de abajo es
-- idempotente (IF NOT EXISTS), así que re-aplicarlo es seguro.
-- ============================================================

-- Comentario del empresario al solicitar cambios en un entregable (Página 14)
ALTER TABLE entregables
  ADD COLUMN IF NOT EXISTS comentario_empresario TEXT;
