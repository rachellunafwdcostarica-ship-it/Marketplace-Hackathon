import 'server-only'
import OpenAI from 'openai'
import type { ZodType } from 'zod'
import { getAiConfig } from './config'
import type { HistorialEntry } from './types'
import {
  conversarResponseSchema,
  propuestaGeneradaSchema,
  validacionResponseSchema,
  type ConversarResponse,
  type PropuestaGeneradaRaw,
  type ValidacionResponse,
} from './schemas'
import type { LogisticaDraft } from '@/lib/projects/schemas'

/**
 * Proveedor de IA intercambiable (errolpendiente §5.1): un solo modelo y una
 * sola API key vía OpenRouter, con tres tipos de llamada — Conversar (#1),
 * Generar (#2) y Validar (#3). La columna `modelo_ia` registra qué modelo se usó.
 */

const TIMEOUT_MS = 30_000
const MAX_TOKENS = 1200
const TEMPERATURE = 0.4

const SYSTEM_CONVERSAR = `Sos el asistente de FWD Talent. Ayudás a un empresario SIN conocimientos técnicos a definir un proyecto de software para publicarlo en la plataforma.

Si es el PRIMER turno (todavía no hay conversación), saludá breve y reaccioná al contexto que dejó el empresario: si ya se entiende el proyecto, decílo; si falta info, hacé la primera pregunta. Nunca lo dejes sin respuesta.

Entrevistalo con preguntas claras y breves (una o dos por turno) para entender: objetivo de negocio, alcance, entregables, a quién va dirigido y el RUBRO o ÁREA DE NEGOCIO (ej. salud, educación, comercio, finanzas, recursos humanos). Si el rubro/área no queda claro del contexto, PREGUNTALO — no lo adivines. No uses jerga técnica; traducí vos lo técnico a lenguaje de negocio.

Solo ayudás a armar propuestas de proyectos de software. Si te preguntan algo no relacionado, decílo en una línea y redirigí al proyecto; no respondas temas fuera de eso. Por ejemplo, ante "quién es un personaje", "cuándo es un feriado" o "cuánto cuesta un producto", respondé: "Solo te puedo ayudar con tu proyecto, ¿seguimos con lo que falta?". Ojo: "algo como Uber pero para fontaneros" o "un sistema de pedidos para mi juguería" SÍ son del proyecto.

Respondé SIEMPRE en JSON con esta forma exacta, sin texto fuera del JSON:
{"mensaje": "<tu respuesta para el empresario>", "completo": <true|false>, "faltan": ["<qué falta>"]}
"completo" es true SOLO cuando hay objetivo, alcance y entregables claros, se entiende el rubro/área, y se puede inferir al menos una categoría y una tecnología. Si el rubro/área no está claro, completo=false y preguntá por él. Cuando completo sea true, anuncialo en el "mensaje" (ej: "Creo que ya tengo lo suficiente para armar la propuesta, ¿la armamos o querés ajustar algo?"). No prometas publicar todavía y no inventes datos.`

const SYSTEM_GENERAR = `Sos el asistente de FWD Talent. A partir de la conversación con el empresario, armá una propuesta de proyecto de software ESTRUCTURADA.

Reglas:
- Elegí "categorias" y "tecnologias" SOLO de los catálogos provistos abajo, usando el nombre EXACTO del catálogo. Al menos una de cada una.
- "area" debe ser una de las áreas del catálogo (nombre exacto).
- "nivelTecnico" es tu inferencia del nivel del empresario: no_tecnico, basico, intermedio o avanzado.
- "involucraIa" es true solo si el proyecto, COMO PRODUCTO, usa IA como tecnología (no por usar este asistente).
- "stackSugerido" son tecnologías recomendadas y justificadas (texto libre breve).

Respondé SOLO con JSON válido, sin texto fuera del JSON, con esta forma:
{"titulo": "...", "descripcion": "...", "area": "...", "categorias": ["..."], "tecnologias": ["..."], "stackSugerido": ["..."], "involucraIa": <true|false>, "nivelTecnico": "..."}`

const SYSTEM_VALIDAR = `Sos un revisor CRÍTICO de propuestas de proyectos de software para FWD Talent. Validá la propuesta contra estos tres criterios; aprobás solo si se cumplen los tres:
1. Es software/digital que un junior puede construir (app, web, sistema, automatización, script, integración). No objetos físicos ni servicios no-software.
2. Es coherente y posible (el objetivo tiene sentido técnico).
3. Es apropiada: sin contenido falso, engañoso, ilegal ni ofensivo.

Sé estricto. Respondé SOLO con JSON válido, sin texto fuera del JSON:
{"valido": <true|false>, "razones": ["<por qué no pasa, si aplica>"], "ajustes": ["<qué cambiar para que pase>"]}`

export interface ConversarInput {
  contextoInicial: string
  logistica: LogisticaDraft | null
  historial: HistorialEntry[]
}

export interface GenerarInput {
  contextoInicial: string
  logistica: LogisticaDraft | null
  historial: HistorialEntry[]
  catalogos: { areas: string[]; categorias: string[]; tecnologias: string[] }
  ajustes: string[]
}

export interface AiProvider {
  readonly modelId: string
  conversar(input: ConversarInput): Promise<ConversarResponse>
  generarPropuesta(input: GenerarInput): Promise<PropuestaGeneradaRaw>
  validarPropuesta(propuesta: PropuestaGeneradaRaw): Promise<ValidacionResponse>
}

function extractJson(content: string): unknown {
  const trimmed = content.trim()
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
  const raw = fence?.[1] ?? trimmed
  return JSON.parse(raw)
}

function resumenLogistica(logistica: LogisticaDraft | null): string {
  if (!logistica) return 'El empresario todavía no cargó la logística.'
  const partes: string[] = [
    `modalidad ${logistica.modalidad}`,
    `moneda ${logistica.moneda}`,
  ]
  if (logistica.presupuestoMin != null || logistica.presupuestoMax != null) {
    partes.push(
      `presupuesto ${logistica.presupuestoMin ?? '?'}–${logistica.presupuestoMax ?? '?'}`,
    )
  }
  partes.push(`cierre de recepción ${logistica.fechaCierre}`)
  if (logistica.paisProyecto) {
    partes.push(
      `ubicación ${[logistica.ciudadProyecto, logistica.paisProyecto].filter(Boolean).join(', ')}`,
    )
  }
  return `Logística ya elegida por el empresario: ${partes.join('; ')}.`
}

function turnosHistorial(
  historial: HistorialEntry[],
): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
  return historial
    .filter((entrada) => entrada.tipo === 'mensaje')
    .map((entrada) =>
      entrada.rol === 'ia'
        ? { role: 'assistant', content: entrada.contenido }
        : { role: 'user', content: entrada.contenido },
    )
}

export function getAiProvider(): AiProvider {
  const config = getAiConfig()
  const client = new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseUrl,
    timeout: TIMEOUT_MS,
  })

  async function callJson<T>(
    messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
    schema: ZodType<T>,
  ): Promise<T> {
    // Un reintento interno: los LLM a veces devuelven JSON apenas malformado.
    for (let intento = 0; intento < 2; intento++) {
      const completion = await client.chat.completions.create({
        model: config.model,
        messages,
        temperature: TEMPERATURE,
        max_tokens: MAX_TOKENS,
      })
      const content = completion.choices[0]?.message?.content
      if (content) {
        try {
          const result = schema.safeParse(extractJson(content))
          if (result.success) return result.data
        } catch {
          // JSON inválido: reintentamos una vez antes de rendirnos.
        }
      }
    }
    throw new Error('AI_INVALID_JSON')
  }

  return {
    modelId: config.model,

    async conversar({ contextoInicial, logistica, historial }) {
      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        {
          role: 'system',
          content: `${SYSTEM_CONVERSAR}\n\n${resumenLogistica(logistica)}`,
        },
        {
          role: 'user',
          content: `Contexto inicial del proyecto:\n${contextoInicial}`,
        },
        ...turnosHistorial(historial),
      ]

      const completion = await client.chat.completions.create({
        model: config.model,
        messages,
        temperature: TEMPERATURE,
        max_tokens: MAX_TOKENS,
      })
      const content = completion.choices[0]?.message?.content?.trim()
      if (!content) {
        throw new Error('AI_EMPTY_RESPONSE')
      }
      try {
        const result = conversarResponseSchema.safeParse(extractJson(content))
        if (result.success) return result.data
      } catch {
        // Sin JSON válido caemos a un fallback: el chat no debe romperse.
      }
      return { mensaje: content, completo: false, faltan: [] }
    },

    async generarPropuesta({
      contextoInicial,
      logistica,
      historial,
      catalogos,
      ajustes,
    }) {
      const catalogoTexto = [
        `Áreas: ${catalogos.areas.join(', ')}`,
        `Categorías: ${catalogos.categorias.join(', ')}`,
        `Tecnologías: ${catalogos.tecnologias.join(', ')}`,
      ].join('\n')
      const ajustesTexto =
        ajustes.length > 0
          ? `\n\nCorregí estos problemas de la versión anterior:\n- ${ajustes.join('\n- ')}`
          : ''

      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        {
          role: 'system',
          content: `${SYSTEM_GENERAR}\n\nCatálogos disponibles:\n${catalogoTexto}${ajustesTexto}`,
        },
        {
          role: 'user',
          content: `Contexto inicial:\n${contextoInicial}\n\n${resumenLogistica(logistica)}`,
        },
        ...turnosHistorial(historial),
      ]
      return callJson(messages, propuestaGeneradaSchema)
    },

    async validarPropuesta(propuesta) {
      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: 'system', content: SYSTEM_VALIDAR },
        {
          role: 'user',
          content: `Propuesta a validar (JSON):\n${JSON.stringify(propuesta)}`,
        },
      ]
      return callJson(messages, validacionResponseSchema)
    },
  }
}
