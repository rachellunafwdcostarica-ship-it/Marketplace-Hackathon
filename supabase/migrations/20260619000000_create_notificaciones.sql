-- ─────────────────────────────────────────────────────────────────────────────
-- Migración: Tabla de notificaciones para el panel de administración (FWD)
-- Fecha: 2026-06-19
-- ─────────────────────────────────────────────────────────────────────────────

-- Enum de tipos de notificación
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_notificacion_enum') THEN
    CREATE TYPE public.tipo_notificacion_enum AS ENUM (
      'STRIKE',
      'REGISTRO_USUARIO',
      'REGISTRO_EMPRESA',
      'VALIDACION',
      'SISTEMA'
    );
  END IF;
END;
$$;

-- Tabla principal de notificaciones
CREATE TABLE IF NOT EXISTS public.notificaciones (
  id_notificacion UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Si id_usuario_destino es NULL, la notificación es para todos los admins
  id_usuario_destino UUID REFERENCES public.usuarios(id_usuario) ON DELETE CASCADE,
  titulo VARCHAR(150) NOT NULL,
  mensaje TEXT NOT NULL,
  tipo public.tipo_notificacion_enum NOT NULL DEFAULT 'SISTEMA',
  leido BOOLEAN NOT NULL DEFAULT FALSE,
  enlace_accion VARCHAR(300) DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Índices para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_notificaciones_destino_leido
  ON public.notificaciones (id_usuario_destino, leido);

CREATE INDEX IF NOT EXISTS idx_notificaciones_created_at
  ON public.notificaciones (created_at DESC);

-- ─── Políticas RLS ────────────────────────────────────────────────────────────

ALTER TABLE public.notificaciones ENABLE ROW LEVEL SECURITY;

-- Los administradores pueden leer TODAS las notificaciones (globales o propias)
CREATE POLICY "admins_can_read_notifications"
  ON public.notificaciones
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.usuarios u
      JOIN public.roles r ON r.id_rol = u.id_rol
      WHERE u.id_usuario = auth.uid()
        AND r.nombre_rol = 'administrador'
    )
  );

-- Solo el service_role puede insertar/actualizar (server actions con admin client)
CREATE POLICY "service_role_can_manage_notifications"
  ON public.notificaciones
  FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);
