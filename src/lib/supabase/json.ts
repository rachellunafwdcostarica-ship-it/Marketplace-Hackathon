import 'server-only'

import type { Json } from '@/types/database'

/**
 * Frontera objeto-tipado → `jsonb`. El tipo `Json` (recursivo) de Supabase no
 * admite interfaces nombradas (no tienen index signature), aunque en runtime
 * sus valores sí son JSON válido. Centraliza la conversión en un único punto
 * auditado en lugar de esparcir el cast por las server actions
 * (reglas.md §2: cast justificado y acotado; §8: sin duplicación).
 *
 * Solo para datos ya validados o construidos por nosotros (no entrada cruda).
 */
export function toJsonb<T>(value: T): Json {
  return value as unknown as Json
}
