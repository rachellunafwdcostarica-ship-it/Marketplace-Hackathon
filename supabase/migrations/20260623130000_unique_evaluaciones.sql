-- ============================================================
-- MIGRACIÓN 20260623120000 — Correcciones de RLS en evaluaciones (RF-49, RF-53)
-- Fecha: 2026-06-23
-- ============================================================
-- 1. UNIQUE constraint: un empresario solo puede calificar una vez
--    por contratación (equivalente a la restricción en evaluaciones_empresarios).
-- 2. Amplía el SELECT para que el egresado evaluado pueda leer su propia nota.
-- 3. Agrega política UPDATE restringida a respuesta_evaluado para que el
--    egresado pueda ejercer su réplica (RF-53, prioridad C).
-- ============================================================

-- 1. Constraint de unicidad
ALTER TABLE public.evaluaciones
  ADD CONSTRAINT uq_evaluaciones_contratacion_empresario
  UNIQUE (id_contratacion, id_empresario);

-- 2. SELECT — empresario ve las suyas, egresado ve las recibidas
DROP POLICY IF EXISTS "evaluaciones_select" ON public.evaluaciones;
CREATE POLICY "evaluaciones_select"
  ON public.evaluaciones FOR SELECT
  USING (
    id_empresario IN (
      SELECT id_empresario FROM public.empresarios
      WHERE id_usuario = (SELECT auth.uid())
    )
    OR
    id_estudiante IN (
      SELECT id_estudiante FROM public.estudiantes
      WHERE id_usuario = (SELECT auth.uid())
    )
  );

-- 3. UPDATE — solo el egresado evaluado puede escribir su respuesta (RF-53)
DROP POLICY IF EXISTS "evaluaciones_update_respuesta" ON public.evaluaciones;
CREATE POLICY "evaluaciones_update_respuesta"
  ON public.evaluaciones FOR UPDATE
  USING (
    id_estudiante IN (
      SELECT id_estudiante FROM public.estudiantes
      WHERE id_usuario = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    id_estudiante IN (
      SELECT id_estudiante FROM public.estudiantes
      WHERE id_usuario = (SELECT auth.uid())
    )
  );
