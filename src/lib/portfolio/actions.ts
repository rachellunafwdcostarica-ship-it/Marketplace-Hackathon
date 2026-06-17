'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { ok, err, type Result } from '@/lib/result'
import { logger } from '@/lib/logger'
import type { Database } from '@/types/database'
import type { StudentSkill, PortfolioProject } from '@/types'

export interface StudentProfileView {
  id_estudiante: string
  id_usuario: string
  descripcion: string
  portafolio_visible_publicamente: boolean
  firstName: string
  lastName1: string
  lastName2: string
  profilePhoto: string
  tituloFwd: string
  skills: StudentSkill[]
  projects: PortfolioProject[]
}

export type StudentProfileInput = Partial<
  Pick<StudentProfileView, 'descripcion' | 'portafolio_visible_publicamente'>
>

/**
 * Obtiene el perfil del estudiante para el usuario autenticado actual.
 */
export async function getStudentProfile(): Promise<
  Result<StudentProfileView | null>
> {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return err('unauthorized')
    }

    const { data: estudiante, error } = await supabase
      .from('estudiantes')
      .select(
        `
        id_estudiante, 
        id_usuario, 
        descripcion, 
        portafolio_visible_publicamente, 
        titulo_fwd, 
        usuarios!estudiantes_id_usuario_fkey(nombre, apellido_1, apellido_2, foto_perfil),
        habilidades_tecnicas(nivel, id_tecnologia, tecnologias(nombre)),
        proyectos_portafolio(id_portafolio, titulo, descripcion, url_repositorio, url_demo, fecha, portafolio_tecnologias(tecnologias(nombre)))
        `,
      )
      .eq('id_usuario', user.id)
      .maybeSingle()

    if (error) {
      logger.error(
        'getStudentProfile: fallo al leer el registro en base de datos',
        { error: error.message },
      )
      return err(error.message)
    }

    if (!estudiante) {
      return ok(null)
    }

    // El join devuelve un objeto o arreglo según la relación; en 1:1 es un objeto.
    const userInfo = estudiante.usuarios as unknown as {
      nombre: string | null
      apellido_1: string | null
      apellido_2: string | null
      foto_perfil: string | null
    } | null

    // Mapeo de habilidades
    const rawSkills =
      (estudiante.habilidades_tecnicas as unknown as Array<{
        id_tecnologia: string
        nivel: 'basico' | 'intermedio' | 'avanzado'
        tecnologias: { nombre: string } | null
      }>) || []

    const skillsList = rawSkills.map((h) => ({
      id: h.id_tecnologia,
      name: h.tecnologias?.nombre ?? 'Desconocida',
      level: h.nivel,
    }))

    // Mapeo de proyectos
    const rawProjects =
      (estudiante.proyectos_portafolio as unknown as Array<{
        id_portafolio: string
        titulo: string
        descripcion: string | null
        fecha: string | null
        url_repositorio: string | null
        url_demo: string | null
        portafolio_tecnologias: Array<{
          tecnologias: { nombre: string } | null
        }> | null
      }>) || []

    const projectsList = rawProjects.map((p) => {
      const techNames = (p.portafolio_tecnologias || [])
        .map((pt) => pt.tecnologias?.nombre)
        .filter(Boolean)
      return {
        id: p.id_portafolio,
        title: p.titulo,
        description: p.descripcion ?? '',
        technologies: techNames as string[],
        completionDate: p.fecha ?? '',
        repositoryUrl: p.url_repositorio ?? undefined,
        demoUrl: p.url_demo ?? undefined,
      }
    })

    const profile: StudentProfileView = {
      id_estudiante: estudiante.id_estudiante,
      id_usuario: estudiante.id_usuario,
      descripcion: estudiante.descripcion ?? '',
      portafolio_visible_publicamente:
        estudiante.portafolio_visible_publicamente,
      firstName: userInfo?.nombre ?? '',
      lastName1: userInfo?.apellido_1 ?? '',
      lastName2: userInfo?.apellido_2 ?? '',
      profilePhoto: userInfo?.foto_perfil ?? '',
      tituloFwd: estudiante.titulo_fwd ?? '',
      skills: skillsList,
      projects: projectsList,
    }

    return ok(profile)
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : 'unexpected_error'
    logger.error('getStudentProfile: error inesperado', { error: errorMsg })
    return err(errorMsg)
  }
}

/**
 * Guarda o actualiza el perfil del estudiante para el usuario autenticado actual.
 */
export async function saveStudentProfile(
  profile: StudentProfileInput,
): Promise<Result<void>> {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return err('unauthorized')
    }

    const estudianteProfile: Database['public']['Tables']['estudiantes']['Insert'] =
      {
        id_usuario: user.id,
        descripcion: profile.descripcion ?? null,
        portafolio_visible_publicamente:
          profile.portafolio_visible_publicamente ?? true,
      }

    const { error: estudianteError } = await supabase
      .from('estudiantes')
      .upsert(estudianteProfile, { onConflict: 'id_usuario' })

    if (estudianteError) {
      logger.error(
        'saveStudentProfile: fallo al realizar upsert en estudiantes',
        { error: estudianteError.message },
      )
      return err(estudianteError.message)
    }

    return ok(undefined)
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : 'unexpected_error'
    logger.error('saveStudentProfile: error inesperado', { error: errorMsg })
    return err(errorMsg)
  }
}

// ----------------------------------------------------------------------------
// Habilidades (Skills)
// ----------------------------------------------------------------------------

export async function addStudentSkill(
  name: string,
  level: 'basico' | 'intermedio' | 'avanzado',
): Promise<Result<void>> {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return err('unauthorized')

    // Obtener id_estudiante
    const { data: estData } = await supabase
      .from('estudiantes')
      .select('id_estudiante')
      .eq('id_usuario', user.id)
      .single()
    if (!estData) return err('estudiante_not_found')

    // Buscar o crear tecnología
    let id_tecnologia: string
    const { data: techData } = await supabase
      .from('tecnologias')
      .select('id_tecnologia')
      .ilike('nombre', name)
      .maybeSingle()

    if (techData) {
      id_tecnologia = techData.id_tecnologia
    } else {
      const { data: newTech, error: newTechErr } = await supabase
        .from('tecnologias')
        .insert({ nombre: name, is_active: true })
        .select('id_tecnologia')
        .single()
      if (newTechErr) return err(newTechErr.message)
      id_tecnologia = newTech.id_tecnologia
    }

    // Insertar en habilidades_tecnicas
    const { error: insertErr } = await supabase
      .from('habilidades_tecnicas')
      .upsert(
        {
          id_estudiante: estData.id_estudiante,
          id_tecnologia,
          nivel: level,
        },
        { onConflict: 'id_estudiante,id_tecnologia' },
      )

    if (insertErr) return err(insertErr.message)

    return ok(undefined)
  } catch (e) {
    return err(e instanceof Error ? e.message : 'unexpected_error')
  }
}

export async function deleteStudentSkill(
  id_tecnologia: string,
): Promise<Result<void>> {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return err('unauthorized')

    const { data: estData } = await supabase
      .from('estudiantes')
      .select('id_estudiante')
      .eq('id_usuario', user.id)
      .single()
    if (!estData) return err('estudiante_not_found')

    const { error } = await supabase
      .from('habilidades_tecnicas')
      .delete()
      .eq('id_estudiante', estData.id_estudiante)
      .eq('id_tecnologia', id_tecnologia)

    if (error) return err(error.message)
    return ok(undefined)
  } catch (e) {
    return err(e instanceof Error ? e.message : 'unexpected_error')
  }
}

// ----------------------------------------------------------------------------
// Proyectos (Projects)
// ----------------------------------------------------------------------------

export async function savePortfolioProject(
  projectData: Omit<PortfolioProject, 'id'>,
  projectId?: string,
): Promise<Result<void>> {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return err('unauthorized')

    const { data: estData } = await supabase
      .from('estudiantes')
      .select('id_estudiante')
      .eq('id_usuario', user.id)
      .single()
    if (!estData) return err('estudiante_not_found')

    const payload = {
      id_estudiante: estData.id_estudiante,
      titulo: projectData.title,
      descripcion: projectData.description,
      fecha: projectData.completionDate,
      url_repositorio: projectData.repositoryUrl || null,
      url_demo: projectData.demoUrl || null,
      origen: 'independiente' as const,
      is_active: true,
    }

    let id_portafolio = projectId
    if (projectId) {
      // Update
      const { error } = await supabase
        .from('proyectos_portafolio')
        .update(payload)
        .eq('id_portafolio', projectId)
      if (error) return err(error.message)
    } else {
      // Insert
      const { data: newProj, error } = await supabase
        .from('proyectos_portafolio')
        .insert(payload)
        .select('id_portafolio')
        .single()
      if (error) return err(error.message)
      id_portafolio = newProj.id_portafolio
    }

    // Actualizar tecnologías del proyecto
    if (id_portafolio) {
      // 1. Borrar anteriores
      await supabase
        .from('portafolio_tecnologias')
        .delete()
        .eq('id_portafolio', id_portafolio)

      // 2. Insertar nuevas
      for (const techName of projectData.technologies) {
        if (!techName.trim()) continue

        let id_tecnologia: string
        const { data: techData } = await supabase
          .from('tecnologias')
          .select('id_tecnologia')
          .ilike('nombre', techName.trim())
          .maybeSingle()
        if (techData) {
          id_tecnologia = techData.id_tecnologia
        } else {
          const { data: newTech } = await supabase
            .from('tecnologias')
            .insert({ nombre: techName.trim(), is_active: true })
            .select('id_tecnologia')
            .single()
          if (!newTech) continue
          id_tecnologia = newTech.id_tecnologia
        }

        await supabase.from('portafolio_tecnologias').insert({
          id_portafolio,
          id_tecnologia,
        })
      }
    }

    return ok(undefined)
  } catch (e) {
    return err(e instanceof Error ? e.message : 'unexpected_error')
  }
}

export async function deletePortfolioProject(
  id_portafolio: string,
): Promise<Result<void>> {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return err('unauthorized')

    const { error } = await supabase
      .from('proyectos_portafolio')
      .delete()
      .eq('id_portafolio', id_portafolio)
    if (error) return err(error.message)

    return ok(undefined)
  } catch (e) {
    return err(e instanceof Error ? e.message : 'unexpected_error')
  }
}
