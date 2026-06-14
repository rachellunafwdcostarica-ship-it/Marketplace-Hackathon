import 'server-only'
import OpenAI from 'openai'
import { getAiConfig } from './config'
import type { HistorialEntry } from './types'
import type { LogisticaDraft } from '@/lib/projects/schemas'

/**
 * Proveedor de IA intercambiable (errolpendiente §5.1): un solo modelo, una
 * sola API key, vía OpenRouter (API compatible con OpenAI). En este corte se
 * implementa la llamada #1 (Conversar). Generar (#2) y Validar (#3) se agregan
 * en el corte siguiente. La columna `modelo_ia` registra qué modelo se usó.
 */

const TIMEOUT_MS = 30_000
const MAX_TOKENS = 800
const TEMPERATURE = 0.4

// Scope guard en el system prompt (errolpendiente §5.1): el chat solo trata el
// proyecto de software; redirige lo fuera de tema en una línea.
const SYSTEM_CONVERSAR = `Sos el asistente de FWD Talent. Ayudás a un empresario SIN conocimientos técnicos a definir un proyecto de software para publicarlo en la plataforma.

Tu objetivo ahora es entrevistarlo con preguntas claras y breves (una o dos por turno) para entender el proyecto: objetivo de negocio, alcance, entregables y a quién va dirigido. No uses jerga técnica; traducí vos lo técnico a lenguaje de negocio.

Solo ayudás a armar propuestas de proyectos de software. Si te preguntan algo no relacionado, decílo en una línea y redirigí al proyecto; no respondas temas fuera de eso. Por ejemplo, ante "quién es un personaje", "cuándo es un feriado" o "cuánto cuesta un producto", respondé: "Solo te puedo ayudar con tu proyecto, ¿seguimos con lo que falta?". Ojo: "algo como Uber pero para fontaneros" o "un sistema de pedidos para mi juguería" SÍ son del proyecto.

No prometas publicar todavía y no inventes datos del empresario.`

export interface ConversarInput {
  contextoInicial: string
  logistica: LogisticaDraft | null
  historial: HistorialEntry[]
}

export interface AiProvider {
  readonly modelId: string
  conversar(input: ConversarInput): Promise<string>
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

export function getAiProvider(): AiProvider {
  const config = getAiConfig()
  const client = new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseUrl,
    timeout: TIMEOUT_MS,
  })

  return {
    modelId: config.model,
    async conversar({ contextoInicial, logistica, historial }) {
      const turnos: OpenAI.Chat.Completions.ChatCompletionMessageParam[] =
        historial
          .filter((entrada) => entrada.tipo === 'mensaje')
          .map((entrada) =>
            entrada.rol === 'ia'
              ? { role: 'assistant', content: entrada.contenido }
              : { role: 'user', content: entrada.contenido },
          )

      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        {
          role: 'system',
          content: `${SYSTEM_CONVERSAR}\n\n${resumenLogistica(logistica)}`,
        },
        {
          role: 'user',
          content: `Contexto inicial del proyecto:\n${contextoInicial}`,
        },
        ...turnos,
      ]

      const completion = await client.chat.completions.create({
        model: config.model,
        messages,
        temperature: TEMPERATURE,
        max_tokens: MAX_TOKENS,
      })

      const reply = completion.choices[0]?.message?.content?.trim()
      if (!reply) {
        throw new Error('AI_EMPTY_RESPONSE')
      }
      return reply
    },
  }
}
