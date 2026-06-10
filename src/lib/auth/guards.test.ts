import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ok, err } from '@/lib/result'
import { requireRole } from './guards'
import { getUserRole } from './queries'

vi.mock('./queries', () => ({
  getUserRole: vi.fn(),
}))

const mockedGetUserRole = vi.mocked(getUserRole)

describe('requireRole', () => {
  beforeEach(() => {
    mockedGetUserRole.mockReset()
  })

  it('devuelve unauthenticated cuando no hay rol/sesión', async () => {
    mockedGetUserRole.mockResolvedValue(err('no_role'))

    const result = await requireRole('admin')

    expect(result).toEqual({ ok: false, error: 'unauthenticated' })
  })

  it('devuelve ok con el rol cuando coincide', async () => {
    mockedGetUserRole.mockResolvedValue(ok('administrador'))

    const result = await requireRole('admin')

    expect(result).toEqual({ ok: true, data: 'admin' })
  })

  it("normaliza 'empresario' (BD) a 'empresa' (frontend) al comparar", async () => {
    mockedGetUserRole.mockResolvedValue(ok('empresario'))

    const result = await requireRole('empresa')

    expect(result).toEqual({ ok: true, data: 'empresa' })
  })

  it('devuelve forbidden cuando el rol no coincide', async () => {
    mockedGetUserRole.mockResolvedValue(ok('egresado'))

    const result = await requireRole('admin')

    expect(result).toEqual({ ok: false, error: 'forbidden' })
  })

  it('devuelve forbidden para un rol desconocido que normaliza a null', async () => {
    mockedGetUserRole.mockResolvedValue(ok('moderador'))

    const result = await requireRole('admin')

    expect(result).toEqual({ ok: false, error: 'forbidden' })
  })
})
