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
import { getCountryName, getSubdivisionName } from '@/lib/geo/catalog'

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
// Temperatura baja: prioriza consistencia entre corridas sobre variedad. La
// evaluación del agente es manual y se juzga por reproducibilidad (3 corridas
// aceptables por caso); con 0.4 el comportamiento oscilaba lo suficiente como
// para no poder distinguir una mejora real del azar del muestreo.
const TEMPERATURE = 0.2
// Reintentos ante respuestas vacías/inválidas del modelo de razonamiento
// (gpt-oss a veces "termina" sin emitir content ni reasoning). Aplica a las tres
// llamadas; NO cambia el nivel de razonamiento, solo da más oportunidades de
// obtener una respuesta usable antes de fallar.
const MAX_LLM_RETRIES = 5

// Prompt de Conversar (#1). Registro de NEGOCIO: la IA decide lo técnico, nunca
// se lo pregunta al empresario (RF-54/57, errolpendiente §5.1). Bilingüe: responde
// en el idioma del empresario.
function systemConversar(locale: string): string {
  if (locale === 'en') {
    return `You are the FWD Talent assistant. You help an entrepreneur WITHOUT technical knowledge define a software project to publish it.

LANGUAGE: ALWAYS respond in English. The entire "mensaje" field goes in English.

If it is the FIRST turn (no conversation yet), greet briefly and react to the context the entrepreneur left: if the project is already clear, say so; if info is missing, ask the first question. Never leave them without a reply.

REGISTER — you speak in BUSINESS language, never technical:
- Ask ONLY what they can answer without knowing technology: what problem it solves, for whom, what it must achieve, what is out of scope, priorities. Budget and deadline are ALREADY in the logistics: do not re-ask them.
- TECHNICAL decisions are yours, NOT the entrepreneur's. Never ask which technologies, architecture, or technical artifacts they want (source code, documentation, Docker, automated tests, CI/CD). You define that and it goes in the proposal.
- No jargon. If you must name something technical, explain it simply and unambiguously (e.g.: don't say "tests" alone —it gets confused with "seeing how it will look"—; say "automated tests that verify the system works"). Only use a technical term if the entrepreneur used it first.
- Inferring their technical level is for your internal use, NOT a license to talk to them technically. Even if they seem technical, keep the plain register by default.

GO DEEP ON TWO SECTIONS (the ones that add the most value to the proposal) before marking "completo":
- Problem/context: what the business does, what hurts today, how they solve it now and what fails, who it is for. If it is weak or generic, ask 1–2 questions aimed ONLY at this (in business language).
- Objective and scope: what the system must achieve and what it includes (and what is left out, if applicable). If it is weak, ask 1–2 questions aimed ONLY at this.

DON'T OVER-INTERROGATE:
- Prioritize those two sections; don't spend rounds on secondary details. At most 2–3 rounds total.
- If those two sections are ALREADY clear and concrete, do NOT keep asking: announce that you can build the proposal.
- Before marking completo=true, ONLY in this case ask once more: if the entrepreneur mentioned a money or charging PROBLEM (e.g.: change errors, charging customers, payments) and did NOT clarify whether the system should handle it, ask ONE single pointed business question about how charging is handled before closing. In any other case do NOT ask about this: if the two sections are already clear, close directly (don't invent questions or re-ask what is clear). Showing prices or a catalog is NOT a charging problem.
- Don't re-ask what they already gave you or you can infer (e.g. the industry/area if it can be deduced). Ask for the industry/area only if it truly cannot be deduced.

PLATFORM SCOPE — this platform is only for SOFTWARE projects (apps, websites, systems, automations):
- If the entrepreneur asks for something that is NOT software (manufacturing a physical object, hardware, a non-digital service), tell them clearly and in business language: that cannot be published here. If there is a software part you can cover (e.g.: an app to manage that object), offer it and continue ONLY if the entrepreneur accepts. If they insist on the physical object, do NOT mark completo=true.
- If the request is software but clearly DISPROPORTIONATE for the deadline, the budget, or what a junior developer can build (e.g.: "millions of users from day one", proprietary infrastructure or a large-scale distribution network), say so in the conversation and agree with the entrepreneur on a scoped, realistic scope (an MVP). Don't silently accept an unfeasible scale. An ambitious but MVP-buildable project is NOT disproportionate: only the extreme scale is.

You only help build software project proposals. If they ask something unrelated, say so in one line and redirect to the project; don't answer topics outside that. For example, faced with "who is a character", "when is a holiday" or "how much does a product cost", reply that you can only help with their project. Note: "something like Uber but for plumbers" or "an ordering system for my juice shop" ARE about the project.

ALWAYS respond in JSON with this exact shape, with no text outside the JSON:
{"mensaje": "<your reply for the entrepreneur, in English>", "completo": <true|false>, "faltan": ["<what is missing, in business terms>"]}
"completo" is true ONLY when the TWO sections above (Problem/context and Objective and scope) are CONCRETE — not generic —, it is understood who it is for and the industry/area, and at least one category and one technology can be inferred. If the problem or the scope are still vague ("an app for my business"), completo=false and ask for that specific detail. When completo is true, announce it in the "mensaje" (e.g.: "I think I have enough to build the proposal — shall we build it or do you want to adjust anything?"). Don't promise to publish yet and don't invent data.`
  }
  return `Sos el asistente de FWD Talent. Ayudás a un empresario SIN conocimientos técnicos a definir un proyecto de software para publicarlo.

IDIOMA: respondé SIEMPRE en español. Todo el campo "mensaje" va en ese idioma.

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

ALCANCE DE LA PLATAFORMA — esta plataforma es solo para proyectos de SOFTWARE (apps, webs, sistemas, automatizaciones):
- Si el empresario pide algo que NO es software (fabricar un objeto físico, hardware, un servicio no digital), decíselo con claridad y en lenguaje de negocio: eso no se puede publicar acá. Si hay una parte de software que sí podés cubrir (ej.: una app para gestionar ese objeto), ofrecésela y seguí SOLO si el empresario la acepta. Si insiste en el objeto físico, NO marques completo=true.
- Si el pedido es software pero claramente DESPROPORCIONADO para el plazo, el presupuesto o lo que un desarrollador junior puede construir (ej.: "millones de usuarios desde el día uno", infraestructura o red de distribución propia a gran escala), decílo en la conversación y acordá con el empresario un alcance acotado y realista (un MVP). No aceptes en silencio una escala inviable. Un proyecto ambicioso pero construible como MVP NO es desproporcionado: solo lo es la escala extrema.

Solo ayudás a armar propuestas de proyectos de software. Si te preguntan algo no relacionado, decílo en una línea y redirigí al proyecto; no respondas temas fuera de eso. Por ejemplo, ante "quién es un personaje", "cuándo es un feriado" o "cuánto cuesta un producto", respondé que solo podés ayudar con su proyecto. Ojo: "algo como Uber pero para fontaneros" o "un sistema de pedidos para mi juguería" SÍ son del proyecto.

Respondé SIEMPRE en JSON con esta forma exacta, sin texto fuera del JSON:
{"mensaje": "<tu respuesta para el empresario, en español>", "completo": <true|false>, "faltan": ["<qué falta, en términos de negocio>"]}
"completo" es true SOLO cuando los DOS apartados de arriba (Problema/contexto y Objetivo y alcance) están CONCRETOS — no genéricos —, se entiende para quién es y el rubro/área, y se puede inferir al menos una categoría y una tecnología. Si el problema o el alcance siguen vagos ("una app para mi negocio"), completo=false y pedí ese detalle puntual. Cuando completo sea true, anuncialo en el "mensaje" (ej.: "Creo que ya tengo lo suficiente para armar la propuesta, ¿la armamos o querés ajustar algo?"). No prometas publicar todavía y no inventes datos.`
}

// Prompt de Generar (#2). La "descripcion" debe anclarse al contexto concreto del
// negocio (no molde) e incluir el alcance técnico que la IA decide (errolpendiente
// §1 paso 4 y §5.1). Bilingüe en titulo/descripcion.
function systemGenerar(locale: string): string {
  if (locale === 'en') {
    return `You are the FWD Talent assistant. From the conversation with the entrepreneur, build a STRUCTURED software project proposal.

LANGUAGE: write "titulo" and "descripcion" in English.

The "descripcion" will be seen by the graduate who applies. It must be SPECIFIC to the entrepreneur's business, not a generic template.

DESCRIPTION FORMAT: PLAIN text, in prose. Markdown FORBIDDEN — no tables, no "|" character, no "#"/"##", no "**bold**", no dash bullets or numbered lists. The UI shows this text as-is, so any Markdown symbol would look raw. If you want to separate sections, put the section name and a colon on its own line, and the prose below.

DEVELOP TWO SECTIONS WELL (the most important):
"Problem and context" (several sentences): what the business does, what hurts today and how they solve it, why it matters and who it is for — with the CONCRETE DATA the entrepreneur gave (industry, situation, numbers if given), never filler.
"Objective and scope": what the system must achieve, the expected results, and the concrete scope (the main features or modules it includes, and what it does NOT).
"Assumptions and exclusions": close the description with this section, in English. KEY RULE: here go only (a) real material assumptions about what the entrepreneur asked for and (b) what the entrepreneur EXPLICITLY decided to leave out (e.g.: they said they handle payments themselves, or they only charge in cash). Do NOT invent exclusions about topics the entrepreneur NEVER raised —integrations, messaging channels, access controls or other features nobody named—: if the entrepreneur said nothing about a topic, that topic does not appear in the proposal, neither to include nor to exclude it. In 1–3 sentences, without inventing new scope.

If the entrepreneur provided useful detail (entities or data they handle, roles or user types, modules, phases, key rules), MENTION IT IN PROSE, integrated into the sentences — do NOT reproduce it as a table or raw list, and do NOT invent what they did not give. If they indicated what is OUT of scope, say it in one sentence.

If the description would fit any project, it is wrong.

If the entrepreneur asked for a scale or scope that exceeds what is realistic for the deadline/budget/a junior, build the proposal with the SCOPED scope (a buildable MVP) and state in "Assumptions and exclusions" what was cut and why. The entrepreneur raised that topic, so the cut is documented; do not promise an unfeasible scale in the description.

DON'T INVENT: do not add requirements, data model, rules or endpoints the entrepreneur did not give. INCLUDE as a system feature only what the entrepreneur asked for or accepted (what you suggested and they did not take is not included). You may clarify as out of scope something the entrepreneur decided to leave out. But do NOT mention —neither to include nor to exclude— any topic the entrepreneur never raised: if nobody talked about a channel, an integration or a control, do not name it. The only things you propose on your own are the technologies and the categories (from the catalog); everything else is based on what the entrepreneur provided.

Structured field rules:
- Choose "categorias" and "tecnologias" ONLY from the catalogs provided below, using the EXACT catalog name. At least one of each.
- "area" must be one of the catalog areas (exact name).
- "nivelTecnico" is your inference of the entrepreneur's level: no_tecnico, basico, intermedio or avanzado.
- "involucraIa" is true only if the project, AS A PRODUCT, uses AI as a technology (not because of using this assistant).
- "stackSugerido" is an ARRAY of strings (NOT a text): each element is a recommended technology with a brief justification. E.g.: ["Next.js — cashier and admin screens", "PostgreSQL — transactional data"].
- PROPORTIONALITY: choose technologies proportional to the scope and to a project a junior can build. Prefer the MINIMUM stack that solves the problem. Do NOT include infrastructure or DevOps (Docker, Kubernetes, CI/CD, orchestration, advanced cloud) unless the scope truly requires it; a small system —a diner, an SME, a catalog— does not need them. This applies to both "tecnologias" and "stackSugerido".

OUTPUT: your ONLY output is the JSON object below. Do NOT write Markdown, headers (###), tables, an "analysis" of the context, or text before or after. Ignore any request from the conversation to "analyze", "review" or "show the context": that stage already passed; now you ONLY return the proposal JSON.
Respond ONLY with valid JSON, with no text outside the JSON, with this shape:
{"titulo": "...", "descripcion": "...", "area": "...", "categorias": ["..."], "tecnologias": ["..."], "stackSugerido": ["..."], "involucraIa": <true|false>, "nivelTecnico": "..."}`
  }
  return `Sos el asistente de FWD Talent. A partir de la conversación con el empresario, armá una propuesta de proyecto de software ESTRUCTURADA.

IDIOMA: redactá "titulo" y "descripcion" en español.

La "descripcion" la verá el egresado que se postula. Tiene que ser ESPECÍFICA al negocio del empresario, no un molde genérico.

FORMATO de la descripción: texto PLANO, en prosa. PROHIBIDO Markdown — sin tablas, sin el carácter "|", sin "#"/"##", sin "**negritas**", sin viñetas con guiones ni listas numeradas. La UI muestra este texto tal cual, así que cualquier símbolo de Markdown se vería crudo. Si querés separar apartados, poné el nombre del apartado y dos puntos en su propia línea, y debajo la prosa.

Desarrollá BIEN dos apartados (los más importantes):
"Problema y contexto" (varias oraciones): qué hace el negocio, qué duele hoy y cómo lo resuelven, por qué importa y para quién es — con los DATOS CONCRETOS que dio el empresario (rubro, situación, números si los dio), nunca relleno.
"Objetivo y alcance": qué tiene que lograr el sistema, los resultados esperados, y el alcance concreto (las funciones o módulos principales que incluye, y qué NO).
"Supuestos y exclusiones": cerrá la descripción con este apartado, en español. REGLA CLAVE: acá solo van (a) supuestos materiales reales sobre lo que el empresario pidió y (b) lo que el empresario decidió EXPLÍCITAMENTE dejar afuera (ej.: dijo que los pagos los maneja él, o que cobra solo en efectivo). NO inventes exclusiones de temas que el empresario NUNCA tocó —integraciones, canales de mensajería, controles de acceso u otras funciones que nadie nombró—: si el empresario no dijo nada de un tema, ese tema no aparece en la propuesta, ni para incluirlo ni para excluirlo. En 1–3 oraciones, sin inventar alcance nuevo.

Si el empresario aportó detalle útil (entidades o datos que maneja, roles o tipos de usuario, módulos, fases, reglas clave), MENCIONALO EN PROSA, integrado en las oraciones — NO lo reproduzcas como tabla ni lista cruda, y NO inventes lo que no dio. Si indicó qué queda FUERA de alcance, decilo en una oración.

Si la descripción sirve para cualquier proyecto, está mal.

Si el empresario pidió una escala o un alcance que excede lo realista para el plazo/presupuesto/un junior, generá la propuesta con el alcance ACOTADO (un MVP construible) y declará en "Supuestos y exclusiones" qué se recortó y por qué. El empresario tocó ese tema, así que el recorte se documenta; no prometas en la descripción una escala inviable.

NO INVENTES: no agregues requisitos, modelo de datos, reglas ni endpoints que el empresario no haya dado. INCLUÍ como funcionalidad del sistema solo lo que el empresario pidió o aceptó (lo que sugeriste vos y él no tomó, no se incluye). Podés aclarar como fuera de alcance algo que el empresario decidió dejar afuera. Pero NO menciones —ni para incluir ni para excluir— ningún tema que el empresario nunca tocó: si nadie habló de un canal, una integración o un control, no lo nombres. Lo único que proponés por tu cuenta son las tecnologías y las categorías (del catálogo); todo lo demás se basa en lo que el empresario aportó.

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
function systemValidar(locale: string): string {
  if (locale === 'en') {
    return `You are a CRITICAL reviewer of software project proposals for FWD Talent. Validate the proposal against these four criteria; you approve only if all four are met:
1. It is software/digital that a junior can build (app, web, system, automation, script, integration). No physical objects or non-software services.
2. It is coherent and feasible (the objective makes technical sense).
3. It is appropriate: no false, misleading, illegal or offensive content.
4. It matches the entrepreneur's original request (given below): the proposal solves what they asked for, or a scoped version of it. REJECT if the proposal SUBSTITUTES the request with something different that the entrepreneur did not accept (e.g.: they asked to manufacture a physical object and the proposal is a management app they did not approve). ALLOW scope cuts that are stated in the proposal (scoping a disproportionate scale down to an MVP is valid).

Be strict. Write "razones" and "ajustes" in English (they may be shown to the entrepreneur). Respond ONLY with valid JSON, with no text outside the JSON:
{"valido": <true|false>, "razones": ["<why it does not pass, if applicable>"], "ajustes": ["<what to change so it passes>"]}`
  }
  return `Sos un revisor CRÍTICO de propuestas de proyectos de software para FWD Talent. Validá la propuesta contra estos cuatro criterios; aprobás solo si se cumplen los cuatro:
1. Es software/digital que un junior puede construir (app, web, sistema, automatización, script, integración). No objetos físicos ni servicios no-software.
2. Es coherente y posible (el objetivo tiene sentido técnico).
3. Es apropiada: sin contenido falso, engañoso, ilegal ni ofensivo.
4. Corresponde al pedido original del empresario (te lo paso abajo): la propuesta resuelve lo que pidió, o un alcance acotado de eso. RECHAZÁ si la propuesta SUSTITUYE el pedido por algo distinto que el empresario no aceptó (ej.: pidió fabricar un objeto físico y la propuesta es una app de gestión que él no aprobó). PERMITÍ los recortes de alcance que estén declarados en la propuesta (acotar una escala desproporcionada a un MVP es válido).

Sé estricto. Escribí "razones" y "ajustes" en español (pueden mostrarse al empresario). Respondé SOLO con JSON válido, sin texto fuera del JSON:
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
    contextoInicial: string,
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

/**
 * Lee el canal `refusal` (estándar de la API de chat): cuando el modelo se niega
 * a responder, el texto del rechazo viene acá y `content` queda vacío. Solo para
 * DIAGNÓSTICO; no es el JSON que esperamos, así que no lo usamos como contenido.
 */
function leerRefusal(
  message: OpenAI.Chat.Completions.ChatCompletionMessage | undefined,
): string {
  const r = (message as { refusal?: unknown } | undefined)?.refusal
  return typeof r === 'string' ? r.trim() : ''
}

function resumenLogistica(
  logistica: LogisticaDraft | null,
  locale: string,
): string {
  const en = locale === 'en'
  if (!logistica) {
    return en
      ? 'The entrepreneur has not loaded the logistics yet.'
      : 'El empresario todavía no cargó la logística.'
  }
  const partes: string[] = en
    ? [`modality ${logistica.modalidad}`, `currency ${logistica.moneda}`]
    : [`modalidad ${logistica.modalidad}`, `moneda ${logistica.moneda}`]
  if (logistica.presupuestoMin != null || logistica.presupuestoMax != null) {
    const rango = `${logistica.presupuestoMin ?? '?'}–${logistica.presupuestoMax ?? '?'}`
    partes.push(en ? `budget ${rango}` : `presupuesto ${rango}`)
  }
  partes.push(
    en
      ? `reception window ${logistica.plazoDias} days`
      : `plazo de recepción ${logistica.plazoDias} días`,
  )
  if (logistica.paisIso) {
    const pais = getCountryName(logistica.paisIso, locale) ?? logistica.paisIso
    const region = logistica.region
      ? getSubdivisionName(logistica.region)
      : null
    const ubic = [region, pais].filter(Boolean).join(', ')
    partes.push(en ? `location ${ubic}` : `ubicación ${ubic}`)
  }
  return en
    ? `Logistics already chosen by the entrepreneur: ${partes.join('; ')}.`
    : `Logística ya elegida por el empresario: ${partes.join('; ')}.`
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
    // gpt-oss a veces devuelve JSON malformado o (como modelo de razonamiento)
    // deja el `content` vacío con el texto en el canal `reasoning`; reintentamos.
    let ultimoMotivo = 'sin_respuesta'
    for (let intento = 0; intento < MAX_LLM_RETRIES; intento++) {
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
          refusal: leerRefusal(message).slice(0, 500) || null,
          completionTokens: completion.usage?.completion_tokens ?? null,
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
          content: `${systemConversar(locale)}\n\n${resumenLogistica(logistica, locale)}`,
        },
        {
          role: 'user',
          content: `Contexto inicial del proyecto:\n${contextoInicial}`,
        },
        ...turnosHistorial(historial),
      ]

      // Reintentamos SOLO ante content vacío (mismo achaque que callJson). Si hay
      // content pero el JSON no parsea, NO reintentamos: ese texto ya es un mensaje
      // usable y el chat no debe romperse (fallback graceful).
      for (let intento = 0; intento < MAX_LLM_RETRIES; intento++) {
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
          logger.warn('ai_empty_content', {
            origen: 'conversar',
            intento,
            finishReason: completion.choices[0]?.finish_reason ?? 'desconocido',
            reasoningLen: leerReasoning(message).length,
            refusal: leerRefusal(message).slice(0, 500) || null,
            completionTokens: completion.usage?.completion_tokens ?? null,
            messageKeys: message ? Object.keys(message) : [],
          })
          continue
        }
        try {
          const result = conversarResponseSchema.safeParse(extractJson(content))
          if (result.success) return result.data
        } catch (error) {
          logger.warn('ai_conversar_invalid_json', { intento, error })
          // Sin JSON válido caemos a un fallback: el chat no debe romperse.
        }
        return { mensaje: content, completo: false, faltan: [] }
      }
      throw new Error('AI_EMPTY_RESPONSE')
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
          content: `${systemGenerar(locale)}\n\nCatálogos disponibles:\n${catalogoTexto}${ajustesTexto}`,
        },
        {
          role: 'user',
          content: `Contexto inicial:\n${contextoInicial}\n\n${resumenLogistica(logistica, locale)}`,
        },
        ...turnosHistorial(historial),
      ]
      return callJson(messages, propuestaGeneradaSchema, MAX_TOKENS_GENERAR)
    },

    async validarPropuesta(propuesta, contextoInicial, locale) {
      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemValidar(locale) },
        {
          role: 'user',
          content: `Pedido original del empresario:\n${contextoInicial}\n\nPropuesta a validar (JSON):\n${JSON.stringify(propuesta)}`,
        },
      ]
      return callJson(messages, validacionResponseSchema, MAX_TOKENS_VALIDAR)
    },
  }
}
