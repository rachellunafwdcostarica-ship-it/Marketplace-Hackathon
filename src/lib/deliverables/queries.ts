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
    .eq('estado', 'contratada')
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
