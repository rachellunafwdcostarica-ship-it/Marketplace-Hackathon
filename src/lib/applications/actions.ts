'use server'

import { z } from 'zod'
import { ok, err, type Result } from '@/lib/result'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/guards'
import { logger } from '@/lib/logger'
import { revalidatePath } from 'next/cache'

const PostularseSchema = z.object({
  id_proyecto: z.string().uuid(),
  carta_postulacion: z.string().min(30),
  planteamiento_solucion: z.string().min(30),
  prototipo_enlaces: z.array(z.string().url()).optional(),
  documentacion_tecnica: z.string().url().optional(),
})

const RetirarSchema = z.object({
  id_participacion: z.string().uuid(),
})

/**
 * Permite a un Junior postularse a un proyecto abierto.
 * RF-27: Enviar oferta a proyecto abierto dentro del plazo.
 */
export async function postularse(
  input: z.infer<typeof PostularseSchema>,
): Promise<Result<void>> {
  const parsed = PostularseSchema.safeParse(input)
  if (!parsed.success) {
    return err('invalid_input')
  }

  const roleResult = await requireRole('egresado')
  if (!roleResult.ok) {
    return roleResult
  }

  const supabase = await createSupabaseServerClient()

  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) {
    return err('unauthenticated')
  }

  const { data: estudiante, error: estudianteError } = await supabase
    .from('estudiantes')
    .select('id_estudiante, estado_verificacion')
    .eq('id_usuario', userData.user.id)
    .single()

  if (estudianteError || !estudiante) {
    return err('estudiante_not_found')
  }

  if (estudiante.estado_verificacion !== 'verificado') {
    return err('cuenta_no_verificada')
  }

  const { data: proyecto, error: proyectoError } = await supabase
    .from('proyectos')
    .select('estado, fecha_cierre, is_active')
    .eq('id_proyecto', parsed.data.id_proyecto)
    .single()

  if (proyectoError || !proyecto) {
    return err('proyecto_not_found')
  }

  if (
    !proyecto.is_active ||
    !['abierto', 'en_recepcion'].includes(proyecto.estado)
  ) {
    return err('proyecto_cerrado')
  }

  if (proyecto.fecha_cierre && new Date(proyecto.fecha_cierre) < new Date()) {
    return err('plazo_vencido')
  }

  const { error: insertError } = await supabase.from('participaciones').insert({
    id_proyecto: parsed.data.id_proyecto,
    id_estudiante: estudiante.id_estudiante,
    estado: 'enviada',
    carta_postulacion: parsed.data.carta_postulacion,
    planteamiento_solucion: parsed.data.planteamiento_solucion,
    prototipo_enlaces: parsed.data.prototipo_enlaces ?? null,
    documentacion_tecnica: parsed.data.documentacion_tecnica ?? null,
  })

  if (insertError) {
    logger.error('postularse failed', { error: insertError.message })
    if (insertError.code === 'P0001' || insertError.message.includes('cupo')) {
      return err('cupo_excedido')
    }
    return err('database_error')
  }

  revalidatePath('/applications')
  revalidatePath(`/junior/projects/${parsed.data.id_proyecto}`)

  return ok(undefined)
}

/**
 * Permite a un Junior retirar su oferta (RF-31)
 */
export async function retirarPostulacion(
  input: z.infer<typeof RetirarSchema>,
): Promise<Result<void>> {
  const parsed = RetirarSchema.safeParse(input)
  if (!parsed.success) {
    return err('invalid_input')
  }

  const roleResult = await requireRole('egresado')
  if (!roleResult.ok) {
    return roleResult
  }

  const supabase = await createSupabaseServerClient()

  // Obtener el usuario actual
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) return err('unauthenticated')

  // Obtener id_estudiante
  const { data: estudiante, error: estError } = await supabase
    .from('estudiantes')
    .select('id_estudiante')
    .eq('id_usuario', userData.user.id)
    .single()

  if (estError || !estudiante) return err('estudiante_not_found')

  // Buscar la participación y asegurar que le pertenece y su estado permite retiro
  const { data: participacion, error: partError } = await supabase
    .from('participaciones')
    .select('id_participacion, estado')
    .eq('id_participacion', parsed.data.id_participacion)
    .eq('id_estudiante', estudiante.id_estudiante)
    .single()

  if (partError || !participacion) {
    return err('participacion_not_found')
  }

  if (
    ['contratada', 'finalizada', 'cancelada', 'retirada'].includes(
      participacion.estado,
    )
  ) {
    return err('estado_invalido_retiro')
  }

  // Actualizar a retirada
  const { error: updateError } = await supabase
    .from('participaciones')
    .update({ estado: 'retirada' })
    .eq('id_participacion', participacion.id_participacion)

  if (updateError) {
    logger.error('retirarPostulacion failed', { error: updateError.message })
    return err('database_error')
  }

  revalidatePath('/applications')
  return ok(undefined)
}
