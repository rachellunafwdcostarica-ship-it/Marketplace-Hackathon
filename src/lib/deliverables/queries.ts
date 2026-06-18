'use server'

import { ok, err, type Result } from '@/lib/result'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/guards'
import { logger } from '@/lib/logger'

export interface MiContratacion {
  id_contratacion: string
  estado_periodo: string
  fecha_inicio: string | null
  fecha_fin_estimada: string | null
}

export interface EntregablePropio {
  id_entregable: string
  tipo_entregable: 'parcial' | 'final'
  version: number
  archivo_url: string | null
  estado: 'enviado' | 'en_revision' | 'aprobado' | 'con_cambios'
  comentario_empresario: string | null
  cargado_at: string
}

/**
 * Devuelve la contratacion activa del egresado para un proyecto dado,
 * o null si no está contratado. RF-40.
 */
export async function getMiContratacion(
  idProyecto: string,
): Promise<Result<MiContratacion | null>> {
  const roleResult = await requireRole('egresado')
  if (!roleResult.ok) return roleResult

  const supabase = await createSupabaseServerClient()
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) return err('unauthenticated')

  const { data: estudiante, error: estError } = await supabase
    .from('estudiantes')
    .select('id_estudiante')
    .eq('id_usuario', userData.user.id)
    .single()

  if (estError || !estudiante) return err('estudiante_not_found')

  const { data: part, error: partError } = await supabase
    .from('participaciones')
    .select('id_participacion')
    .eq('id_proyecto', idProyecto)
    .eq('id_estudiante', estudiante.id_estudiante)
    .in('estado', ['contratada', 'finalizada'])
    .maybeSingle()

  if (partError) {
    logger.error('getMiContratacion: participacion query failed', {
      error: partError.message,
    })
    return err('database_error')
  }

  if (!part) return ok(null)

  const { data: contratacion, error: contError } = await supabase
    .from('contrataciones')
    .select('id_contratacion, estado_periodo, fecha_inicio, fecha_fin_estimada')
    .eq('id_participacion', part.id_participacion)
    .maybeSingle()

  if (contError) {
    logger.error('getMiContratacion: contratacion query failed', {
      error: contError.message,
    })
    return err('database_error')
  }

  if (!contratacion) return ok(null)

  return ok({
    id_contratacion: contratacion.id_contratacion,
    estado_periodo: contratacion.estado_periodo,
    fecha_inicio: contratacion.fecha_inicio,
    fecha_fin_estimada: contratacion.fecha_fin_estimada,
  })
}

export interface EntregableEmpresario {
  id_entregable: string
  tipo_entregable: 'parcial' | 'final'
  version: number
  archivo_url: string | null
  estado: 'enviado' | 'en_revision' | 'aprobado' | 'con_cambios'
  comentario_empresario: string | null
  cargado_at: string
}

/**
 * Lista los entregables del contratado para un proyecto del empresario (RF-43).
 * Verifica que el caller sea el empresario dueño antes de devolver datos.
 */
export async function getEntregablesDeProyecto(
  idProyecto: string,
): Promise<Result<EntregableEmpresario[]>> {
  const supabase = await createSupabaseServerClient()
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) return err('unauthenticated')

  const { data: empresario, error: empError } = await supabase
    .from('empresarios')
    .select('id_empresario')
    .eq('id_usuario', userData.user.id)
    .maybeSingle()
  if (empError) {
    logger.error('getEntregablesDeProyecto: empresario query failed', {
      error: empError.message,
    })
    return err('database_error')
  }
  if (!empresario) return err('unauthorized')

  const { data: proyecto, error: proyError } = await supabase
    .from('proyectos')
    .select('id_proyecto')
    .eq('id_proyecto', idProyecto)
    .eq('id_empresario', empresario.id_empresario)
    .maybeSingle()
  if (proyError) {
    logger.error('getEntregablesDeProyecto: proyecto query failed', {
      error: proyError.message,
    })
    return err('database_error')
  }
  if (!proyecto) return err('unauthorized')

  const { data: participacion, error: partError } = await supabase
    .from('participaciones')
    .select('id_participacion')
    .eq('id_proyecto', idProyecto)
    .eq('estado', 'contratada')
    .maybeSingle()
  if (partError) {
    logger.error('getEntregablesDeProyecto: participacion query failed', {
      error: partError.message,
    })
    return err('database_error')
  }
  if (!participacion) return ok([])

  const { data: contratacion, error: contError } = await supabase
    .from('contrataciones')
    .select('id_contratacion')
    .eq('id_participacion', participacion.id_participacion)
    .maybeSingle()
  if (contError) {
    logger.error('getEntregablesDeProyecto: contratacion query failed', {
      error: contError.message,
    })
    return err('database_error')
  }
  if (!contratacion) return ok([])

  const { data, error } = await supabase
    .from('entregables')
    .select(
      'id_entregable, tipo_entregable, version, archivo_url, estado, comentario_empresario, cargado_at',
    )
    .eq('id_contratacion', contratacion.id_contratacion)
    .order('cargado_at', { ascending: false })
  if (error) {
    logger.error('getEntregablesDeProyecto: entregables query failed', {
      error: error.message,
    })
    return err('database_error')
  }

  return ok((data ?? []) as EntregableEmpresario[])
}

/**
 * Genera una URL firmada (1h) para que el empresario descargue un entregable
 * del bucket privado. Verifica propiedad antes de emitir la URL (RF-43).
 */
export async function getSignedUrlEntregable(
  idEntregable: string,
): Promise<Result<{ url: string }>> {
  const supabase = await createSupabaseServerClient()
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) return err('unauthenticated')

  const { data: entregable, error: entErr } = await supabase
    .from('entregables')
    .select('id_entregable, archivo_url, id_contratacion')
    .eq('id_entregable', idEntregable)
    .maybeSingle()
  if (entErr) {
    logger.error('getSignedUrlEntregable: entregable query failed', {
      error: entErr.message,
    })
    return err('database_error')
  }
  if (!entregable?.archivo_url) return err('entregable_not_found')

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

  const { data: empresario, error: empErr } = await supabase
    .from('empresarios')
    .select('id_empresario')
    .eq('id_usuario', userData.user.id)
    .maybeSingle()
  if (empErr || !empresario) return err('unauthorized')

  const { data: proyectoOwned, error: proyErr } = await supabase
    .from('proyectos')
    .select('id_proyecto')
    .eq('id_proyecto', participacion.id_proyecto)
    .eq('id_empresario', empresario.id_empresario)
    .maybeSingle()
  if (proyErr || !proyectoOwned) return err('unauthorized')

  const { data: signed, error: signErr } = await supabase.storage
    .from('entregables')
    .createSignedUrl(entregable.archivo_url, 3600)
  if (signErr) {
    logger.error('getSignedUrlEntregable: storage error', {
      error: signErr.message,
    })
    return err('storage_error')
  }
  if (!signed?.signedUrl) return err('storage_error')

  return ok({ url: signed.signedUrl })
}

/**
 * Lista los entregables del egresado para una contratacion. RF-40.
 */
export async function getMisEntregables(
  idContratacion: string,
): Promise<Result<EntregablePropio[]>> {
  const roleResult = await requireRole('egresado')
  if (!roleResult.ok) return roleResult

  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from('entregables')
    .select(
      'id_entregable, tipo_entregable, version, archivo_url, estado, comentario_empresario, cargado_at',
    )
    .eq('id_contratacion', idContratacion)
    .order('cargado_at', { ascending: false })

  if (error) {
    logger.error('getMisEntregables failed', { error: error.message })
    return err('database_error')
  }

  return ok((data ?? []) as EntregablePropio[])
}
