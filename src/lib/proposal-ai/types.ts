/**
 * Tipos del agente de IA (errolpendiente §2, §5.1).
 *
 * `HistorialEntry` es cada entrada append-only del rastro de auditoría que se
 * guarda en `conversaciones_ia.historial` (jsonb).
 */
export type HistorialRol = 'empresario' | 'ia' | 'sistema'
export type HistorialTipo = 'mensaje' | 'pdf' | 'propuesta' | 'validacion'

export interface HistorialEntry {
  rol: HistorialRol
  tipo: HistorialTipo
  contenido: string
  fecha: string
}
