import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import type { PortfolioProject } from '@/types'

// Fetch all portfolio projects visible to the current user
export async function getProjects(): Promise<PortfolioProject[]> {
  const supabase = createSupabaseBrowserClient()
  const { data, error } = await supabase
    .from('proyectos_portafolio')
    .select('*')
  if (error) {
    console.error('Error fetching projects:', error)
    return []
  }
  return data as PortfolioProject[]
}

// Create a new portfolio project
export async function createProject(
  project: Omit<PortfolioProject, 'id' | 'createdAt'>,
): Promise<PortfolioProject | null> {
  const supabase = createSupabaseBrowserClient()
  const { data, error } = await supabase
    .from('proyectos_portafolio')
    .insert({
      ...project,
      created_at: new Date().toISOString(),
    })
    .select()
    .single()
  if (error) {
    console.error('Error creating project:', error)
    return null
  }
  return data as PortfolioProject
}

// Update a portfolio project
export async function updateProject(
  id: string,
  updates: Partial<PortfolioProject>,
): Promise<PortfolioProject | null> {
  const supabase = createSupabaseBrowserClient()
  const { data, error } = await supabase
    .from('proyectos_portafolio')
    .update({ ...updates })
    .eq('id', id)
    .select()
    .single()
  if (error) {
    console.error('Error updating project:', error)
    return null
  }
  return data as PortfolioProject
}

// Delete a portfolio project
export async function deleteProject(id: string): Promise<boolean> {
  const supabase = createSupabaseBrowserClient()
  const { error } = await supabase
    .from('proyectos_portafolio')
    .delete()
    .eq('id', id)
  if (error) {
    console.error('Error deleting project:', error)
    return false
  }
  return true
}
