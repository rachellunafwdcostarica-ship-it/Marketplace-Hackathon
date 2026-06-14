import { z } from 'zod'

/**
 * Esquemas Zod de las RESPUESTAS de la IA (reglas §5: "Zod en respuestas de IA").
 * El LLM devuelve JSON; lo validamos antes de confiar en él. Cada llamada
 * (Conversar / Generar / Validar) tiene su forma — errolpendiente §5.1.
 */

export const NIVELES_TECNICOS = [
  'no_tecnico',
  'basico',
  'intermedio',
  'avanzado',
] as const
export type NivelTecnico = (typeof NIVELES_TECNICOS)[number]

/** #1 Conversar: mensaje para el chat + si el fondo ya está completo. */
export const conversarResponseSchema = z.object({
  mensaje: z.string().min(1),
  completo: z.boolean(),
  faltan: z.array(z.string()).default([]),
})
export type ConversarResponse = z.infer<typeof conversarResponseSchema>

/** #2 Generar: propuesta estructurada (categorías/tecnologías por NOMBRE de catálogo). */
export const propuestaGeneradaSchema = z.object({
  titulo: z.string().min(1),
  descripcion: z.string().min(1),
  area: z.string().min(1),
  categorias: z.array(z.string()).min(1),
  tecnologias: z.array(z.string()).min(1),
  stackSugerido: z.array(z.string()).default([]),
  involucraIa: z.boolean(),
  nivelTecnico: z.enum(NIVELES_TECNICOS),
})
export type PropuestaGeneradaRaw = z.infer<typeof propuestaGeneradaSchema>

/** #3 Validar: guardrail crítico antes de mostrar la propuesta. */
export const validacionResponseSchema = z.object({
  valido: z.boolean(),
  razones: z.array(z.string()).default([]),
  ajustes: z.array(z.string()).default([]),
})
export type ValidacionResponse = z.infer<typeof validacionResponseSchema>
