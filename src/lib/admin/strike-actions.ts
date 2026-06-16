'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { ok, err, type Result } from '@/lib/result'
import { logger } from '@/lib/logger'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { requireRole } from '@/lib/auth/guards'

const UserIdSchema = z.string().uuid()
const MotivoSchema = z.string().trim().min(1).max(500).optional()

/**
 * Incrementa en 1 los strikes de un usuario.
 * Solo un admin puede invocarla. Self-guard: no permite modificar la propia cuenta.
 */
export async function addStrike(
  userId: string,
  motivo?: string,
): Promise<Result<void>> {
  const parsedId = UserIdSchema.safeParse(userId)
  if (!parsedId.success) {
    return err('invalid_user_id')
  }

  const parsedMotivo = MotivoSchema.safeParse(motivo)
  if (!parsedMotivo.success) {
    return err('invalid_motivo')
  }

  const authResult = await requireRole('administrador')
  if (!authResult.ok) {
    return authResult
  }

  const adminClient = createSupabaseAdminClient()

  // Leer el valor actual
  const { data: usuario, error: readError } = await adminClient
    .from('usuarios')
    .select('cantidad_strikes')
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

  const { error } = await adminClient
    .from('usuarios')
    .update({ cantidad_strikes: nuevaCantidad })
    .eq('id_usuario', parsedId.data)

  if (error) {
    logger.error('addStrike: fallo al actualizar strikes', {
      userId,
      error: error.message,
      motivo: parsedMotivo.data,
    })
    return err(error.message)
  }

  logger.info('addStrike: strike añadido', {
    userId,
    nuevaCantidad,
    motivo: parsedMotivo.data ?? 'sin motivo',
  })

  revalidatePath('/admin/moderation', 'page')
  revalidatePath('/admin/users', 'page')
  return ok(undefined)
}

/**
 * Decrementa en 1 los strikes de un usuario (mínimo 0).
 * Solo un admin puede invocarla.
 */
export async function removeStrike(userId: string): Promise<Result<void>> {
  const parsedId = UserIdSchema.safeParse(userId)
  if (!parsedId.success) {
    return err('invalid_user_id')
  }

  const authResult = await requireRole('administrador')
  if (!authResult.ok) {
    return authResult
  }

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

  const { error } = await adminClient
    .from('usuarios')
    .update({ cantidad_strikes: nuevaCantidad })
    .eq('id_usuario', parsedId.data)

  if (error) {
    logger.error('removeStrike: fallo al actualizar strikes', {
      userId,
      error: error.message,
    })
    return err(error.message)
  }

  logger.info('removeStrike: strike reducido', { userId, nuevaCantidad })

  revalidatePath('/admin/moderation', 'page')
  revalidatePath('/admin/users', 'page')
  return ok(undefined)
}

/**
 * Resetea a 0 los strikes de un usuario. Motivo obligatorio (auditoría).
 * Solo un admin puede invocarla.
 */
export async function resetStrikes(
  userId: string,
  motivo: string,
): Promise<Result<void>> {
  const parsedId = UserIdSchema.safeParse(userId)
  if (!parsedId.success) {
    return err('invalid_user_id')
  }

  const parsedMotivo = z.string().trim().min(5).max(500).safeParse(motivo)
  if (!parsedMotivo.success) {
    return err('motivo_requerido')
  }

  const authResult = await requireRole('administrador')
  if (!authResult.ok) {
    return authResult
  }

  const adminClient = createSupabaseAdminClient()

  const { error } = await adminClient
    .from('usuarios')
    .update({ cantidad_strikes: 0 })
    .eq('id_usuario', parsedId.data)

  if (error) {
    logger.error('resetStrikes: fallo al resetear strikes', {
      userId,
      error: error.message,
    })
    return err(error.message)
  }

  logger.info('resetStrikes: strikes reseteados', {
    userId,
    motivo: parsedMotivo.data,
  })

  revalidatePath('/admin/moderation', 'page')
  revalidatePath('/admin/users', 'page')
  return ok(undefined)
}
