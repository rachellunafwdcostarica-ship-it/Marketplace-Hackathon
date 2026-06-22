import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/headers', () => ({
  headers: vi.fn(() => ({ get: vi.fn(() => null) })),
}))
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))
vi.mock('@/lib/auth/guards', () => ({ requireRole: vi.fn() }))
vi.mock('@/lib/supabase/admin', () => ({ createSupabaseAdminClient: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}))

import {
  verificarEgresado,
  rechazarEgresado,
  verificarEmpresa,
  rechazarEmpresa,
} from './actions'
import { requireRole } from '@/lib/auth/guards'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const mockedRequireRole = vi.mocked(requireRole)
const mockedAdmin = vi.mocked(createSupabaseAdminClient)
const mockedServer = vi.mocked(createSupabaseServerClient)

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000'
const GRADUATE_EMAIL = 'egresado@fwd.test'

beforeEach(() => {
  vi.clearAllMocks()
  mockedRequireRole.mockResolvedValue({ ok: true, data: 'administrador' })
  mockedServer.mockResolvedValue({
    auth: {
      getUser: vi
        .fn()
        .mockResolvedValue({ data: { user: { id: 'admin-1' } }, error: null }),
    },
  } as never)
})

function buildGraduateAdmin(opts: {
  hasConsent?: boolean
  updateRows?: unknown[]
  before?: unknown
  userEmail?: string | null
  isFwdGraduate?: boolean
}) {
  const correo = opts.userEmail === undefined ? GRADUATE_EMAIL : opts.userEmail
  const isGraduate = opts.isFwdGraduate ?? true
  const update = vi.fn(() => ({
    eq: vi.fn(() => ({
      select: vi.fn().mockResolvedValue({
        data: opts.updateRows ?? [{ id_estudiante: 'e1' }],
        error: null,
      }),
    })),
  }))
  const insert = vi.fn().mockResolvedValue({ error: null })
  const selectBefore = vi.fn(() => ({
    eq: vi.fn(() => ({
      maybeSingle: vi.fn().mockResolvedValue({
        data: opts.before ?? {
          estado_verificacion: 'pendiente',
          verificado_at: null,
          verificado_por: null,
        },
        error: null,
      }),
    })),
  }))
  const client = {
    from: vi.fn((table: string) => {
      if (table === 'usuarios') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: correo === null ? null : { correo },
                error: null,
              }),
            })),
          })),
        }
      }
      if (table === 'egresados_fwd_oficial') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: isGraduate ? { correo: GRADUATE_EMAIL } : null,
                error: null,
              }),
            })),
          })),
        }
      }
      if (table === 'consentimientos') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  limit: vi.fn().mockResolvedValue({
                    data: opts.hasConsent ? [{ id_consentimiento: 'c1' }] : [],
                    error: null,
                  }),
                })),
              })),
            })),
          })),
        }
      }
      if (table === 'auditoria') {
        return { insert }
      }
      // estudiantes: SELECT previo (.select().eq().maybeSingle()) y UPDATE (.update().eq().select())
      return { select: selectBefore, update }
    }),
    update,
    insert,
  }
  mockedAdmin.mockReturnValue(client as never)
  return client
}

function buildCompanyAdmin(opts: { updateRows?: unknown[]; before?: unknown }) {
  const update = vi.fn(() => ({
    eq: vi.fn(() => ({
      select: vi.fn().mockResolvedValue({
        data: opts.updateRows ?? [{ id_empresario: 'm1' }],
        error: null,
      }),
    })),
  }))
  const insert = vi.fn().mockResolvedValue({ error: null })
  const selectBefore = vi.fn(() => ({
    eq: vi.fn(() => ({
      maybeSingle: vi.fn().mockResolvedValue({
        data: opts.before ?? {
          estado_verificacion: 'pendiente',
          verificado_at: null,
          verificado_por: null,
        },
        error: null,
      }),
    })),
  }))
  const client = {
    from: vi.fn((table: string) => {
      if (table === 'auditoria') {
        return { insert }
      }
      return { select: selectBefore, update }
    }),
    update,
    insert,
  }
  mockedAdmin.mockReturnValue(client as never)
  return client
}

describe('verificarEgresado', () => {
  it('rechaza un id inválido sin tocar Supabase', async () => {
    const result = await verificarEgresado('no-es-uuid')
    expect(result).toEqual({ ok: false, error: 'invalid_user_id' })
    expect(mockedAdmin).not.toHaveBeenCalled()
  })

  it('propaga el error si el caller no es admin', async () => {
    mockedRequireRole.mockResolvedValue({ ok: false, error: 'forbidden' })
    const result = await verificarEgresado(VALID_UUID)
    expect(result).toEqual({ ok: false, error: 'forbidden' })
  })

  it('bloquea si el egresado no consintió el cotejo (RNF-38)', async () => {
    const admin = buildGraduateAdmin({ hasConsent: false })
    const result = await verificarEgresado(VALID_UUID)
    expect(result).toEqual({ ok: false, error: 'sin_consentimiento_cotejo' })
    expect(admin.update).not.toHaveBeenCalled()
  })

  it('verifica si hay consentimiento y existe la fila estudiantes', async () => {
    buildGraduateAdmin({ hasConsent: true })
    const result = await verificarEgresado(VALID_UUID)
    expect(result).toEqual({ ok: true, data: undefined })
  })

  it('devuelve not_a_student si no se tocó ninguna fila', async () => {
    buildGraduateAdmin({ hasConsent: true, updateRows: [] })
    const result = await verificarEgresado(VALID_UUID)
    expect(result).toEqual({ ok: false, error: 'not_a_student' })
  })

  it('registra la verificación en auditoría (RNF-05)', async () => {
    const admin = buildGraduateAdmin({ hasConsent: true })
    await verificarEgresado(VALID_UUID)
    expect(admin.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        accion: 'verificar_egresado',
        entidad: 'estudiantes',
        id_actor: 'admin-1',
      }),
    )
  })

  it('devuelve user_not_found si el usuario no tiene correo', async () => {
    const admin = buildGraduateAdmin({ userEmail: null })
    const result = await verificarEgresado(VALID_UUID)
    expect(result).toEqual({ ok: false, error: 'user_not_found' })
    expect(admin.update).not.toHaveBeenCalled()
  })

  it('devuelve egresado_no_encontrado si el correo no está en la base FWD', async () => {
    const admin = buildGraduateAdmin({ isFwdGraduate: false })
    const result = await verificarEgresado(VALID_UUID)
    expect(result).toEqual({ ok: false, error: 'egresado_no_encontrado' })
    expect(admin.update).not.toHaveBeenCalled()
  })
})

describe('rechazarEgresado', () => {
  it('rechaza sin exigir consentimiento', async () => {
    const admin = buildGraduateAdmin({ hasConsent: false })
    const result = await rechazarEgresado(VALID_UUID)
    expect(result).toEqual({ ok: true, data: undefined })
    expect(admin.update).toHaveBeenCalledTimes(1)
  })
})

describe('verificarEmpresa', () => {
  it('rechaza un id inválido sin tocar Supabase', async () => {
    const result = await verificarEmpresa('no-es-uuid')
    expect(result).toEqual({ ok: false, error: 'invalid_company_id' })
    expect(mockedAdmin).not.toHaveBeenCalled()
  })

  it('verifica una empresa existente', async () => {
    buildCompanyAdmin({})
    const result = await verificarEmpresa(VALID_UUID)
    expect(result).toEqual({ ok: true, data: undefined })
  })

  it('devuelve empresa_no_encontrada si no se tocó ninguna fila', async () => {
    buildCompanyAdmin({ updateRows: [] })
    const result = await verificarEmpresa(VALID_UUID)
    expect(result).toEqual({ ok: false, error: 'empresa_no_encontrada' })
  })
})

describe('rechazarEmpresa', () => {
  it('rechaza una empresa existente', async () => {
    buildCompanyAdmin({})
    const result = await rechazarEmpresa(VALID_UUID)
    expect(result).toEqual({ ok: true, data: undefined })
  })
})
