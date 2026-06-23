import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ok, err } from '@/lib/result'
import {
  requireRole,
  requireVerifiedEgresado,
  requireVerifiedEmpresario,
} from './guards'
import { getUserRole } from './queries'
import { getCurrentUser } from '@/lib/auth/dal'
import { createSupabaseServerClient } from '@/lib/supabase/server'

vi.mock('./queries', () => ({
  getUserRole: vi.fn(),
}))
vi.mock('@/lib/auth/dal', () => ({
  getCurrentUser: vi.fn(),
}))
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}))

const mockedGetUserRole = vi.mocked(getUserRole)
const mockedGetCurrentUser = vi.mocked(getCurrentUser)
const mockedServer = vi.mocked(createSupabaseServerClient)

const GUARD_USER_ID = 'usr-guard-1'

// Cliente Supabase mínimo: from(table) devuelve una cadena cuyo single() y
// maybeSingle() resuelven el { data, error } indicado; otras tablas → {}.
function clientReturning(
  table: string,
  result: { data: unknown; error: unknown },
) {
  const chain = {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn().mockResolvedValue(result),
        maybeSingle: vi.fn().mockResolvedValue(result),
      })),
    })),
  }
  return { from: vi.fn((t: string) => (t === table ? chain : {})) }
}

describe('requireRole', () => {
  beforeEach(() => {
    mockedGetUserRole.mockReset()
  })

  it('devuelve unauthenticated cuando no hay rol/sesión', async () => {
    mockedGetUserRole.mockResolvedValue(err('no_role'))

    const result = await requireRole('administrador')

    expect(result).toEqual({ ok: false, error: 'unauthenticated' })
  })

  it('devuelve ok con el rol cuando coincide', async () => {
    mockedGetUserRole.mockResolvedValue(ok('administrador'))

    const result = await requireRole('administrador')

    expect(result).toEqual({ ok: true, data: 'administrador' })
  })

  it("devuelve ok para el rol 'empresario'", async () => {
    mockedGetUserRole.mockResolvedValue(ok('empresario'))

    const result = await requireRole('empresario')

    expect(result).toEqual({ ok: true, data: 'empresario' })
  })

  it('devuelve forbidden cuando el rol no coincide', async () => {
    mockedGetUserRole.mockResolvedValue(ok('egresado'))

    const result = await requireRole('administrador')

    expect(result).toEqual({ ok: false, error: 'forbidden' })
  })

  it('devuelve forbidden para un rol desconocido que normaliza a null', async () => {
    mockedGetUserRole.mockResolvedValue(ok('moderador'))

    const result = await requireRole('administrador')

    expect(result).toEqual({ ok: false, error: 'forbidden' })
  })
})

describe('requireVerifiedEgresado', () => {
  beforeEach(() => {
    mockedGetUserRole.mockReset()
    mockedGetCurrentUser.mockReset()
    mockedServer.mockReset()
  })

  it('devuelve forbidden si el rol no es egresado', async () => {
    mockedGetUserRole.mockResolvedValue(ok('empresario'))

    const result = await requireVerifiedEgresado()

    expect(result).toEqual({ ok: false, error: 'forbidden' })
  })

  it('devuelve unauthenticated si no hay usuario', async () => {
    mockedGetUserRole.mockResolvedValue(ok('egresado'))
    mockedGetCurrentUser.mockResolvedValue(null as never)

    const result = await requireVerifiedEgresado()

    expect(result).toEqual({ ok: false, error: 'unauthenticated' })
  })

  it('devuelve estudiante_not_found si no existe la fila', async () => {
    mockedGetUserRole.mockResolvedValue(ok('egresado'))
    mockedGetCurrentUser.mockResolvedValue({ id: GUARD_USER_ID } as never)
    mockedServer.mockResolvedValue(
      clientReturning('estudiantes', {
        data: null,
        error: { message: 'no row' },
      }) as never,
    )

    const result = await requireVerifiedEgresado()

    expect(result).toEqual({ ok: false, error: 'estudiante_not_found' })
  })

  it('devuelve cuenta_no_verificada si el estado no es verificado', async () => {
    mockedGetUserRole.mockResolvedValue(ok('egresado'))
    mockedGetCurrentUser.mockResolvedValue({ id: GUARD_USER_ID } as never)
    mockedServer.mockResolvedValue(
      clientReturning('estudiantes', {
        data: { id_estudiante: 'est-1', estado_verificacion: 'pendiente' },
        error: null,
      }) as never,
    )

    const result = await requireVerifiedEgresado()

    expect(result).toEqual({ ok: false, error: 'cuenta_no_verificada' })
  })

  it('devuelve ok con el id_estudiante cuando está verificado', async () => {
    mockedGetUserRole.mockResolvedValue(ok('egresado'))
    mockedGetCurrentUser.mockResolvedValue({ id: GUARD_USER_ID } as never)
    mockedServer.mockResolvedValue(
      clientReturning('estudiantes', {
        data: { id_estudiante: 'est-1', estado_verificacion: 'verificado' },
        error: null,
      }) as never,
    )

    const result = await requireVerifiedEgresado()

    expect(result).toEqual({
      ok: true,
      data: { id_estudiante: 'est-1', id_usuario: GUARD_USER_ID },
    })
  })
})

describe('requireVerifiedEmpresario', () => {
  beforeEach(() => {
    mockedGetUserRole.mockReset()
    mockedGetCurrentUser.mockReset()
    mockedServer.mockReset()
  })

  it('devuelve forbidden si el rol no es empresario', async () => {
    mockedGetUserRole.mockResolvedValue(ok('egresado'))

    const result = await requireVerifiedEmpresario()

    expect(result).toEqual({ ok: false, error: 'forbidden' })
  })

  it('devuelve empresario_no_encontrado si no existe la fila', async () => {
    mockedGetUserRole.mockResolvedValue(ok('empresario'))
    mockedGetCurrentUser.mockResolvedValue({ id: GUARD_USER_ID } as never)
    mockedServer.mockResolvedValue(
      clientReturning('empresarios', { data: null, error: null }) as never,
    )

    const result = await requireVerifiedEmpresario()

    expect(result).toEqual({ ok: false, error: 'empresario_no_encontrado' })
  })

  it('devuelve not_verified si el estado no es verificado', async () => {
    mockedGetUserRole.mockResolvedValue(ok('empresario'))
    mockedGetCurrentUser.mockResolvedValue({ id: GUARD_USER_ID } as never)
    mockedServer.mockResolvedValue(
      clientReturning('empresarios', {
        data: { id_empresario: 'emp-1', estado_verificacion: 'pendiente' },
        error: null,
      }) as never,
    )

    const result = await requireVerifiedEmpresario()

    expect(result).toEqual({ ok: false, error: 'not_verified' })
  })

  it('devuelve ok con el id_empresario cuando está verificado', async () => {
    mockedGetUserRole.mockResolvedValue(ok('empresario'))
    mockedGetCurrentUser.mockResolvedValue({ id: GUARD_USER_ID } as never)
    mockedServer.mockResolvedValue(
      clientReturning('empresarios', {
        data: { id_empresario: 'emp-1', estado_verificacion: 'verificado' },
        error: null,
      }) as never,
    )

    const result = await requireVerifiedEmpresario()

    expect(result).toEqual({
      ok: true,
      data: { id_empresario: 'emp-1', id_usuario: GUARD_USER_ID },
    })
  })
})
