-- ============================================================
-- conversaciones_ia.logistica — Corte 1 (Pantalla 1, flujo paso 2)
-- ------------------------------------------------------------
-- Agrega la columna donde se persiste la LOGÍSTICA que el empresario
-- llena en la Pantalla 1 (modalidad, moneda, presupuestos, fecha_cierre,
-- país/ciudad) ANTES de publicar. Persistirla acá permite retomar la
-- conversación completa tras una recarga (errolpendiente.md §1 paso 2, §2, §3).
--
-- Aditiva, nullable, no destructiva: no toca datos existentes y ninguna
-- página lee aún esta columna. Al publicar (Corte 4) alimenta proyectos.
--
-- IF NOT EXISTS: idempotente, seguro de re-ejecutar desde el SQL Editor.
--
-- NOTA: esta es la 1ra parte del split de §0. El rename usa_ia -> involucra_ia
-- y la columna generado_por_ia van en una migración aparte (Corte 4, deuda).
-- ============================================================

alter table public.conversaciones_ia
  add column if not exists logistica jsonb;
