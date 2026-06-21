import { z } from 'zod'
import type { Json } from '@/types/database'
import {
  HISTORIAL_ROLES,
  HISTORIAL_TIPOS,
  type HistorialEntry,
} from '@/lib/proposal-ai/types'
import { MODALIDADES, MONEDAS } from './schemas'
import type { LogisticaDraft, PropuestaProyecto } from './schemas'

/**
 * Validación de los `jsonb` al LEERLOS (reglas.md §5: Zod en toda frontera,
 * incluidas las respuestas de IA persistidas). El contenido del `jsonb` es
 * `unknown` real, así que se valida en vez de asertar la forma a ciegas: un
 * borrador viejo o corrupto se descarta acá en lugar de explotar río abajo.
 *
 * `satisfies z.ZodType<...>` ata cada schema a su interfaz: si una cambia y el
 * otro no, el typecheck rompe.
 */
const historialEntrySchema = z.object({
  rol: z.enum(HISTORIAL_ROLES),
  tipo: z.enum(HISTORIAL_TIPOS),
  contenido: z.string(),
  fecha: z.string(),
}) satisfies z.ZodType<HistorialEntry>

const logisticaDraftSchema = z.object({
  titulo: z.string().nullable(),
  modalidad: z.enum(MODALIDADES),
  moneda: z.enum(MONEDAS),
  presupuestoMin: z.number().nullable(),
  presupuestoMax: z.number().nullable(),
  plazoDias: z.number(),
  paisIso: z.string().nullable(),
  region: z.string().nullable(),
}) satisfies z.ZodType<LogisticaDraft>

const catalogRefSchema = z.object({
  id: z.string(),
  nombre: z.string(),
})

const propuestaSchema = z.object({
  titulo: z.string(),
  descripcion: z.string(),
  idArea: z.string().nullable(),
  areaNombre: z.string().nullable(),
  categorias: z.array(catalogRefSchema),
  tecnologias: z.array(catalogRefSchema),
  stackSugerido: z.array(z.string()),
  involucraIa: z.boolean(),
}) satisfies z.ZodType<PropuestaProyecto>

/** Lee el historial (jsonb) como arreglo tipado; vacío si no valida. */
export function parseHistorial(raw: Json | null): HistorialEntry[] {
  const result = z.array(historialEntrySchema).safeParse(raw)
  return result.success ? result.data : []
}

/** Lee la logística (jsonb) como draft tipado; null si no valida. */
export function parseLogistica(raw: Json | null): LogisticaDraft | null {
  const result = logisticaDraftSchema.safeParse(raw)
  return result.success ? result.data : null
}

/** Lee la propuesta generada (jsonb) como objeto tipado; null si no valida. */
export function parseProposal(raw: Json | null): PropuestaProyecto | null {
  const result = propuestaSchema.safeParse(raw)
  return result.success ? result.data : null
}
