'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { ok, err, type Result } from '@/lib/result'
import { logger } from '@/lib/logger'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { requireRole } from '@/lib/auth/guards'

/**
 * Marca a un estudiante (egresado) como verificado.
 *
 * Es el productor de `estudiantes.estado_verificacion = 'verificado'`, el campo
 * que la policy `participaciones_insert_egresado` exige para poder postular.
 * Se mantiene SEPARADA de `approveUser` a propósito: aprobar la cuenta
 * (`usuarios.estado_cuenta = 'activa'`) y verificar el egreso son dos conceptos
 * distintos del SRS (cuenta activa ≠ egresado FWD validado).
 *
 * Usa el cliente de servicio porque el guard-trigger
 * `trg_guard_estudiantes_protected` congela estas columnas ante el rol
 * `authenticated` y solo deja pasar a `service_role`.
 *
 * Solo un admin puede invocarla.
 */
export async function verificarEgresado(userId: string): Promise<Result<void>> {
  const parsed = z.string().uuid().safeParse(userId)
  if (!parsed.success) {
    return err('invalid_user_id')
  }

  // Verificar que el caller es admin
  const authResult = await requireRole('admin')
  if (!authResult.ok) {
    return authResult
  }

  // Obtener el id del admin que verifica (para verificado_por)
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) {
    return err('unauthenticated')
  }

  // service_role para bypassear RLS y el guard-trigger de columnas protegidas
  const adminClient = createSupabaseAdminClient()
  const { data, error } = await adminClient
    .from('estudiantes')
    .update({
      estado_verificacion: 'verificado',
      verificado_at: new Date().toISOString(),
      verificado_por: user.id,
    })
    .eq('id_usuario', parsed.data)
    .select('id_estudiante')

  if (error) {
    logger.error('verificarEgresado failed', { error: error.message, userId })
    return err(error.message)
  }

  // El usuario no tiene fila en estudiantes (no es egresado): no se tocó nada
  if (!data || data.length === 0) {
    return err('not_a_student')
  }

  revalidatePath('/admin/validations', 'page')
  return ok(undefined)
}
