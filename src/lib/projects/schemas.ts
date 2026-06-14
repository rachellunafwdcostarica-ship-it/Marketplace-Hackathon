import { z } from 'zod'

/**
 * Esquemas y mapeos del formulario de publicación de proyectos (RF-19..22).
 *
 * `projectFormSchema` valida los valores tal cual los entrega el formulario
 * (todo string/array) y se usa en ambas fronteras (RHF en el cliente y el
 * server action). Los mensajes son CÓDIGOS estables; la traducción vive en el
 * componente (namespace ProjectPublish.errors) para mantener el esquema puro.
 *
 * `toPublishPayload` convierte los valores ya validados a los tipos de la BD.
 */

export const MODALIDADES = ['remoto', 'hibrido', 'presencial'] as const
export type Modalidad = (typeof MODALIDADES)[number]

export const MONEDAS = ['USD', 'CRC'] as const
export type Moneda = (typeof MONEDAS)[number]

export const TITULO_MIN = 10
export const DESCRIPCION_MIN = 30
export const FONDO_MIN = 20
export const UBICACION_MAX = 80
export const PLAZO_MIN_DIAS = 5
export const PLAZO_MAX_DIAS = 15

const MS_POR_DIA = 86_400_000

export interface ProjectFormValues {
  titulo: string
  descripcion: string
  idAreaNegocio: string
  categorias: string[]
  tecnologias: string[]
  modalidad: string
  paisProyecto: string
  ciudadProyecto: string
  moneda: Moneda
  presupuestoMin: string
  presupuestoMax: string
  fechaPublicacion: string
  fechaCierre: string
  contextoInicial: string
}

export interface PublishPayload {
  titulo: string
  descripcion: string
  idAreaNegocio: string | null
  categorias: string[]
  tecnologias: string[]
  modalidad: Modalidad
  paisProyecto: string | null
  ciudadProyecto: string | null
  moneda: Moneda
  presupuestoMin: number | null
  presupuestoMax: number | null
  fechaPublicacionIso: string
  fechaCierreIso: string
  contextoInicial: string
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

export const projectFormSchema = z
  .object({
    titulo: z.string().trim().min(TITULO_MIN, { error: 'tituloMin' }),
    descripcion: z
      .string()
      .trim()
      .min(DESCRIPCION_MIN, { error: 'descripcionMin' }),
    idAreaNegocio: z.string(),
    categorias: z.array(z.uuid()).min(1, { error: 'categoriasMin' }),
    tecnologias: z.array(z.uuid()).min(1, { error: 'tecnologiasMin' }),
    modalidad: z.string(),
    paisProyecto: z.string().trim().max(UBICACION_MAX),
    ciudadProyecto: z.string().trim().max(UBICACION_MAX),
    moneda: z.enum(MONEDAS),
    presupuestoMin: z.string(),
    presupuestoMax: z.string(),
    fechaPublicacion: z.string().min(1, { error: 'fechasRequeridas' }),
    fechaCierre: z.string().min(1, { error: 'fechasRequeridas' }),
    contextoInicial: z.string().trim().min(FONDO_MIN, { error: 'fondoMin' }),
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

    const dias = daysBetween(valores.fechaPublicacion, valores.fechaCierre)
    if (dias !== null && (dias < PLAZO_MIN_DIAS || dias > PLAZO_MAX_DIAS)) {
      ctx.addIssue({ code: 'custom', message: 'plazo', path: ['fechaCierre'] })
    }
  })

/**
 * Mapea valores YA validados a los tipos de la BD. Debe llamarse después de un
 * `projectFormSchema.safeParse` exitoso (asume `modalidad` válida).
 */
export function toPublishPayload(values: ProjectFormValues): PublishPayload {
  const esRemoto = values.modalidad === 'remoto'
  const pais = values.paisProyecto.trim()
  const ciudad = values.ciudadProyecto.trim()
  const area = values.idAreaNegocio.trim()

  return {
    titulo: values.titulo.trim(),
    descripcion: values.descripcion.trim(),
    idAreaNegocio: area === '' ? null : area,
    categorias: values.categorias,
    tecnologias: values.tecnologias,
    modalidad: values.modalidad as Modalidad,
    paisProyecto: esRemoto || pais === '' ? null : pais,
    ciudadProyecto: esRemoto || ciudad === '' ? null : ciudad,
    moneda: values.moneda,
    presupuestoMin: parseMoney(values.presupuestoMin),
    presupuestoMax: parseMoney(values.presupuestoMax),
    fechaPublicacionIso: `${values.fechaPublicacion}T00:00:00.000Z`,
    fechaCierreIso: `${values.fechaCierre}T00:00:00.000Z`,
    contextoInicial: values.contextoInicial.trim(),
  }
}
