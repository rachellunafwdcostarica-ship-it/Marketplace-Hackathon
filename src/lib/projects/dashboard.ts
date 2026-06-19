'use server'

import { unstable_rethrow } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/dal'
import { ok, err, type Result } from '@/lib/result'
import { logger } from '@/lib/logger'
import type { Database } from '@/types/database'
import type { Modalidad, Moneda } from './schemas'
import {
  computeEstadoEfectivoProyecto,
  type EstadoEfectivoProyecto,
} from './project-detail-logic'

type EstadoProyecto = Database['public']['Enums']['estado_proyecto_enum']

/**
 * Estado efectivo (errolpendiente §4.1): el estado guardado, salvo que un
 * `abierto` con `fecha_cierre` vencida se muestra como `en_evaluacion`. Alias
 * del tipo canónico de `project-detail-logic`, conservado con el nombre del
 * dashboard por compatibilidad con sus consumidores.
 */
export type EstadoEfectivo = EstadoEfectivoProyecto

export interface PublishedProject {
  id: string
  titulo: string
  descripcion: string
  estado: EstadoProyecto
  estadoEfectivo: EstadoEfectivo
  modalidad: Modalidad
  moneda: Moneda
  presupuestoMin: number | null
  presupuestoMax: number | null
  paisProyecto: string | null
  ciudadProyecto: string | null
  fechaPublicacion: string | null
  fechaCierre: string | null
  areaNombre: string | null
  categorias: string[]
  tecnologias: string[]
  involucraIa: boolean
}

const PROYECTO_SELECT =
  'id_proyecto, titulo, descripcion, estado, modalidad, moneda, presupuesto_min, presupuesto_max, pais_proyecto, ciudad_proyecto, fecha_publicacion, fecha_cierre, involucra_ia, areas_negocio(nombre), proyecto_categorias(categorias(nombre)), proyecto_tecnologias(tecnologias(nombre))'

/**
 * Forma de una fila del `PROYECTO_SELECT` que consume el mapeo. Los joins van
 * como to-one anulables (área) o como arrays de to-one anulables (categorías,
 * tecnologías), igual que infiere PostgREST para este select.
 */
export interface ProyectoDashboardRow {
  id_proyecto: string
  titulo: string
  descripcion: string
  estado: EstadoProyecto
  modalidad: Modalidad
  moneda: Moneda
  presupuesto_min: number | null
  presupuesto_max: number | null
  pais_proyecto: string | null
  ciudad_proyecto: string | null
  fecha_publicacion: string | null
  fecha_cierre: string | null
  involucra_ia: boolean
  areas_negocio: { nombre: string } | null
  proyecto_categorias: { categorias: { nombre: string } | null }[]
  proyecto_tecnologias: { tecnologias: { nombre: string } | null }[]
}

/**
 * Proyección pura de una fila de BD al modelo de UI `PublishedProject`: calcula
 * el estado efectivo y aplana los nombres de área/categorías/tecnologías,
 * descartando los nulos. `now` se inyecta para que el resultado sea determinista
 * en pruebas.
 */
export function mapRowToPublishedProject(
  row: ProyectoDashboardRow,
  now: number = Date.now(),
): PublishedProject {
  return {
    id: row.id_proyecto,
    titulo: row.titulo,
    descripcion: row.descripcion,
    estado: row.estado,
    estadoEfectivo: computeEstadoEfectivoProyecto(
      row.estado,
      row.fecha_cierre,
      now,
    ),
    modalidad: row.modalidad,
    moneda: row.moneda,
    presupuestoMin: row.presupuesto_min,
    presupuestoMax: row.presupuesto_max,
    paisProyecto: row.pais_proyecto,
    ciudadProyecto: row.ciudad_proyecto,
    fechaPublicacion: row.fecha_publicacion,
    fechaCierre: row.fecha_cierre,
    areaNombre: row.areas_negocio?.nombre ?? null,
    categorias: row.proyecto_categorias
      .map((pc) => pc.categorias?.nombre)
      .filter((nombre): nombre is string => Boolean(nombre)),
    tecnologias: row.proyecto_tecnologias
      .map((pt) => pt.tecnologias?.nombre)
      .filter((nombre): nombre is string => Boolean(nombre)),
    involucraIa: row.involucra_ia,
  }
}

/**
 * Proyectos del empresario logueado, con nombres de área/categorías/tecnologías
 * y el `estado_efectivo` calculado. Datos REALES de la BD (RLS: el dueño ve los
 * suyos vía `proyectos_select_auth`).
 */
export async function getMyPublishedProjects(): Promise<
  Result<PublishedProject[]>
> {
  try {
    const user = await getCurrentUser()
    if (!user) return err('unauthorized')

    const supabase = await createSupabaseServerClient()

    const { data: empresario, error: empError } = await supabase
      .from('empresarios')
      .select('id_empresario')
      .eq('id_usuario', user.id)
      .maybeSingle()
    if (empError) {
      logger.error('getMyPublishedProjects: fallo al leer empresario', {
        error: empError.message,
      })
      return err('unexpected')
    }
    if (!empresario) {
      return err('empresario_no_encontrado')
    }

    const { data: filasRaw, error } = await supabase
      .from('proyectos')
      .select(PROYECTO_SELECT)
      .eq('id_empresario', empresario.id_empresario)
      .order('fecha_publicacion', { ascending: false })
    if (error) {
      logger.error('getMyPublishedProjects: fallo al leer proyectos', {
        error: error.message,
      })
      return err('unexpected')
    }

    const filas = filasRaw ?? []
    const proyectos: PublishedProject[] = filas.map((p) =>
      mapRowToPublishedProject(p),
    )

    return ok(proyectos)
  } catch (e) {
    unstable_rethrow(e)
    const msg = e instanceof Error ? e.message : 'unexpected_error'
    logger.error('getMyPublishedProjects: error inesperado', { error: msg })
    return err('unexpected')
  }
}

/**
 * Cierre manual del proyecto → `cancelado` (errolpendiente §4.1: la única forma
 * de tocar un proyecto publicado). Guarda: solo sobre estados NO terminales.
 */
export async function cancelProject(
  projectId: string,
  motivo: string,
): Promise<Result<{ cancelled: boolean }>> {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return err('unauthorized')
    }

    const { data: empresario, error: empError } = await supabase
      .from('empresarios')
      .select('id_empresario')
      .eq('id_usuario', user.id)
      .maybeSingle()
    if (empError) {
      logger.error('cancelProject: fallo al leer empresario', {
        error: empError.message,
      })
      return err('unexpected')
    }
    if (!empresario) {
      return err('empresario_no_encontrado')
    }

    const motivoLimpio = motivo.trim()
    const { data: proyecto, error } = await supabase
      .from('proyectos')
      .update({
        estado: 'cancelado',
        motivo_cancelacion: motivoLimpio.length > 0 ? motivoLimpio : null,
      })
      .eq('id_proyecto', projectId)
      .eq('id_empresario', empresario.id_empresario)
      .neq('estado', 'finalizado')
      .neq('estado', 'cancelado')
      .select('id_proyecto')
      .maybeSingle()
    if (error) {
      logger.error('cancelProject: fallo al cancelar', {
        error: error.message,
      })
      return err('cancel_failed')
    }
    if (!proyecto) {
      // No encontrado, ajeno o ya terminal.
      return err('cancel_failed')
    }

    return ok({ cancelled: true })
  } catch (e) {
    unstable_rethrow(e)
    const msg = e instanceof Error ? e.message : 'unexpected_error'
    logger.error('cancelProject: error inesperado', { error: msg })
    return err('unexpected')
  }
}
