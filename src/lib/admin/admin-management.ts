/**
 * Reglas puras de gestión de administradores (registro y baja).
 *
 * Se aíslan de las server actions para poder testearlas con Vitest sin tocar la
 * BD ni Supabase Auth. Las actions invocan estas funciones tras resolver los
 * datos reales (niveles, fechas, conteos).
 *
 * Decisiones de producto (confirmadas con el equipo):
 *  - Solo un superadmin registra administradores; el nivel `moderador` no se
 *    ofrece en la UI (se mantiene en el enum por si se reactiva en el futuro).
 *  - Solo un superadmin puede desactivar/reactivar a un administrador.
 *  - Un superadmin puede desactivar a otro superadmin únicamente si el objetivo
 *    tiene `fecha_registro` POSTERIOR (es más nuevo). El superadmin más antiguo
 *    queda inamovible por UI (a propósito: cuenta raíz protegida).
 *  - Nunca se desactiva al último superadmin activo.
 */

export type NivelAdmin = 'superadmin' | 'admin' | 'moderador'

/** Niveles que un superadmin puede asignar al registrar (excluye `moderador`). */
export const NIVELES_ADMIN_ASIGNABLES = ['superadmin', 'admin'] as const
export type NivelAdminAsignable = (typeof NIVELES_ADMIN_ASIGNABLES)[number]

export type AdminMgmtAction = 'deactivate' | 'reactivate'

export type AdminMgmtVerdict =
  | { allowed: true }
  | {
      allowed: false
      reason: 'requires_superadmin' | 'seniority' | 'last_superadmin'
    }

interface EvaluateAdminManagementParams {
  action: AdminMgmtAction
  actorNivel: NivelAdmin | null
  actorFechaRegistro: string
  targetNivel: NivelAdmin | null
  targetFechaRegistro: string
  /** Cantidad de superadmins con is_active = true (incluye al objetivo). */
  activeSuperadminCount: number
}

/**
 * Decide si `actor` puede desactivar/reactivar a un administrador objetivo.
 * Asume que el objetivo ES un administrador (rol = 'administrador'); la action
 * que la invoca debe filtrar antes a los usuarios que no son admin.
 */
export function evaluateAdminManagement(
  params: EvaluateAdminManagementParams,
): AdminMgmtVerdict {
  if (params.actorNivel !== 'superadmin') {
    return { allowed: false, reason: 'requires_superadmin' }
  }

  if (params.targetNivel === 'superadmin') {
    const targetNewer =
      new Date(params.targetFechaRegistro).getTime() >
      new Date(params.actorFechaRegistro).getTime()
    if (!targetNewer) {
      return { allowed: false, reason: 'seniority' }
    }
    if (params.action === 'deactivate' && params.activeSuperadminCount <= 1) {
      return { allowed: false, reason: 'last_superadmin' }
    }
  }

  return { allowed: true }
}

/**
 * Versión liviana para la UI: ¿mostrar los botones de desactivar/reactivar
 * sobre la fila de un admin? Ignora el guard del "último superadmin" (lo valida
 * el backend con el conteo real y devuelve un toast si aplica).
 */
export function canManageAdminInUi(params: {
  actorNivel: NivelAdmin | null
  actorFechaRegistro: string
  targetNivel: NivelAdmin | null
  targetFechaRegistro: string
}): boolean {
  return evaluateAdminManagement({
    action: 'reactivate',
    actorNivel: params.actorNivel,
    actorFechaRegistro: params.actorFechaRegistro,
    targetNivel: params.targetNivel,
    targetFechaRegistro: params.targetFechaRegistro,
    activeSuperadminCount: Number.MAX_SAFE_INTEGER,
  }).allowed
}
