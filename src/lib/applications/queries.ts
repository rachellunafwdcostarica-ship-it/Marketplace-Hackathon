'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/dal'
import { ok, err, type Result } from '@/lib/result'
import { logger } from '@/lib/logger'

export interface MisPostulacionesStats {
  total: number
  activas: number
  contratadas: number
}

export async function getMisPostulacionesStats(): Promise<
  Result<MisPostulacionesStats>
> {
  const user = await getCurrentUser()
  if (!user) return err('unauthorized')

  const supabase = await createSupabaseServerClient()

  const { data: estudiante, error: estError } = await supabase
    .from('estudiantes')
    .select('id_estudiante')
    .eq('id_usuario', user.id)
    .maybeSingle()

  if (estError) {
    logger.error('getMisPostulacionesStats: fallo al leer estudiante', {
      error: estError.message,
    })
    return err('unexpected')
  }

  if (!estudiante) return ok({ total: 0, activas: 0, contratadas: 0 })

  const { data, error } = await supabase
    .from('participaciones')
    .select('estado')
    .eq('id_estudiante', estudiante.id_estudiante)

  if (error) {
    logger.error('getMisPostulacionesStats: fallo al contar', {
      error: error.message,
    })
    return err('unexpected')
  }

  const filas = data ?? []
  const total = filas.length
  const activas = filas.filter(
    (f) => f.estado === 'enviada' || f.estado === 'en_revision',
  ).length
  const contratadas = filas.filter(
    (f) => f.estado === 'contratada' || f.estado === 'finalizada',
  ).length

  return ok({ total, activas, contratadas })
}
