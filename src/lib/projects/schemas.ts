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
export const CONTEXTO_MIN = 90
export const CONTEXTO_MAX = 3000
export const PLAZO_MIN_DIAS = 5
export const PLAZO_MAX_DIAS = 15

export interface LogisticsFormValues {
  titulo: string
  modalidad: string
  moneda: Moneda
  presupuestoMin: string
  presupuestoMax: string
  plazoDias: string
  paisIso: string
  region: string
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
  plazoDias: number
  paisIso: string | null
  region: string | null
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

/** Convierte el plazo (días) de texto a entero; null si vacío o no es entero. */
export function parsePlazo(raw: string): number | null {
  const limpio = raw.trim()
  if (limpio === '') return null
  const dias = Number(limpio)
  return Number.isInteger(dias) ? dias : null
}

/**
 * Construye el esquema de la Pantalla 1. El plazo (RF-21) es una DURACIÓN en
 * días (5..15), no una fecha: así no envejece al retomar el borrador ni depende
 * de la zona horaria. La `fecha_cierre` real la calcula el RPC al publicar
 * (`fecha_publicacion` + `plazo_dias`).
 */
export function buildLogisticsSchema() {
  return z
    .object({
      titulo: z.string().trim().max(TITULO_MAX, { error: 'tituloMax' }),
      modalidad: z.string(),
      moneda: z.enum(MONEDAS),
      presupuestoMin: z.string(),
      presupuestoMax: z.string(),
      plazoDias: z.string(),
      paisIso: z.string().trim(),
      region: z.string().trim(),
      contextoInicial: z
        .string()
        .trim()
        .min(CONTEXTO_MIN, { error: 'fondoMin' })
        .max(CONTEXTO_MAX, { error: 'fondoMax' }),
    })
    .superRefine((valores, ctx) => {
      if (!MODALIDADES.includes(valores.modalidad as Modalidad)) {
        ctx.addIssue({
          code: 'custom',
          message: 'modalidad',
          path: ['modalidad'],
        })
      }

      if (valores.modalidad !== 'remoto' && !valores.paisIso.trim()) {
        ctx.addIssue({
          code: 'custom',
          message: 'pais',
          path: ['paisIso'],
        })
      }

      const min = parseMoney(valores.presupuestoMin)
      const max = parseMoney(valores.presupuestoMax)
      // Obligatorios y > 0 (decisión de proyecto; el doc viejo los daba opcionales).
      if (min === null || min <= 0) {
        ctx.addIssue({
          code: 'custom',
          message: 'presupuestoMin',
          path: ['presupuestoMin'],
        })
      }
      if (max === null || max <= 0) {
        ctx.addIssue({
          code: 'custom',
          message: 'presupuestoMax',
          path: ['presupuestoMax'],
        })
      }
      if (min !== null && max !== null && min > max) {
        ctx.addIssue({
          code: 'custom',
          message: 'presupuesto',
          path: ['presupuestoMax'],
        })
      }

      // Decimales por defecto (USD), pero el colón no admite decimales (céntimos
      // en desuso): en CRC el presupuesto debe ser entero. Mitad backend de la
      // regla; el form refleja lo mismo con el `step` del input.
      if (valores.moneda === 'CRC') {
        if (min !== null && !Number.isInteger(min)) {
          ctx.addIssue({
            code: 'custom',
            message: 'presupuestoEntero',
            path: ['presupuestoMin'],
          })
        }
        if (max !== null && !Number.isInteger(max)) {
          ctx.addIssue({
            code: 'custom',
            message: 'presupuestoEntero',
            path: ['presupuestoMax'],
          })
        }
      }

      const plazo = parsePlazo(valores.plazoDias)
      if (plazo === null || plazo < PLAZO_MIN_DIAS || plazo > PLAZO_MAX_DIAS) {
        ctx.addIssue({
          code: 'custom',
          message: 'plazo',
          path: ['plazoDias'],
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
  const paisIso = values.paisIso.trim()
  const region = values.region.trim()
  const titulo = values.titulo.trim()

  return {
    titulo: titulo === '' ? null : titulo,
    modalidad: values.modalidad as Modalidad,
    moneda: values.moneda,
    presupuestoMin: parseMoney(values.presupuestoMin),
    presupuestoMax: parseMoney(values.presupuestoMax),
    plazoDias: parsePlazo(values.plazoDias) ?? PLAZO_MIN_DIAS,
    paisIso: esRemoto || paisIso === '' ? null : paisIso,
    region: esRemoto || region === '' ? null : region,
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
    plazoDias: draft?.plazoDias != null ? String(draft.plazoDias) : '',
    paisIso: draft?.paisIso ?? '',
    region: draft?.region ?? '',
    contextoInicial,
  }
}
