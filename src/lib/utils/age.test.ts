import { describe, it, expect } from 'vitest'
import {
  calculateAgeInYears,
  isAtLeastYearsOld,
  maxBirthDateForMinAge,
} from './age'

// Fecha de referencia fija para que los tests no dependan del reloj.
const REFERENCE = new Date(2026, 5, 17) // 2026-06-17 (mes 0-indexado)

describe('calculateAgeInYears', () => {
  it('cuenta solo años cumplidos: el cumpleaños justo hoy ya suma', () => {
    expect(calculateAgeInYears('2008-06-17', REFERENCE)).toBe(18)
  })

  it('no suma el año si el cumpleaños aún no llegó', () => {
    expect(calculateAgeInYears('2008-06-18', REFERENCE)).toBe(17)
    expect(calculateAgeInYears('2008-12-31', REFERENCE)).toBe(17)
  })

  it('devuelve null para cadenas vacías o con formato inválido', () => {
    expect(calculateAgeInYears('', REFERENCE)).toBeNull()
    expect(calculateAgeInYears('17/06/2008', REFERENCE)).toBeNull()
    expect(calculateAgeInYears('abc', REFERENCE)).toBeNull()
  })

  it('devuelve null para fechas calendáricas inexistentes', () => {
    expect(calculateAgeInYears('2000-02-31', REFERENCE)).toBeNull()
    expect(calculateAgeInYears('2001-02-29', REFERENCE)).toBeNull()
  })

  it('da edad negativa para fechas futuras', () => {
    expect(calculateAgeInYears('2030-01-01', REFERENCE)).toBeLessThan(0)
  })
})

describe('isAtLeastYearsOld', () => {
  it('acepta a quien cumple 18 exactamente hoy', () => {
    expect(isAtLeastYearsOld('2008-06-17', 18, REFERENCE)).toBe(true)
  })

  it('rechaza por un día de diferencia', () => {
    expect(isAtLeastYearsOld('2008-06-18', 18, REFERENCE)).toBe(false)
  })

  it('rechaza fechas inválidas y futuras', () => {
    expect(isAtLeastYearsOld('', 18, REFERENCE)).toBe(false)
    expect(isAtLeastYearsOld('2030-01-01', 18, REFERENCE)).toBe(false)
  })
})

describe('maxBirthDateForMinAge', () => {
  it('devuelve la fecha exacta de hace `minAge` años', () => {
    expect(maxBirthDateForMinAge(18, REFERENCE)).toBe('2008-06-17')
  })

  it('rellena con ceros mes y día', () => {
    expect(maxBirthDateForMinAge(18, new Date(2026, 0, 5))).toBe('2008-01-05')
  })
})
