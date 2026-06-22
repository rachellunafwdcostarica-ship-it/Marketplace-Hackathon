import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { ok, err, type Result } from '@/lib/result'
import { logger } from '@/lib/logger'
import type { SignUpInput } from './schemas'

type AdminClient = SupabaseClient<Database>

/**
 * Asigna el rol y crea la fila de perfil (`estudiantes`/`empresarios`) del
 * usuario recién registrado, usando el cliente admin (service_role).
 *
 * Reemplaza a `assign_my_role` en el registro por contraseña (Camino A), donde
 * todavía no hay sesión y `auth.uid()` no aplica. El `estado_verificacion`
 * arranca 'pendiente' (lo refuerza el guard BEFORE INSERT de BD); la
 * verificación la hace el admin (RF-64 / RF-17).
 */
export async function crearPerfilUsuario(
  admin: AdminClient,
  userId: string,
  input: SignUpInput,
): Promise<Result<void>> {
  // Resolver id_rol desde el catálogo (mismo vocabulario que nombre_rol).
  const { data: rol, error: rolError } = await admin
    .from('roles')
    .select('id_rol')
    .eq('nombre_rol', input.role)
    .maybeSingle()

  if (rolError || !rol) {
    logger.error('crearPerfilUsuario: rol no encontrado', {
      error: rolError?.message,
      role: input.role,
    })
    return err('role_not_found')
  }

  const { error: usuarioError } = await admin
    .from('usuarios')
    .update({ id_rol: rol.id_rol })
    .eq('id_usuario', userId)

  if (usuarioError) {
    logger.error('crearPerfilUsuario: fallo al asignar rol', {
      error: usuarioError.message,
    })
    return err(usuarioError.message)
  }

  if (input.role === 'egresado') {
    const { error: estudianteError } = await admin.from('estudiantes').insert({
      id_usuario: userId,
      titulo_fwd: input.tituloFwd,
    })
    if (estudianteError) {
      logger.error('crearPerfilUsuario: fallo al crear estudiante', {
        error: estudianteError.message,
      })
      return err(estudianteError.message)
    }
    return ok(undefined)
  }

  const { error: empresarioError } = await admin.from('empresarios').insert({
    id_usuario: userId,
    tipo_empresario: input.tipoEmpresario,
    nombre_empresa: input.nombreEmpresa,
    cedula: input.cedula,
    sitio_web: input.sitioWeb ? input.sitioWeb : null,
  })
  if (empresarioError) {
    logger.error('crearPerfilUsuario: fallo al crear empresario', {
      error: empresarioError.message,
    })
    return err(empresarioError.message)
  }

  return ok(undefined)
}
