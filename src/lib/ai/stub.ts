import type {
  AiProvider,
  AiValidationResult,
  ProjectProposalInput,
} from './types'

/**
 * Proveedor stub determinista (Fase 1).
 *
 * No llama a ningún LLM: aprueba la propuesta cuando hay un mínimo de contexto
 * ("fondo") para que el flujo completo de publicación sea testeable sin gastar
 * créditos. La validación real (software/digital, coherente, apropiada) llega
 * con el proveedor de OpenRouter en la fase de IA real.
 */
const FONDO_MINIMO_CARACTERES = 20

export const stubAiProvider: AiProvider = {
  modelId: 'stub',

  async validateProposal(
    input: ProjectProposalInput,
  ): Promise<AiValidationResult> {
    const tieneFondo =
      input.contextoInicial.trim().length >= FONDO_MINIMO_CARACTERES

    if (!tieneFondo) {
      return {
        valido: false,
        razones: ['fondo_insuficiente'],
        ajustesSugeridos: [],
      }
    }

    return { valido: true, razones: [], ajustesSugeridos: [] }
  },
}
