'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { ok, err, type Result } from '@/lib/result'
import { logger } from '@/lib/logger'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { requireRole } from '@/lib/auth/guards'

/**
 * Mueve `estudiantes.estado_verificacion` (RF-64). Productor del campo que la
 * policy `participaciones_insert_egresado` exige para postular.
 *
 * Separado de `approveUser` a propósito: aprobar la cuenta
 * (`usuarios.estado_cuenta = 'activa'`) y verificar el egreso son dos conceptos
 * distintos del SRS (cuenta activa ≠ egresado FWD validado).
 *
 * Usa service_role porque el guard-trigger `trg_guard_estudiantes_protected`
 * congela estas columnas ante `authenticated`. Solo un admin puede invocarla.
 */
async function setGraduateVerification(
  userId: string,
  estado: 'verificado' | 'rechazado',
): Promise<Result<void>> {
  const parsed = z.string().uuid().safeParse(userId)
  if (!parsed.success) {
    return err('invalid_user_id')
  }

  const authResult = await requireRole('admin')
  if (!authResult.ok) {
    return authResult
  }

  // Id del admin que decide (para verificado_por, traza también al rechazar)
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) {
    return err('unauthenticated')
  }

  const adminClient = createSupabaseAdminClient()

  // RNF-38: verificar exige que el egresado haya consentido el cotejo de su
  // correo contra la base de egresados FWD. Rechazar no lo requiere.
  if (estado === 'verificado') {
    const { data: consent } = await adminClient
      .from('consentimientos')
      .select('id_consentimiento')
      .eq('id_usuario', parsed.data)
      .eq('tipo_consentimiento', 'cotejo_fwd')
      .eq('otorgado', true)
      .limit(1)
    if (!consent || consent.length === 0) {
      return err('sin_consentimiento_cotejo')
    }
  }

  const { data, error } = await adminClient
    .from('estudiantes')
    .update({
      estado_verificacion: estado,
      verificado_at: new Date().toISOString(),
      verificado_por: user.id,
    })
    .eq('id_usuario', parsed.data)
    .select('id_estudiante')

  if (error) {
    logger.error('setGraduateVerification failed', {
      error: error.message,
      userId,
      estado,
    })
    return err(error.message)
  }

  // El usuario no tiene fila en estudiantes (no es egresado): no se tocó nada
  if (!data || data.length === 0) {
    return err('not_a_student')
  }

  revalidatePath('/admin/validations', 'page')
  return ok(undefined)
}

/** Verifica a un egresado (estado_verificacion → 'verificado'). Solo admin. */
export async function verificarEgresado(userId: string): Promise<Result<void>> {
  return setGraduateVerification(userId, 'verificado')
}

/** Rechaza a un egresado (estado_verificacion → 'rechazado'). Solo admin. */
export async function rechazarEgresado(userId: string): Promise<Result<void>> {
  return setGraduateVerification(userId, 'rechazado')
}

/**
 * Desactiva la cuenta de un usuario (is_active → false). Es el reverso de
 * `approveUser` (que reactiva con is_active → true). Solo un admin puede
 * invocarla.
 *
 * El bloqueo es real: el gate del middleware expulsa a las cuentas con
 * is_active = false (no pueden iniciar sesión ni navegar), igual que con las
 * suspendidas.
 *
 * Self-guard: un admin NO puede desactivarse a sí mismo; si pudiera, el gate lo
 * sacaría de la plataforma en la siguiente navegación.
 *
 * Usa el cliente de servicio para bypassear RLS (las políticas solo dejan al
 * usuario ver/editar su propio registro).
 */
export async function deactivateUser(userId: string): Promise<Result<void>> {
  const parsed = z.string().uuid().safeParse(userId)
  if (!parsed.success) {
    return err('invalid_user_id')
  }

  const authResult = await requireRole('admin')
  if (!authResult.ok) {
    return authResult
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) {
    return err('unauthenticated')
  }

  if (user.id === parsed.data) {
    return err('cannot_modify_self')
  }

  const adminClient = createSupabaseAdminClient()
  const { error } = await adminClient
    .from('usuarios')
    .update({ is_active: false })
    .eq('id_usuario', parsed.data)

  if (error) {
    logger.error('deactivateUser failed', { error: error.message, userId })
    return err(error.message)
  }

  revalidatePath('/admin/users', 'page')
  return ok(undefined)
}

/**
 * Mueve empresarios.estado_verificacion (RF-17). Espejo de verificarEgresado:
 * el guard-trigger congela esta columna para `authenticated`, solo `service_role`
 * la escribe. Registra verificado_at/por como traza (también al rechazar).
 */
async function setCompanyVerification(
  idEmpresario: string,
  estado: 'verificado' | 'rechazado',
): Promise<Result<void>> {
  const parsed = z.string().uuid().safeParse(idEmpresario)
  if (!parsed.success) {
    return err('invalid_company_id')
  }

  const authResult = await requireRole('admin')
  if (!authResult.ok) {
    return authResult
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) {
    return err('unauthenticated')
  }

  const adminClient = createSupabaseAdminClient()
  const { data, error } = await adminClient
    .from('empresarios')
    .update({
      estado_verificacion: estado,
      verificado_at: new Date().toISOString(),
      verificado_por: user.id,
    })
    .eq('id_empresario', parsed.data)
    .select('id_empresario')

  if (error) {
    logger.error('setCompanyVerification failed', {
      error: error.message,
      idEmpresario,
      estado,
    })
    return err(error.message)
  }

  if (!data || data.length === 0) {
    return err('empresa_no_encontrada')
  }

  revalidatePath('/admin/validations', 'page')
  return ok(undefined)
}

/** Verifica una empresa (estado_verificacion → 'verificado'). Solo admin. */
export async function verificarEmpresa(
  idEmpresario: string,
): Promise<Result<void>> {
  return setCompanyVerification(idEmpresario, 'verificado')
}

/** Rechaza una empresa (estado_verificacion → 'rechazado'). Solo admin. */
export async function rechazarEmpresa(
  idEmpresario: string,
): Promise<Result<void>> {
  return setCompanyVerification(idEmpresario, 'rechazado')
}
