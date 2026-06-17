'use server'

import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/dal'
import { ok, err, type Result } from '@/lib/result'
import { logger } from '@/lib/logger'
import type { Database } from '@/types/database'
import {
  PARTICIPACION_ACTION_TARGET,
  canAdvanceProject,
  computeEstadoEfectivoProyecto,
  isParticipacionActionAllowed,
  type EstadoParticipacion,
  type EstadoProyecto,
} from './project-detail-logic'

type TituloFwd = Database['public']['Enums']['titulo_fwd_enum']

/** Postgres `check_violation`: lo emite el trigger ante una transición ilegal. */
const CHECK_VIOLATION = '23514'

export interface ParticipacionEmpresario {
  idParticipacion: string
  estado: EstadoParticipacion
  estudianteNombre: string
  estudianteApellidos: string
  fotoPerfil: string | null
  reputacion: number | null
  tituloFwd: TituloFwd | null
  cartaPostulacion: string | null
  planteamientoSolucion: string | null
  prototipoEnlaces: string[]
  documentacionTecnica: string | null
  urlRepositorioProyecto: string | null
  fechaPostulacion: string
  fechaEntregaPrototipo: string | null
  calificacionPrototipo: number | null
  comentarioPrototipo: string | null
}

/**
 * Participaciones del proyecto con la identidad del estudiante (RF-34). Usa el
 * RPC `get_participaciones_de_proyecto` (SECURITY DEFINER) porque la RLS no deja
 * al empresario leer el nombre del postulante; el RPC reimpone que el llamante
 * sea el empresario dueño.
 */
export async function getProjectParticipations(
  projectId: string,
): Promise<Result<ParticipacionEmpresario[]>> {
  const parsed = z.string().uuid().safeParse(projectId)
  if (!parsed.success) return err('invalid_input')

  const user = await getCurrentUser()
  if (!user) return err('unauthorized')

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.rpc(
    'get_participaciones_de_proyecto',
    { p_id_proyecto: parsed.data },
  )
  if (error) {
    logger.error('getProjectParticipations: fallo en RPC', {
      error: error.message,
    })
    return err('participaciones_load_failed')
  }

  const participaciones: ParticipacionEmpresario[] = (data ?? []).map(
    (fila) => ({
      idParticipacion: fila.id_participacion,
      estado: fila.estado,
      estudianteNombre: fila.estudiante_nombre,
      estudianteApellidos: fila.estudiante_apellido_2
        ? `${fila.estudiante_apellido_1} ${fila.estudiante_apellido_2}`
        : fila.estudiante_apellido_1,
      fotoPerfil: fila.foto_perfil,
      reputacion: fila.reputacion,
      tituloFwd: fila.titulo_fwd,
      cartaPostulacion: fila.carta_postulacion,
      planteamientoSolucion: fila.planteamiento_solucion,
      prototipoEnlaces: fila.prototipo_enlaces ?? [],
      documentacionTecnica: fila.documentacion_tecnica,
      urlRepositorioProyecto: fila.url_repositorio_proyecto,
      fechaPostulacion: fila.fecha_postulacion,
      fechaEntregaPrototipo: fila.fecha_entrega_prototipo,
      calificacionPrototipo: fila.calificacion_prototipo,
      comentarioPrototipo: fila.comentario_prototipo,
    }),
  )

  return ok(participaciones)
}

const CambiarEstadoProyectoSchema = z.object({
  idProyecto: z.string().uuid(),
  destino: z.enum(['adjudicado', 'en_desarrollo']),
})

/**
 * Avance manual del estado del proyecto (RF-25), validado en la app porque la
 * BD no tiene máquina de estados de proyecto. Solo permite transiciones hacia
 * adelante de `project-detail-logic`. Cancelar va por `cancelProject`.
 */
export async function setProjectEstado(
  input: z.infer<typeof CambiarEstadoProyectoSchema>,
): Promise<Result<{ estado: EstadoProyecto }>> {
  const parsed = CambiarEstadoProyectoSchema.safeParse(input)
  if (!parsed.success) return err('invalid_input')

  const user = await getCurrentUser()
  if (!user) return err('unauthorized')

  const supabase = await createSupabaseServerClient()

  const { data: empresario, error: empError } = await supabase
    .from('empresarios')
    .select('id_empresario')
    .eq('id_usuario', user.id)
    .maybeSingle()
  if (empError) {
    logger.error('setProjectEstado: fallo al leer empresario', {
      error: empError.message,
    })
    return err('unexpected')
  }
  if (!empresario) return err('empresario_no_encontrado')

  const { data: proyecto, error: readError } = await supabase
    .from('proyectos')
    .select('estado, fecha_cierre')
    .eq('id_proyecto', parsed.data.idProyecto)
    .eq('id_empresario', empresario.id_empresario)
    .maybeSingle()
  if (readError) {
    logger.error('setProjectEstado: fallo al leer proyecto', {
      error: readError.message,
    })
    return err('unexpected')
  }
  if (!proyecto) return err('proyecto_no_encontrado')

  const efectivo = computeEstadoEfectivoProyecto(
    proyecto.estado,
    proyecto.fecha_cierre,
  )
  if (!canAdvanceProject(efectivo, parsed.data.destino)) {
    return err('transicion_invalida')
  }

  const { data: actualizado, error: updateError } = await supabase
    .from('proyectos')
    .update({ estado: parsed.data.destino })
    .eq('id_proyecto', parsed.data.idProyecto)
    .eq('id_empresario', empresario.id_empresario)
    .select('id_proyecto')
    .maybeSingle()
  if (updateError) {
    logger.error('setProjectEstado: fallo al actualizar', {
      error: updateError.message,
    })
    return err('update_failed')
  }
  if (!actualizado) return err('update_failed')

  return ok({ estado: parsed.data.destino })
}

const CambiarEstadoParticipacionSchema = z.object({
  idParticipacion: z.string().uuid(),
  accion: z.enum(['revisar', 'contratar', 'rechazar']),
})

/**
 * Cambia el estado de una participación según la acción del empresario (trío de
 * revisión). La RLS (`participaciones_update`) y el trigger
 * `validar_transicion_participacion` son la red dura; acá validamos antes para
 * dar un error claro y evitar viajes innecesarios a la BD.
 */
export async function setParticipacionEstado(
  input: z.infer<typeof CambiarEstadoParticipacionSchema>,
): Promise<Result<{ estado: EstadoParticipacion }>> {
  const parsed = CambiarEstadoParticipacionSchema.safeParse(input)
  if (!parsed.success) return err('invalid_input')

  const user = await getCurrentUser()
  if (!user) return err('unauthorized')

  const supabase = await createSupabaseServerClient()

  const { data: actual, error: readError } = await supabase
    .from('participaciones')
    .select('id_participacion, estado, id_proyecto')
    .eq('id_participacion', parsed.data.idParticipacion)
    .maybeSingle()
  if (readError) {
    logger.error('setParticipacionEstado: fallo al leer participación', {
      error: readError.message,
    })
    return err('unexpected')
  }
  if (!actual) return err('participacion_no_encontrada')

  if (!isParticipacionActionAllowed(actual.estado, parsed.data.accion)) {
    return err('transicion_invalida')
  }
  const destino = PARTICIPACION_ACTION_TARGET[parsed.data.accion]

  const { data: actualizada, error: updateError } = await supabase
    .from('participaciones')
    .update({ estado: destino })
    .eq('id_participacion', actual.id_participacion)
    .select('id_participacion')
    .maybeSingle()
  if (updateError) {
    logger.error('setParticipacionEstado: fallo al actualizar', {
      error: updateError.message,
    })
    if (updateError.code === CHECK_VIOLATION) return err('transicion_invalida')
    return err('update_failed')
  }
  if (!actualizada) return err('update_failed')

  return ok({ estado: destino })
}
