'use server'

import { z } from 'zod'
import { ok, err, type Result } from '@/lib/result'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { requireRole, requireVerifiedEgresado } from '@/lib/auth/guards'
import { logger } from '@/lib/logger'
import { revalidatePath } from 'next/cache'
import { validateApplicationWithAI } from '@/lib/ai-filtro-ofertas/openrouter-validation'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { crearNotificacion } from '@/lib/notifications/create'
import { DEFAULT_LOCALE } from '@/i18n/config'
import { buildPostulacionNotificacion } from './postulacion-notificacion-logic'

const MIN_PLANTEAMIENTO_LEN = 30
const MIN_CARTA_LEN = 30
const MAX_CARTA_LEN = 2800
const MIN_PROTOTIPO_ENLACES = 1
const MAX_PROTOTIPO_ENLACES = 4
const MAX_ENLACE_LEN = 500
const MAX_DOC_URL_LEN = 300

const PostularseSchema = z.object({
  id_proyecto: z.string().uuid(),
  planteamiento_solucion: z.string().min(MIN_PLANTEAMIENTO_LEN),
  prototipo_enlaces: z
    .array(z.string().url().max(MAX_ENLACE_LEN))
    .min(MIN_PROTOTIPO_ENLACES)
    .max(MAX_PROTOTIPO_ENLACES),
  carta_postulacion: z.string().min(MIN_CARTA_LEN).max(MAX_CARTA_LEN),
  documentacion_tecnica: z.string().url().max(MAX_DOC_URL_LEN),
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
    .select('titulo, descripcion, estado, fecha_cierre, is_active')
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

  const expectedPath = `${parsed.data.id_proyecto}/${userData.user.id}`
  if (!parsed.data.documentacion_tecnica.includes(expectedPath)) {
    return err('url_invalida')
  }

  // Validación de IA antes de insertar
  const aiValidation = await validateApplicationWithAI({
    projectTitle: proyecto.titulo || 'Proyecto FWD',
    projectDescription: proyecto.descripcion || '',
    coverLetter: parsed.data.carta_postulacion,
    solutionApproach: parsed.data.planteamiento_solucion,
    externalLink:
      parsed.data.prototipo_enlaces?.[1] ||
      parsed.data.prototipo_enlaces?.[0] ||
      null, // Dependiendo de cuántos hay
    uploadedPrototypeUrl: parsed.data.prototipo_enlaces?.[0] || null,
    technicalDocUrl: parsed.data.documentacion_tecnica || null,
  })

  if (!aiValidation.isRelated) {
    return err(`AI_REJECTED::${aiValidation.reason}`)
  }

  const { error: insertError } = await supabase.from('participaciones').insert({
    id_proyecto: parsed.data.id_proyecto,
    id_estudiante: estudiante.id_estudiante,
    estado: 'enviada',
    carta_postulacion: parsed.data.carta_postulacion,
    planteamiento_solucion: parsed.data.planteamiento_solucion,
    prototipo_enlaces: parsed.data.prototipo_enlaces,
    documentacion_tecnica: parsed.data.documentacion_tecnica,
  })

  if (insertError) {
    logger.error('postularse failed', { error: insertError.message })
    if (
      insertError.code === 'P0001' ||
      insertError.message.toLowerCase().includes('cupo')
    ) {
      return err('cupo_excedido')
    }
    return err('database_error')
  }

  await notificarPostulacion(
    parsed.data.id_proyecto,
    proyecto.titulo ?? 'tu proyecto',
  )

  revalidatePath('/egresado/applications')
  revalidatePath(`/egresado/projects/${parsed.data.id_proyecto}`)

  return ok(undefined)
}

/**
 * Notifica al empresario dueño que recibió una nueva postulación
 * (`postulacion_recibida`). Best-effort y autoblindada: la postulación ya quedó
 * guardada, así que un fallo al notificar se loguea y se traga (log + decisión,
 * §8). Lee el `id_usuario` del empresario con `service_role`: la sesión es del
 * egresado y la RLS no le deja ver al dueño.
 */
async function notificarPostulacion(
  idProyecto: string,
  titulo: string,
): Promise<void> {
  try {
    const admin = createSupabaseAdminClient()
    const { data, error } = await admin
      .from('proyectos')
      .select('empresarios(id_usuario)')
      .eq('id_proyecto', idProyecto)
      .maybeSingle()
    if (error || !data) {
      logger.error('notificarPostulacion: no se pudo leer el proyecto', {
        idProyecto,
        error: error?.message,
      })
      return
    }
    const empresario = (
      data as unknown as { empresarios: { id_usuario: string } | null }
    ).empresarios
    if (!empresario?.id_usuario) {
      logger.error('notificarPostulacion: proyecto sin empresario', {
        idProyecto,
      })
      return
    }
    const urlProyecto = `/${DEFAULT_LOCALE}/empresario/proyecto/${idProyecto}`
    const result = await crearNotificacion(
      buildPostulacionNotificacion({
        idUsuarioEmpresario: empresario.id_usuario,
        titulo,
        urlProyecto,
      }),
    )
    if (!result.ok) {
      logger.error('notificarPostulacion: fallo al crear la notificación', {
        idProyecto,
        error: result.error,
      })
    }
  } catch (e) {
    logger.error('notificarPostulacion: excepción inesperada', {
      idProyecto,
      error: String(e),
    })
  }
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

  const verified = await requireVerifiedEgresado()
  if (!verified.ok) return verified

  const supabase = await createSupabaseServerClient()

  // Buscar la participación y asegurar que le pertenece y su estado permite retiro
  const { data: participacion, error: partError } = await supabase
    .from('participaciones')
    .select('id_participacion, estado')
    .eq('id_participacion', parsed.data.id_participacion)
    .eq('id_estudiante', verified.data.id_estudiante)
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

  revalidatePath('/egresado/applications')
  return ok(undefined)
}
