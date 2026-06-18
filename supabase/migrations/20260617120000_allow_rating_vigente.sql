-- ============================================================
-- MIGRACIÓN 20260617120000 — Permitir Calificaciones en Periodo Vigente
-- Fecha: 2026-06-17
-- Autor: Antigravity
--
-- Actualiza la política RLS de evaluaciones_empresarios para permitir calificar
-- tanto en estado 'vigente' como 'finalizado'.
-- ============================================================

DROP POLICY IF EXISTS "evaluaciones_empresarios_insert_estudiante" ON public.evaluaciones_empresarios;
CREATE POLICY "evaluaciones_empresarios_insert_estudiante"
  ON public.evaluaciones_empresarios FOR INSERT
  TO authenticated
  WITH CHECK (
    id_estudiante IN (
      SELECT id_estudiante FROM public.estudiantes WHERE id_usuario = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM public.contrataciones c
      JOIN public.participaciones pa ON pa.id_participacion = c.id_participacion
      WHERE c.id_contratacion = evaluaciones_empresarios.id_contratacion
        AND pa.id_estudiante = evaluaciones_empresarios.id_estudiante
        AND c.estado_periodo IN ('vigente', 'finalizado')
    )
  );
