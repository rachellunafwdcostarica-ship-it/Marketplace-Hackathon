import 'server-only'
import { stubAiProvider } from './stub'
import type { AiProvider } from './types'

/**
 * Punto único de selección del proveedor de IA.
 *
 * Fase 1: siempre devuelve el stub determinista.
 *
 * TODO(fase-ia-real): devolver un proveedor real contra OpenRouter usando el
 * SDK `openai` con `baseURL = OPENAI_BASE_URL` y `OPENAI_MODEL`, validados con
 * Zod. La key (OPENAI_API_KEY) ya está contemplada en .env.local.example.
 */
export function getAiProvider(): AiProvider {
  return stubAiProvider
}
