'use server'

import { z } from 'zod'
import { ok, err, type Result } from '@/lib/result'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/guards'
import { logger } from '@/lib/logger'
import { revalidatePath } from 'next/cache'

const RateCompanySchema = z.object({
  idEmpresario: z.string().uuid(),
  idContratacion: z.string().uuid().optional(),
  puntuacion: z.number().int().min(1).max(5),
  comentario: z.string().max(1000).optional(),
})

export type RateCompanyInput = z.infer<typeof RateCompanySchema>

/**
 * Inserta una calificación para el empresario por parte del egresado (RF-49).
 * Permite calificar de forma general (sin contrato/postulación previa) o vinculada a un contrato.
 * Garantiza que un egresado califique como máximo una única vez a un empresario.
 */
export async function rateCompany(
  input: RateCompanyInput,
): Promise<Result<void>> {
  const parsed = RateCompanySchema.safeParse(input)
  if (!parsed.success) return err('invalid_input')

  const roleResult = await requireRole('egresado')
  if (!roleResult.ok) return roleResult

  const supabase = await createSupabaseServerClient()

  // Obtener el ID del estudiante (egresado) autenticado
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) return err('unauthenticated')

  const { data: estudiante, error: estError } = await supabase
    .from('estudiantes')
    .select('id_estudiante')
    .eq('id_usuario', userData.user.id)
    .maybeSingle()

  if (estError || !estudiante) return err('unauthorized')

  // Si se proporciona un contrato, verificar validez e id_empresario coincidente
  if (parsed.data.idContratacion) {
    const { data: contratacion, error: contError } = await supabase
      .from('contrataciones')
      .select(
        `
        id_contratacion,
        estado_periodo,
        participaciones!inner(
          id_estudiante,
          id_proyecto,
          proyectos!inner(
            id_empresario,
            id_proyecto
          )
        )
      `,
      )
      .eq('id_contratacion', parsed.data.idContratacion)
      .maybeSingle()

    if (contError || !contratacion) {
      logger.error('rateCompany: fallo al buscar contratación', {
        error: contError?.message,
      })
      return err('contratacion_not_found')
    }

    const part = contratacion.participaciones as unknown as {
      id_estudiante: string
      proyectos: {
        id_empresario: string
        id_proyecto: string
      }
    }
    if (part.id_estudiante !== estudiante.id_estudiante) {
      return err('forbidden')
    }

    if (
      contratacion.estado_periodo !== 'finalizado' &&
      contratacion.estado_periodo !== 'vigente'
    ) {
      return err('contratacion_no_finalizada')
    }

    // El empresario en el contrato debe coincidir con el proporcionado
    if (part.proyectos.id_empresario !== parsed.data.idEmpresario) {
      return err('invalid_input')
    }
  }

  // Verificar si ya existe calificación del estudiante para esta empresa (uniqueness guard)
  const { data: existing, error: existError } = await supabase
    .from('evaluaciones_empresarios')
    .select('id_evaluacion')
    .eq('id_estudiante', estudiante.id_estudiante)
    .eq('id_empresario', parsed.data.idEmpresario)
    .maybeSingle()

  if (existError) {
    logger.error('rateCompany: fallo al validar duplicado', {
      error: existError.message,
    })
    return err('database_error')
  }

  if (existing) {
    return err('ya_calificado')
  }

  // Insertar la calificación en la base de datos
  const { error: insertError } = await supabase
    .from('evaluaciones_empresarios')
    .insert({
      id_contratacion: parsed.data.idContratacion || null,
      id_estudiante: estudiante.id_estudiante,
      id_empresario: parsed.data.idEmpresario,
      puntuacion: parsed.data.puntuacion,
      comentario: parsed.data.comentario || null,
    })

  if (insertError) {
    if (insertError.code === '23505') {
      return err('ya_calificado')
    }
    logger.error('rateCompany: inserción fallida en base de datos', {
      error: insertError.message,
    })
    return err('database_error')
  }

  // Revalidar rutas del empresario
  revalidatePath(`/empresario/perfil`)
  return ok(undefined)
}

/**
 * Consulta la calificación que un egresado le dejó a la empresa por un contrato específico.
 */
export async function getCompanyRatingForContract(
  idContratacion: string,
): Promise<Result<{ puntuacion: number; comentario: string | null } | null>> {
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from('evaluaciones_empresarios')
    .select('puntuacion, comentario')
    .eq('id_contratacion', idContratacion)
    .maybeSingle()

  if (error) {
    logger.error('getCompanyRatingForContract: fallo en consulta', {
      error: error.message,
    })
    return err('database_error')
  }

  return ok(data || null)
}

/**
 * Consulta la calificación que el egresado actual le dejó a un empresario específico.
 */
export async function getCompanyRatingForStudent(
  idEmpresario: string,
): Promise<Result<{ puntuacion: number; comentario: string | null } | null>> {
  const supabase = await createSupabaseServerClient()
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData?.user) return ok(null)

  const { data: estudiante } = await supabase
    .from('estudiantes')
    .select('id_estudiante')
    .eq('id_usuario', userData.user.id)
    .maybeSingle()

  if (!estudiante) return ok(null)

  const { data, error } = await supabase
    .from('evaluaciones_empresarios')
    .select('puntuacion, comentario')
    .eq('id_estudiante', estudiante.id_estudiante)
    .eq('id_empresario', idEmpresario)
    .maybeSingle()

  if (error) {
    logger.error('getCompanyRatingForStudent: fallo en consulta', {
      error: error.message,
    })
    return err('database_error')
  }

  return ok(data || null)
}

export interface AdminRatingItem {
  idEvaluacion: string
  idContratacion: string | null
  proyectoTitulo: string
  nombreEgresado: string
  nombreEmpresa: string
  puntuacion: number
  comentario: string | null
  evaluadoAt: string
}

/**
 * Consulta todas las calificaciones de empresarios del sistema para el panel de administración.
 */
export async function getAllCompanyRatingsForAdmin(): Promise<
  Result<AdminRatingItem[]>
> {
  const roleResult = await requireRole('administrador')
  if (!roleResult.ok) return err('forbidden')

  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from('evaluaciones_empresarios')
    .select(
      `
      id_evaluacion,
      id_contratacion,
      puntuacion,
      comentario,
      evaluado_at,
      estudiantes!inner(
        usuarios!inner(
          nombre,
          primer_apellido,
          segundo_apellido
        )
      ),
      empresarios!inner(
        nombre_empresa,
        usuarios!inner(
          nombre,
          primer_apellido,
          segundo_apellido
        )
      ),
      contrataciones(
        participaciones(
          proyectos(
            titulo
          )
        )
      )
    `,
    )
    .order('evaluado_at', { ascending: false })

  if (error) {
    logger.error('getAllCompanyRatingsForAdmin: fallo en consulta', {
      error: error.message,
    })
    return err('database_error')
  }

  const items: AdminRatingItem[] = (data || []).map((row) => {
    const r = row as unknown as {
      id_evaluacion: string
      id_contratacion: string | null
      puntuacion: number
      comentario: string | null
      evaluado_at: string
      estudiantes: {
        usuarios: {
          nombre: string
          primer_apellido: string | null
          segundo_apellido: string | null
        }
      }
      empresarios: {
        nombre_empresa: string | null
        usuarios: {
          nombre: string
          primer_apellido: string | null
          segundo_apellido: string | null
        }
      }
      contrataciones: {
        participaciones: {
          proyectos: {
            titulo: string
          } | null
        } | null
      } | null
    }
    const estUser = r.estudiantes.usuarios
    const nombreEgresado = [
      estUser.nombre,
      estUser.primer_apellido,
      estUser.segundo_apellido,
    ]
      .filter(Boolean)
      .join(' ')

    const emp = r.empresarios
    const empUser = emp.usuarios
    const repName = [
      empUser.nombre,
      empUser.primer_apellido,
      empUser.segundo_apellido,
    ]
      .filter(Boolean)
      .join(' ')
    const nombreEmpresa = emp.nombre_empresa || repName

    const proy = r.contrataciones?.participaciones?.proyectos
    const proyectoTitulo = proy?.titulo || 'Calificación General'

    return {
      idEvaluacion: r.id_evaluacion,
      idContratacion: r.id_contratacion,
      proyectoTitulo,
      nombreEgresado,
      nombreEmpresa,
      puntuacion: r.puntuacion,
      comentario: r.comentario,
      evaluadoAt: r.evaluado_at,
    }
  })

  return ok(items)
}
