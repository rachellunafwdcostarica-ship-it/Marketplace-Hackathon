import { z } from 'zod'

/**
 * Esquemas y mapeos de la Pantalla 1 (logística) del flujo de publicación.
 *
 * El empresario solo llena LOGÍSTICA + un cuadro de contexto (errolpendiente §1):
 * NO descripción, área, categorías ni tecnologías (eso lo produce la IA y se
 * revisa en la propuesta, Pantalla 2). `titulo` es OPCIONAL; si va vacío, lo
 * genera la IA. `fecha_publicacion` NO se pide (se setea `now()` al publicar).
 *
 * Los mensajes de Zod son CÓDIGOS estables; la traducción vive en el componente
 * (namespace ProjectPublish.errors) para mantener el esquema puro.
 */

export const MODALIDADES = ['remoto', 'hibrido', 'presencial'] as const
export type Modalidad = (typeof MODALIDADES)[number]

export const MONEDAS = ['USD', 'CRC'] as const
export type Moneda = (typeof MONEDAS)[number]

export const TITULO_MAX = 120
export const UBICACION_MAX = 80
export const CONTEXTO_MIN = 20
export const PLAZO_MIN_DIAS = 5
export const PLAZO_MAX_DIAS = 15

const MS_POR_DIA = 86_400_000

export interface LogisticsFormValues {
  titulo: string
  modalidad: string
  moneda: Moneda
  presupuestoMin: string
  presupuestoMax: string
  fechaCierre: string
  paisProyecto: string
  ciudadProyecto: string
  contextoInicial: string
}

/**
 * Logística persistida en `conversaciones_ia.logistica` (jsonb). NO incluye el
 * contexto: ese va a su propia columna `contexto_inicial`. Al publicar (Corte 4)
 * alimenta las columnas de `proyectos`.
 */
export interface LogisticaDraft {
  titulo: string | null
  modalidad: Modalidad
  moneda: Moneda
  presupuestoMin: number | null
  presupuestoMax: number | null
  fechaCierre: string
  paisProyecto: string | null
  ciudadProyecto: string | null
}

/** Referencia a un ítem de catálogo ya resuelto (id + nombre legible). */
export interface CatalogRef {
  id: string
  nombre: string
}

/**
 * Propuesta del fondo ya RESUELTA contra los catálogos, tal como se persiste en
 * `conversaciones_ia.propuesta_generada` y se publica luego (errolpendiente §2).
 * Las categorías/tecnologías guardan id + nombre: el nombre para mostrar, el id
 * para los INSERT en las tablas puente al publicar.
 */
export interface PropuestaProyecto {
  titulo: string
  descripcion: string
  idArea: string | null
  areaNombre: string | null
  categorias: CatalogRef[]
  tecnologias: CatalogRef[]
  stackSugerido: string[]
  involucraIa: boolean
}

/** Convierte un monto de texto a número; vacío o no numérico devuelve null. */
export function parseMoney(raw: string): number | null {
  const limpio = raw.trim()
  if (limpio === '') return null
  const monto = Number(limpio)
  return Number.isFinite(monto) ? monto : null
}

/** Días entre dos fechas 'YYYY-MM-DD' en UTC; null si alguna es inválida. */
export function daysBetween(desde: string, hasta: string): number | null {
  if (!desde || !hasta) return null
  const inicio = Date.parse(`${desde}T00:00:00.000Z`)
  const fin = Date.parse(`${hasta}T00:00:00.000Z`)
  if (Number.isNaN(inicio) || Number.isNaN(fin)) return null
  return Math.round((fin - inicio) / MS_POR_DIA)
}

/**
 * Construye el esquema de la Pantalla 1. Recibe `todayIso` ('YYYY-MM-DD') porque
 * el plazo (RF-21) se mide desde HOY: `fecha_publicacion` será ~`now()` al
 * publicar. En el publicar (Corte 4) se re-valida contra `now()` real.
 */
export function buildLogisticsSchema(todayIso: string) {
  return z
    .object({
      titulo: z.string().trim().max(TITULO_MAX, { error: 'tituloMax' }),
      modalidad: z.string(),
      moneda: z.enum(MONEDAS),
      presupuestoMin: z.string(),
      presupuestoMax: z.string(),
      fechaCierre: z.string().min(1, { error: 'fechaCierreRequerida' }),
      paisProyecto: z.string().trim().max(UBICACION_MAX),
      ciudadProyecto: z.string().trim().max(UBICACION_MAX),
      contextoInicial: z
        .string()
        .trim()
        .min(CONTEXTO_MIN, { error: 'fondoMin' }),
    })
    .superRefine((valores, ctx) => {
      if (!MODALIDADES.includes(valores.modalidad as Modalidad)) {
        ctx.addIssue({
          code: 'custom',
          message: 'modalidad',
          path: ['modalidad'],
        })
      }

      if (valores.modalidad !== 'remoto') {
        if (!valores.paisProyecto.trim() || !valores.ciudadProyecto.trim()) {
          ctx.addIssue({
            code: 'custom',
            message: 'ubicacion',
            path: ['ciudadProyecto'],
          })
        }
      }

      const min = parseMoney(valores.presupuestoMin)
      const max = parseMoney(valores.presupuestoMax)
      if (min !== null && max !== null && min > max) {
        ctx.addIssue({
          code: 'custom',
          message: 'presupuesto',
          path: ['presupuestoMax'],
        })
      }

      const dias = daysBetween(todayIso, valores.fechaCierre)
      if (dias !== null && (dias < PLAZO_MIN_DIAS || dias > PLAZO_MAX_DIAS)) {
        ctx.addIssue({
          code: 'custom',
          message: 'plazo',
          path: ['fechaCierre'],
        })
      }
    })
}

/**
 * Mapea valores YA validados al draft que se persiste en
 * `conversaciones_ia.logistica`. Asume `modalidad` válida (post-safeParse).
 */
export function toLogisticaDraft(values: LogisticsFormValues): LogisticaDraft {
  const esRemoto = values.modalidad === 'remoto'
  const pais = values.paisProyecto.trim()
  const ciudad = values.ciudadProyecto.trim()
  const titulo = values.titulo.trim()

  return {
    titulo: titulo === '' ? null : titulo,
    modalidad: values.modalidad as Modalidad,
    moneda: values.moneda,
    presupuestoMin: parseMoney(values.presupuestoMin),
    presupuestoMax: parseMoney(values.presupuestoMax),
    fechaCierre: values.fechaCierre,
    paisProyecto: esRemoto || pais === '' ? null : pais,
    ciudadProyecto: esRemoto || ciudad === '' ? null : ciudad,
  }
}

/**
 * Inverso de `toLogisticaDraft`: reconstruye los valores del formulario a partir
 * del draft persistido + el contexto, para hidratar la Pantalla 1 al retomar la
 * conversación (errolpendiente §3, RF-59).
 */
export function draftToFormValues(
  draft: LogisticaDraft | null,
  contextoInicial: string,
): LogisticsFormValues {
  return {
    titulo: draft?.titulo ?? '',
    modalidad: draft?.modalidad ?? '',
    moneda: draft?.moneda ?? 'USD',
    presupuestoMin:
      draft?.presupuestoMin != null ? String(draft.presupuestoMin) : '',
    presupuestoMax:
      draft?.presupuestoMax != null ? String(draft.presupuestoMax) : '',
    fechaCierre: draft?.fechaCierre ?? '',
    paisProyecto: draft?.paisProyecto ?? '',
    ciudadProyecto: draft?.ciudadProyecto ?? '',
    contextoInicial,
  }
}
