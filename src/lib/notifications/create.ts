import 'server-only'

import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { ok, err, type Result } from '@/lib/result'
import { logger } from '@/lib/logger'
import {
  buildNotificacionRows,
  validateNotificacionInputs,
  type NotificacionInput,
} from './create-logic'

export type { NotificacionInput, TipoNotificacion } from './create-logic'

/**
 * Núcleo único de escritura de notificaciones (RF-47). Inserta un lote con
 * `service_role`: la tabla `notificaciones` no tiene policy INSERT, así que es la
 * única vía y coincide con la decisión recomendada del equipo (PlanParaBarry,
 * P1.1). La audiencia ya viene resuelta por el productor que llama.
 *
 * Devuelve cuántas filas se insertaron. Un lote vacío es un no-op (`ok(0)`).
 */
export async function crearNotificaciones(
  inputs: NotificacionInput[],
): Promise<Result<number>> {
  if (inputs.length === 0) return ok(0)

  const validation = validateNotificacionInputs(inputs)
  if (!validation.ok) {
    logger.error('crearNotificaciones: entrada inválida', {
      error: validation.error,
    })
    return err(validation.error)
  }

  const admin = createSupabaseAdminClient()
  const { error } = await admin
    .from('notificaciones')
    .insert(buildNotificacionRows(inputs))

  if (error) {
    logger.error('crearNotificaciones: fallo al insertar', {
      error: error.message,
    })
    return err(error.message)
  }

  return ok(inputs.length)
}

/** Conveniencia para un solo destinatario. Envuelve {@link crearNotificaciones}. */
export async function crearNotificacion(
  input: NotificacionInput,
): Promise<Result<void>> {
  const result = await crearNotificaciones([input])
  if (!result.ok) return err(result.error)
  return ok(undefined)
}
