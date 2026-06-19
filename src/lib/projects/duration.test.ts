import { describe, it, expect } from 'vitest'
import {
  DURATION_BUCKET_BOUNDS,
  durationInDays,
  matchesDurationBucket,
} from './duration'

describe('durationInDays', () => {
  it('cuenta los días entre publicación y cierre', () => {
    expect(durationInDays('2026-01-01', '2026-01-08')).toBe(7)
  })

  it('redondea las fracciones de día al entero más cercano', () => {
    // 1.75 días (42 horas) redondea a 2.
    expect(durationInDays('2026-01-01T00:00:00Z', '2026-01-02T18:00:00Z')).toBe(
      2,
    )
  })

  it('devuelve null si falta alguna de las dos fechas', () => {
    expect(durationInDays(null, '2026-01-08')).toBeNull()
    expect(durationInDays('2026-01-01', null)).toBeNull()
    expect(durationInDays(null, null)).toBeNull()
  })

  it('devuelve null cuando una fecha es inválida', () => {
    expect(durationInDays('no-es-fecha', '2026-01-08')).toBeNull()
  })

  it('nunca devuelve negativos: un cierre anterior a la publicación da 0', () => {
    expect(durationInDays('2026-01-10', '2026-01-01')).toBe(0)
  })
})

describe('matchesDurationBucket', () => {
  it('short incluye hasta la cota (7 días) y el 0', () => {
    expect(matchesDurationBucket(0, 'short')).toBe(true)
    expect(
      matchesDurationBucket(DURATION_BUCKET_BOUNDS.shortMax, 'short'),
    ).toBe(true)
    expect(matchesDurationBucket(8, 'short')).toBe(false)
  })

  it('medium es el rango (7, 14]', () => {
    expect(matchesDurationBucket(7, 'medium')).toBe(false)
    expect(matchesDurationBucket(8, 'medium')).toBe(true)
    expect(
      matchesDurationBucket(DURATION_BUCKET_BOUNDS.mediumMax, 'medium'),
    ).toBe(true)
    expect(matchesDurationBucket(15, 'medium')).toBe(false)
  })

  it('long es estrictamente mayor a 14 días', () => {
    expect(matchesDurationBucket(14, 'long')).toBe(false)
    expect(matchesDurationBucket(15, 'long')).toBe(true)
  })

  it('una duración null no matchea ningún bucket', () => {
    expect(matchesDurationBucket(null, 'short')).toBe(false)
    expect(matchesDurationBucket(null, 'medium')).toBe(false)
    expect(matchesDurationBucket(null, 'long')).toBe(false)
  })

  it('un bucket desconocido o vacío no matchea', () => {
    expect(matchesDurationBucket(5, 'desconocido')).toBe(false)
    expect(matchesDurationBucket(5, '')).toBe(false)
  })
})
