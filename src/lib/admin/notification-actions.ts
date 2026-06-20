'use server'

import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/logger'
import { crearNotificaciones } from '@/lib/notifications/create'
import type { Database } from '@/types/database'

export type TipoEvento = Database['public']['Enums']['tipo_notificacion_enum']

/**
 * Crea una notificación para todos los administradores activos. Se invoca desde
 * acciones del servidor (p. ej. strikes). Resuelve la audiencia (los admins) y
 * delega la escritura en `crearNotificaciones` (núcleo con `service_role`).
 * Best-effort: los errores se loguean sin abortar el flujo que la llamó.
 */
export async function createAdminNotification(evento: {
  mensaje: string
  tipo_evento: TipoEvento
  url_destino?: string
}): Promise<void> {
  try {
    const adminClient = createSupabaseAdminClient()

    const { data: admins, error: adminFetchError } = await adminClient
      .from('usuarios')
      .select('id_usuario')
      .not('nivel_admin', 'is', null)
      .eq('is_active', true)

    if (adminFetchError || !admins?.length) {
      logger.warn('createAdminNotification: no se encontraron admins activos', {
        error: adminFetchError?.message,
      })
      return
    }

    const result = await crearNotificaciones(
      admins.map((a) => ({
        idUsuario: a.id_usuario,
        tipoEvento: evento.tipo_evento,
        mensaje: evento.mensaje,
        urlDestino: evento.url_destino ?? null,
      })),
    )

    if (!result.ok) {
      logger.error('createAdminNotification: fallo al insertar', {
        error: result.error,
        tipo: evento.tipo_evento,
      })
    }
  } catch (e) {
    logger.error('createAdminNotification: excepción inesperada', {
      error: String(e),
    })
  }
}
