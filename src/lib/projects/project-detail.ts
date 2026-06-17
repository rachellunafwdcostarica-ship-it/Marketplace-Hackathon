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
import { getMyPublishedProjects } from './dashboard'

type TituloFwd = Database['public']['Enums']['titulo_fwd_enum']
type RpcParticipacionRow =
  Database['public']['Functions']['get_participaciones_de_proyecto']['Returns'][number]

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

/** Participación cross-project: lleva el proyecto al que pertenece la oferta. */
export interface ParticipacionConProyecto extends ParticipacionEmpresario {
  proyecto: { id: string; titulo: string }
}

/** Mapea una fila cruda del RPC al shape camelCase que consume la UI. */
function mapParticipacionRow(
  fila: RpcParticipacionRow,
): ParticipacionEmpresario {
  return {
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
  }
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

  return ok((data ?? []).map(mapParticipacionRow))
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

/**
 * Todas las participaciones de TODOS los proyectos del empresario, con la
 * identidad del estudiante (RF-34) y el proyecto al que pertenecen. Reusa el RPC
 * por proyecto (N+1) en vez de un RPC dedicado: a escala del MVP es aceptable y
 * evita una migración. Resiliente: si un proyecto falla se omite; si TODOS los
 * proyectos fallan se devuelve error (para distinguir "roto" de "sin ofertas").
 */
export async function getEmpresarioParticipations(): Promise<
  Result<ParticipacionConProyecto[]>
> {
  const user = await getCurrentUser()
  if (!user) return err('unauthorized')

  const projectsResult = await getMyPublishedProjects()
  if (!projectsResult.ok) return err('participaciones_load_failed')
  const proyectos = projectsResult.data
  if (proyectos.length === 0) return ok([])

  const supabase = await createSupabaseServerClient()
  const porProyecto = await Promise.all(
    proyectos.map(async (proyecto) => {
      const { data, error } = await supabase.rpc(
        'get_participaciones_de_proyecto',
        { p_id_proyecto: proyecto.id },
      )
      if (error) {
        logger.error('getEmpresarioParticipations: fallo en RPC', {
          error: error.message,
          proyecto: proyecto.id,
        })
        return null
      }
      return { proyecto, filas: data ?? [] }
    }),
  )

  const cargados = porProyecto.filter(
    (entrada): entrada is NonNullable<typeof entrada> => entrada !== null,
  )
  if (cargados.length === 0) return err('participaciones_load_failed')

  const items = cargados.flatMap(({ proyecto, filas }) =>
    filas.map((fila) => ({
      ...mapParticipacionRow(fila),
      proyecto: { id: proyecto.id, titulo: proyecto.titulo },
    })),
  )

  return ok(items)
}

const CalificarParticipacionSchema = z.object({
  idParticipacion: z.string().uuid(),
  calificacion: z.number().int().min(1).max(5),
  comentario: z.string().max(1000).optional(),
})

/**
 * Guarda la calificación (1-5) y el comentario opcional del empresario sobre el
 * prototipo de un postulante (RF-36). Solo aplicable cuando `estado === 'en_revision'`.
 * No modifica el estado — el trigger de transición no se dispara.
 */
export async function calificarParticipacion(
  input: z.infer<typeof CalificarParticipacionSchema>,
): Promise<Result<void>> {
  const parsed = CalificarParticipacionSchema.safeParse(input)
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
    logger.error('calificarParticipacion: fallo al leer empresario', {
      error: empError.message,
    })
    return err('unexpected')
  }
  if (!empresario) return err('empresario_no_encontrado')

  const { data: participacion, error: readError } = await supabase
    .from('participaciones')
    .select('id_participacion, estado, id_proyecto')
    .eq('id_participacion', parsed.data.idParticipacion)
    .maybeSingle()
  if (readError) {
    logger.error('calificarParticipacion: fallo al leer participacion', {
      error: readError.message,
    })
    return err('unexpected')
  }
  if (!participacion) return err('participacion_no_encontrada')
  if (participacion.estado !== 'en_revision') return err('transicion_invalida')

  const { data: proyectoOwned, error: proyError } = await supabase
    .from('proyectos')
    .select('id_proyecto')
    .eq('id_proyecto', participacion.id_proyecto)
    .eq('id_empresario', empresario.id_empresario)
    .maybeSingle()
  if (proyError) {
    logger.error('calificarParticipacion: fallo al verificar proyecto', {
      error: proyError.message,
    })
    return err('unexpected')
  }
  if (!proyectoOwned) return err('unauthorized')

  const { error: updateError } = await supabase
    .from('participaciones')
    .update({
      calificacion_prototipo: parsed.data.calificacion,
      ...(parsed.data.comentario !== undefined
        ? { comentario_prototipo: parsed.data.comentario }
        : {}),
    })
    .eq('id_participacion', parsed.data.idParticipacion)
  if (updateError) {
    logger.error('calificarParticipacion: fallo al actualizar', {
      error: updateError.message,
    })
    return err('calificacion_fallida')
  }

  return ok(undefined)
}

const AdjudicarParticipacionSchema = z.object({
  idParticipacion: z.string().uuid(),
  idProyecto: z.string().uuid(),
})

/**
 * Adjudica el proyecto al postulante seleccionado (RF-37 + RF-39). Hace 3 updates
 * secuenciales (no atómicos — MVP aceptable, riesgo documentado):
 *   1. Ganador → `contratada` (dispara trigger crear_contratacion_al_adjudicar)
 *   2. Resto `en_revision` del proyecto → `no_seleccionada` (batch)
 *   3. Proyecto → `adjudicado`
 * Si el paso 1 falla devuelve `adjudicacion_fallida`. Si fallan 2 o 3 devuelve
 * `adjudicacion_parcial` (inconsistencia recuperable por admin).
 */
export async function adjudicarParticipacion(
  input: z.infer<typeof AdjudicarParticipacionSchema>,
): Promise<Result<void>> {
  const parsed = AdjudicarParticipacionSchema.safeParse(input)
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
    logger.error('adjudicarParticipacion: fallo al leer empresario', {
      error: empError.message,
    })
    return err('unexpected')
  }
  if (!empresario) return err('empresario_no_encontrado')

  const { data: proyecto, error: proyError } = await supabase
    .from('proyectos')
    .select('id_proyecto')
    .eq('id_proyecto', parsed.data.idProyecto)
    .eq('id_empresario', empresario.id_empresario)
    .maybeSingle()
  if (proyError) {
    logger.error('adjudicarParticipacion: fallo al verificar proyecto', {
      error: proyError.message,
    })
    return err('unexpected')
  }
  if (!proyecto) return err('proyecto_no_encontrado')

  const { data: participacion, error: partError } = await supabase
    .from('participaciones')
    .select('id_participacion, estado')
    .eq('id_participacion', parsed.data.idParticipacion)
    .eq('id_proyecto', parsed.data.idProyecto)
    .maybeSingle()
  if (partError) {
    logger.error('adjudicarParticipacion: fallo al leer participacion', {
      error: partError.message,
    })
    return err('unexpected')
  }
  if (!participacion) return err('participacion_no_encontrada')
  if (participacion.estado !== 'en_revision') return err('transicion_invalida')

  const { error: contratarError } = await supabase
    .from('participaciones')
    .update({ estado: 'contratada' })
    .eq('id_participacion', parsed.data.idParticipacion)
  if (contratarError) {
    logger.error('adjudicarParticipacion: fallo al contratar ganador', {
      error: contratarError.message,
    })
    if (contratarError.code === CHECK_VIOLATION)
      return err('transicion_invalida')
    return err('adjudicacion_fallida')
  }

  const { error: batchError } = await supabase
    .from('participaciones')
    .update({ estado: 'no_seleccionada' })
    .eq('id_proyecto', parsed.data.idProyecto)
    .eq('estado', 'en_revision')
    .neq('id_participacion', parsed.data.idParticipacion)
  if (batchError) {
    logger.error(
      'adjudicarParticipacion: fallo al cerrar otras participaciones',
      {
        error: batchError.message,
        idProyecto: parsed.data.idProyecto,
      },
    )
    return err('adjudicacion_parcial')
  }

  const { error: adjError } = await supabase
    .from('proyectos')
    .update({ estado: 'adjudicado' })
    .eq('id_proyecto', parsed.data.idProyecto)
    .eq('id_empresario', empresario.id_empresario)
  if (adjError) {
    logger.error('adjudicarParticipacion: fallo al adjudicar proyecto', {
      error: adjError.message,
      idProyecto: parsed.data.idProyecto,
    })
    return err('adjudicacion_parcial')
  }

  return ok(undefined)
}

/**
 * Conteos para las stats del dashboard del empresario. No usa el RPC: la RLS
 * (`participaciones_select`) ya limita la lectura a las participaciones de los
 * proyectos del empresario, y los conteos no necesitan la identidad del
 * estudiante. Una sola query.
 */
export async function getEmpresarioParticipationStats(): Promise<
  Result<{ total: number; hired: number }>
> {
  const user = await getCurrentUser()
  if (!user) return err('unauthorized')

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('participaciones')
    .select('estado')
  if (error) {
    logger.error('getEmpresarioParticipationStats: fallo al contar', {
      error: error.message,
    })
    return err('unexpected')
  }

  const filas = data ?? []
  const total = filas.length
  const hired = filas.filter(
    (fila) => fila.estado === 'contratada' || fila.estado === 'finalizada',
  ).length
  return ok({ total, hired })
}
