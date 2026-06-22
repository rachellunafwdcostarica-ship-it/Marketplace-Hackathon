'use server'

import { z } from 'zod'
import { ok, err, type Result } from '@/lib/result'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/guards'
import { logger } from '@/lib/logger'
import { revalidatePath } from 'next/cache'
import { crearNotificacion } from '@/lib/notifications/create'

const SubirEntregableSchema = z.object({
  idContratacion: z.string().uuid(),
  archivoPath: z.string().min(1).max(150),
  idProyecto: z.string().uuid(),
})

type SubirInput = z.infer<typeof SubirEntregableSchema>

const MAX_VERSION_ATTEMPTS = 2

async function registrarEntregable(
  input: SubirInput,
  tipo: 'parcial' | 'final',
): Promise<Result<void>> {
  const roleResult = await requireRole('egresado')
  if (!roleResult.ok) return roleResult

  const supabase = await createSupabaseServerClient()

  // La versión se calcula como max(version)+1 por contratación. El constraint
  // UNIQUE(id_contratacion, version) garantiza la secuencia; si dos subidas casi
  // simultáneas chocan (23505), recalculamos y reintentamos una vez.
  for (let attempt = 1; attempt <= MAX_VERSION_ATTEMPTS; attempt++) {
    const { data: maxVerData } = await supabase
      .from('entregables')
      .select('version')
      .eq('id_contratacion', input.idContratacion)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle()

    const version = (maxVerData?.version ?? 0) + 1

    const { error: insertError } = await supabase.from('entregables').insert({
      id_contratacion: input.idContratacion,
      tipo_entregable: tipo,
      archivo_url: input.archivoPath,
      version,
      estado: 'enviado',
    })

    if (!insertError) {
      revalidatePath(`/egresado/projects/${input.idProyecto}/entregables`)
      return ok(undefined)
    }

    if (insertError.code === '23505' && attempt < MAX_VERSION_ATTEMPTS) {
      continue
    }

    logger.error(`registrarEntregable (${tipo}) failed`, {
      error: insertError.message,
    })
    return err(
      insertError.code === '23505' ? 'version_conflict' : 'database_error',
    )
  }

  return err('version_conflict')
}

/**
 * Registra un hito parcial (RF-40). El upload al storage ya ocurrió
 * en el cliente; este action solo inserta la fila en `entregables`.
 */
export async function subirHito(input: SubirInput): Promise<Result<void>> {
  const parsed = SubirEntregableSchema.safeParse(input)
  if (!parsed.success) return err('invalid_input')
  return registrarEntregable(parsed.data, 'parcial')
}

/**
 * Registra el entregable final (RF-41). Mismo patrón que subirHito
 * pero con tipo_entregable='final'.
 */
export async function subirEntregableFinal(
  input: SubirInput,
): Promise<Result<void>> {
  const parsed = SubirEntregableSchema.safeParse(input)
  if (!parsed.success) return err('invalid_input')
  return registrarEntregable(parsed.data, 'final')
}

const ResponderEntregableSchema = z
  .object({
    idEntregable: z.string().uuid(),
    decision: z.enum(['aprobado', 'con_cambios']),
    comentario: z.string().max(1000).optional(),
  })
  .refine(
    (data) =>
      data.decision !== 'con_cambios' ||
      (data.comentario?.trim().length ?? 0) > 0,
    { message: 'comentario_requerido', path: ['comentario'] },
  )

/**
 * El empresario aprueba o solicita cambios sobre un entregable (RF-44).
 * Solo se puede responder cuando estado === 'enviado'. Si se APRUEBA un
 * entregable `final`, cierra el ciclo (RF-41) vía el RPC atómico
 * `finalizar_proyecto_por_entregable`: aprueba el entregable y pasa
 * proyecto/contratación/participación a finalizado, habilitando las
 * calificaciones mutuas. Devuelve `finalizado` para que la UI muestre el aviso.
 * Revalida la vista del empresario y la del egresado.
 */
export async function responderEntregable(
  input: z.infer<typeof ResponderEntregableSchema>,
): Promise<Result<{ finalizado: boolean }>> {
  const parsed = ResponderEntregableSchema.safeParse(input)
  if (!parsed.success) return err('invalid_input')

  const supabase = await createSupabaseServerClient()
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) return err('unauthenticated')

  const { data: entregable, error: entErr } = await supabase
    .from('entregables')
    .select('id_entregable, estado, id_contratacion, tipo_entregable')
    .eq('id_entregable', parsed.data.idEntregable)
    .maybeSingle()
  if (entErr) {
    logger.error('responderEntregable: entregable query failed', {
      error: entErr.message,
    })
    return err('database_error')
  }
  if (!entregable) return err('entregable_not_found')
  if (entregable.estado !== 'enviado') return err('estado_invalido')

  const { data: contratacion, error: contErr } = await supabase
    .from('contrataciones')
    .select('id_participacion')
    .eq('id_contratacion', entregable.id_contratacion)
    .maybeSingle()
  if (contErr || !contratacion) return err('unauthorized')

  const { data: participacion, error: partErr } = await supabase
    .from('participaciones')
    .select('id_proyecto, id_estudiante')
    .eq('id_participacion', contratacion.id_participacion)
    .maybeSingle()
  if (partErr || !participacion) return err('unauthorized')

  const { data: empresario, error: empErr } = await supabase
    .from('empresarios')
    .select('id_empresario')
    .eq('id_usuario', userData.user.id)
    .maybeSingle()
  if (empErr || !empresario) return err('unauthorized')

  const { data: proyectoOwned, error: proyErr } = await supabase
    .from('proyectos')
    .select('id_proyecto, titulo')
    .eq('id_proyecto', participacion.id_proyecto)
    .eq('id_empresario', empresario.id_empresario)
    .maybeSingle()
  if (proyErr || !proyectoOwned) return err('unauthorized')

  const { data: estudianteNotif } = await supabase
    .from('estudiantes')
    .select('id_usuario')
    .eq('id_estudiante', participacion.id_estudiante)
    .maybeSingle()

  // Aprobar el entregable FINAL cierra el ciclo (RF-41): un RPC atómico aprueba
  // el entregable y finaliza proyecto/contratación/participación en una sola
  // transacción, habilitando las calificaciones mutuas.
  if (
    parsed.data.decision === 'aprobado' &&
    entregable.tipo_entregable === 'final'
  ) {
    const { error: rpcErr } = await supabase.rpc(
      'finalizar_proyecto_por_entregable',
      {
        p_id_entregable: parsed.data.idEntregable,
        p_comentario: parsed.data.comentario ?? '',
      },
    )
    if (rpcErr) {
      logger.error('responderEntregable: finalizar RPC failed', {
        error: rpcErr.message,
      })
      return err('finalizacion_fallida')
    }
    revalidatePath(`/empresario/proyecto/${participacion.id_proyecto}`)
    revalidatePath(
      `/egresado/projects/${participacion.id_proyecto}/entregables`,
    )
    if (estudianteNotif?.id_usuario) {
      const notifResult = await crearNotificacion({
        idUsuario: estudianteNotif.id_usuario,
        tipoEvento: 'entregable_aprobado',
        params: { titulo: proyectoOwned.titulo },
        urlDestino: `/egresado/projects/${participacion.id_proyecto}/entregables`,
        mensaje: `Tu entregable final del proyecto "${proyectoOwned.titulo}" fue aprobado. El proyecto está finalizado.`,
      })
      if (!notifResult.ok) {
        logger.error('responderEntregable: notificacion aprobado fallida', {
          error: notifResult.error,
        })
      }
    }
    return ok({ finalizado: true })
  }

  const updateData: {
    estado: 'aprobado' | 'con_cambios'
    comentario_empresario?: string
  } = {
    estado: parsed.data.decision,
    ...(parsed.data.comentario
      ? { comentario_empresario: parsed.data.comentario }
      : {}),
  }

  const { error: updateErr } = await supabase
    .from('entregables')
    .update(updateData)
    .eq('id_entregable', parsed.data.idEntregable)
  if (updateErr) {
    logger.error('responderEntregable: update failed', {
      error: updateErr.message,
    })
    return err('database_error')
  }

  revalidatePath(`/empresario/proyecto/${participacion.id_proyecto}`)
  revalidatePath(`/egresado/projects/${participacion.id_proyecto}/entregables`)
  if (estudianteNotif?.id_usuario) {
    const tipoEvento =
      parsed.data.decision === 'aprobado'
        ? ('entregable_aprobado' as const)
        : ('entregable_rechazado' as const)
    const mensaje =
      parsed.data.decision === 'aprobado'
        ? `Tu entregable del proyecto "${proyectoOwned.titulo}" fue aprobado.`
        : `El empresario solicitó cambios en tu entregable de "${proyectoOwned.titulo}".`
    const notifResult = await crearNotificacion({
      idUsuario: estudianteNotif.id_usuario,
      tipoEvento,
      params: { titulo: proyectoOwned.titulo },
      urlDestino: `/egresado/projects/${participacion.id_proyecto}/entregables`,
      mensaje,
    })
    if (!notifResult.ok) {
      logger.error('responderEntregable: notificacion fallida', {
        error: notifResult.error,
      })
    }
  }
  return ok({ finalizado: false })
}
