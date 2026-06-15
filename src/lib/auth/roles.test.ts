import { describe, it, expect } from 'vitest'
import { normalizeRole } from './roles'
import type { UserRole } from '@/types'

describe('normalizeRole', () => {
  it("devuelve 'egresado' para el valor de BD 'egresado'", () => {
    expect(normalizeRole('egresado')).toBe<UserRole>('egresado')
  })

  it("devuelve 'empresario' para el valor de BD 'empresario'", () => {
    expect(normalizeRole('empresario')).toBe<UserRole>('empresario')
  })

  it("devuelve 'administrador' para el valor de BD 'administrador'", () => {
    expect(normalizeRole('administrador')).toBe<UserRole>('administrador')
  })

  it('devuelve null para valor desconocido', () => {
    expect(normalizeRole('fantasma')).toBeNull()
  })

  it('devuelve null para null', () => {
    expect(normalizeRole(null)).toBeNull()
  })

  it('devuelve null para undefined', () => {
    expect(normalizeRole(undefined)).toBeNull()
  })

  it("devuelve null para el valor legado 'junior' (ya no existe en la BD)", () => {
    expect(normalizeRole('junior')).toBeNull()
  })

  it("devuelve null para el valor legado 'empresa' (ya no existe en la BD)", () => {
    expect(normalizeRole('empresa')).toBeNull()
  })
})
