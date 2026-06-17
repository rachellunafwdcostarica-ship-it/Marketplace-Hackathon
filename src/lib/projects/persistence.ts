import type { Json } from '@/types/database'
import type { HistorialEntry } from '@/lib/proposal-ai/types'
import type { LogisticaDraft, PropuestaProyecto } from './schemas'

/** Lee el historial (jsonb) como arreglo tipado; vacío si no es un arreglo. */
export function parseHistorial(raw: Json | null): HistorialEntry[] {
  return Array.isArray(raw) ? (raw as unknown as HistorialEntry[]) : []
}

/** Lee la logística (jsonb) como draft tipado; null si no es un objeto. */
export function parseLogistica(raw: Json | null): LogisticaDraft | null {
  return raw !== null && typeof raw === 'object' && !Array.isArray(raw)
    ? (raw as unknown as LogisticaDraft)
    : null
}

/** Lee la propuesta generada (jsonb) como objeto tipado; null si no es un objeto. */
export function parseProposal(raw: Json | null): PropuestaProyecto | null {
  return raw !== null && typeof raw === 'object' && !Array.isArray(raw)
    ? (raw as unknown as PropuestaProyecto)
    : null
}
