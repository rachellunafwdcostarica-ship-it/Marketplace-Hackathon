import { z } from 'zod'
import { logger } from '@/lib/logger'

export interface ValidationInput {
  projectTitle: string
  projectDescription: string
  coverLetter: string
  solutionApproach: string
  externalLink?: string | null
  uploadedPrototypeUrl?: string | null
  technicalDocUrl?: string | null
}

export interface ValidationResult {
  isRelated: boolean
  problematicFields: string[]
  reason: string
}

const geminiResponseSchema = z.object({
  isRelated: z.boolean(),
  problematicFields: z.array(z.string()),
  reason: z.string(),
})

/**
 * Descarga un archivo desde una URL y lo convierte a Base64.
 * Solo procesa PDFs e imágenes; ignora otros tipos.
 */
async function fetchFileAsBase64(
  url: string,
): Promise<{ mimeType: string; data: string } | null> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) })
    if (!response.ok) return null

    const mimeType = response.headers.get('content-type') ?? ''
    if (!mimeType.includes('pdf') && !mimeType.includes('image')) {
      return null
    }

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    return { mimeType, data: buffer.toString('base64') }
  } catch (error) {
    logger.warn('fetchFileAsBase64: no se pudo descargar el archivo', {
      url,
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

/**
 * Valida con Gemini si una postulación está relacionada con el proyecto.
 * Si la API Key no está configurada, aprueba automáticamente para no bloquear el equipo.
 * Si la API devuelve error, también aprueba (fail-safe).
 */
export async function validateApplicationWithGemini(
  input: ValidationInput,
): Promise<ValidationResult> {
  const apiKey = process.env.GEMINI_API_KEY

  if (!apiKey) {
    logger.warn(
      'validateApplicationWithGemini: GEMINI_API_KEY no configurada, saltando validación',
    )
    return { isRelated: true, problematicFields: [], reason: 'API Key missing' }
  }

  const prompt = `
Eres un evaluador experto de talento tech. Tu tarea es analizar una postulación de un egresado junior a un proyecto freelance y determinar estrictamente si el contenido de su postulación (carta, solución y archivos) TIENE RELACIÓN DIRECTA con el proyecto.

DATOS DEL PROYECTO:
- Título: ${input.projectTitle}
- Descripción: ${input.projectDescription}

POSTULACIÓN DEL EGRESADO:
- Carta de presentación: ${input.coverLetter}
- Planteamiento de la solución: ${input.solutionApproach}
- Enlace externo/prototipo (solo texto): ${input.externalLink ?? 'No provisto'}
- Archivo de prototipo subido: ${input.uploadedPrototypeUrl ? 'Sí (ver adjunto si es imagen/pdf)' : 'No'}
- Documentación técnica: ${input.technicalDocUrl ? 'Sí (ver adjunto si es pdf)' : 'No'}

INSTRUCCIONES:
Determina si la postulación está respondiendo genuinamente a los requisitos del proyecto. Si el egresado habla de cosas completamente ajenas al proyecto, debes rechazarlo.
Si la postulación es un intento genuino y guarda relación temática con el proyecto, acéptalo.
En caso de rechazo, indica en 'problematicFields' cuáles partes están mal (ej. "Carta de presentación", "Documentación técnica", "Planteamiento") y en 'reason' da una breve explicación en español del porqué.

Devuelve EXCLUSIVAMENTE un JSON con el siguiente formato, sin texto adicional ni bloques markdown:
{
  "isRelated": boolean,
  "problematicFields": ["..."],
  "reason": "..."
}
`

  type GeminiPart =
    | { text: string }
    | { inline_data: { mime_type: string; data: string } }
  type GeminiContent = { role: string; parts: GeminiPart[] }

  const contents: GeminiContent[] = [
    { role: 'user', parts: [{ text: prompt }] },
  ]

  const firstContent = contents[0]

  if (input.uploadedPrototypeUrl) {
    const fileData = await fetchFileAsBase64(input.uploadedPrototypeUrl)
    if (fileData && firstContent) {
      firstContent.parts.push({
        inline_data: { mime_type: fileData.mimeType, data: fileData.data },
      })
    }
  }

  if (input.technicalDocUrl) {
    const fileData = await fetchFileAsBase64(input.technicalDocUrl)
    if (fileData && firstContent) {
      firstContent.parts.push({
        inline_data: { mime_type: fileData.mimeType, data: fileData.data },
      })
    }
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify({
        contents,
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      }),
    })

    if (!res.ok) {
      const errorText = await res.text()
      logger.error('validateApplicationWithGemini: error de API', {
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
      data !== null && typeof data === 'object' && 'candidates' in data
        ? (
            data as {
              candidates?: { content?: { parts?: { text?: string }[] } }[]
            }
          ).candidates?.[0]?.content?.parts?.[0]?.text
        : undefined

    if (!responseText) {
      logger.warn('validateApplicationWithGemini: respuesta vacía de la IA')
      return {
        isRelated: true,
        problematicFields: [],
        reason: 'Empty response from AI',
      }
    }

    const parsed = geminiResponseSchema.safeParse(JSON.parse(responseText))

    if (!parsed.success) {
      logger.error(
        'validateApplicationWithGemini: formato de respuesta inválido',
        {
          error: parsed.error.message,
        },
      )
      return { isRelated: true, problematicFields: [], reason: 'Parse error' }
    }

    return parsed.data
  } catch (error) {
    logger.error('validateApplicationWithGemini: excepción en la petición', {
      error: error instanceof Error ? error.message : String(error),
    })
    return {
      isRelated: true,
      problematicFields: [],
      reason: 'Request exception',
    }
  }
}
