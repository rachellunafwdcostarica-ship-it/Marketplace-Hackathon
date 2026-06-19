/**
 * Tipos del agente de IA (errolpendiente §2, §5.1).
 *
 * `HistorialEntry` es cada entrada append-only del rastro de auditoría que se
 * guarda en `conversaciones_ia.historial` (jsonb).
 */
export const HISTORIAL_ROLES = ['empresario', 'ia', 'sistema'] as const
export type HistorialRol = (typeof HISTORIAL_ROLES)[number]

export const HISTORIAL_TIPOS = [
  'mensaje',
  'pdf',
  'propuesta',
  'validacion',
] as const
export type HistorialTipo = (typeof HISTORIAL_TIPOS)[number]

export interface HistorialEntry {
  rol: HistorialRol
  tipo: HistorialTipo
  contenido: string
  fecha: string
}
