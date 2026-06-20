import { describe, it, expect } from 'vitest'
import {
  NIVELES_ADMIN_ASIGNABLES,
  evaluateAdminManagement,
  canManageAdminInUi,
} from './admin-management'

const OLDER = '2026-01-01T00:00:00.000Z'
const NEWER = '2026-06-01T00:00:00.000Z'

describe('NIVELES_ADMIN_ASIGNABLES', () => {
  it('ofrece solo superadmin y admin (nunca moderador)', () => {
    expect(NIVELES_ADMIN_ASIGNABLES).toEqual(['superadmin', 'admin'])
    expect(NIVELES_ADMIN_ASIGNABLES).not.toContain('moderador')
  })
})

describe('evaluateAdminManagement', () => {
  it('rechaza a quien no es superadmin', () => {
    const verdict = evaluateAdminManagement({
      action: 'deactivate',
      actorNivel: 'admin',
      actorFechaRegistro: OLDER,
      targetNivel: 'admin',
      targetFechaRegistro: NEWER,
      activeSuperadminCount: 2,
    })
    expect(verdict).toEqual({ allowed: false, reason: 'requires_superadmin' })
  })

  it('rechaza a un moderador (futuro) que intente gestionar', () => {
    const verdict = evaluateAdminManagement({
      action: 'deactivate',
      actorNivel: 'moderador',
      actorFechaRegistro: OLDER,
      targetNivel: 'admin',
      targetFechaRegistro: NEWER,
      activeSuperadminCount: 2,
    })
    expect(verdict.allowed).toBe(false)
  })

  it('permite a un superadmin desactivar a un admin común', () => {
    const verdict = evaluateAdminManagement({
      action: 'deactivate',
      actorNivel: 'superadmin',
      actorFechaRegistro: NEWER,
      targetNivel: 'admin',
      targetFechaRegistro: OLDER,
      activeSuperadminCount: 1,
    })
    expect(verdict).toEqual({ allowed: true })
  })

  it('permite a un superadmin desactivar a otro superadmin más nuevo', () => {
    const verdict = evaluateAdminManagement({
      action: 'deactivate',
      actorNivel: 'superadmin',
      actorFechaRegistro: OLDER,
      targetNivel: 'superadmin',
      targetFechaRegistro: NEWER,
      activeSuperadminCount: 2,
    })
    expect(verdict).toEqual({ allowed: true })
  })

  it('rechaza desactivar a un superadmin más antiguo (antigüedad)', () => {
    const verdict = evaluateAdminManagement({
      action: 'deactivate',
      actorNivel: 'superadmin',
      actorFechaRegistro: NEWER,
      targetNivel: 'superadmin',
      targetFechaRegistro: OLDER,
      activeSuperadminCount: 2,
    })
    expect(verdict).toEqual({ allowed: false, reason: 'seniority' })
  })

  it('rechaza desactivar a un superadmin con la misma fecha (empate)', () => {
    const verdict = evaluateAdminManagement({
      action: 'deactivate',
      actorNivel: 'superadmin',
      actorFechaRegistro: OLDER,
      targetNivel: 'superadmin',
      targetFechaRegistro: OLDER,
      activeSuperadminCount: 2,
    })
    expect(verdict).toEqual({ allowed: false, reason: 'seniority' })
  })

  it('rechaza desactivar al último superadmin activo', () => {
    const verdict = evaluateAdminManagement({
      action: 'deactivate',
      actorNivel: 'superadmin',
      actorFechaRegistro: OLDER,
      targetNivel: 'superadmin',
      targetFechaRegistro: NEWER,
      activeSuperadminCount: 1,
    })
    expect(verdict).toEqual({ allowed: false, reason: 'last_superadmin' })
  })

  it('al reactivar no aplica el guard del último superadmin', () => {
    const verdict = evaluateAdminManagement({
      action: 'reactivate',
      actorNivel: 'superadmin',
      actorFechaRegistro: OLDER,
      targetNivel: 'superadmin',
      targetFechaRegistro: NEWER,
      activeSuperadminCount: 1,
    })
    expect(verdict).toEqual({ allowed: true })
  })
})

describe('canManageAdminInUi', () => {
  it('oculta acciones para quien no es superadmin', () => {
    expect(
      canManageAdminInUi({
        actorNivel: 'admin',
        actorFechaRegistro: OLDER,
        targetNivel: 'admin',
        targetFechaRegistro: NEWER,
      }),
    ).toBe(false)
  })

  it('muestra acciones de un superadmin sobre un admin común', () => {
    expect(
      canManageAdminInUi({
        actorNivel: 'superadmin',
        actorFechaRegistro: NEWER,
        targetNivel: 'admin',
        targetFechaRegistro: OLDER,
      }),
    ).toBe(true)
  })

  it('oculta acciones sobre un superadmin más antiguo', () => {
    expect(
      canManageAdminInUi({
        actorNivel: 'superadmin',
        actorFechaRegistro: NEWER,
        targetNivel: 'superadmin',
        targetFechaRegistro: OLDER,
      }),
    ).toBe(false)
  })
})
