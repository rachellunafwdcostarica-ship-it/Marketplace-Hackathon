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
  CrearReporteUsuarioSchema,
  ResolverReporteSchema,
  TIPO_A_MOTIVO_STRIKE,
  type CrearReporteUsuarioInput,
  type ResolverReporteInput,
  type AdminReportQueueItem,
} from './schemas'

/**
 * RF-69 — Cualquier usuario autenticado reporta a OTRO usuario por conducta o
 * contenido. Inserta con la sesión del usuario (política reportes_insert_auth:
 * id_reportante = auth.uid()). El objetivo único lo valida Zod (un usuario).
 */
export async function crearReporteUsuario(
  input: CrearReporteUsuarioInput,
): Promise<Result<void>> {
  const parsed = CrearReporteUsuarioSchema.safeParse(input)
  if (!parsed.success) return err('invalid_input')

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return err('unauthorized')

  if (user.id === parsed.data.idReportado) return err('cannot_report_self')

  const { error } = await supabase.from('reportes_moderacion').insert({
    id_reportante: user.id,
    id_reportado: parsed.data.idReportado,
    tipo_reporte: parsed.data.tipoReporte,
    descripcion: parsed.data.descripcion,
  })

  if (error) {
    logger.error('crearReporteUsuario: fallo al insertar reporte', {
      error: error.message,
    })
    return err(error.message)
  }

  return ok(undefined)
}

/**
 * Lista la cola de reportes pendientes/en revisión para el admin (RF-69).
 * Usa el cliente de servicio (como el resto del admin) y resuelve los nombres
 * con una segunda consulta a usuarios, sin embed.
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
      'id_reporte, tipo_reporte, descripcion, estado_moderacion, reportado_at, id_reportante, id_reportado',
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

  const nameById = new Map<string, string>(
    (usuarios ?? []).map((u) => [u.id_usuario, `${u.nombre} ${u.apellido_1}`]),
  )

  const items: AdminReportQueueItem[] = rows.map((r) => ({
    id_reporte: r.id_reporte,
    tipo_reporte: r.tipo_reporte,
    descripcion: r.descripcion,
    estado_moderacion: r.estado_moderacion,
    reportado_at: r.reportado_at,
    id_reportante: r.id_reportante,
    reportante_nombre: nameById.get(r.id_reportante) ?? '',
    id_reportado: r.id_reportado,
    reportado_nombre:
      r.id_reportado === null ? null : (nameById.get(r.id_reportado) ?? null),
  }))

  return ok(items)
}

/**
 * Resuelve un reporte (solo admin): fija estado + resolución + autor/fecha.
 * Si la denuncia procede (resuelto_a_favor), el admin puede sancionar al
 * reportado con un strike, reusando addStrike (contador, suspensión, correo y
 * notificaciones). El strike solo aplica a reportes sobre un usuario.
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
