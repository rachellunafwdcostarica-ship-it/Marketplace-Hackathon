import 'server-only'
import { ok, err, type Result } from '@/lib/result'
import { getUserRole } from '@/lib/auth/queries'
import { getCurrentUser } from '@/lib/auth/dal'
import { normalizeRole } from '@/lib/auth/roles'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'
import type { UserRole } from '@/types'

/**
 * Garantiza que el usuario autenticado tenga el rol requerido.
 *
 * Centraliza el check de autorización que antes se repetía a mano en cada
 * server action de admin (approveUser, listUsers, ...).
 *
 * - `err('unauthenticated')` si no hay sesión o el usuario aún no tiene rol.
 * - `err('forbidden')` si el rol no coincide con el requerido.
 * - `ok(role)` con el UserRole normalizado si coincide.
 *
 * El frontend y la BD ahora usan el mismo vocabulario (egresado/empresario/
 * administrador), por lo que no hay traducción: `normalizeRole` solo valida.
 */
export async function requireRole(role: UserRole): Promise<Result<UserRole>> {
  const roleResult = await getUserRole()
  if (!roleResult.ok) {
    return err('unauthenticated')
  }

  const normalized = normalizeRole(roleResult.data)
  if (normalized !== role) {
    return err('forbidden')
  }

  return ok(normalized)
}

export interface SuperadminContext {
  userId: string
  fechaRegistro: string
}

/**
 * Garantiza que el usuario autenticado sea un administrador con
 * `nivel_admin = 'superadmin'`. Es el gate de las acciones de gestión de
 * administradores (registro, baja, reactivación): un `admin` o `moderador`
 * común queda fuera.
 *
 * Devuelve el id y la `fecha_registro` del superadmin para que la action que
 * lo invoca aplique la regla de antigüedad sin volver a consultar.
 *
 * Lee `nivel_admin` con el cliente de servicio (ya gateado por rol arriba): la
 * policy de RLS solo deja al usuario ver su propia fila, y este dato no debe
 * depender de esa sutileza.
 */
export async function requireSuperadmin(): Promise<Result<SuperadminContext>> {
  const roleResult = await requireRole('administrador')
  if (!roleResult.ok) {
    return roleResult
  }

  const user = await getCurrentUser()
  if (!user) {
    return err('unauthenticated')
  }

  const adminClient = createSupabaseAdminClient()
  const { data, error } = await adminClient
    .from('usuarios')
    .select('nivel_admin, fecha_registro')
    .eq('id_usuario', user.id)
    .maybeSingle()

  if (error) {
    logger.error('requireSuperadmin: fallo al leer nivel_admin', {
      error: error.message,
    })
    return err('forbidden')
  }

  if (!data || data.nivel_admin !== 'superadmin') {
    return err('forbidden')
  }

  return ok({ userId: user.id, fechaRegistro: data.fecha_registro })
}
