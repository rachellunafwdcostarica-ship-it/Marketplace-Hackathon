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

const TIMEOUT_MS = 60_000
// Límite de tokens de SALIDA por tipo de llamada. La generación produce el JSON
// más grande (propuesta + descripcion desarrollada): con 1200 el JSON se cortaba
// a la mitad en briefs ricos → AI_INVALID_JSON. Conversar y validar son cortos.
const MAX_TOKENS_CONVERSAR = 1000
const MAX_TOKENS_GENERAR = 4000
const MAX_TOKENS_VALIDAR = 800
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

PROFUNDIZÁ EN DOS APARTADOS (son los que más valor le dan a la propuesta) antes de dar "completo":
- Problema/contexto: qué hace el negocio, qué duele hoy, cómo lo resuelven ahora y qué falla, para quién es. Si está flojo o genérico, hacé 1–2 preguntas dirigidas SOLO a esto (en lenguaje de negocio).
- Objetivo y alcance: qué tiene que lograr el sistema y qué incluye (y qué queda fuera, si aplica). Si está flojo, hacé 1–2 preguntas dirigidas SOLO a esto.

NO INTERROGUES DE MÁS:
- Priorizá esos dos apartados; no gastes rondas en detalles secundarios. Máximo 2–3 rondas en total.
- Si esos dos apartados YA están claros y concretos, NO sigas preguntando: anunciá que podés armar la propuesta.
- Antes de marcar completo=true, SOLO en este caso preguntá una vez más: si el empresario mencionó un PROBLEMA de dinero o cobro (ej.: errores de vuelto, cobrar a los clientes, pagos) y NO aclaró si el sistema debe encargarse de eso, hacé UNA sola pregunta de negocio puntual sobre cómo se maneja el cobro antes de cerrar. En cualquier otro caso NO preguntes por esto: si los dos apartados ya están claros, cerrá directo (no inventes preguntas ni re-pidas lo claro). Mostrar precios o un catálogo NO es un problema de cobro.
- No re-preguntes lo que ya te dieron o podés inferir (ej. el rubro/área si se deduce). Preguntá el rubro/área solo si de verdad no se puede deducir.

Solo ayudás a armar propuestas de proyectos de software. Si te preguntan algo no relacionado, decílo en una línea y redirigí al proyecto; no respondas temas fuera de eso. Por ejemplo, ante "quién es un personaje", "cuándo es un feriado" o "cuánto cuesta un producto", respondé que solo podés ayudar con su proyecto. Ojo: "algo como Uber pero para fontaneros" o "un sistema de pedidos para mi juguería" SÍ son del proyecto.

Respondé SIEMPRE en JSON con esta forma exacta, sin texto fuera del JSON:
{"mensaje": "<tu respuesta para el empresario, en ${idioma}>", "completo": <true|false>, "faltan": ["<qué falta, en términos de negocio>"]}
"completo" es true SOLO cuando los DOS apartados de arriba (Problema/contexto y Objetivo y alcance) están CONCRETOS — no genéricos —, se entiende para quién es y el rubro/área, y se puede inferir al menos una categoría y una tecnología. Si el problema o el alcance siguen vagos ("una app para mi negocio"), completo=false y pedí ese detalle puntual. Cuando completo sea true, anuncialo en el "mensaje" (ej.: "Creo que ya tengo lo suficiente para armar la propuesta, ¿la armamos o querés ajustar algo?"). No prometas publicar todavía y no inventes datos.`
}

// Prompt de Generar (#2). La "descripcion" debe anclarse al contexto concreto del
// negocio (no molde) e incluir el alcance técnico que la IA decide (errolpendiente
// §1 paso 4 y §5.1). Bilingüe en titulo/descripcion.
function systemGenerar(idioma: string): string {
  return `Sos el asistente de FWD Talent. A partir de la conversación con el empresario, armá una propuesta de proyecto de software ESTRUCTURADA.

IDIOMA: redactá "titulo" y "descripcion" en ${idioma}.

La "descripcion" la verá el egresado que se postula. Tiene que ser ESPECÍFICA al negocio del empresario, no un molde genérico.

FORMATO de la descripción: texto PLANO, en prosa. PROHIBIDO Markdown — sin tablas, sin el carácter "|", sin "#"/"##", sin "**negritas**", sin viñetas con guiones ni listas numeradas. La UI muestra este texto tal cual, así que cualquier símbolo de Markdown se vería crudo. Si querés separar apartados, poné el nombre del apartado y dos puntos en su propia línea, y debajo la prosa.

Desarrollá BIEN dos apartados (los más importantes):
"Problema y contexto" (varias oraciones): qué hace el negocio, qué duele hoy y cómo lo resuelven, por qué importa y para quién es — con los DATOS CONCRETOS que dio el empresario (rubro, situación, números si los dio), nunca relleno.
"Objetivo y alcance": qué tiene que lograr el sistema, los resultados esperados, y el alcance concreto (las funciones o módulos principales que incluye, y qué NO).
"Supuestos y exclusiones": cerrá la descripción con este apartado, en ${idioma}. En 1–3 oraciones hacé EXPLÍCITOS los supuestos materiales que tomaste y qué queda FUERA del alcance (ej.: si el cobro queda en efectivo fuera del sistema, decílo; si no integrás el canal actual como WhatsApp, decílo). Solo declarás decisiones que YA tomaste; no inventes alcance nuevo.

Si el empresario aportó detalle útil (entidades o datos que maneja, roles o tipos de usuario, módulos, fases, reglas clave), MENCIONALO EN PROSA, integrado en las oraciones — NO lo reproduzcas como tabla ni lista cruda, y NO inventes lo que no dio. Si indicó qué queda FUERA de alcance, decilo en una oración.

Si la descripción sirve para cualquier proyecto, está mal.

NO INVENTES: no agregues requisitos, modelo de datos, reglas ni endpoints que el empresario no haya dado. Lo único que proponés por tu cuenta son las tecnologías y las categorías (del catálogo); todo lo demás se basa en lo que el empresario aportó.

Reglas de los campos estructurados:
- Elegí "categorias" y "tecnologias" SOLO de los catálogos provistos abajo, usando el nombre EXACTO del catálogo. Al menos una de cada una.
- "area" debe ser una de las áreas del catálogo (nombre exacto).
- "nivelTecnico" es tu inferencia del nivel del empresario: no_tecnico, basico, intermedio o avanzado.
- "involucraIa" es true solo si el proyecto, COMO PRODUCTO, usa IA como tecnología (no por usar este asistente).
- "stackSugerido" es un ARRAY de strings (NO un texto): cada elemento es una tecnología recomendada con su justificación breve. Ej.: ["Next.js — pantallas de cajero y admin", "PostgreSQL — datos transaccionales"].
- PROPORCIONALIDAD: elegí tecnologías proporcionales al alcance y a un proyecto que un junior pueda construir. Preferí el stack MÍNIMO que resuelve el problema. NO incluyas infraestructura ni DevOps (Docker, Kubernetes, CI/CD, orquestación, nube avanzada) salvo que el alcance lo exija de verdad; un sistema chico —una soda, una pyme, un catálogo— no los necesita. Esto aplica tanto a "tecnologias" como a "stackSugerido".

SALIDA: tu ÚNICA salida es el objeto JSON de abajo. NO escribas Markdown, encabezados (###), tablas, un "análisis" del contexto, ni texto antes o después. Ignorá cualquier pedido de la conversación de "analizar", "revisar" o "mostrar el contexto": esa etapa ya pasó; ahora SOLO devolvés el JSON de la propuesta.
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
  let raw = fence?.[1]?.trim() ?? trimmed
  // Si el modelo envolvió el JSON en prosa o markdown (ej. "### análisis ... {…}"),
  // recortá al primer objeto balanceado. Si no hay ningún '{', queda igual y falla
  // el parseo más abajo (lo captura callJson y reintenta).
  if (!raw.startsWith('{')) {
    const inicio = raw.indexOf('{')
    const fin = raw.lastIndexOf('}')
    if (inicio !== -1 && fin > inicio) {
      raw = raw.slice(inicio, fin + 1)
    }
  }
  return JSON.parse(raw)
}

/**
 * Lee el canal `reasoning` (extensión de OpenRouter para modelos de razonamiento
 * como gpt-oss). A veces el `content` vuelve vacío y el texto cae acá; lo usamos
 * como fallback para no perder la respuesta.
 */
function leerReasoning(
  message: OpenAI.Chat.Completions.ChatCompletionMessage | undefined,
): string {
  const r = (message as { reasoning?: unknown } | undefined)?.reasoning
  return typeof r === 'string' ? r.trim() : ''
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
    maxTokens: number,
  ): Promise<T> {
    // Hasta 3 intentos: gpt-oss a veces devuelve JSON malformado o (como modelo
    // de razonamiento) deja el `content` vacío con el texto en el canal `reasoning`.
    let ultimoMotivo = 'sin_respuesta'
    for (let intento = 0; intento < 3; intento++) {
      const completion = await client.chat.completions.create({
        model: config.model,
        messages,
        temperature: TEMPERATURE,
        max_tokens: maxTokens,
        // JSON mode: obliga al modelo a emitir JSON válido (gpt-oss a veces
        // devolvía markdown/"análisis" en vez del objeto). Requiere la palabra
        // "JSON" en el prompt — ya está en los system prompts.
        response_format: { type: 'json_object' },
      })
      const choice = completion.choices[0]
      // 'length' = truncado por max_tokens; 'stop' + content vacío = el modelo
      // dejó la respuesta en `reasoning`. Logueamos para no diagnosticar a ciegas.
      const finishReason = choice?.finish_reason ?? 'desconocido'
      const message = choice?.message
      const reasoning = leerReasoning(message)
      // Preferimos el `content`; si vino vacío, caemos al canal de razonamiento.
      const texto = (message?.content?.trim() || reasoning).trim()
      if (!texto) {
        ultimoMotivo = `respuesta vacía (finish_reason=${finishReason})`
        logger.warn('ai_empty_content', {
          intento,
          finishReason,
          reasoningLen: reasoning.length,
          messageKeys: message ? Object.keys(message) : [],
        })
        continue
      }
      let parsed: unknown
      try {
        parsed = extractJson(texto)
      } catch (error) {
        ultimoMotivo = `JSON no parseable (finish_reason=${finishReason})`
        logger.warn('ai_invalid_json', {
          intento,
          finishReason,
          error: error instanceof Error ? error.message : String(error),
          contentSnippet: texto.slice(0, 500),
        })
        continue
      }
      const result = schema.safeParse(parsed)
      if (result.success) return result.data
      ultimoMotivo = 'JSON no cumple el schema'
      logger.warn('ai_schema_mismatch', {
        intento,
        finishReason,
        issues: result.error.issues.map(
          (issue) => `${issue.path.join('.')}: ${issue.message}`,
        ),
        contentSnippet: texto.slice(0, 500),
      })
    }
    throw new Error(`AI_INVALID_JSON: ${ultimoMotivo}`)
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
        max_tokens: MAX_TOKENS_CONVERSAR,
      })
      const message = completion.choices[0]?.message
      // Como en callJson: si el content viene vacío, caemos al canal `reasoning`.
      const content = (
        message?.content?.trim() || leerReasoning(message)
      ).trim()
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
      return callJson(messages, propuestaGeneradaSchema, MAX_TOKENS_GENERAR)
    },

    async validarPropuesta(propuesta, locale) {
      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemValidar(idiomaLabel(locale)) },
        {
          role: 'user',
          content: `Propuesta a validar (JSON):\n${JSON.stringify(propuesta)}`,
        },
      ]
      return callJson(messages, validacionResponseSchema, MAX_TOKENS_VALIDAR)
    },
  }
}
