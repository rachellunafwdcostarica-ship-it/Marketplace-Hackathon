import type { UserRole } from '@/types'

/**
 * Ruta home por rol — fuente única de verdad.
 * Usada en middleware, callbacks y layouts.
 *
 * Nota: las URL siguen siendo /junior y /empresario por decisión de equipo
 * (cambiarlas rompería bookmarks y hrefs existentes). El valor de rol ya
 * coincide con el nombre_rol de la BD (egresado/empresario/administrador).
 */
export const ROLE_HOME: Record<UserRole, string> = {
  egresado: '/junior',
  empresario: '/empresario',
  administrador: '/admin',
}

/**
 * Valida que el nombre_rol recibido de la BD sea un UserRole conocido.
 *
 * El frontend y la BD ahora usan el mismo vocabulario
 * (egresado / empresario / administrador). Esta función descarta valores
 * nulos o desconocidos y devuelve el tipo correcto — ya no hace traducción.
 */
export function normalizeRole(
  dbRole: string | null | undefined,
): UserRole | null {
  if (!dbRole) return null
  if (dbRole === 'egresado') return 'egresado'
  if (dbRole === 'empresario') return 'empresario'
  if (dbRole === 'administrador') return 'administrador'
  return null
}
