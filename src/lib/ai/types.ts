/**
 * Contrato del proveedor de IA del agente de proyectos (errolpendiente §5.1).
 *
 * El módulo se diseña intercambiable: hoy lo implementa un stub determinista
 * (Fase 1) y en la fase de IA real se conecta OpenRouter sin tocar a los
 * consumidores. La columna conversaciones_ia.modelo_ia registra `modelId`.
 *
 * Fase 1 solo consume `validateProposal` (la llamada #3, el guardrail).
 * Las llamadas #1 (conversar) y #2 (generar) se agregan en Fase 2.
 */

export interface ProjectProposalInput {
  titulo: string
  descripcion: string
  categorias: string[]
  tecnologias: string[]
  modalidad: 'remoto' | 'hibrido' | 'presencial'
  contextoInicial: string
}

/**
 * Resultado de la validación (#3). `valido=false` bloquea la publicación y
 * el flujo muestra `razones`/`ajustesSugeridos` (errolpendiente §5.1).
 */
export interface AiValidationResult {
  valido: boolean
  razones: string[]
  ajustesSugeridos: string[]
}

export interface AiProvider {
  /** Identificador del modelo, persistido en conversaciones_ia.modelo_ia. */
  readonly modelId: string
  /** Llamada #3: revisa la propuesta antes de publicar (guardrail). */
  validateProposal(input: ProjectProposalInput): Promise<AiValidationResult>
}
