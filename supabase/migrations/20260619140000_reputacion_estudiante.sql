-- ============================================================
-- MIGRACIÓN 20260619140000 — Trigger de reputación del estudiante (RF-51)
-- Fecha: 2026-06-19
-- ============================================================
-- Empareja la reputación del estudiante con la del empresario. Hasta ahora
-- `estudiantes.reputacion` existía como columna (20260608000001) pero nada la
-- calculaba. Crea la función y el trigger que recalculan el promedio de
-- `puntuacion` sobre `evaluaciones` (empresario -> estudiante, RF-49), de forma
-- simétrica a `recalcular_reputacion_empresario` sobre `evaluaciones_empresarios`.
--
-- Convención de reputación: NULL = sin evaluaciones todavía (distingue al usuario
-- nuevo del que tiene mala nota); un valor en [1.00, 5.00] = promedio real. Por
-- eso la función NO usa COALESCE: si no hay evaluaciones, AVG devuelve NULL.
--
-- Idempotente: CREATE OR REPLACE FUNCTION + DROP TRIGGER IF EXISTS.
-- ============================================================

CREATE OR REPLACE FUNCTION public.recalcular_reputacion_estudiante()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.estudiantes
  SET reputacion = (
    SELECT ROUND(AVG(puntuacion)::NUMERIC, 2)
    FROM public.evaluaciones
    WHERE id_estudiante = NEW.id_estudiante
  )
  WHERE id_estudiante = NEW.id_estudiante;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reputacion_estudiante ON public.evaluaciones;
CREATE TRIGGER trg_reputacion_estudiante
  AFTER INSERT OR UPDATE OF puntuacion ON public.evaluaciones
  FOR EACH ROW EXECUTE FUNCTION public.recalcular_reputacion_estudiante();

-- La función solo debe ejecutarse vía trigger, no por llamada directa.
REVOKE EXECUTE ON FUNCTION public.recalcular_reputacion_estudiante()
  FROM public, anon, authenticated;
