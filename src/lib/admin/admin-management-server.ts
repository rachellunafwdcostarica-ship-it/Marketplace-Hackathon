import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type { NivelAdmin } from './admin-management'

export interface AdminTargetContext {
  targetExists: boolean
  targetIsAdmin: boolean
  targetNivel: NivelAdmin | null
  targetFechaRegistro: string | null
  actorNivel: NivelAdmin | null
  actorFechaRegistro: string | null
  /** Superadmins con is_active = true (para el guard del "último superadmin"). */
  activeSuperadminCount: number
}

function extractNombreRol(
  roles: { nombre_rol: string } | { nombre_rol: string }[] | null,
): string | null {
  if (!roles) return null
  return Array.isArray(roles)
    ? (roles[0]?.nombre_rol ?? null)
    : roles.nombre_rol
}

/**
 * Reúne los datos que necesita `evaluateAdminManagement` para decidir si un
 * actor puede desactivar/reactivar a un usuario objetivo: niveles y fechas de
 * ambos, si el objetivo es administrador, y cuántos superadmins activos hay.
 *
 * Usa el cliente de servicio que le pasa la action (ya gateada por rol).
 */
export async function resolveAdminTargetContext(
  adminClient: SupabaseClient<Database>,
  actorId: string,
  targetId: string,
): Promise<AdminTargetContext> {
  const { data: rows } = await adminClient
    .from('usuarios')
    .select('id_usuario, nivel_admin, fecha_registro, roles(nombre_rol)')
    .in('id_usuario', [actorId, targetId])

  const actorRow = rows?.find((r) => r.id_usuario === actorId) ?? null
  const targetRow = rows?.find((r) => r.id_usuario === targetId) ?? null

  const { count } = await adminClient
    .from('usuarios')
    .select('id_usuario', { count: 'exact', head: true })
    .eq('nivel_admin', 'superadmin')
    .eq('is_active', true)

  return {
    targetExists: targetRow !== null,
    targetIsAdmin:
      extractNombreRol(targetRow?.roles ?? null) === 'administrador',
    targetNivel: (targetRow?.nivel_admin as NivelAdmin | null) ?? null,
    targetFechaRegistro: targetRow?.fecha_registro ?? null,
    actorNivel: (actorRow?.nivel_admin as NivelAdmin | null) ?? null,
    actorFechaRegistro: actorRow?.fecha_registro ?? null,
    activeSuperadminCount: count ?? 0,
  }
}
