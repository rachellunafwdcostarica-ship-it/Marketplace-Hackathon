-- ============================================================
-- UNIQUE (id_contratacion, version) en entregables (RF-42)
-- ------------------------------------------------------------
-- La versión de cada entregable se calcula en la app como max(version)+1 por
-- contratación (read-then-insert NO atómico): dos subidas casi simultáneas del
-- mismo egresado podían tomar el mismo número. Este constraint garantiza la
-- secuencia a nivel BD; la server action `registrarEntregable` reintenta una vez
-- ante violación única (23505).
--
-- Esquema GLOBAL por contratación (no por tipo): una sola secuencia que mezcla
-- 'parcial' y 'final', que es exactamente lo que la app ya calcula.
-- Seguro de aplicar: la tabla no tiene datos productivos (0 filas al crear).
-- ============================================================

alter table public.entregables
  add constraint entregables_contratacion_version_key unique (id_contratacion, version);
