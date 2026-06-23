'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { requireRole } from '@/lib/auth/guards'
import { getCurrentUser } from '@/lib/auth/dal'
import { addStrike } from '@/lib/admin/strike-actions'
import { ok, err, type Result } from '@/lib/result'
import { logger } from '@/lib/logger'
import {
  CrearReporteSchema,
  ResolverReporteSchema,
  TARGET_TIPO_TO_COLUMN,
  TIPO_A_MOTIVO_STRIKE,
  type TipoReporte,
  type ReportTarget,
  type CrearReporteInput,
  type ResolverReporteInput,
  type AdminReportQueueItem,
} from './schemas'

const MENSAJE_SNIPPET_MAX = 80

/**
 * RF-69 — Cualquier usuario autenticado denuncia un objetivo (usuario, proyecto,
 * mensaje, entregable o portafolio). Inserta con la sesión del usuario (política
 * reportes_insert_auth: id_reportante = auth.uid()). Zod garantiza exactamente
 * un objetivo; el objetivo se mapea a su columna polimórfica.
 */
export async function crearReporte(
  input: CrearReporteInput,
): Promise<Result<void>> {
  const parsed = CrearReporteSchema.safeParse(input)
  if (!parsed.success) return err('invalid_input')

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return err('unauthorized')

  if (
    parsed.data.targetTipo === 'usuario' &&
    user.id === parsed.data.targetId
  ) {
    return err('cannot_report_self')
  }

  const insertRow: {
    id_reportante: string
    tipo_reporte: TipoReporte
    descripcion: string
    id_reportado: string | null
    id_proyecto: string | null
    id_mensaje: string | null
    id_entregable: string | null
    id_portafolio: string | null
  } = {
    id_reportante: user.id,
    tipo_reporte: parsed.data.tipoReporte,
    descripcion: parsed.data.descripcion,
    id_reportado: null,
    id_proyecto: null,
    id_mensaje: null,
    id_entregable: null,
    id_portafolio: null,
  }
  insertRow[TARGET_TIPO_TO_COLUMN[parsed.data.targetTipo]] =
    parsed.data.targetId

  const { error } = await supabase.from('reportes_moderacion').insert(insertRow)

  if (error) {
    logger.error('crearReporte: fallo al insertar reporte', {
      error: error.message,
    })
    return err(error.message)
  }

  return ok(undefined)
}

/**
 * Lista la cola de reportes pendientes/en revisión para el admin (RF-69).
 * Usa el cliente de servicio (como el resto del admin) y resuelve el objetivo
 * polimórfico (usuario → nombre, proyecto → título) con consultas separadas.
 */
export async function listarColaReportes(): Promise<
  Result<AdminReportQueueItem[]>
> {
  const authResult = await requireRole('administrador')
  if (!authResult.ok) return authResult

  const adminClient = createSupabaseAdminClient()
  const { data, error } = await adminClient
    .from('reportes_moderacion')
    .select(
      'id_reporte, tipo_reporte, descripcion, estado_moderacion, reportado_at, id_reportante, id_reportado, id_proyecto, id_mensaje, id_entregable, id_portafolio',
    )
    .in('estado_moderacion', ['pendiente', 'en_revision'])
    .order('reportado_at', { ascending: false })

  if (error) {
    logger.error('listarColaReportes: fallo al leer reportes', {
      error: error.message,
    })
    return err(error.message)
  }

  const rows = data ?? []
  if (rows.length === 0) return ok([])

  const userIds = [
    ...new Set(
      rows
        .flatMap((r) => [r.id_reportante, r.id_reportado])
        .filter((id): id is string => id !== null),
    ),
  ]

  const { data: usuarios, error: usersError } = await adminClient
    .from('usuarios')
    .select('id_usuario, nombre, apellido_1')
    .in('id_usuario', userIds)

  if (usersError) {
    logger.error('listarColaReportes: fallo al leer usuarios', {
      error: usersError.message,
    })
    return err(usersError.message)
  }

  const userNameById = new Map<string, string>(
    (usuarios ?? []).map((u) => [u.id_usuario, `${u.nombre} ${u.apellido_1}`]),
  )

  const proyectoIds = [
    ...new Set(
      rows.map((r) => r.id_proyecto).filter((id): id is string => id !== null),
    ),
  ]
  const proyectoTituloById = new Map<string, string>()
  if (proyectoIds.length > 0) {
    const { data: proyectos, error: projError } = await adminClient
      .from('proyectos')
      .select('id_proyecto, titulo')
      .in('id_proyecto', proyectoIds)
    if (projError) {
      logger.error('listarColaReportes: fallo al leer proyectos', {
        error: projError.message,
      })
      return err(projError.message)
    }
    for (const p of proyectos ?? []) {
      proyectoTituloById.set(p.id_proyecto, p.titulo)
    }
  }

  const mensajeIds = [
    ...new Set(
      rows.map((r) => r.id_mensaje).filter((id): id is string => id !== null),
    ),
  ]
  const mensajeSnippetById = new Map<string, string>()
  if (mensajeIds.length > 0) {
    const { data: mensajes, error: msgError } = await adminClient
      .from('mensajes')
      .select('id_mensaje, contenido')
      .in('id_mensaje', mensajeIds)
    if (msgError) {
      logger.error('listarColaReportes: fallo al leer mensajes', {
        error: msgError.message,
      })
      return err(msgError.message)
    }
    for (const m of mensajes ?? []) {
      mensajeSnippetById.set(
        m.id_mensaje,
        m.contenido.length > MENSAJE_SNIPPET_MAX
          ? `${m.contenido.slice(0, MENSAJE_SNIPPET_MAX)}…`
          : m.contenido,
      )
    }
  }

  const entregableIds = [
    ...new Set(
      rows
        .map((r) => r.id_entregable)
        .filter((id): id is string => id !== null),
    ),
  ]
  const entregableLabelById = new Map<string, string>()
  if (entregableIds.length > 0) {
    const { data: entregables, error: entError } = await adminClient
      .from('entregables')
      .select('id_entregable, tipo_entregable, version')
      .in('id_entregable', entregableIds)
    if (entError) {
      logger.error('listarColaReportes: fallo al leer entregables', {
        error: entError.message,
      })
      return err(entError.message)
    }
    for (const e of entregables ?? []) {
      entregableLabelById.set(
        e.id_entregable,
        `${e.tipo_entregable} v${e.version}`,
      )
    }
  }

  const items: AdminReportQueueItem[] = rows.map((r) => {
    let target: ReportTarget | null = null
    if (r.id_reportado !== null) {
      target = {
        tipo: 'usuario',
        id: r.id_reportado,
        nombre: userNameById.get(r.id_reportado) ?? '',
      }
    } else if (r.id_proyecto !== null) {
      target = {
        tipo: 'proyecto',
        id: r.id_proyecto,
        nombre: proyectoTituloById.get(r.id_proyecto) ?? '',
      }
    } else if (r.id_mensaje !== null) {
      target = {
        tipo: 'mensaje',
        id: r.id_mensaje,
        nombre: mensajeSnippetById.get(r.id_mensaje) ?? '',
      }
    } else if (r.id_entregable !== null) {
      target = {
        tipo: 'entregable',
        id: r.id_entregable,
        nombre: entregableLabelById.get(r.id_entregable) ?? '',
      }
    } else if (r.id_portafolio !== null) {
      target = {
        tipo: 'portafolio',
        id: r.id_portafolio,
        nombre: r.id_portafolio,
      }
    }

    return {
      id_reporte: r.id_reporte,
      tipo_reporte: r.tipo_reporte,
      descripcion: r.descripcion,
      estado_moderacion: r.estado_moderacion,
      reportado_at: r.reportado_at,
      id_reportante: r.id_reportante,
      reportante_nombre: userNameById.get(r.id_reportante) ?? '',
      target,
    }
  })

  return ok(items)
}

/**
 * Resuelve un reporte (solo admin): fija estado + resolución + autor/fecha.
 * Si la denuncia procede (resuelto_a_favor) y el objetivo es un usuario, el
 * admin puede sancionarlo con un strike reusando addStrike (contador,
 * suspensión, correo y notificaciones).
 */
export async function resolverReporte(
  input: ResolverReporteInput,
): Promise<Result<void>> {
  const parsed = ResolverReporteSchema.safeParse(input)
  if (!parsed.success) return err('invalid_input')

  const authResult = await requireRole('administrador')
  if (!authResult.ok) return authResult

  const me = await getCurrentUser()
  if (!me) return err('unauthenticated')

  const adminClient = createSupabaseAdminClient()

  const { data: reporte, error: readError } = await adminClient
    .from('reportes_moderacion')
    .select('id_reporte, id_reportado, tipo_reporte, estado_moderacion')
    .eq('id_reporte', parsed.data.idReporte)
    .single()

  if (readError || !reporte) return err('report_not_found')
  if (
    reporte.estado_moderacion !== 'pendiente' &&
    reporte.estado_moderacion !== 'en_revision'
  ) {
    return err('report_already_resolved')
  }

  const { error: updateError } = await adminClient
    .from('reportes_moderacion')
    .update({
      estado_moderacion: parsed.data.decision,
      resolucion: parsed.data.resolucion,
      resuelto_por: me.id,
      resuelto_at: new Date().toISOString(),
    })
    .eq('id_reporte', parsed.data.idReporte)

  if (updateError) {
    logger.error('resolverReporte: fallo al actualizar', {
      error: updateError.message,
    })
    return err(updateError.message)
  }

  if (
    parsed.data.decision === 'resuelto_a_favor' &&
    parsed.data.aplicarStrike &&
    reporte.id_reportado !== null
  ) {
    const motivo = TIPO_A_MOTIVO_STRIKE[reporte.tipo_reporte]
    const strikeResult = await addStrike(
      reporte.id_reportado,
      motivo,
      parsed.data.resolucion,
    )
    if (!strikeResult.ok) {
      logger.error('resolverReporte: reporte resuelto pero falló el strike', {
        idReporte: parsed.data.idReporte,
        error: strikeResult.error,
      })
      return err('resolved_but_strike_failed')
    }
  }

  revalidatePath('/admin/moderation', 'page')
  return ok(undefined)
}
