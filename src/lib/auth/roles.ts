import type { UserRole } from '@/types'

/**
 * Ruta home por rol — fuente única de verdad.
 * Usada en middleware, callbacks y layouts.
 */
export const ROLE_HOME: Record<UserRole, string> = {
  junior: '/junior',
  empresa: '/empresario',
  admin: '/admin',
}

/**
 * Convierte el nombre_rol de la BD (modelo XXI) al UserRole del frontend.
 *
 * La BD almacena 'egresado' pero la ruta/UI usa 'junior';
 * 'empresario' mapea a 'empresa' y 'administrador' a 'admin'.
 * Cualquier valor desconocido retorna null (sin home propio).
 */
export function normalizeRole(
  dbRole: string | null | undefined,
): UserRole | null {
  if (!dbRole) return null
  if (dbRole === 'egresado') return 'junior'
  if (dbRole === 'empresario') return 'empresa'
  if (dbRole === 'administrador') return 'admin'
  return null
}

/**
 * Convierte el UserRole del frontend al nombre_rol de la BD (modelo XXI).
 * Inversa de normalizeRole. La traducción frontend→BD vive únicamente aquí.
 */
export function toDbRole(role: UserRole): string {
  if (role === 'junior') return 'egresado'
  if (role === 'empresa') return 'empresario'
  return 'administrador'
}
