'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { ok, err, type Result } from '@/lib/result'
import { logger } from '@/lib/logger'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { requireRole } from '@/lib/auth/guards'
import { getCurrentUser } from '@/lib/auth/dal'
import { createAdminNotification } from '@/lib/admin/notification-actions'
import { createGmailTransport, getGmailFrom } from '@/lib/email/gmail'
import {
  strikeAppliedHtml,
  strikeAppliedSubject,
} from '@/lib/email/templates/strike-applied'
import type { Database } from '@/types/database'

type MotivoStrikeEnum = Database['public']['Enums']['motivo_strike_enum']

const UserIdSchema = z.string().uuid()
const MotivoEnumSchema = z.enum([
  'no_entrego',
  'abandono_proyecto',
  'conducta_inapropiada',
  'calificacion_baja_repetida',
  'fraude',
  'ghosting',
  'otro',
] as const)
const DescripcionSchema = z.string().trim().min(1).max(500).optional()

/**
 * Incrementa en 1 los strikes de un usuario e inserta un registro en la tabla
 * `strikes` para auditoría. Solo un admin puede invocarla.
 */
export async function addStrike(
  userId: string,
  motivoEnum: MotivoStrikeEnum,
  descripcion?: string,
): Promise<Result<void>> {
  const parsedId = UserIdSchema.safeParse(userId)
  if (!parsedId.success) return err('invalid_user_id')

  const parsedMotivo = MotivoEnumSchema.safeParse(motivoEnum)
  if (!parsedMotivo.success) return err('invalid_motivo')

  const parsedDesc = DescripcionSchema.safeParse(descripcion)
  if (!parsedDesc.success) return err('invalid_descripcion')

  const authResult = await requireRole('administrador')
  if (!authResult.ok) return authResult

  const me = await getCurrentUser()
  if (!me) return err('unauthenticated')

  const adminClient = createSupabaseAdminClient()

  // Leer estado actual del usuario
  const { data: usuario, error: readError } = await adminClient
    .from('usuarios')
    .select('cantidad_strikes, id_usuario')
    .eq('id_usuario', parsedId.data)
    .single()

  if (readError || !usuario) {
    logger.error('addStrike: usuario no encontrado', {
      userId,
      error: readError?.message,
    })
    return err('user_not_found')
  }

  const nuevaCantidad = (usuario.cantidad_strikes ?? 0) + 1

  // Leer límite de strikes de configuración (default: 3)
  const { data: configRows } = await adminClient
    .from('configuracion_sistema')
    .select('valor')
    .eq('clave', 'max_strikes_limit')
    .maybeSingle()

  const maxStrikesLimit = configRows ? parseInt(configRows.valor, 10) : 3

  const updateFields: {
    cantidad_strikes: number
    estado_cuenta?: 'suspendida'
  } = {
    cantidad_strikes: nuevaCantidad,
  }

  if (nuevaCantidad >= maxStrikesLimit) {
    updateFields.estado_cuenta = 'suspendida'
    logger.warn('addStrike: usuario suspendido automáticamente', {
      userId,
      nuevaCantidad,
    })
  }

  // Actualizar contador en usuarios
  const { error: updateError } = await adminClient
    .from('usuarios')
    .update(updateFields)
    .eq('id_usuario', parsedId.data)

  if (updateError) {
    logger.error('addStrike: fallo al actualizar', {
      userId,
      error: updateError.message,
    })
    return err(updateError.message)
  }

  // Insertar registro de auditoría en tabla strikes
  const { error: insertError } = await adminClient.from('strikes').insert({
    id_usuario: parsedId.data,
    aplicado_por: me.id,
    motivo: parsedMotivo.data,
    descripcion: parsedDesc.data ?? null,
    revocado: false,
  })

  if (insertError) {
    logger.error('addStrike: fallo al insertar en strikes', {
      userId,
      error: insertError.message,
    })
    // No revertimos el contador — el strike ya está aplicado; solo logamos el fallo de auditoría.
  }

  logger.info('addStrike: strike añadido', {
    userId,
    nuevaCantidad,
    motivo: parsedMotivo.data,
    descripcion: parsedDesc.data ?? 'sin descripción',
    autoSuspended: nuevaCantidad >= maxStrikesLimit,
  })

  // ── Obtener datos del usuario para enviar el correo ────────────────────────
  const { data: usuarioCompleto } = await adminClient
    .from('usuarios')
    .select('nombre, apellido_1, correo')
    .eq('id_usuario', parsedId.data)
    .single()

  // ── Enviar correo de notificación al usuario ───────────────────────────────
  if (usuarioCompleto?.correo) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://fwdtalent.com'
    try {
      const transporter = createGmailTransport()
      await transporter.sendMail({
        from: getGmailFrom(),
        to: usuarioCompleto.correo,
        subject: strikeAppliedSubject(nuevaCantidad, maxStrikesLimit),
        html: strikeAppliedHtml({
          nombre: usuarioCompleto.nombre,
          correo: usuarioCompleto.correo,
          motivo: parsedMotivo.data,
          descripcion: parsedDesc.data ?? undefined,
          cantidadStrikes: nuevaCantidad,
          maxStrikes: maxStrikesLimit,
          dashboardUrl: `${baseUrl}/dashboard`,
        }),
      })
      logger.info('addStrike: correo enviado al usuario', {
        userId,
        correo: usuarioCompleto.correo,
      })
    } catch (emailErr) {
      logger.error('addStrike: fallo al enviar correo', {
        userId,
        error: String(emailErr),
      })
      // No fallamos la acción principal si el email no llega
    }
  }

  // ── Crear notificación en el panel de admin ────────────────────────────────
  const nombreCompleto = usuarioCompleto
    ? `${usuarioCompleto.nombre} ${usuarioCompleto.apellido_1}`
    : `usuario ${parsedId.data.slice(0, 8)}`
  await createAdminNotification({
    mensaje:
      nuevaCantidad >= maxStrikesLimit
        ? `⚠️ ${nombreCompleto} fue suspendido automáticamente tras ${nuevaCantidad} strikes. Motivo: ${parsedMotivo.data}.`
        : `🔴 Strike aplicado a ${nombreCompleto} (${nuevaCantidad}/${maxStrikesLimit}). Motivo: ${parsedMotivo.data}.`,
    tipo_evento: 'strike_recibido',
    url_destino: '/admin/moderation',
  })

  revalidatePath('/admin/moderation', 'page')
  revalidatePath('/admin/users', 'page')
  return ok(undefined)
}

/**
 * Revoca (marca como revocado) el strike más reciente no revocado del usuario
 * y decrementa el contador. Solo un admin puede invocarla.
 */
export async function removeStrike(
  userId: string,
  motivo?: string,
): Promise<Result<void>> {
  const parsedId = UserIdSchema.safeParse(userId)
  if (!parsedId.success) return err('invalid_user_id')

  const authResult = await requireRole('administrador')
  if (!authResult.ok) return authResult

  const me = await getCurrentUser()
  if (!me) return err('unauthenticated')

  const adminClient = createSupabaseAdminClient()

  const { data: usuario, error: readError } = await adminClient
    .from('usuarios')
    .select('cantidad_strikes')
    .eq('id_usuario', parsedId.data)
    .single()

  if (readError || !usuario) {
    logger.error('removeStrike: usuario no encontrado', {
      userId,
      error: readError?.message,
    })
    return err('user_not_found')
  }

  const nuevaCantidad = Math.max(0, (usuario.cantidad_strikes ?? 0) - 1)

  const { error: updateError } = await adminClient
    .from('usuarios')
    .update({ cantidad_strikes: nuevaCantidad })
    .eq('id_usuario', parsedId.data)

  if (updateError) {
    logger.error('removeStrike: fallo al actualizar', {
      userId,
      error: updateError.message,
    })
    return err(updateError.message)
  }

  // Marcar como revocado el strike más reciente no revocado
  const { data: strikeToRevoke } = await adminClient
    .from('strikes')
    .select('id_strike')
    .eq('id_usuario', parsedId.data)
    .eq('revocado', false)
    .order('aplicado_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (strikeToRevoke) {
    await adminClient
      .from('strikes')
      .update({
        revocado: true,
        revocado_at: new Date().toISOString(),
        revocado_por: me.id,
        motivo_revocacion: motivo ?? 'Reducción manual por administrador',
      })
      .eq('id_strike', strikeToRevoke.id_strike)
  }

  logger.info('removeStrike: strike reducido', { userId, nuevaCantidad })

  revalidatePath('/admin/moderation', 'page')
  revalidatePath('/admin/users', 'page')
  return ok(undefined)
}

/**
 * Resetea a 0 los strikes de un usuario. Motivo obligatorio.
 * Revoca todos los strikes activos del usuario.
 */
export async function resetStrikes(
  userId: string,
  motivo: string,
): Promise<Result<void>> {
  const parsedId = UserIdSchema.safeParse(userId)
  if (!parsedId.success) return err('invalid_user_id')

  const parsedMotivo = z.string().trim().min(5).max(500).safeParse(motivo)
  if (!parsedMotivo.success) return err('motivo_requerido')

  const authResult = await requireRole('administrador')
  if (!authResult.ok) return authResult

  const me = await getCurrentUser()
  if (!me) return err('unauthenticated')

  const adminClient = createSupabaseAdminClient()

  const { error: updateError } = await adminClient
    .from('usuarios')
    .update({ cantidad_strikes: 0 })
    .eq('id_usuario', parsedId.data)

  if (updateError) {
    logger.error('resetStrikes: fallo al resetear', {
      userId,
      error: updateError.message,
    })
    return err(updateError.message)
  }

  // Revocar todos los strikes activos
  await adminClient
    .from('strikes')
    .update({
      revocado: true,
      revocado_at: new Date().toISOString(),
      revocado_por: me.id,
      motivo_revocacion: parsedMotivo.data,
    })
    .eq('id_usuario', parsedId.data)
    .eq('revocado', false)

  logger.info('resetStrikes: strikes reseteados', {
    userId,
    motivo: parsedMotivo.data,
  })

  revalidatePath('/admin/moderation', 'page')
  revalidatePath('/admin/users', 'page')
  return ok(undefined)
}
