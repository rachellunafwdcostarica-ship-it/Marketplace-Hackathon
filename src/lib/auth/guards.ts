import 'server-only'
import { ok, err, type Result } from '@/lib/result'
import { getUserRole } from '@/lib/auth/queries'
import { getCurrentUser } from '@/lib/auth/dal'
import { normalizeRole } from '@/lib/auth/roles'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'
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

/**
 * Garantiza que el egresado autenticado esté VERIFICADO por un admin (RF-64).
 *
 * Reúne en un solo lugar el patrón que antes se repetía a mano (`postularse`):
 * rol `egresado` + `estado_verificacion = 'verificado'`. Devuelve el
 * `id_estudiante` ya resuelto para que la action no repita el query.
 *
 * - `err('cuenta_no_verificada')` si el perfil todavía no está verificado.
 * - `err('estudiante_not_found')` si no existe la fila de estudiante.
 *
 * Es defensa en profundidad: la RLS ya exige verificación, pero validar acá
 * falla-seguro y permite devolver un error amigable en vez de un rechazo crudo
 * de la base. Conviene invocarlo ANTES de trabajo costoso (subir al Storage).
 */
export async function requireVerifiedEgresado(): Promise<
  Result<{ id_estudiante: string; id_usuario: string }>
> {
  const roleResult = await requireRole('egresado')
  if (!roleResult.ok) return roleResult

  const user = await getCurrentUser()
  if (!user) return err('unauthenticated')

  const supabase = await createSupabaseServerClient()
  const { data: estudiante, error } = await supabase
    .from('estudiantes')
    .select('id_estudiante, estado_verificacion')
    .eq('id_usuario', user.id)
    .single()

  if (error || !estudiante) return err('estudiante_not_found')
  if (estudiante.estado_verificacion !== 'verificado') {
    return err('cuenta_no_verificada')
  }

  return ok({ id_estudiante: estudiante.id_estudiante, id_usuario: user.id })
}

/**
 * Garantiza que el empresario autenticado esté VERIFICADO por un admin (RF-17).
 *
 * Equivalente a `requireVerifiedEgresado` para el lado empresa: rol
 * `empresario` + `estado_verificacion = 'verificado'`, devolviendo el
 * `id_empresario` ya resuelto. Mantiene el err code `'not_verified'` que ya usa
 * `publishProject`, para no introducir un tercer vocabulario.
 *
 * - `err('not_verified')` si el perfil todavía no está verificado.
 * - `err('empresario_no_encontrado')` si no existe la fila de empresario.
 */
export async function requireVerifiedEmpresario(): Promise<
  Result<{ id_empresario: string; id_usuario: string }>
> {
  const roleResult = await requireRole('empresario')
  if (!roleResult.ok) return roleResult

  const user = await getCurrentUser()
  if (!user) return err('unauthenticated')

  const supabase = await createSupabaseServerClient()
  const { data: empresario, error } = await supabase
    .from('empresarios')
    .select('id_empresario, estado_verificacion')
    .eq('id_usuario', user.id)
    .maybeSingle()

  if (error || !empresario) return err('empresario_no_encontrado')
  if (empresario.estado_verificacion !== 'verificado') {
    return err('not_verified')
  }

  return ok({ id_empresario: empresario.id_empresario, id_usuario: user.id })
}
