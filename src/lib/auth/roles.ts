import type { UserRole } from '@/types'

/**
 * Ruta home por rol — fuente única de verdad.
 * Usada en middleware, callbacks y layouts.
 */
export const ROLE_HOME: Record<UserRole, string> = {
  junior: '/junior',
  empresa: '/empresa',
  admin: '/admin',
}

/**
 * Convierte el nombre_rol de la BD al UserRole del frontend.
 *
 * La BD almacena 'empresario' pero la ruta/UI usa 'empresa'.
 * 'moderador' y cualquier valor desconocido retornan null (sin home propio).
 */
export function normalizeRole(
  dbRole: string | null | undefined,
): UserRole | null {
  if (!dbRole) return null
  if (dbRole === 'junior') return 'junior'
  if (dbRole === 'empresario') return 'empresa'
  if (dbRole === 'admin') return 'admin'
  return null
}
