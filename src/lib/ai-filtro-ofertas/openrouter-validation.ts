import { z } from 'zod'
import { logger } from '@/lib/logger'
import { serverEnv } from '@/lib/env.server'

export interface ValidationInput {
  projectTitle: string
  projectDescription: string
  coverLetter?: string | undefined
  solutionApproach: string
  externalLink?: string | null | undefined
  uploadedPrototypeUrl?: string | null | undefined
  technicalDocUrl?: string | null | undefined
}

export interface ValidationResult {
  isRelated: boolean
  problematicFields: string[]
  reason: string
}

const aiResponseSchema = z.object({
  isRelated: z.boolean(),
  problematicFields: z.array(z.string()),
  reason: z.string(),
})

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'
const DEFAULT_MODEL = 'openai/gpt-4o-mini'

/**
 * Valida con OpenRouter si una postulación está relacionada con el proyecto.
 * Si la API Key (OPENROUTER_FILTRO_OFERTAS_API_KEY) no está configurada,
 * aprueba automáticamente para no bloquear al equipo (fail-safe).
 * Si la API devuelve error, también aprueba.
 */
export async function validateApplicationWithAI(
  input: ValidationInput,
): Promise<ValidationResult> {
  const apiKey = serverEnv.OPENROUTER_FILTRO_OFERTAS_API_KEY
  const model = serverEnv.OPENROUTER_FILTRO_OFERTAS_MODEL ?? DEFAULT_MODEL

  if (!apiKey) {
    logger.warn(
      'validateApplicationWithAI: OPENROUTER_FILTRO_OFERTAS_API_KEY no configurada, saltando validación',
    )
    return { isRelated: true, problematicFields: [], reason: 'API Key missing' }
  }

  logger.info('validateApplicationWithAI: iniciando llamada a OpenRouter', {
    model,
    project: input.projectTitle,
  })

  const prompt = `Eres un evaluador experto de talento tech. Tu tarea es analizar una postulación de un egresado junior a un proyecto freelance y determinar estrictamente si el contenido de su postulación (carta, solución y archivos) TIENE RELACIÓN DIRECTA con el proyecto.

DATOS DEL PROYECTO:
- Título: ${input.projectTitle}
- Descripción: ${input.projectDescription}

POSTULACIÓN DEL EGRESADO:
- Carta de presentación: ${input.coverLetter ?? 'No provista'}
- Planteamiento de la solución: ${input.solutionApproach}
- Enlace externo/prototipo: ${input.externalLink ?? 'No provisto'}
- Archivo de prototipo subido: ${input.uploadedPrototypeUrl ? 'Si' : 'No'}
- Documentación técnica: ${input.technicalDocUrl ? 'Si' : 'No'}

INSTRUCCIONES:
Determina si la postulación responde genuinamente a los requisitos del proyecto. Si el egresado habla de cosas completamente ajenas al proyecto, debes rechazarlo.
Si la postulación es un intento genuino y guarda relación temática con el proyecto, acéptalo.
En caso de rechazo, indica en 'problematicFields' cuáles partes están mal y en 'reason' da una breve explicación en español.

Devuelve EXCLUSIVAMENTE un objeto JSON con el siguiente formato, sin texto adicional ni bloques markdown:
{"isRelated": true/false, "problematicFields": ["campo1", "campo2"], "reason": "explicación"}`

  try {
    const res = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://fwd.com',
        'X-Title': 'FWD Marketplace - Filtro de Postulaciones',
      },
      signal: AbortSignal.timeout(20000),
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
      }),
    })

    logger.info('validateApplicationWithAI: respuesta recibida de OpenRouter', {
      status: res.status,
      ok: res.ok,
    })

    if (!res.ok) {
      const errorText = await res.text()
      logger.error('validateApplicationWithAI: error de API OpenRouter', {
        status: res.status,
        body: errorText.slice(0, 500),
      })
      return {
        isRelated: true,
        problematicFields: [],
        reason: `API error ${res.status}`,
      }
    }

    const data: unknown = await res.json()

    const responseText =
      data !== null && typeof data === 'object' && 'choices' in data
        ? (
            data as {
              choices?: { message?: { content?: string } }[]
            }
          ).choices?.[0]?.message?.content
        : undefined

    logger.info('validateApplicationWithAI: texto de respuesta', {
      responseText: responseText?.slice(0, 300),
    })

    if (!responseText) {
      logger.warn('validateApplicationWithAI: respuesta vacía de OpenRouter')
      return {
        isRelated: true,
        problematicFields: [],
        reason: 'Empty response from AI',
      }
    }

    // Limpia posibles bloques markdown que algunos modelos añaden
    const cleanText = responseText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim()

    const parsed = aiResponseSchema.safeParse(JSON.parse(cleanText))

    if (!parsed.success) {
      logger.error('validateApplicationWithAI: formato de respuesta inválido', {
        error: parsed.error.message,
        raw: cleanText.slice(0, 200),
      })
      return { isRelated: true, problematicFields: [], reason: 'Parse error' }
    }

    logger.info('validateApplicationWithAI: resultado final', {
      isRelated: parsed.data.isRelated,
      reason: parsed.data.reason,
    })

    return parsed.data
  } catch (error) {
    logger.error('validateApplicationWithAI: excepcion en la peticion', {
      error: error instanceof Error ? error.message : String(error),
    })
    return {
      isRelated: true,
      problematicFields: [],
      reason: 'Request exception',
    }
  }
}
