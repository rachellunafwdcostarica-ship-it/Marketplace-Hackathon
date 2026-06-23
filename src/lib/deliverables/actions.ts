'use server'

import { z } from 'zod'
import { ok, err, type Result } from '@/lib/result'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import {
  requireVerifiedEgresado,
  requireVerifiedEmpresario,
} from '@/lib/auth/guards'
import { logger } from '@/lib/logger'
import { revalidatePath } from 'next/cache'
import { crearNotificacion } from '@/lib/notifications/create'
import { DEFAULT_LOCALE } from '@/i18n/config'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { buildEntregableEnviadoNotificacion } from './entregable-notificacion-logic'
import { createHash } from 'node:crypto'

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024 // 50 MB; coincide con el límite del bucket
const ENTREGABLES_BUCKET = 'entregables'

const SubirEntregableSchema = z.object({
  idContratacion: z.string().uuid(),
  idProyecto: z.string().uuid(),
  file: z
    .instanceof(File)
    .refine((archivo) => archivo.size > 0, { message: 'archivo_vacio' })
    .refine((archivo) => archivo.size <= MAX_FILE_SIZE_BYTES, {
      message: 'archivo_muy_grande',
    }),
})

type SubirInput = z.infer<typeof SubirEntregableSchema>

const MAX_VERSION_ATTEMPTS = 2

async function registrarEntregable(
  input: SubirInput,
  tipo: 'parcial' | 'final',
): Promise<Result<void>> {
  // Validación de verificación ANTES de tocar el Storage: si el egresado no está
  // verificado, cortamos acá para no subir un archivo huérfano (la policy de
  // Storage de 'entregables' no exige verificación por sí sola).
  const verified = await requireVerifiedEgresado()
  if (!verified.ok) return verified

  const supabase = await createSupabaseServerClient()

  // Dedup por contenido: hash sha-256 del archivo. No se permite subir dos veces
  // el mismo archivo en la contratación. Un archivo corregido (con_cambios) tiene
  // bytes distintos → hash distinto → pasa. El chequeo previo evita subir al
  // Storage en vano; el índice único parcial es el backstop ante carreras.
  const fileBuffer = Buffer.from(await input.file.arrayBuffer())
  const archivoHash = createHash('sha256').update(fileBuffer).digest('hex')

  const { data: duplicado } = await supabase
    .from('entregables')
    .select('id_entregable')
    .eq('id_contratacion', input.idContratacion)
    .eq('archivo_hash', archivoHash)
    .limit(1)
    .maybeSingle()
  if (duplicado) return err('archivo_duplicado')

  // El upload corre en el SERVIDOR a propósito: el cliente browser de Supabase
  // se cuelga al resolver la sesión y nunca emite el request del Storage. Con el
  // cliente de servidor la sesión sale de las cookies y la RLS del bucket aplica
  // igual (la carpeta es el id_contratacion del estudiante).
  const ext = input.file.name.split('.').pop()?.toLowerCase() || 'bin'
  const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  const archivoPath = `${input.idContratacion}/${uniqueSuffix}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from(ENTREGABLES_BUCKET)
    .upload(archivoPath, input.file)

  if (uploadError) {
    logger.error(`registrarEntregable (${tipo}) storage upload failed`, {
      error: uploadError.message,
    })
    return err('storage_error')
  }

  // La versión se calcula como max(version)+1 por contratación. El constraint
  // UNIQUE(id_contratacion, version) garantiza la secuencia; si dos subidas casi
  // simultáneas chocan (23505), recalculamos y reintentamos una vez. Si el insert
  // falla en firme, borramos el archivo recién subido para no dejar huérfanos.
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
      archivo_url: archivoPath,
      archivo_hash: archivoHash,
      version,
      estado: 'enviado',
    })

    if (!insertError) {
      revalidatePath(`/egresado/projects/${input.idProyecto}/entregables`)
      try {
        const adminClient = createSupabaseAdminClient()
        const { data: proyecto } = await adminClient
          .from('proyectos')
          .select('titulo, id_empresario')
          .eq('id_proyecto', input.idProyecto)
          .maybeSingle()
        if (proyecto) {
          const { data: empresario } = await adminClient
            .from('empresarios')
            .select('id_usuario')
            .eq('id_empresario', proyecto.id_empresario)
            .maybeSingle()
          if (empresario?.id_usuario) {
            const notifResult = await crearNotificacion(
              buildEntregableEnviadoNotificacion({
                idUsuarioEmpresario: empresario.id_usuario,
                tituloProyecto: proyecto.titulo,
                idProyecto: input.idProyecto,
              }),
            )
            if (!notifResult.ok) {
              logger.error('registrarEntregable: notificacion fallida', {
                error: notifResult.error,
              })
            }
          }
        }
      } catch (e) {
        logger.error('registrarEntregable: error al notificar empresario', {
          error: e instanceof Error ? e.message : String(e),
        })
      }
      return ok(undefined)
    }

    if (insertError.code === '23505') {
      // Choque del índice (id_contratacion, archivo_hash) = archivo duplicado en
      // carrera: no reintentar, devolver duplicado.
      if (insertError.message.includes('entregables_contratacion_hash_uniq')) {
        await supabase.storage.from(ENTREGABLES_BUCKET).remove([archivoPath])
        return err('archivo_duplicado')
      }
      // Choque de versión: recalcular y reintentar una vez.
      if (attempt < MAX_VERSION_ATTEMPTS) continue
    }

    await supabase.storage.from(ENTREGABLES_BUCKET).remove([archivoPath])
    logger.error(`registrarEntregable (${tipo}) failed`, {
      error: insertError.message,
    })
    return err(
      insertError.code === '23505' ? 'version_conflict' : 'database_error',
    )
  }

  await supabase.storage.from(ENTREGABLES_BUCKET).remove([archivoPath])
  return err('version_conflict')
}

/**
 * Registra un hito parcial (RF-40). Recibe el archivo por `FormData`, lo sube al
 * Storage desde el servidor y crea la fila en `entregables`.
 */
export async function subirHito(formData: FormData): Promise<Result<void>> {
  const parsed = SubirEntregableSchema.safeParse({
    idContratacion: formData.get('idContratacion'),
    idProyecto: formData.get('idProyecto'),
    file: formData.get('file'),
  })
  if (!parsed.success) return err('invalid_input')
  return registrarEntregable(parsed.data, 'parcial')
}

/**
 * Registra el entregable final (RF-41). Mismo patrón que subirHito pero con
 * tipo_entregable='final'.
 */
export async function subirEntregableFinal(
  formData: FormData,
): Promise<Result<void>> {
  const parsed = SubirEntregableSchema.safeParse({
    idContratacion: formData.get('idContratacion'),
    idProyecto: formData.get('idProyecto'),
    file: formData.get('file'),
  })
  if (!parsed.success) return err('invalid_input')
  return registrarEntregable(parsed.data, 'final')
}

const ActualizarUrlSchema = z.object({
  idParticipacion: z.string().uuid(),
  url: z.string().url().max(150).nullable(),
})

/**
 * Actualiza el enlace del proyecto (url_repositorio_proyecto) en la
 * participacion del egresado. Delega en el RPC SECURITY DEFINER que valida
 * propiedad y restringe la escritura a esa columna especifica.
 */
export async function actualizarUrlProyecto(
  input: z.infer<typeof ActualizarUrlSchema>,
): Promise<Result<void>> {
  const parsed = ActualizarUrlSchema.safeParse(input)
  if (!parsed.success) return err('invalid_input')

  const verified = await requireVerifiedEgresado()
  if (!verified.ok) return verified

  const supabase = await createSupabaseServerClient()

  const { error } = await supabase.rpc('actualizar_url_participacion', {
    p_id_participacion: parsed.data.idParticipacion,
    p_url: parsed.data.url,
  })

  if (error) {
    logger.error('actualizarUrlProyecto: rpc failed', { error: error.message })
    return err('database_error')
  }

  return ok(undefined)
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
 * Solo se puede responder cuando estado === 'enviado' | 'en_revision'. Si se
 * APRUEBA un entregable `final`, cierra el ciclo (RF-41) vía el RPC atómico
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

  const verified = await requireVerifiedEmpresario()
  if (!verified.ok) return verified

  const supabase = await createSupabaseServerClient()

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
  if (entregable.estado !== 'enviado' && entregable.estado !== 'en_revision')
    return err('estado_invalido')

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

  const { data: proyectoOwned, error: proyErr } = await supabase
    .from('proyectos')
    .select('id_proyecto, titulo')
    .eq('id_proyecto', participacion.id_proyecto)
    .eq('id_empresario', verified.data.id_empresario)
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
    const { error: comentFinalErr } = await supabase
      .from('comentarios_entregables')
      .insert({
        id_entregable: parsed.data.idEntregable,
        id_autor: verified.data.id_usuario,
        contenido: parsed.data.comentario ?? '',
        tipo_comentario: 'aprobacion',
      })
    if (comentFinalErr) {
      logger.error('responderEntregable: comentario final insert failed', {
        error: comentFinalErr.message,
      })
    }
    if (estudianteNotif?.id_usuario) {
      const notifResult = await crearNotificacion({
        idUsuario: estudianteNotif.id_usuario,
        tipoEvento: 'entregable_aprobado',
        params: { titulo: proyectoOwned.titulo },
        urlDestino: `/${DEFAULT_LOCALE}/egresado/projects/${participacion.id_proyecto}/entregables`,
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
  const { error: comentErr } = await supabase
    .from('comentarios_entregables')
    .insert({
      id_entregable: parsed.data.idEntregable,
      id_autor: verified.data.id_usuario,
      contenido: parsed.data.comentario ?? '',
      tipo_comentario:
        parsed.data.decision === 'aprobado'
          ? ('aprobacion' as const)
          : ('revision_solicitada' as const),
    })
  if (comentErr) {
    logger.error('responderEntregable: comentario insert failed', {
      error: comentErr.message,
    })
  }
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
      urlDestino: `/${DEFAULT_LOCALE}/egresado/projects/${participacion.id_proyecto}/entregables`,
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

const ComentarEntregableSchema = z.object({
  idEntregable: z.string().uuid(),
  contenido: z.string().min(1).max(1000),
})

/**
 * El empresario agrega un comentario libre (aclaración) sobre un entregable (RF-44).
 * Inserta en `comentarios_entregables` con tipo_comentario = 'aclaracion'.
 * Verifica propiedad del proyecto antes de insertar.
 */
export async function comentarEntregable(
  input: z.infer<typeof ComentarEntregableSchema>,
): Promise<Result<void>> {
  const parsed = ComentarEntregableSchema.safeParse(input)
  if (!parsed.success) return err('invalid_input')

  const verified = await requireVerifiedEmpresario()
  if (!verified.ok) return verified

  const supabase = await createSupabaseServerClient()

  const { data: entregable, error: entErr } = await supabase
    .from('entregables')
    .select('id_entregable, id_contratacion')
    .eq('id_entregable', parsed.data.idEntregable)
    .maybeSingle()
  if (entErr || !entregable) return err('entregable_not_found')

  const { data: contratacion, error: contErr } = await supabase
    .from('contrataciones')
    .select('id_participacion')
    .eq('id_contratacion', entregable.id_contratacion)
    .maybeSingle()
  if (contErr || !contratacion) return err('unauthorized')

  const { data: participacion, error: partErr } = await supabase
    .from('participaciones')
    .select('id_proyecto')
    .eq('id_participacion', contratacion.id_participacion)
    .maybeSingle()
  if (partErr || !participacion) return err('unauthorized')

  const { data: proyectoOwned, error: proyErr } = await supabase
    .from('proyectos')
    .select('id_proyecto')
    .eq('id_proyecto', participacion.id_proyecto)
    .eq('id_empresario', verified.data.id_empresario)
    .maybeSingle()
  if (proyErr || !proyectoOwned) return err('unauthorized')

  const { error: insertErr } = await supabase
    .from('comentarios_entregables')
    .insert({
      id_entregable: parsed.data.idEntregable,
      id_autor: verified.data.id_usuario,
      contenido: parsed.data.contenido,
      tipo_comentario: 'aclaracion',
    })
  if (insertErr) {
    logger.error('comentarEntregable: insert failed', {
      error: insertErr.message,
    })
    return err('database_error')
  }

  revalidatePath(`/empresario/proyecto/${participacion.id_proyecto}`)
  return ok(undefined)
}
