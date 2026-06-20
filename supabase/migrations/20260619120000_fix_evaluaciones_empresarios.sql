-- ============================================================
-- MIGRACIÓN 20260619120000 — Pulir evaluaciones_empresarios
-- Fecha: 2026-06-19
-- ============================================================
-- Rediseña (in-place) la evaluación estudiante -> empresa para que se comporte
-- como la tabla `evaluaciones` (empresario -> estudiante, del SRS), corrigiendo
-- los defectos de la versión original:
--   1. Faltaba `respuesta_evaluado` (réplica del evaluado, igual que en
--      `evaluaciones`): permite que el empresario responda la valoración.
--   2. La RLS de INSERT llegó a permitir calificar con la contratación 'vigente';
--      debe permitirse SOLO cuando está 'finalizado' (alineado con RF-49).
--   3. La reputación del empresario usaba 0.00 como "sin evaluaciones"; se cambia
--      a NULL para distinguir al empresario nuevo del de mala nota (0.00 además
--      es imposible como promedio real, ya que puntuacion va de 1 a 5).
--
-- La columna `reputacion` de `empresarios` y su trigger `trg_reputacion_empresario`
-- ya existen (20260617000000): el trigger se conserva; aquí solo se redefine el
-- cuerpo de la función para que devuelva NULL sin evaluaciones.
--
-- Idempotente: ADD COLUMN IF NOT EXISTS + DROP POLICY IF EXISTS +
-- CREATE OR REPLACE FUNCTION.
--
-- NOTA SRS: la evaluación estudiante -> empresa es una EXTENSIÓN del SRS (sus RF
-- solo cubren empresario -> estudiante). Documentar en el README (reglas.md §6/§7).
-- ============================================================

-- 1. Réplica del evaluado (espejo de evaluaciones.respuesta_evaluado)
ALTER TABLE public.evaluaciones_empresarios
  ADD COLUMN IF NOT EXISTS respuesta_evaluado text;

-- 2. RLS de INSERT: solo el estudiante contratado y solo con la contratación
--    en estado 'finalizado'.
DROP POLICY IF EXISTS "evaluaciones_empresarios_insert_estudiante" ON public.evaluaciones_empresarios;
CREATE POLICY "evaluaciones_empresarios_insert_estudiante"
  ON public.evaluaciones_empresarios FOR INSERT
  TO authenticated
  WITH CHECK (
    id_estudiante IN (
      SELECT id_estudiante FROM public.estudiantes WHERE id_usuario = (select auth.uid())
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

-- 3. Reputación del empresario: NULL = sin evaluaciones (coherente con el
--    estudiante). Se quita el COALESCE a 0.00, el DEFAULT 0.00 y se normalizan
--    los 0.00 existentes (centinela, no promedio real) a NULL.
CREATE OR REPLACE FUNCTION public.recalcular_reputacion_empresario()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.empresarios
  SET reputacion = (
    SELECT ROUND(AVG(puntuacion)::NUMERIC, 2)
    FROM public.evaluaciones_empresarios
    WHERE id_empresario = NEW.id_empresario
  )
  WHERE id_empresario = NEW.id_empresario;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.recalcular_reputacion_empresario()
  FROM public, anon, authenticated;

ALTER TABLE public.empresarios ALTER COLUMN reputacion DROP DEFAULT;
UPDATE public.empresarios SET reputacion = NULL WHERE reputacion = 0.00;
