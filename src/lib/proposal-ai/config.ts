import 'server-only'
import { z } from 'zod'

/**
 * Configuración del GENERADOR DE PROPUESTAS (feature new-project) leída de
 * variables de entorno y validada con Zod (reglas §5). Usa las variables
 * PROPOSAL_AI_* EXCLUSIVAS de esta feature: este es el único módulo que las lee
 * y la key se pasa explícita al cliente, así ninguna otra parte de la app
 * consume estos tokens. Cada feature de IA debe usar su propio prefijo
 * <FEATURE>_AI_* con su propia key. Un solo proveedor compatible con OpenAI vía
 * OpenRouter (errolpendiente §5.1). Lanza 'AI_NOT_CONFIGURED' si falta o es inválida.
 */
const aiEnvSchema = z.object({
  PROPOSAL_AI_API_KEY: z.string().min(1),
  PROPOSAL_AI_MODEL: z.string().min(1),
  PROPOSAL_AI_BASE_URL: z.url(),
})

export interface AiConfig {
  apiKey: string
  model: string
  baseUrl: string
}

export function getAiConfig(): AiConfig {
  const parsed = aiEnvSchema.safeParse({
    PROPOSAL_AI_API_KEY: process.env.PROPOSAL_AI_API_KEY,
    PROPOSAL_AI_MODEL: process.env.PROPOSAL_AI_MODEL,
    PROPOSAL_AI_BASE_URL: process.env.PROPOSAL_AI_BASE_URL,
  })
  if (!parsed.success) {
    throw new Error('AI_NOT_CONFIGURED')
  }
  return {
    apiKey: parsed.data.PROPOSAL_AI_API_KEY,
    model: parsed.data.PROPOSAL_AI_MODEL,
    baseUrl: parsed.data.PROPOSAL_AI_BASE_URL,
  }
}
