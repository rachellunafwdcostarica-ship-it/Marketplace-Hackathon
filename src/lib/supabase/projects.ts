import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import type { PortfolioProject } from '@/types'
import { logger } from '@/lib/logger'

function mapToPortfolioProject(row: Record<string, unknown>): PortfolioProject {
  const result: PortfolioProject = {
    id: String(row.id_portafolio || row.id_participacion || ''),
    title: String(row.titulo || ''),
    description: String(row.descripcion || ''),
    technologies: [], // Not present in DB schema
    completionDate: String(row.fecha || ''),
  }
  if (row.url_repositorio) result.repositoryUrl = String(row.url_repositorio)
  if (row.url_demo) result.demoUrl = String(row.url_demo)
  return result
}

// Helper to map PortfolioProject to DB row
function mapToDBRow(project: Partial<PortfolioProject>) {
  const row: Record<string, unknown> = {}
  if (project.title !== undefined) row.titulo = project.title
  if (project.description !== undefined) row.descripcion = project.description
  if (project.completionDate !== undefined) row.fecha = project.completionDate
  if (project.repositoryUrl !== undefined)
    row.url_repositorio = project.repositoryUrl
  if (project.demoUrl !== undefined) row.url_demo = project.demoUrl
  return row
}

// Fetch all portfolio projects visible to the current user
export async function getProjects(): Promise<PortfolioProject[]> {
  const supabase = createSupabaseBrowserClient()
  const { data, error } = await supabase
    .from('proyectos_portafolio')
    .select('*')
  if (error) {
    logger.error('Error fetching projects:', { error })
    return []
  }
  return (data || []).map((row) =>
    mapToPortfolioProject(row as Record<string, unknown>),
  )
}

// Create a new portfolio project
export async function createProject(
  project: Omit<PortfolioProject, 'id' | 'createdAt'>,
): Promise<PortfolioProject | null> {
  const supabase = createSupabaseBrowserClient()
  const dbRow = mapToDBRow(project)
  // id_estudiante might be required, but we'll try to insert what we have
  const { data, error } = await supabase
    .from('proyectos_portafolio')
    .insert(dbRow as never)
    .select()
    .single()
  if (error) {
    logger.error('Error creating project:', { error })
    return null
  }
  return mapToPortfolioProject(data as Record<string, unknown>)
}

// Update a portfolio project
export async function updateProject(
  id: string,
  updates: Partial<PortfolioProject>,
): Promise<PortfolioProject | null> {
  const supabase = createSupabaseBrowserClient()
  const dbRow = mapToDBRow(updates)
  const { data, error } = await supabase
    .from('proyectos_portafolio')
    .update(dbRow as never)
    .eq('id_portafolio', id)
    .select()
    .single()
  if (error) {
    logger.error('Error updating project:', { error })
    return null
  }
  return mapToPortfolioProject(data as Record<string, unknown>)
}

// Delete a portfolio project
export async function deleteProject(id: string): Promise<boolean> {
  const supabase = createSupabaseBrowserClient()
  const { error } = await supabase
    .from('proyectos_portafolio')
    .delete()
    .eq('id_portafolio', id)
  if (error) {
    logger.error('Error deleting project:', { error })
    return false
  }
  return true
}
