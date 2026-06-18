import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))
vi.mock('@/lib/auth/guards', () => ({ requireRole: vi.fn() }))
vi.mock('@/lib/auth/dal', () => ({ getCurrentUser: vi.fn() }))
vi.mock('@/lib/supabase/admin', () => ({ createSupabaseAdminClient: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { addStrike, removeStrike, resetStrikes } from './strike-actions'
import { requireRole } from '@/lib/auth/guards'
import { getCurrentUser } from '@/lib/auth/dal'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

const mockedRequireRole = vi.mocked(requireRole)
const mockedGetCurrentUser = vi.mocked(getCurrentUser)
const mockedAdmin = vi.mocked(createSupabaseAdminClient)

const VALID_UUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
const MOTIVO_VALIDO = 'ghosting' as const
const ADMIN_USER = { id: 'admin-uuid', email: 'admin@test.com' }

/** Crea un builder encadenable para queries de strikes (select→eq→eq→order→limit→maybeSingle) */
function makeStrikesSelectChain(data: unknown) {
  const chain: Record<string, () => unknown> = {}
  const end = { maybeSingle: vi.fn().mockResolvedValue({ data, error: null }) }
  chain.select = vi.fn(() => chain)
  chain.eq = vi.fn(() => chain)
  chain.order = vi.fn(() => chain)
  chain.limit = vi.fn(() => end)
  return chain
}

beforeEach(() => {
  vi.clearAllMocks()
  mockedRequireRole.mockResolvedValue({ ok: true, data: 'administrador' })
  mockedGetCurrentUser.mockResolvedValue(ADMIN_USER as never)
})

// ─────────────────────────────────────────────────────────────────────────────
// addStrike
// ─────────────────────────────────────────────────────────────────────────────

describe('addStrike', () => {
  it('rechaza userId inválido (no UUID)', async () => {
    const result = await addStrike('no-uuid', MOTIVO_VALIDO)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('invalid_user_id')
  })

  it('rechaza motivo inválido', async () => {
    const result = await addStrike(VALID_UUID, 'motivo_inventado' as never)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('invalid_motivo')
  })

  it('rechaza descripcion vacía si se pasa', async () => {
    const result = await addStrike(VALID_UUID, MOTIVO_VALIDO, '')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('invalid_descripcion')
  })

  it('propaga error si el caller no es admin', async () => {
    mockedRequireRole.mockResolvedValue({ ok: false, error: 'forbidden' })
    const result = await addStrike(VALID_UUID, MOTIVO_VALIDO)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('forbidden')
  })

  it('retorna unauthenticated si no hay usuario autenticado', async () => {
    mockedGetCurrentUser.mockResolvedValue(null)
    const result = await addStrike(VALID_UUID, MOTIVO_VALIDO)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('unauthenticated')
  })

  it('retorna user_not_found si el usuario no existe en DB', async () => {
    mockedAdmin.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi
              .fn()
              .mockResolvedValue({
                data: null,
                error: { message: 'not found' },
              }),
          })),
        })),
      })),
    } as never)

    const result = await addStrike(VALID_UUID, MOTIVO_VALIDO)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('user_not_found')
  })

  it('añade strike exitosamente (por debajo del límite)', async () => {
    mockedAdmin.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'usuarios') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { id_usuario: VALID_UUID, cantidad_strikes: 1 },
                  error: null,
                }),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ error: null }),
            })),
          }
        }
        if (table === 'configuracion_sistema') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi
                  .fn()
                  .mockResolvedValue({ data: { valor: '3' }, error: null }),
              })),
            })),
          }
        }
        if (table === 'strikes') {
          return { insert: vi.fn().mockResolvedValue({ error: null }) }
        }
        return {}
      }),
    } as never)

    const result = await addStrike(
      VALID_UUID,
      MOTIVO_VALIDO,
      'Descripción del comportamiento',
    )
    expect(result.ok).toBe(true)
  })

  it('suspende automáticamente al alcanzar el límite de 3', async () => {
    mockedAdmin.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'usuarios') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { id_usuario: VALID_UUID, cantidad_strikes: 2 },
                  error: null,
                }),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ error: null }),
            })),
          }
        }
        if (table === 'configuracion_sistema') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi
                  .fn()
                  .mockResolvedValue({ data: { valor: '3' }, error: null }),
              })),
            })),
          }
        }
        if (table === 'strikes') {
          return { insert: vi.fn().mockResolvedValue({ error: null }) }
        }
        return {}
      }),
    } as never)

    const result = await addStrike(VALID_UUID, MOTIVO_VALIDO)
    expect(result.ok).toBe(true)
  })

  it('usa límite default (3) si configuracion_sistema no tiene el registro', async () => {
    mockedAdmin.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'usuarios') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { id_usuario: VALID_UUID, cantidad_strikes: 0 },
                  error: null,
                }),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ error: null }),
            })),
          }
        }
        if (table === 'configuracion_sistema') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi
                  .fn()
                  .mockResolvedValue({ data: null, error: null }),
              })),
            })),
          }
        }
        if (table === 'strikes') {
          return { insert: vi.fn().mockResolvedValue({ error: null }) }
        }
        return {}
      }),
    } as never)

    const result = await addStrike(VALID_UUID, 'otro')
    expect(result.ok).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// removeStrike
// ─────────────────────────────────────────────────────────────────────────────

describe('removeStrike', () => {
  it('rechaza userId inválido', async () => {
    const result = await removeStrike('no-uuid')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('invalid_user_id')
  })

  it('propaga error si el caller no es admin', async () => {
    mockedRequireRole.mockResolvedValue({ ok: false, error: 'forbidden' })
    const result = await removeStrike(VALID_UUID)
    expect(result.ok).toBe(false)
  })

  it('retorna unauthenticated si no hay usuario', async () => {
    mockedGetCurrentUser.mockResolvedValue(null)
    const result = await removeStrike(VALID_UUID)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('unauthenticated')
  })

  it('retorna user_not_found si el usuario no existe', async () => {
    mockedAdmin.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi
              .fn()
              .mockResolvedValue({
                data: null,
                error: { message: 'not found' },
              }),
          })),
        })),
      })),
    } as never)

    const result = await removeStrike(VALID_UUID)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('user_not_found')
  })

  it('revoca el strike más reciente y decrementa el contador', async () => {
    const strikesChain = makeStrikesSelectChain({ id_strike: 'stk-1' })
    mockedAdmin.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'usuarios') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { cantidad_strikes: 2 },
                  error: null,
                }),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ error: null }),
            })),
          }
        }
        if (table === 'strikes') {
          return {
            ...strikesChain,
            update: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ error: null }),
            })),
          }
        }
        return {}
      }),
    } as never)

    const result = await removeStrike(VALID_UUID, 'Error de moderación')
    expect(result.ok).toBe(true)
  })

  it('continúa sin error si no hay strike activo para revocar', async () => {
    const strikesChain = makeStrikesSelectChain(null)
    mockedAdmin.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'usuarios') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { cantidad_strikes: 1 },
                  error: null,
                }),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ error: null }),
            })),
          }
        }
        if (table === 'strikes') {
          return strikesChain
        }
        return {}
      }),
    } as never)

    const result = await removeStrike(VALID_UUID)
    expect(result.ok).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// resetStrikes
// ─────────────────────────────────────────────────────────────────────────────

describe('resetStrikes', () => {
  it('rechaza userId inválido', async () => {
    const result = await resetStrikes('no-uuid', 'Motivo válido largo')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('invalid_user_id')
  })

  it('rechaza motivo con menos de 5 caracteres', async () => {
    const result = await resetStrikes(VALID_UUID, 'abc')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('motivo_requerido')
  })

  it('propaga error si el caller no es admin', async () => {
    mockedRequireRole.mockResolvedValue({ ok: false, error: 'forbidden' })
    const result = await resetStrikes(
      VALID_UUID,
      'Motivo suficientemente largo',
    )
    expect(result.ok).toBe(false)
  })

  it('retorna unauthenticated si no hay usuario', async () => {
    mockedGetCurrentUser.mockResolvedValue(null)
    const result = await resetStrikes(
      VALID_UUID,
      'Motivo suficientemente largo',
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('unauthenticated')
  })

  it('resetea los strikes a 0 exitosamente', async () => {
    mockedAdmin.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'usuarios') {
          return {
            update: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ error: null }),
            })),
          }
        }
        if (table === 'strikes') {
          return {
            update: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn().mockResolvedValue({ error: null }),
              })),
            })),
          }
        }
        return {}
      }),
    } as never)

    const result = await resetStrikes(
      VALID_UUID,
      'Error de moderación del sistema',
    )
    expect(result.ok).toBe(true)
  })

  it('retorna error si la actualización de usuarios falla', async () => {
    mockedAdmin.mockReturnValue({
      from: vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: { message: 'db error' } }),
        })),
      })),
    } as never)

    const result = await resetStrikes(
      VALID_UUID,
      'Error de moderación del sistema',
    )
    expect(result.ok).toBe(false)
  })
})
