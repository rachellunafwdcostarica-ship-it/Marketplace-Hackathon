import { describe, it, expect, vi, beforeEach } from 'vitest'
import { validateApplicationWithAI } from '@/lib/ai-filtro-ofertas/openrouter-validation'

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

const BASE_INPUT = {
  projectTitle: 'Plataforma de delivery de comida',
  projectDescription:
    'Desarrollar una app web con Next.js para pedir comida a restaurantes locales.',
  coverLetter: 'Me interesa mucho este proyecto de delivery.',
  solutionApproach:
    'Usaría Next.js con Supabase para la base de datos y Stripe para pagos.',
  externalLink: 'https://github.com/ejemplo/delivery',
  uploadedPrototypeUrl: null,
  technicalDocUrl: null,
}

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

function makeFetchResponse(body: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  })
}

describe('validateApplicationWithAI — filtro de postulaciones con OpenRouter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('aprueba automáticamente (fail-safe) si OPENROUTER_FILTRO_OFERTAS_API_KEY no está configurada', async () => {
    delete process.env.OPENROUTER_FILTRO_OFERTAS_API_KEY

    const result = await validateApplicationWithAI(BASE_INPUT)

    expect(result.isRelated).toBe(true)
    expect(result.reason).toBe('API Key missing')
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('aprueba la postulación cuando la IA responde isRelated: true', async () => {
    process.env.OPENROUTER_FILTRO_OFERTAS_API_KEY = 'sk-or-v1-test-key'
    mockFetch.mockReturnValue(
      makeFetchResponse({
        choices: [
          {
            message: {
              content: JSON.stringify({
                isRelated: true,
                problematicFields: [],
                reason: 'La postulación está relacionada con el proyecto.',
              }),
            },
          },
        ],
      }),
    )

    const result = await validateApplicationWithAI(BASE_INPUT)

    expect(result.isRelated).toBe(true)
    expect(result.problematicFields).toHaveLength(0)
  })

  it('rechaza la postulación cuando la IA responde isRelated: false', async () => {
    process.env.OPENROUTER_FILTRO_OFERTAS_API_KEY = 'sk-or-v1-test-key'
    mockFetch.mockReturnValue(
      makeFetchResponse({
        choices: [
          {
            message: {
              content: JSON.stringify({
                isRelated: false,
                problematicFields: [
                  'Planteamiento de la solución',
                  'Carta de presentación',
                ],
                reason:
                  'La postulación habla de marketing pero el proyecto es de desarrollo web.',
              }),
            },
          },
        ],
      }),
    )

    const result = await validateApplicationWithAI({
      ...BASE_INPUT,
      coverLetter: 'Soy experto en marketing digital y redes sociales.',
      solutionApproach:
        'Haría campañas de Instagram y TikTok para aumentar las ventas.',
    })

    expect(result.isRelated).toBe(false)
    expect(result.problematicFields).toContain('Planteamiento de la solución')
    expect(result.reason).toMatch(/marketing/)
  })

  it('aprueba (fail-safe) si la API de OpenRouter retorna un error HTTP (ej. 500)', async () => {
    process.env.OPENROUTER_FILTRO_OFERTAS_API_KEY = 'sk-or-v1-test-key'
    mockFetch.mockReturnValue(
      makeFetchResponse({ error: 'Internal Server Error' }, 500),
    )

    const result = await validateApplicationWithAI(BASE_INPUT)

    expect(result.isRelated).toBe(true)
    expect(result.reason).toMatch(/API error 500/)
  })

  it('aprueba (fail-safe) si la API retorna error 401 (key inválida o sin créditos)', async () => {
    process.env.OPENROUTER_FILTRO_OFERTAS_API_KEY = 'sk-or-v1-clave-invalida'
    mockFetch.mockReturnValue(
      makeFetchResponse({ error: { message: 'Unauthorized' } }, 401),
    )

    const result = await validateApplicationWithAI(BASE_INPUT)

    expect(result.isRelated).toBe(true)
    expect(result.reason).toMatch(/API error 401/)
  })

  it('aprueba (fail-safe) si la respuesta de la IA viene vacía (choices vacío)', async () => {
    process.env.OPENROUTER_FILTRO_OFERTAS_API_KEY = 'sk-or-v1-test-key'
    mockFetch.mockReturnValue(
      makeFetchResponse({
        choices: [],
      }),
    )

    const result = await validateApplicationWithAI(BASE_INPUT)

    expect(result.isRelated).toBe(true)
    expect(result.reason).toBe('Empty response from AI')
  })

  it('aprueba (fail-safe) si el JSON de la IA no tiene el formato esperado', async () => {
    process.env.OPENROUTER_FILTRO_OFERTAS_API_KEY = 'sk-or-v1-test-key'
    mockFetch.mockReturnValue(
      makeFetchResponse({
        choices: [
          {
            message: {
              content: JSON.stringify({ resultado: 'aprobado', campos: [] }),
            },
          },
        ],
      }),
    )

    const result = await validateApplicationWithAI(BASE_INPUT)

    expect(result.isRelated).toBe(true)
    expect(result.reason).toBe('Parse error')
  })

  it('limpia bloques markdown si el modelo los incluye en la respuesta', async () => {
    process.env.OPENROUTER_FILTRO_OFERTAS_API_KEY = 'sk-or-v1-test-key'
    const jsonPayload = JSON.stringify({
      isRelated: false,
      problematicFields: ['Carta de presentación'],
      reason: 'Contenido ajeno al proyecto.',
    })
    mockFetch.mockReturnValue(
      makeFetchResponse({
        choices: [
          {
            message: {
              content: `\`\`\`json\n${jsonPayload}\n\`\`\``,
            },
          },
        ],
      }),
    )

    const result = await validateApplicationWithAI(BASE_INPUT)

    expect(result.isRelated).toBe(false)
    expect(result.problematicFields).toContain('Carta de presentación')
  })

  it('aprueba (fail-safe) si fetch lanza una excepción de red o timeout', async () => {
    process.env.OPENROUTER_FILTRO_OFERTAS_API_KEY = 'sk-or-v1-test-key'
    mockFetch.mockRejectedValue(new Error('fetch failed: network error'))

    const result = await validateApplicationWithAI(BASE_INPUT)

    expect(result.isRelated).toBe(true)
    expect(result.reason).toBe('Request exception')
  })

  it('llama al endpoint correcto de OpenRouter con el modelo configurado', async () => {
    process.env.OPENROUTER_FILTRO_OFERTAS_API_KEY = 'sk-or-v1-test-key'
    process.env.OPENROUTER_FILTRO_OFERTAS_MODEL = 'anthropic/claude-3-haiku'
    mockFetch.mockReturnValue(
      makeFetchResponse({
        choices: [
          {
            message: {
              content: JSON.stringify({
                isRelated: true,
                problematicFields: [],
                reason: 'OK',
              }),
            },
          },
        ],
      }),
    )

    await validateApplicationWithAI(BASE_INPUT)

    expect(mockFetch).toHaveBeenCalledWith(
      'https://openrouter.ai/api/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"model":"anthropic/claude-3-haiku"'),
      }),
    )

    delete process.env.OPENROUTER_FILTRO_OFERTAS_MODEL
  })
})
