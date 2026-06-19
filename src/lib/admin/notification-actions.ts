'use server'

import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { requireRole } from '@/lib/auth/guards'
import { getCurrentUser } from '@/lib/auth/dal'
import { ok, err, type Result } from '@/lib/result'
import { logger } from '@/lib/logger'
import type { Database } from '@/types/database'

export type TipoEvento = Database['public']['Enums']['tipo_notificacion_enum']

export interface NotificacionItem {
  id_notificacion: string
  mensaje: string
  tipo_evento: TipoEvento
  leida: boolean
  url_destino: string | null
  generada_at: string
}

/**
 * Lee las últimas 30 notificaciones del admin que está logueado actualmente.
 * Solo un admin puede invocarla.
 */
export async function getAdminNotifications(): Promise<
  Result<NotificacionItem[]>
> {
  const authResult = await requireRole('administrador')
  if (!authResult.ok) return authResult

  const me = await getCurrentUser()
  if (!me) return err('unauthenticated')

  const adminClient = createSupabaseAdminClient()

  const { data, error } = await adminClient
    .from('notificaciones')
    .select(
      'id_notificacion, mensaje, tipo_evento, leida, url_destino, generada_at',
    )
    .eq('id_usuario', me.id)
    .order('generada_at', { ascending: false })
    .limit(30)

  if (error) {
    logger.error('getAdminNotifications: fallo al leer notificaciones', {
      error: error.message,
    })
    return err(error.message)
  }

  return ok((data ?? []) as NotificacionItem[])
}

/**
 * Marca una notificación específica como leída.
 * Solo un admin puede invocarla.
 */
export async function markNotificationAsRead(
  id: string,
): Promise<Result<void>> {
  const authResult = await requireRole('administrador')
  if (!authResult.ok) return authResult

  const adminClient = createSupabaseAdminClient()

  const { error } = await adminClient
    .from('notificaciones')
    .update({ leida: true })
    .eq('id_notificacion', id)

  if (error) {
    logger.error('markNotificationAsRead: fallo al actualizar', {
      id,
      error: error.message,
    })
    return err(error.message)
  }

  return ok(undefined)
}

/**
 * Marca todas las notificaciones del admin actual como leídas.
 * Solo un admin puede invocarla.
 */
export async function markAllNotificationsAsRead(): Promise<Result<void>> {
  const authResult = await requireRole('administrador')
  if (!authResult.ok) return authResult

  const me = await getCurrentUser()
  if (!me) return err('unauthenticated')

  const adminClient = createSupabaseAdminClient()

  const { error } = await adminClient
    .from('notificaciones')
    .update({ leida: true })
    .eq('id_usuario', me.id)
    .eq('leida', false)

  if (error) {
    logger.error('markAllNotificationsAsRead: fallo al actualizar', {
      error: error.message,
    })
    return err(error.message)
  }

  return ok(undefined)
}

/**
 * Crea una notificación para todos los usuarios admins.
 * Se usa internamente desde acciones del servidor (registro de usuarios, strikes, etc.)
 * Utiliza el cliente admin para bypassear RLS.
 */
export async function createAdminNotification(data: {
  mensaje: string
  tipo_evento: TipoEvento
  url_destino?: string
}): Promise<void> {
  try {
    const adminClient = createSupabaseAdminClient()

    // Obtener todos los admins activos
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

    const rows = admins.map((a) => ({
      id_usuario: a.id_usuario,
      mensaje: data.mensaje,
      tipo_evento: data.tipo_evento,
      url_destino: data.url_destino ?? null,
      leida: false,
    }))

    const { error } = await adminClient.from('notificaciones').insert(rows)

    if (error) {
      logger.error('createAdminNotification: fallo al insertar', {
        error: error.message,
        tipo: data.tipo_evento,
      })
    }
  } catch (e) {
    logger.error('createAdminNotification: excepción inesperada', {
      error: String(e),
    })
  }
}
