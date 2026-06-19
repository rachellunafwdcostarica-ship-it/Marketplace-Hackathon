import 'server-only'

import { unstable_rethrow } from 'next/navigation'
import type { QueryData } from '@supabase/supabase-js'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { ok, err, type Result } from '@/lib/result'
import type { Project } from '@/types'
import { logger } from '@/lib/logger'
import { estadoToStatus } from './status'
import { durationInDays } from './duration'

type ServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>

const PROYECTO_SELECT = `
  *,
  empresarios (nombre_empresa),
  proyecto_tecnologias (
    tecnologias (nombre)
  )
` as const

function selectProyectos(supabase: ServerClient) {
  return supabase.from('proyectos').select(PROYECTO_SELECT)
}

type ProyectoRow = QueryData<ReturnType<typeof selectProyectos>>[number]

/** Mapea una fila de Supabase (tipo inferido del `.select`) a la interfaz `Project`. */
function mapProject(row: ProyectoRow): Project {
  const stack: string[] = []
  for (const pt of row.proyecto_tecnologias) {
    if (pt.tecnologias?.nombre) stack.push(pt.tecnologias.nombre)
  }

  return {
    id: row.id_proyecto,
    title: row.titulo,
    companyId: row.id_empresario,
    // El nombre de empresa siempre viene (FK NOT NULL); si faltara, la UI rotula
    // el vacío vía i18n (sin string hardcodeado acá, reglas.md §4).
    companyName: row.empresarios?.nombre_empresa ?? '',
    description: row.descripcion,
    stack,
    durationDays: durationInDays(row.fecha_publicacion, row.fecha_cierre),
    budget: row.presupuesto_max ?? row.presupuesto_min ?? 0,
    mode: row.modalidad,
    startDate: row.fecha_publicacion ?? row.created_at,
    status: estadoToStatus(row.estado),
    createdAt: row.created_at,
  }
}

/**
 * Proyectos activos del marketplace (estados `abierto` o `en_recepcion`).
 */
export async function getMarketplaceProjects(): Promise<
  Result<Project[], string>
> {
  try {
    const supabase = await createSupabaseServerClient()

    const { data, error } = await selectProyectos(supabase)
      .eq('is_active', true)
      .in('estado', ['abierto', 'en_recepcion'])
      .order('created_at', { ascending: false })

    if (error) {
      logger.error('Error fetching marketplace projects', {
        error: error.message,
      })
      return err('database_error')
    }

    return ok(data.map(mapProject))
  } catch (error) {
    unstable_rethrow(error)
    logger.error('Unexpected error fetching marketplace projects', { error })
    return err('unexpected_error')
  }
}

/**
 * Detalle de un proyecto específico.
 */
export async function getMarketplaceProjectById(
  id: string,
): Promise<Result<Project, string>> {
  try {
    const supabase = await createSupabaseServerClient()

    const { data, error } = await selectProyectos(supabase)
      .eq('id_proyecto', id)
      .single()

    if (error) {
      logger.error('Error fetching project by ID', { id, error: error.message })
      return err(error.code === 'PGRST116' ? 'not_found' : 'database_error')
    }

    return ok(mapProject(data))
  } catch (error) {
    unstable_rethrow(error)
    logger.error('Unexpected error fetching project by id', { error })
    return err('unexpected_error')
  }
}

/**
 * Verifica si el egresado actual ya aplicó a este proyecto.
 */
export async function checkIfApplied(
  projectId: string,
): Promise<Result<boolean, string>> {
  try {
    const supabase = await createSupabaseServerClient()

    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData.user) return err('unauthenticated')

    const { data: estudiante, error: estError } = await supabase
      .from('estudiantes')
      .select('id_estudiante')
      .eq('id_usuario', userData.user.id)
      .single()

    if (estError || !estudiante) return err('estudiante_not_found')

    const { data: participacion, error: partError } = await supabase
      .from('participaciones')
      .select('id_participacion')
      .eq('id_proyecto', projectId)
      .eq('id_estudiante', estudiante.id_estudiante)
      .maybeSingle()

    if (partError) {
      logger.error('Error checking application status', {
        error: partError.message,
      })
      return err('database_error')
    }

    return ok(!!participacion)
  } catch (error) {
    unstable_rethrow(error)
    logger.error('Unexpected error checking application status', { error })
    return err('unexpected_error')
  }
}
