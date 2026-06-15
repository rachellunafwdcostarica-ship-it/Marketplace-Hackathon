import { describe, it, expect } from 'vitest'
import { normalizeRole, toDbRole } from './roles'
import type { UserRole } from '@/types'

describe('normalizeRole', () => {
  it("convierte 'egresado' a 'junior'", () => {
    expect(normalizeRole('egresado')).toBe('junior')
  })

  it("convierte 'empresario' a 'empresa'", () => {
    expect(normalizeRole('empresario')).toBe('empresa')
  })

  it("convierte 'administrador' a 'admin'", () => {
    expect(normalizeRole('administrador')).toBe('admin')
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
})

describe('toDbRole', () => {
  it("convierte 'junior' a 'egresado'", () => {
    expect(toDbRole('junior')).toBe('egresado')
  })

  it("convierte 'empresa' a 'empresario'", () => {
    expect(toDbRole('empresa')).toBe('empresario')
  })

  it("convierte 'admin' a 'administrador'", () => {
    expect(toDbRole('admin')).toBe('administrador')
  })
})

describe('round-trip normalizeRole ↔ toDbRole', () => {
  const roles: UserRole[] = ['junior', 'empresa', 'admin']

  for (const role of roles) {
    it(`normalizeRole(toDbRole('${role}')) === '${role}'`, () => {
      expect(normalizeRole(toDbRole(role))).toBe(role)
    })
  }
})
