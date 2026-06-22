-- ============================================================
-- MIGRACIÓN 20260619140500 — Restringir calificación a estado finalizado
-- Fecha: 2026-06-19
-- ============================================================
-- Revierte la apertura de 20260617120000 (vigente + finalizado) y deja la
-- política de INSERT en evaluaciones_empresarios restringida a 'finalizado'
-- únicamente, alineada con RF-49 del SRS.
-- Idempotente: DROP POLICY IF EXISTS + CREATE POLICY.
-- ============================================================

DROP POLICY IF EXISTS "evaluaciones_empresarios_insert_estudiante" ON public.evaluaciones_empresarios;
CREATE POLICY "evaluaciones_empresarios_insert_estudiante"
  ON public.evaluaciones_empresarios FOR INSERT
  TO authenticated
  WITH CHECK (
    id_estudiante IN (
      SELECT id_estudiante FROM public.estudiantes WHERE id_usuario = (SELECT auth.uid())
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
