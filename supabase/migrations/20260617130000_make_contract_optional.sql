-- ============================================================
-- MIGRACIÓN 20260617130000 — Hacer Contrato Opcional en Calificaciones
-- Fecha: 2026-06-17
-- Autor: Antigravity
--
-- Hace que el campo id_contratacion sea opcional (nullable), agrega una
-- restricción única de un único rating por egresado por empresa, y actualiza RLS.
-- ============================================================

-- 1. Quitar restricción NOT NULL de id_contratacion
ALTER TABLE public.evaluaciones_empresarios 
  ALTER COLUMN id_contratacion DROP NOT NULL;

-- 2. Quitar restricción única anterior (contrato, estudiante)
ALTER TABLE public.evaluaciones_empresarios 
  DROP CONSTRAINT IF EXISTS uq_contratacion_estudiante;

-- 3. Crear restricción única (estudiante, empresario) para garantizar una calificación máxima por empresa
ALTER TABLE public.evaluaciones_empresarios 
  ADD CONSTRAINT uq_estudiante_empresario UNIQUE (id_estudiante, id_empresario);

-- 4. Actualizar RLS Policy
DROP POLICY IF EXISTS "evaluaciones_empresarios_insert_estudiante" ON public.evaluaciones_empresarios;
CREATE POLICY "evaluaciones_empresarios_insert_estudiante"
  ON public.evaluaciones_empresarios FOR INSERT
  TO authenticated
  WITH CHECK (
    id_estudiante IN (
      SELECT id_estudiante FROM public.estudiantes WHERE id_usuario = auth.uid()
    )
  );
