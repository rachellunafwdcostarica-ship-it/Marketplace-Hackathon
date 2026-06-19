/**
 * Duración de un proyecto medida en DÍAS (no meses): el plazo real es la ventana
 * `fecha_publicacion`→`fecha_cierre`. Centraliza el cálculo y los buckets del
 * filtro del marketplace para que UI y lógica no se desincronicen.
 */
export type DurationBucket = 'short' | 'medium' | 'long'

const MS_POR_DIA = 86_400_000

/** Cotas (en días) de los buckets del filtro. */
export const DURATION_BUCKET_BOUNDS = {
  shortMax: 7,
  mediumMax: 14,
} as const

/** Días entre publicación y cierre; `null` si falta alguna fecha. */
export function durationInDays(
  fechaPublicacion: string | null,
  fechaCierre: string | null,
): number | null {
  if (fechaPublicacion === null || fechaCierre === null) return null
  const ms =
    new Date(fechaCierre).getTime() - new Date(fechaPublicacion).getTime()
  if (!Number.isFinite(ms)) return null
  return Math.max(0, Math.round(ms / MS_POR_DIA))
}

/**
 * ¿La duración cae en el bucket? `null` (sin fechas) no matchea ninguno; un
 * bucket vacío/desconocido tampoco (el caller filtra el "sin filtro" antes).
 * Acepta `string` porque el valor viene del estado de UI del filtro.
 */
export function matchesDurationBucket(
  durationDays: number | null,
  bucket: string,
): boolean {
  if (durationDays === null) return false
  switch (bucket) {
    case 'short':
      return durationDays <= DURATION_BUCKET_BOUNDS.shortMax
    case 'medium':
      return (
        durationDays > DURATION_BUCKET_BOUNDS.shortMax &&
        durationDays <= DURATION_BUCKET_BOUNDS.mediumMax
      )
    case 'long':
      return durationDays > DURATION_BUCKET_BOUNDS.mediumMax
    default:
      return false
  }
}
