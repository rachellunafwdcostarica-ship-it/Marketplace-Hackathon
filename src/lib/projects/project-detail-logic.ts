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
 * Configuración del panel de participaciones por contexto (RF-34). El panel es
 * compartido por la vista de detalle de proyecto y la cross-project de
 * postulaciones; cada una le pasa su propia config para mostrar SOLO los estados
 * que le importan y los criterios de orden que tienen sentido ahí (p. ej.
 * "nombre de proyecto" solo aplica en la vista cross-project).
 *
 * `estados` cumple doble función: define los chips visibles Y el universo de
 * filas que la vista muestra. En postulaciones eso excluye `finalizada` y
 * `cancelada` incluso sin filtro activo, porque esas ofertas viven en la vista
 * de Contrataciones.
 */
export type PanelSortKey =
  | 'fecha_postulacion'
  | 'nombre_proyecto'
  | 'nombre_participante'

export type SortDirection = 'asc' | 'desc'

export interface PanelFilterConfig {
  estados: readonly EstadoParticipacion[]
  sorts: readonly PanelSortKey[]
}

export const PANEL_FILTER_DETALLE: PanelFilterConfig = {
  estados: [
    'enviada',
    'en_revision',
    'contratada',
    'no_seleccionada',
    'retirada',
    'finalizada',
    'cancelada',
  ],
  sorts: ['fecha_postulacion', 'nombre_participante'],
}

export const PANEL_FILTER_POSTULACIONES: PanelFilterConfig = {
  estados: [
    'enviada',
    'en_revision',
    'contratada',
    'no_seleccionada',
    'retirada',
  ],
  sorts: ['fecha_postulacion', 'nombre_proyecto', 'nombre_participante'],
}

/** Universo de la vista: la fila solo aparece si su estado está en la config. */
export function isParticipacionEnPanel(
  estado: EstadoParticipacion,
  config: PanelFilterConfig,
): boolean {
  return config.estados.includes(estado)
}

/**
 * Selección multiselección de chips. Con los chips por estado siendo una
 * partición exacta, el filtro es pura pertenencia: una selección vacía muestra
 * todo el universo; si no, la fila pasa si su estado está marcado (OR).
 */
export function matchesPanelSeleccion(
  estado: EstadoParticipacion,
  seleccion: ReadonlySet<EstadoParticipacion>,
): boolean {
  return seleccion.size === 0 || seleccion.has(estado)
}

/** Shape mínimo ordenable: mantiene el comparador puro y testeable sin atar la
 *  lógica al tipo completo de la tarjeta. */
export interface ParticipacionOrdenable {
  estudianteNombre: string
  estudianteApellidos: string
  fechaPostulacion: string
  proyecto?: { titulo: string }
}

function getSortValue(
  fila: ParticipacionOrdenable,
  clave: PanelSortKey,
): string {
  switch (clave) {
    case 'fecha_postulacion':
      return fila.fechaPostulacion
    case 'nombre_proyecto':
      return fila.proyecto?.titulo ?? ''
    case 'nombre_participante':
      return `${fila.estudianteNombre} ${fila.estudianteApellidos}`.trim()
  }
}

/**
 * Comparador de participaciones para el orden del panel. Las fechas se comparan
 * como cadenas ISO (lexicográfico = cronológico); los nombres con `localeCompare`
 * insensible a mayúsculas y acentos.
 */
export function compareParticipacionesBy(
  a: ParticipacionOrdenable,
  b: ParticipacionOrdenable,
  clave: PanelSortKey,
  direccion: SortDirection,
): number {
  const factor = direccion === 'asc' ? 1 : -1
  const va = getSortValue(a, clave)
  const vb = getSortValue(b, clave)
  const base =
    clave === 'fecha_postulacion'
      ? va < vb
        ? -1
        : va > vb
          ? 1
          : 0
      : va.localeCompare(vb, undefined, { sensitivity: 'base' })
  return factor * base
}
