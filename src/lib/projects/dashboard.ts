'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { ok, err, type Result } from '@/lib/result'
import { logger } from '@/lib/logger'
import type { Database } from '@/types/database'
import type { Modalidad, Moneda } from './schemas'

type EstadoProyecto = Database['public']['Enums']['estado_proyecto_enum']

/**
 * `estado_efectivo` (errolpendiente §4.1): el estado guardado, salvo que un
 * `abierto` con `fecha_cierre` vencida se muestra como `en_evaluacion`. Es
 * DERIVADO (se calcula al leer); la columna sigue diciendo `abierto`. Sin
 * migración, sin cron — por eso lo computamos acá en vez de con la vista.
 */
export type EstadoEfectivo = EstadoProyecto | 'en_evaluacion'

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

interface RawProyecto {
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

const PROYECTO_SELECT =
  'id_proyecto, titulo, descripcion, estado, modalidad, moneda, presupuesto_min, presupuesto_max, pais_proyecto, ciudad_proyecto, fecha_publicacion, fecha_cierre, involucra_ia, areas_negocio(nombre), proyecto_categorias(categorias(nombre)), proyecto_tecnologias(tecnologias(nombre))'

function estadoEfectivoDe(
  estado: EstadoProyecto,
  fechaCierre: string | null,
): EstadoEfectivo {
  const vencio =
    fechaCierre !== null && new Date(fechaCierre).getTime() < Date.now()
  return estado === 'abierto' && vencio ? 'en_evaluacion' : estado
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

    // Cast: el typado de selects anidados de Supabase es poco confiable; mapeamos a mano.
    const filas = (filasRaw ?? []) as unknown as RawProyecto[]
    const proyectos: PublishedProject[] = filas.map((p) => ({
      id: p.id_proyecto,
      titulo: p.titulo,
      descripcion: p.descripcion,
      estado: p.estado,
      estadoEfectivo: estadoEfectivoDe(p.estado, p.fecha_cierre),
      modalidad: p.modalidad,
      moneda: p.moneda,
      presupuestoMin: p.presupuesto_min,
      presupuestoMax: p.presupuesto_max,
      paisProyecto: p.pais_proyecto,
      ciudadProyecto: p.ciudad_proyecto,
      fechaPublicacion: p.fecha_publicacion,
      fechaCierre: p.fecha_cierre,
      areaNombre: p.areas_negocio?.nombre ?? null,
      categorias: p.proyecto_categorias
        .map((pc) => pc.categorias?.nombre)
        .filter((nombre): nombre is string => Boolean(nombre)),
      tecnologias: p.proyecto_tecnologias
        .map((pt) => pt.tecnologias?.nombre)
        .filter((nombre): nombre is string => Boolean(nombre)),
      involucraIa: p.involucra_ia,
    }))

    return ok(proyectos)
  } catch (e) {
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
    const msg = e instanceof Error ? e.message : 'unexpected_error'
    logger.error('cancelProject: error inesperado', { error: msg })
    return err('unexpected')
  }
}
