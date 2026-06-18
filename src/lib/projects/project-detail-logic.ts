import type { Database } from '@/types/database'

export type EstadoParticipacion =
  Database['public']['Enums']['estado_participacion_enum']
export type EstadoProyecto = Database['public']['Enums']['estado_proyecto_enum']

/**
 * Estado efectivo del proyecto: igual criterio que `lib/projects/dashboard.ts`.
 * Un `abierto` con `fecha_cierre` vencida se MUESTRA como `en_evaluacion`
 * (derivado en lectura; la columna sigue diciendo `abierto`).
 */
export type EstadoEfectivoProyecto = EstadoProyecto | 'en_evaluacion'

export function computeEstadoEfectivoProyecto(
  estado: EstadoProyecto,
  fechaCierre: string | null,
  now: number = Date.now(),
): EstadoEfectivoProyecto {
  const expiro = fechaCierre !== null && new Date(fechaCierre).getTime() < now
  return estado === 'abierto' && expiro ? 'en_evaluacion' : estado
}

/**
 * Transiciones de proyecto que el empresario puede hacer "hacia adelante".
 * La BD NO valida transiciones de proyecto (no hay trigger equivalente al de
 * participaciones), así que esta tabla es la única red de seguridad.
 *
 * `cancelado` NO está acá a propósito: cancelar vive en `cancelProject` con su
 * propio flujo (motivo + confirmación irreversible). `finalizado` queda diferido
 * al subflujo de contratos (tabla `contrataciones`), aún sin construir.
 */
export type ProjectForwardTarget = Extract<
  EstadoProyecto,
  'adjudicado' | 'en_desarrollo'
>

export const PROJECT_FORWARD_TRANSITIONS: Record<
  EstadoEfectivoProyecto,
  ProjectForwardTarget[]
> = {
  borrador: [],
  abierto: ['adjudicado'],
  en_recepcion: ['adjudicado'],
  en_evaluacion: ['adjudicado'],
  adjudicado: ['en_desarrollo'],
  en_desarrollo: [],
  finalizado: [],
  cancelado: [],
}

export function getProjectForwardStates(
  estado: EstadoEfectivoProyecto,
): ProjectForwardTarget[] {
  return PROJECT_FORWARD_TRANSITIONS[estado]
}

export function canAdvanceProject(
  from: EstadoEfectivoProyecto,
  to: EstadoProyecto,
): boolean {
  const targets: EstadoProyecto[] = getProjectForwardStates(from)
  return targets.includes(to)
}

/**
 * Acciones del empresario sobre una participación, según su estado actual.
 * Respeta el trigger `validar_transicion_participacion`:
 *   enviada      -> revisar  (en_revision)
 *   en_revision  -> contratar (contratada) | rechazar (no_seleccionada)
 * No hay `enviada -> no_seleccionada` directo: primero se marca en revisión.
 */
export type ParticipacionAction = 'revisar' | 'contratar' | 'rechazar'

export const PARTICIPACION_ACTION_TARGET: Record<
  ParticipacionAction,
  EstadoParticipacion
> = {
  revisar: 'en_revision',
  contratar: 'contratada',
  rechazar: 'no_seleccionada',
}

export function getParticipacionActions(
  estado: EstadoParticipacion,
): ParticipacionAction[] {
  if (estado === 'enviada') return ['revisar']
  if (estado === 'en_revision') return ['contratar', 'rechazar']
  return []
}

export function isParticipacionActionAllowed(
  estado: EstadoParticipacion,
  accion: ParticipacionAction,
): boolean {
  return getParticipacionActions(estado).includes(accion)
}

/**
 * Una participación está "sellada" (sobre cerrado) mientras nadie la abrió:
 * estado `enviada`. Abrirla la lleva a `en_revision` (acción `revisar`) y revela
 * su contenido. Es la pieza de UI del flujo de sobres; el sello REAL lo impone el
 * RPC `get_participaciones_de_proyecto`, que no devuelve el contenido de una
 * `enviada` — acá solo decidimos cómo se PINTA la tarjeta.
 */
export function isParticipacionSealed(estado: EstadoParticipacion): boolean {
  return estado === 'enviada'
}

/**
 * El empresario solo puede ABRIR sobres mientras el proyecto sigue recibiendo o
 * evaluando ofertas. Tras adjudicar o cerrar ya no tiene sentido revisar, así que
 * los sobres que quedaron sellados se muestran pero su botón "Abrir" desaparece.
 */
export function canOpenParticipacion(
  estadoProyecto: EstadoEfectivoProyecto,
): boolean {
  return (
    estadoProyecto === 'abierto' ||
    estadoProyecto === 'en_recepcion' ||
    estadoProyecto === 'en_evaluacion'
  )
}

/**
 * Estado EFECTIVO de una participación de cara al estudiante (RF-32), DERIVADO al
 * leer — la columna `estado` no se toca. Mismo patrón que
 * `computeEstadoEfectivoProyecto`: cuando un proyecto ya se decidió o se cerró,
 * las ofertas que quedaron "vivas" (`enviada`/`en_revision`) no tienen futuro,
 * pero la máquina de estados PROHÍBE el salto directo `enviada -> no_seleccionada`
 * (migración `flujo_b_maquina_estados`, decisión de Santiago). En vez de mutarlas
 * con una transición ilegal, derivamos lo que el estudiante VE:
 *   - proyecto adjudicado / en_desarrollo / finalizado -> `no_seleccionada`
 *   - proyecto cancelado                               -> `cancelada`
 * Las participaciones ya terminales y los proyectos aún vivos se devuelven igual.
 */
export function computeEstadoParticipacionEfectivo(
  estadoParticipacion: EstadoParticipacion,
  estadoProyecto: EstadoProyecto,
): EstadoParticipacion {
  if (
    estadoParticipacion !== 'enviada' &&
    estadoParticipacion !== 'en_revision'
  ) {
    return estadoParticipacion
  }
  switch (estadoProyecto) {
    case 'adjudicado':
    case 'en_desarrollo':
    case 'finalizado':
      return 'no_seleccionada'
    case 'cancelado':
      return 'cancelada'
    default:
      return estadoParticipacion
  }
}

/**
 * Filtros del panel de participaciones. Son LENTES, no particiones: se solapan
 * a propósito (`rechazados` y `contratados` también caen en `revisadas`).
 */
export type ParticipacionFilter =
  | 'todos'
  | 'con_entregas'
  | 'revisadas'
  | 'contratados'
  | 'rechazados'

export const PARTICIPACION_FILTERS: ParticipacionFilter[] = [
  'todos',
  'con_entregas',
  'revisadas',
  'contratados',
  'rechazados',
]

export interface ParticipacionFilterable {
  estado: EstadoParticipacion
  fechaEntregaPrototipo: string | null
}

export function matchesParticipacionFilter(
  fila: ParticipacionFilterable,
  filtro: ParticipacionFilter,
): boolean {
  switch (filtro) {
    case 'todos':
      return true
    case 'con_entregas':
      return fila.fechaEntregaPrototipo !== null
    case 'revisadas':
      return (
        fila.estado === 'en_revision' ||
        fila.estado === 'no_seleccionada' ||
        fila.estado === 'contratada'
      )
    case 'contratados':
      return fila.estado === 'contratada' || fila.estado === 'finalizada'
    case 'rechazados':
      return fila.estado === 'no_seleccionada'
  }
}
