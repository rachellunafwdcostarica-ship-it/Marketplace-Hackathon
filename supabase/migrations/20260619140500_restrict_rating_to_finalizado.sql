-- ============================================================
-- MIGRACIÓN 20260619140500 — Restringir Calificaciones a Periodo Finalizado
-- Fecha: 2026-06-19
-- Autor: Antigravity
--
-- Restringe la política RLS de evaluaciones_empresarios para permitir calificar
-- únicamente cuando el estado del periodo de contratación es 'finalizado' (RF-49).
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
        AND c.estado_periodo = 'finalizado'
    )
  );
