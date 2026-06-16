import 'server-only'
import { ok, err, type Result } from '@/lib/result'
import { getUserRole } from '@/lib/auth/queries'
import { normalizeRole } from '@/lib/auth/roles'
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
