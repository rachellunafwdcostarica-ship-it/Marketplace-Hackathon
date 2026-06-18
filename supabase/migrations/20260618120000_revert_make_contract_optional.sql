-- ============================================================
-- MIGRACIÓN 20260618000000 — Revertir make_contract_optional
-- Fecha: 2026-06-18
--
-- Restaura el estado de seguridad original definido en
-- 20260617000000_evaluaciones_empresarios.sql, deshaciendo
-- los cambios de 20260617130000_make_contract_optional.sql:
--   1. RLS: restaura AND EXISTS (contrato + participación + finalizado)
--   2. Datos: elimina filas con id_contratacion IS NULL (ilegítimas)
--   3. Constraints: revierte a uq_contratacion_estudiante
--   4. Columna: restaura NOT NULL en id_contratacion
-- ============================================================

-- 1. Restaurar RLS con vínculo contractual obligatorio y estado 'finalizado'
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

-- 2. Eliminar filas sin vínculo contractual (id_contratacion IS NULL)
--    Estas filas son ilegítimas: fueron insertadas mientras la RLS de
--    20260617130000 estaba activa sin validación de contrato.
DELETE FROM public.evaluaciones_empresarios WHERE id_contratacion IS NULL;

-- 3. Revertir constraints
ALTER TABLE public.evaluaciones_empresarios
  DROP CONSTRAINT IF EXISTS uq_estudiante_empresario;

ALTER TABLE public.evaluaciones_empresarios
  ADD CONSTRAINT uq_contratacion_estudiante UNIQUE (id_contratacion, id_estudiante);

-- 4. Restaurar NOT NULL en id_contratacion
ALTER TABLE public.evaluaciones_empresarios
  ALTER COLUMN id_contratacion SET NOT NULL;
