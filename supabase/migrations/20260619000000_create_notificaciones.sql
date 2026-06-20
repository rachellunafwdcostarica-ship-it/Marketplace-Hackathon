-- ============================================================
-- MIGRACIÓN 20260619000000 — Recrear notificaciones
-- Fecha: 2026-06-19
-- ============================================================
-- La tabla public.notificaciones fue eliminada manualmente de la base (fuera
-- del control de migraciones), quedando en drift respecto al historial. Como
-- 20260608000001_initial_schema ya figura como aplicada, db push no la
-- re-ejecuta; por eso se recrea aquí.
--
-- Estructura idéntica al initial_schema. Idempotente: CREATE TABLE IF NOT EXISTS
-- + DROP POLICY IF EXISTS.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.notificaciones (
  id_notificacion uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  id_usuario      uuid         NOT NULL REFERENCES public.usuarios(id_usuario) ON DELETE CASCADE,
  tipo_evento     public.tipo_notificacion_enum NOT NULL,
  mensaje         varchar(255) NOT NULL,
  url_destino     varchar(255),
  leida           boolean      NOT NULL DEFAULT false,
  generada_at     timestamptz  NOT NULL DEFAULT now()
);

ALTER TABLE public.notificaciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notificaciones_select_own" ON public.notificaciones;
CREATE POLICY "notificaciones_select_own"
  ON public.notificaciones FOR SELECT
  TO authenticated
  USING (id_usuario = (SELECT auth.uid()));

DROP POLICY IF EXISTS "notificaciones_update_own" ON public.notificaciones;
CREATE POLICY "notificaciones_update_own"
  ON public.notificaciones FOR UPDATE
  TO authenticated
  USING (id_usuario = (SELECT auth.uid()))
  WITH CHECK (id_usuario = (SELECT auth.uid()));
