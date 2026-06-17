'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { ok, err, type Result } from '@/lib/result'
import { logger } from '@/lib/logger'
import type { Database } from '@/types/database'

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
        'id_estudiante, id_usuario, descripcion, portafolio_visible_publicamente, titulo_fwd, usuarios(nombre, apellido_1, apellido_2, foto_perfil)',
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
