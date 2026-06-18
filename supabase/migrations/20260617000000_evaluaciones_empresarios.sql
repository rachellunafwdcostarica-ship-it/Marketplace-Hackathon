-- ============================================================
-- MIGRACIÓN 20260617000000 — Sistema de Calificación de Empresarios
-- Fecha: 2026-06-17
-- Autor: Antigravity
--
-- Agrega soporte para que los egresados califiquen a los empresarios:
--   1. Añade columna 'reputacion' a 'empresarios'.
--   2. Crea la tabla 'evaluaciones_empresarios' para valoraciones.
--   3. Establece trigger para recalcular la reputación promedio.
--   4. Implementa políticas RLS seguras.
-- ============================================================

-- 1. Añadir columna 'reputacion' a 'empresarios' si no existe
ALTER TABLE public.empresarios 
  ADD COLUMN IF NOT EXISTS reputacion DECIMAL(3,2) DEFAULT 0.00;

-- 2. Crear la tabla de evaluaciones
CREATE TABLE IF NOT EXISTS public.evaluaciones_empresarios (
  id_evaluacion   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_contratacion UUID NOT NULL REFERENCES public.contrataciones(id_contratacion) ON DELETE CASCADE,
  id_estudiante   UUID NOT NULL REFERENCES public.estudiantes(id_estudiante) ON DELETE CASCADE,
  id_empresario   UUID NOT NULL REFERENCES public.empresarios(id_empresario) ON DELETE CASCADE,
  puntuacion      INT NOT NULL CHECK (puntuacion BETWEEN 1 AND 5),
  comentario      TEXT,
  evaluado_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_contratacion_estudiante UNIQUE (id_contratacion, id_estudiante)
);

-- 3. Crear índices para optimizar las políticas y consultas
CREATE INDEX IF NOT EXISTS idx_evaluaciones_emp_id_empresario
  ON public.evaluaciones_empresarios(id_empresario);
CREATE INDEX IF NOT EXISTS idx_evaluaciones_emp_id_contratacion
  ON public.evaluaciones_empresarios(id_contratacion);

-- 4. Crear función para recalcular la reputación del empresario
CREATE OR REPLACE FUNCTION public.recalcular_reputacion_empresario()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.empresarios
  SET reputacion = COALESCE(
    (SELECT ROUND(AVG(puntuacion)::NUMERIC, 2) 
     FROM public.evaluaciones_empresarios 
     WHERE id_empresario = NEW.id_empresario),
    0.00
  )
  WHERE id_empresario = NEW.id_empresario;
  RETURN NEW;
END;
$$;

-- 5. Crear trigger para recalcular reputación automáticamente
DROP TRIGGER IF EXISTS trg_reputacion_empresario ON public.evaluaciones_empresarios;
CREATE TRIGGER trg_reputacion_empresario
  AFTER INSERT OR UPDATE OF puntuacion ON public.evaluaciones_empresarios
  FOR EACH ROW EXECUTE FUNCTION public.recalcular_reputacion_empresario();

-- Revocar ejecución pública de la función
REVOKE EXECUTE ON FUNCTION public.recalcular_reputacion_empresario()
  FROM public, anon, authenticated;

-- 6. Habilitar RLS
ALTER TABLE public.evaluaciones_empresarios ENABLE ROW LEVEL SECURITY;

-- 7. Crear políticas RLS
-- Select: Cualquier usuario autenticado puede ver las calificaciones
DROP POLICY IF EXISTS "evaluaciones_empresarios_select" ON public.evaluaciones_empresarios;
CREATE POLICY "evaluaciones_empresarios_select"
  ON public.evaluaciones_empresarios FOR SELECT
  TO authenticated
  USING (true);

-- Insert: Solo el estudiante contratado puede calificar una contratación finalizada
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
