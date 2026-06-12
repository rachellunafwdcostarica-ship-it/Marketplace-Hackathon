import { ok, err, type Result } from '@/lib/result'
import { logger } from '@/lib/logger'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { requireRole } from '@/lib/auth/guards'

export interface PendingUser {
  id_usuario: string
  nombre: string
  apellido_1: string
  correo: string
  id_rol: number | null
  estado_cuenta: string
}

/**
 * Devuelve los usuarios con estado_cuenta = 'pendiente'.
 * Solo puede ser llamada por un usuario con rol 'admin'.
 * Usa el cliente de servicio para bypassear RLS.
 */
export async function getPendingUsers(): Promise<Result<PendingUser[]>> {
  // Verificar que el caller es admin (requireRole normaliza 'administrador' → 'admin')
  const authResult = await requireRole('admin')
  if (!authResult.ok) {
    return authResult
  }

  const adminClient = createSupabaseAdminClient()
  const { data, error } = await adminClient
    .from('usuarios')
    .select('id_usuario, nombre, apellido_1, correo, id_rol, estado_cuenta')
    .eq('estado_cuenta', 'pendiente')
    .order('fecha_registro', { ascending: true })

  if (error) {
    logger.error('getPendingUsers failed', { error: error.message })
    return err(error.message)
  }

  return ok((data ?? []) as PendingUser[])
}
