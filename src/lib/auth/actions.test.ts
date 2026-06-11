import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}))

import { signInWithPassword } from './actions'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const mockedAdmin = vi.mocked(createSupabaseAdminClient)
const mockedServer = vi.mocked(createSupabaseServerClient)

const DEFAULT_CONFIG = [
  { clave: 'intentos_login_max', valor: '5' },
  { clave: 'tiempo_bloqueo_minutos', valor: '30' },
]

interface UsuarioRow {
  id_usuario: string
  intentos_fallidos: number
  bloqueado_hasta: string | null
}

function buildAdmin(opts: {
  configRows?: Array<{ clave: string; valor: string }>
  usuario: UsuarioRow | null
  updateError?: { message: string } | null
}) {
  const usuariosUpdate = vi.fn<
    (updates: {
      intentos_fallidos: number
      bloqueado_hasta?: string | null
    }) => {
      eq: () => Promise<{ error: { message: string } | null }>
    }
  >()
  usuariosUpdate.mockReturnValue({
    eq: vi.fn().mockResolvedValue({ error: opts.updateError ?? null }),
  })

  const client = {
    from: vi.fn((table: string) => {
      if (table === 'configuracion_sistema') {
        return {
          select: vi.fn(() => ({
            in: vi
              .fn()
              .mockResolvedValue({ data: opts.configRows ?? DEFAULT_CONFIG }),
          })),
        }
      }
      // usuarios
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({ data: opts.usuario }),
          })),
        })),
        update: usuariosUpdate,
      }
    }),
    usuariosUpdate,
  }

  // El cliente admin es síncrono en el action.
  mockedAdmin.mockReturnValue(client as never)
  return client
}

function buildServer(signInError: { message: string } | null) {
  const signInWithPasswordFn = vi.fn().mockResolvedValue({ error: signInError })
  mockedServer.mockResolvedValue({
    auth: { signInWithPassword: signInWithPasswordFn },
  } as never)
  return signInWithPasswordFn
}

const CREDENTIALS = { email: 'user@example.com', password: 'secret-123' }

describe('signInWithPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rechaza input inválido sin tocar Supabase', async () => {
    const result = await signInWithPassword({
      email: 'no-es-email',
      password: '',
    })

    expect(result).toEqual({ ok: false, error: 'invalid_input' })
    expect(mockedAdmin).not.toHaveBeenCalled()
    expect(mockedServer).not.toHaveBeenCalled()
  })

  it('devuelve account_locked sin intentar autenticar si el bloqueo sigue vigente', async () => {
    buildAdmin({
      usuario: {
        id_usuario: 'u1',
        intentos_fallidos: 5,
        bloqueado_hasta: '2999-01-01T00:00:00.000Z',
      },
    })
    const signIn = buildServer(null)

    const result = await signInWithPassword(CREDENTIALS)

    expect(result).toEqual({ ok: false, error: 'account_locked' })
    expect(signIn).not.toHaveBeenCalled()
  })

  it('incrementa intentos_fallidos en credenciales inválidas sin bloquear', async () => {
    const admin = buildAdmin({
      usuario: {
        id_usuario: 'u1',
        intentos_fallidos: 2,
        bloqueado_hasta: null,
      },
    })
    buildServer({ message: 'Invalid login credentials' })

    const result = await signInWithPassword(CREDENTIALS)

    expect(result).toEqual({ ok: false, error: 'invalid_credentials' })
    expect(admin.usuariosUpdate).toHaveBeenCalledTimes(1)
    const updateArg = admin.usuariosUpdate.mock.calls[0]?.[0]
    expect(updateArg).toEqual({ intentos_fallidos: 3 })
  })

  it('fija bloqueado_hasta al alcanzar el máximo de intentos', async () => {
    const admin = buildAdmin({
      usuario: {
        id_usuario: 'u1',
        intentos_fallidos: 4,
        bloqueado_hasta: null,
      },
    })
    buildServer({ message: 'Invalid login credentials' })

    const result = await signInWithPassword(CREDENTIALS)

    expect(result).toEqual({ ok: false, error: 'invalid_credentials' })
    const updateArg = admin.usuariosUpdate.mock.calls[0]?.[0]
    expect(updateArg?.intentos_fallidos).toBe(5)
    expect(typeof updateArg?.bloqueado_hasta).toBe('string')
  })

  it('resetea el contador tras un login exitoso', async () => {
    const admin = buildAdmin({
      usuario: {
        id_usuario: 'u1',
        intentos_fallidos: 3,
        bloqueado_hasta: null,
      },
    })
    const signIn = buildServer(null)

    const result = await signInWithPassword(CREDENTIALS)

    expect(result).toEqual({ ok: true, data: undefined })
    expect(signIn).toHaveBeenCalledTimes(1)
    expect(admin.usuariosUpdate).toHaveBeenCalledWith({
      intentos_fallidos: 0,
      bloqueado_hasta: null,
    })
  })

  it('autentica correos desconocidos sin crear contador', async () => {
    const admin = buildAdmin({ usuario: null })
    buildServer({ message: 'Invalid login credentials' })

    const result = await signInWithPassword(CREDENTIALS)

    expect(result).toEqual({ ok: false, error: 'invalid_credentials' })
    expect(admin.usuariosUpdate).not.toHaveBeenCalled()
  })
})
