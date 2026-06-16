import { z } from 'zod'

/**
 * Esquemas Zod de las RESPUESTAS de la IA (reglas §5: "Zod en respuestas de IA").
 * El LLM devuelve JSON; lo validamos antes de confiar en él. Cada llamada
 * (Conversar / Generar / Validar) tiene su forma — errolpendiente §5.1.
 *
 * gpt-oss-120b devuelve JSON VÁLIDO (con JSON mode) pero no siempre con los TIPOS
 * correctos: a veces manda un string donde se espera un array, o "true" en vez de
 * true. Por eso coercionamos las desviaciones comunes en vez de explotar — así un
 * tipo flojo del modelo no tira toda la propuesta (decisión: parser tolerante).
 */

export const NIVELES_TECNICOS = [
  'no_tecnico',
  'basico',
  'intermedio',
  'avanzado',
] as const
export type NivelTecnico = (typeof NIVELES_TECNICOS)[number]

/** string suelto, array u otro → array de strings limpio (sin vacíos). */
const toStringArray = (val: unknown): string[] => {
  if (typeof val === 'string') {
    return val
      .split(/[\n,;]+/)
      .map((s) => s.trim())
      .filter(Boolean)
  }
  if (Array.isArray(val)) {
    return val
      .map((x) => (typeof x === 'string' ? x : String(x)).trim())
      .filter(Boolean)
  }
  return []
}

/** array u otro tipo → texto (el modelo a veces parte un texto en array). */
const toText = (val: unknown): string => {
  if (typeof val === 'string') return val
  if (Array.isArray(val)) return val.map((x) => String(x)).join('\n')
  if (val == null) return ''
  return String(val)
}

/** booleano flexible: acepta true/false o "true"/"false". */
const toBool = (val: unknown): boolean => {
  if (typeof val === 'boolean') return val
  if (typeof val === 'string') return val.trim().toLowerCase() === 'true'
  return false
}

/** nivel técnico tolerante: mapea variantes ("básico", "no técnico") al enum. */
const toNivel = (val: unknown): string => {
  const s = String(val ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
  if (s.startsWith('no')) return 'no_tecnico'
  if (s.startsWith('b')) return 'basico' // basico / básico
  if (s.startsWith('inter')) return 'intermedio'
  if (s.startsWith('avan')) return 'avanzado'
  return (NIVELES_TECNICOS as readonly string[]).includes(s) ? s : 'no_tecnico'
}

/** #1 Conversar: mensaje para el chat + si el fondo ya está completo. */
export const conversarResponseSchema = z.object({
  mensaje: z.string().min(1),
  completo: z.preprocess(toBool, z.boolean()),
  faltan: z.preprocess(toStringArray, z.array(z.string())),
})
export type ConversarResponse = z.infer<typeof conversarResponseSchema>

/** #2 Generar: propuesta estructurada (categorías/tecnologías por NOMBRE de catálogo). */
export const propuestaGeneradaSchema = z.object({
  titulo: z.preprocess(toText, z.string().min(1)),
  descripcion: z.preprocess(toText, z.string().min(1)),
  area: z.preprocess(toText, z.string().min(1)),
  categorias: z.preprocess(toStringArray, z.array(z.string()).min(1)),
  tecnologias: z.preprocess(toStringArray, z.array(z.string()).min(1)),
  stackSugerido: z.preprocess(toStringArray, z.array(z.string())),
  involucraIa: z.preprocess(toBool, z.boolean()),
  nivelTecnico: z.preprocess(toNivel, z.enum(NIVELES_TECNICOS)),
})
export type PropuestaGeneradaRaw = z.infer<typeof propuestaGeneradaSchema>

/** #3 Validar: guardrail crítico antes de mostrar la propuesta. */
export const validacionResponseSchema = z.object({
  valido: z.preprocess(toBool, z.boolean()),
  razones: z.preprocess(toStringArray, z.array(z.string())),
  ajustes: z.preprocess(toStringArray, z.array(z.string())),
})
export type ValidacionResponse = z.infer<typeof validacionResponseSchema>
