import 'server-only'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { ok, err, type Result } from '@/lib/result'
import { Project, WorkMode, ProjectStatus } from '@/types'
import { Database } from '@/types/database'
import { logger } from '@/lib/logger'

type SupabaseProjectRow = Database['public']['Tables']['proyectos']['Row']
type SupabaseEmpresarioRow = Database['public']['Tables']['empresarios']['Row']

interface ProjectWithRelations extends SupabaseProjectRow {
  empresarios: { nombre_empresa: string } | { nombre_empresa: string }[] | null
  proyecto_tecnologias?: { tecnologias: { nombre: string } | null }[]
}

/**
 * Mapea una fila de Supabase a la interfaz Project de la aplicación
 */
function mapProject(row: ProjectWithRelations): Project {
  // Asegurarnos de sacar el nombre de la empresa, considerando que empresarios puede ser array u objeto
  let companyName = 'Empresa Desconocida'
  if (row.empresarios) {
    if (Array.isArray(row.empresarios) && row.empresarios.length > 0) {
      companyName = row.empresarios[0]?.nombre_empresa ?? 'Empresa Desconocida'
    } else if ('nombre_empresa' in row.empresarios) {
      companyName = row.empresarios.nombre_empresa
    }
  }

  // Mapear tecnologías si vienen anidadas
  const stack: string[] = []
  if (row.proyecto_tecnologias) {
    row.proyecto_tecnologias.forEach((pt) => {
      if (pt.tecnologias?.nombre) {
        stack.push(pt.tecnologias.nombre)
      }
    })
  }

  // Fallbacks para datos no presentes en BD
  const mode = (row.modalidad || 'remoto') as WorkMode
  const status = (row.estado || 'draft') as ProjectStatus
  const budget = row.presupuesto_max || row.presupuesto_min || 0

  return {
    id: row.id_proyecto,
    title: row.titulo,
    companyId: row.id_empresario,
    companyName,
    description: row.descripcion,
    stack,
    duration: '1 mes', // TODO: Ajustar si se agrega duración exacta en BD
    budget,
    mode,
    startDate: row.fecha_publicacion || row.created_at,
    status,
    createdAt: row.created_at,
  }
}

/**
 * Obtiene los proyectos activos del marketplace (solo los en estado 'abierto' o 'en_recepcion')
 */
export async function getMarketplaceProjects(): Promise<
  Result<Project[], string>
> {
  try {
    const supabase = await createSupabaseServerClient()

    const { data, error } = await supabase
      .from('proyectos')
      .select(
        `
        *,
        empresarios (nombre_empresa),
        proyecto_tecnologias (
          tecnologias (nombre)
        )
      `,
      )
      .eq('is_active', true)
      .in('estado', ['abierto', 'en_recepcion'])
      .order('created_at', { ascending: false })

    if (error) {
      logger.error('Error fetching marketplace projects', {
        error: error.message,
      })
      return err('database_error')
    }

    const projects: Project[] = (data as ProjectWithRelations[]).map(mapProject)
    return ok(projects)
  } catch (error) {
    logger.error('Unexpected error fetching marketplace projects', { error })
    return err('unexpected_error')
  }
}

/**
 * Obtiene los detalles de un proyecto específico
 */
export async function getMarketplaceProjectById(
  id: string,
): Promise<Result<Project, string>> {
  try {
    const supabase = await createSupabaseServerClient()

    const { data, error } = await supabase
      .from('proyectos')
      .select(
        `
        *,
        empresarios (nombre_empresa),
        proyecto_tecnologias (
          tecnologias (nombre)
        )
      `,
      )
      .eq('id_proyecto', id)
      .single()

    if (error) {
      logger.error('Error fetching project by ID', { id, error: error.message })
      return err(error.code === 'PGRST116' ? 'not_found' : 'database_error')
    }

    return ok(mapProject(data as ProjectWithRelations))
  } catch (error) {
    logger.error('Unexpected error fetching project by id', { error })
    return err('unexpected_error')
  }
}

/**
 * Verifica si el egresado actual ya aplicó a este proyecto
 */
export async function checkIfApplied(
  projectId: string,
): Promise<Result<boolean, string>> {
  try {
    const supabase = await createSupabaseServerClient()

    // Obtener ID del usuario autenticado
    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData.user) return err('unauthenticated')

    // Obtener el ID del estudiante (egresado)
    const { data: estudiante, error: estError } = await supabase
      .from('estudiantes')
      .select('id_estudiante')
      .eq('id_usuario', userData.user.id)
      .single()

    if (estError || !estudiante) return err('estudiante_not_found')

    // Revisar si existe participacion
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
    logger.error('Unexpected error checking application status', { error })
    return err('unexpected_error')
  }
}
