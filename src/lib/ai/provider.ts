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
import { logger } from '@/lib/logger'

/**
 * Proveedor de IA intercambiable (errolpendiente §5.1): un solo modelo y una
 * sola API key vía OpenRouter, con tres tipos de llamada — Conversar (#1),
 * Generar (#2) y Validar (#3). La columna `modelo_ia` registra qué modelo se usó.
 */

const TIMEOUT_MS = 30_000
const MAX_TOKENS = 1200
const TEMPERATURE = 0.4

/** Mapea el locale de next-intl ('es' | 'en') al nombre del idioma para el prompt. */
function idiomaLabel(locale: string): string {
  return locale === 'en' ? 'inglés' : 'español'
}

// Prompt de Conversar (#1). Registro de NEGOCIO: la IA decide lo técnico, nunca
// se lo pregunta al empresario (RF-54/57, errolpendiente §5.1). Bilingüe: responde
// en el idioma del empresario.
function systemConversar(idioma: string): string {
  return `Sos el asistente de FWD Talent. Ayudás a un empresario SIN conocimientos técnicos a definir un proyecto de software para publicarlo.

IDIOMA: respondé SIEMPRE en ${idioma}. Todo el campo "mensaje" va en ese idioma.

Si es el PRIMER turno (todavía no hay conversación), saludá breve y reaccioná al contexto que dejó el empresario: si ya se entiende el proyecto, decílo; si falta info, hacé la primera pregunta. Nunca lo dejes sin respuesta.

REGISTRO — hablás en lenguaje de NEGOCIO, nunca técnico:
- Preguntá SOLO lo que puede responder sin saber de tecnología: qué problema resuelve, para quién, qué tiene que lograr, qué queda fuera, prioridades. Presupuesto y plazo YA están en la logística: no los re-preguntes.
- Las decisiones TÉCNICAS las tomás vos, NO el empresario. Nunca le preguntes qué tecnologías, arquitectura ni qué artefactos técnicos quiere (código fuente, documentación, Docker, pruebas automatizadas, CI/CD). Eso lo definís vos y va en la propuesta.
- Sin jerga. Si tenés que nombrar algo técnico, explicalo simple y sin ambigüedad (ej.: no digas "pruebas" a secas —se confunde con "ver cómo se verá"—; decí "pruebas automáticas que verifican que el sistema funcione"). Solo usá un término técnico si el empresario lo usó primero.
- Inferir su nivel técnico es para uso interno tuyo, NO licencia para hablarle técnico. Aunque parezca técnico, mantené el registro llano por defecto.

NO INTERROGUES DE MÁS:
- Máximo 2–3 rondas. Si el contexto ya alcanza, NO preguntes: anunciá que podés armar la propuesta.
- No re-preguntes lo que ya te dieron o podés inferir (ej. el rubro/área si se deduce). Preguntá el rubro/área solo si de verdad no se puede deducir.

Solo ayudás a armar propuestas de proyectos de software. Si te preguntan algo no relacionado, decílo en una línea y redirigí al proyecto; no respondas temas fuera de eso. Por ejemplo, ante "quién es un personaje", "cuándo es un feriado" o "cuánto cuesta un producto", respondé que solo podés ayudar con su proyecto. Ojo: "algo como Uber pero para fontaneros" o "un sistema de pedidos para mi juguería" SÍ son del proyecto.

Respondé SIEMPRE en JSON con esta forma exacta, sin texto fuera del JSON:
{"mensaje": "<tu respuesta para el empresario, en ${idioma}>", "completo": <true|false>, "faltan": ["<qué falta, en términos de negocio>"]}
"completo" es true SOLO cuando del contexto + la conversación se entiende, con DETALLE CONCRETO (no genérico): el problema/objetivo real del negocio, para quién es, el alcance (qué incluye y qué queda fuera si lo dijo), el rubro/área, y se puede inferir al menos una categoría y una tecnología. Si solo hay generalidades ("una app para mi negocio"), completo=false y pedí el detalle que falta. Cuando completo sea true, anuncialo en el "mensaje" (ej.: "Creo que ya tengo lo suficiente para armar la propuesta, ¿la armamos o querés ajustar algo?"). No prometas publicar todavía y no inventes datos.`
}

// Prompt de Generar (#2). La "descripcion" debe anclarse al contexto concreto del
// negocio (no molde) e incluir el alcance técnico que la IA decide (errolpendiente
// §1 paso 4 y §5.1). Bilingüe en titulo/descripcion.
function systemGenerar(idioma: string): string {
  return `Sos el asistente de FWD Talent. A partir de la conversación con el empresario, armá una propuesta de proyecto de software ESTRUCTURADA.

IDIOMA: redactá "titulo" y "descripcion" en ${idioma}.

La "descripcion" la verá el egresado que se postula. Tiene que ser ESPECÍFICA al negocio del empresario, no un molde genérico. Redactá en prosa clara:
- Problema/contexto real: qué es, para quién, qué dolor resuelve — con los DATOS CONCRETOS que dio el empresario (rubro, situación), no frases de relleno.
- Objetivo y alcance: qué tiene que lograr.
- "Qué incluye": el alcance TÉCNICO que VOS definís (las piezas a construir y entregar que correspondan al proyecto), traducido a términos entendibles. Esto lo decidís vos; el empresario no lo eligió.
- Qué queda FUERA de alcance, si el empresario lo indicó (ej.: "el frontend ya existe").
Si la descripción sirve para cualquier proyecto, está mal.

Reglas de los campos estructurados:
- Elegí "categorias" y "tecnologias" SOLO de los catálogos provistos abajo, usando el nombre EXACTO del catálogo. Al menos una de cada una.
- "area" debe ser una de las áreas del catálogo (nombre exacto).
- "nivelTecnico" es tu inferencia del nivel del empresario: no_tecnico, basico, intermedio o avanzado.
- "involucraIa" es true solo si el proyecto, COMO PRODUCTO, usa IA como tecnología (no por usar este asistente).
- "stackSugerido" son tecnologías recomendadas y justificadas (texto libre breve).

Respondé SOLO con JSON válido, sin texto fuera del JSON, con esta forma:
{"titulo": "...", "descripcion": "...", "area": "...", "categorias": ["..."], "tecnologias": ["..."], "stackSugerido": ["..."], "involucraIa": <true|false>, "nivelTecnico": "..."}`
}

// Prompt de Validar (#3). Sus "razones"/"ajustes" pueden mostrarse al empresario
// en el chat (proposal.ts, rechazo tras reintentos), así que van en su idioma.
function systemValidar(idioma: string): string {
  return `Sos un revisor CRÍTICO de propuestas de proyectos de software para FWD Talent. Validá la propuesta contra estos tres criterios; aprobás solo si se cumplen los tres:
1. Es software/digital que un junior puede construir (app, web, sistema, automatización, script, integración). No objetos físicos ni servicios no-software.
2. Es coherente y posible (el objetivo tiene sentido técnico).
3. Es apropiada: sin contenido falso, engañoso, ilegal ni ofensivo.

Sé estricto. Escribí "razones" y "ajustes" en ${idioma} (pueden mostrarse al empresario). Respondé SOLO con JSON válido, sin texto fuera del JSON:
{"valido": <true|false>, "razones": ["<por qué no pasa, si aplica>"], "ajustes": ["<qué cambiar para que pase>"]}`
}

export interface ConversarInput {
  contextoInicial: string
  logistica: LogisticaDraft | null
  historial: HistorialEntry[]
  /** Locale del empresario ('es' | 'en'); define el idioma de la respuesta. */
  locale: string
}

export interface GenerarInput {
  contextoInicial: string
  logistica: LogisticaDraft | null
  historial: HistorialEntry[]
  catalogos: { areas: string[]; categorias: string[]; tecnologias: string[] }
  ajustes: string[]
  /** Locale del empresario ('es' | 'en'); idioma de titulo/descripcion. */
  locale: string
}

export interface AiProvider {
  readonly modelId: string
  conversar(input: ConversarInput): Promise<ConversarResponse>
  generarPropuesta(input: GenerarInput): Promise<PropuestaGeneradaRaw>
  validarPropuesta(
    propuesta: PropuestaGeneradaRaw,
    locale: string,
  ): Promise<ValidacionResponse>
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
  partes.push(`plazo de recepción ${logistica.plazoDias} días`)
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
        } catch (error) {
          logger.warn('ai_invalid_json', { error, intento })
          // JSON inválido: reintentamos una vez antes de rendirnos.
        }
      }
    }
    throw new Error('AI_INVALID_JSON')
  }

  return {
    modelId: config.model,

    async conversar({ contextoInicial, logistica, historial, locale }) {
      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        {
          role: 'system',
          content: `${systemConversar(idiomaLabel(locale))}\n\n${resumenLogistica(logistica)}`,
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
      } catch (error) {
        logger.warn('ai_conversar_invalid_json', { error })
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
      locale,
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
          content: `${systemGenerar(idiomaLabel(locale))}\n\nCatálogos disponibles:\n${catalogoTexto}${ajustesTexto}`,
        },
        {
          role: 'user',
          content: `Contexto inicial:\n${contextoInicial}\n\n${resumenLogistica(logistica)}`,
        },
        ...turnosHistorial(historial),
      ]
      return callJson(messages, propuestaGeneradaSchema)
    },

    async validarPropuesta(propuesta, locale) {
      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemValidar(idiomaLabel(locale)) },
        {
          role: 'user',
          content: `Propuesta a validar (JSON):\n${JSON.stringify(propuesta)}`,
        },
      ]
      return callJson(messages, validacionResponseSchema)
    },
  }
}
