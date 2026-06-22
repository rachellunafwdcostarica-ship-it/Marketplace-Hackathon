-- Crear tabla oficial de egresados FWD para validación interna
CREATE TABLE public.egresados_fwd_oficial (
    correo text PRIMARY KEY,
    fecha_agregado timestamp with time zone DEFAULT now() NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.egresados_fwd_oficial ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
-- Solo los administradores activos pueden consultar o modificar esta tabla

CREATE POLICY "egresados_fwd_oficial_select_admin"
    ON public.egresados_fwd_oficial
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.usuarios
            WHERE usuarios.id_usuario = auth.uid()
              AND usuarios.is_active = true
              AND EXISTS (
                  SELECT 1 FROM public.roles
                  WHERE roles.id_rol = usuarios.id_rol
                    AND roles.nombre_rol = 'administrador'
              )
        )
    );

CREATE POLICY "egresados_fwd_oficial_all_admin"
    ON public.egresados_fwd_oficial
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.usuarios
            WHERE usuarios.id_usuario = auth.uid()
              AND usuarios.is_active = true
              AND EXISTS (
                  SELECT 1 FROM public.roles
                  WHERE roles.id_rol = usuarios.id_rol
                    AND roles.nombre_rol = 'administrador'
              )
        )
    );

-- Datos semilla iniciales (opcional)
INSERT INTO public.egresados_fwd_oficial (correo) VALUES ('test-egresado@example.com') ON CONFLICT DO NOTHING;
