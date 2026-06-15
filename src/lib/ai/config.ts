import 'server-only'
import { z } from 'zod'

/**
 * Configuración de la IA leída de variables de entorno y validada con Zod
 * (reglas §5). Un solo proveedor compatible con OpenAI vía OpenRouter
 * (errolpendiente §5.1). Lanza 'AI_NOT_CONFIGURED' si falta o es inválida.
 */
const aiEnvSchema = z.object({
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_MODEL: z.string().min(1),
  OPENAI_BASE_URL: z.url(),
})

export interface AiConfig {
  apiKey: string
  model: string
  baseUrl: string
}

export function getAiConfig(): AiConfig {
  const parsed = aiEnvSchema.safeParse({
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_MODEL: process.env.OPENAI_MODEL,
    OPENAI_BASE_URL: process.env.OPENAI_BASE_URL,
  })
  if (!parsed.success) {
    throw new Error('AI_NOT_CONFIGURED')
  }
  return {
    apiKey: parsed.data.OPENAI_API_KEY,
    model: parsed.data.OPENAI_MODEL,
    baseUrl: parsed.data.OPENAI_BASE_URL,
  }
}
