import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}))
vi.mock('@/lib/auth/guards', () => ({ requireRole: vi.fn() }))
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
// El productor de notificaciones (notificarPostulacion) usa el cliente admin;
// se mockea para que no intente una conexión real (igual que strike-actions.test).
vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              empresarios: {
                id_usuario: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
              },
            },
            error: null,
          }),
        })),
      })),
      insert: vi.fn().mockResolvedValue({ error: null }),
    })),
  })),
}))

import { postularse, retirarPostulacion } from './actions'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/guards'

const mockedServer = vi.mocked(createSupabaseServerClient)
const mockedRequireRole = vi.mocked(requireRole)

const PROJ_UUID = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
const PART_UUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
const USER_ID = 'usr-egresado-1'
const EST_ID = 'est-1'

function withAuth(fromImpl: (table: string) => unknown) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: USER_ID } },
        error: null,
      }),
    },
    from: vi.fn(fromImpl),
  }
}

function withNoAuth() {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: null },
        error: { message: 'no auth' },
      }),
    },
    from: vi.fn(),
  }
}

const validInput = {
  id_proyecto: PROJ_UUID,
  planteamiento_solucion:
    'Esta es mi propuesta de solución detallada para el proyecto.',
  prototipo_enlaces: ['https://github.com/test/prototype'],
  carta_postulacion: 'Carta de presentación del egresado.',
}

beforeEach(() => {
  vi.clearAllMocks()
  mockedRequireRole.mockResolvedValue({ ok: true, data: 'egresado' })
})

// ─────────────────────────────────────────────────────────────────────────────
// postularse
// ─────────────────────────────────────────────────────────────────────────────

describe('postularse', () => {
  it('retorna invalid_input si el input no cumple el schema', async () => {
    const result = await postularse({
      id_proyecto: 'no-es-uuid',
      planteamiento_solucion: 'corto',
      prototipo_enlaces: [],
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('invalid_input')
  })

  it('propaga error si el rol no es egresado', async () => {
    mockedRequireRole.mockResolvedValue({ ok: false, error: 'forbidden' })
    const result = await postularse(validInput)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('forbidden')
  })

  it('retorna unauthenticated si no hay usuario', async () => {
    mockedServer.mockResolvedValue(withNoAuth() as never)
    const result = await postularse(validInput)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('unauthenticated')
  })

  it('retorna estudiante_not_found si el estudiante no existe', async () => {
    mockedServer.mockResolvedValue(
      withAuth((table) => {
        if (table === 'estudiantes') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'not found' },
                }),
              })),
            })),
          }
        }
        return {}
      }) as never,
    )

    const result = await postularse(validInput)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('estudiante_not_found')
  })

  it('retorna cuenta_no_verificada si el egresado no está verificado', async () => {
    mockedServer.mockResolvedValue(
      withAuth((table) => {
        if (table === 'estudiantes') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id_estudiante: EST_ID,
                    estado_verificacion: 'pendiente',
                  },
                  error: null,
                }),
              })),
            })),
          }
        }
        return {}
      }) as never,
    )

    const result = await postularse(validInput)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('cuenta_no_verificada')
  })

  it('retorna proyecto_not_found si el proyecto no existe', async () => {
    mockedServer.mockResolvedValue(
      withAuth((table) => {
        if (table === 'estudiantes') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id_estudiante: EST_ID,
                    estado_verificacion: 'verificado',
                  },
                  error: null,
                }),
              })),
            })),
          }
        }
        if (table === 'proyectos') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'not found' },
                }),
              })),
            })),
          }
        }
        return {}
      }) as never,
    )

    const result = await postularse(validInput)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('proyecto_not_found')
  })

  it('retorna proyecto_cerrado si el proyecto no está abierto', async () => {
    mockedServer.mockResolvedValue(
      withAuth((table) => {
        if (table === 'estudiantes') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id_estudiante: EST_ID,
                    estado_verificacion: 'verificado',
                  },
                  error: null,
                }),
              })),
            })),
          }
        }
        if (table === 'proyectos') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    estado: 'finalizado',
                    fecha_cierre: null,
                    is_active: true,
                  },
                  error: null,
                }),
              })),
            })),
          }
        }
        return {}
      }) as never,
    )

    const result = await postularse(validInput)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('proyecto_cerrado')
  })

  it('envía la postulación exitosamente', async () => {
    mockedServer.mockResolvedValue(
      withAuth((table) => {
        if (table === 'estudiantes') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id_estudiante: EST_ID,
                    estado_verificacion: 'verificado',
                  },
                  error: null,
                }),
              })),
            })),
          }
        }
        if (table === 'proyectos') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    estado: 'abierto',
                    fecha_cierre: null,
                    is_active: true,
                  },
                  error: null,
                }),
              })),
            })),
          }
        }
        if (table === 'participaciones') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
          }
        }
        return {}
      }) as never,
    )

    const result = await postularse(validInput)
    expect(result.ok).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// retirarPostulacion
// ─────────────────────────────────────────────────────────────────────────────

describe('retirarPostulacion', () => {
  it('retorna invalid_input si el UUID es inválido', async () => {
    const result = await retirarPostulacion({ id_participacion: 'no-uuid' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('invalid_input')
  })

  it('propaga error si el rol no es egresado', async () => {
    mockedRequireRole.mockResolvedValue({ ok: false, error: 'forbidden' })
    const result = await retirarPostulacion({ id_participacion: PART_UUID })
    expect(result.ok).toBe(false)
  })

  it('retorna unauthenticated si no hay usuario', async () => {
    mockedServer.mockResolvedValue(withNoAuth() as never)
    const result = await retirarPostulacion({ id_participacion: PART_UUID })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('unauthenticated')
  })

  it('retorna estudiante_not_found si no existe el estudiante', async () => {
    mockedServer.mockResolvedValue(
      withAuth((table) => {
        if (table === 'estudiantes') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'not found' },
                }),
              })),
            })),
          }
        }
        return {}
      }) as never,
    )

    const result = await retirarPostulacion({ id_participacion: PART_UUID })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('estudiante_not_found')
  })

  it('retorna participacion_not_found si no existe la participación', async () => {
    mockedServer.mockResolvedValue(
      withAuth((table) => {
        if (table === 'estudiantes') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { id_estudiante: EST_ID },
                  error: null,
                }),
              })),
            })),
          }
        }
        if (table === 'participaciones') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'not found' },
              }),
            })),
          }
        }
        return {}
      }) as never,
    )

    const result = await retirarPostulacion({ id_participacion: PART_UUID })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('participacion_not_found')
  })

  it('retorna estado_invalido_retiro si el estado no permite retiro', async () => {
    mockedServer.mockResolvedValue(
      withAuth((table) => {
        if (table === 'estudiantes') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { id_estudiante: EST_ID },
                  error: null,
                }),
              })),
            })),
          }
        }
        if (table === 'participaciones') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: { id_participacion: PART_UUID, estado: 'contratada' },
                error: null,
              }),
            })),
          }
        }
        return {}
      }) as never,
    )

    const result = await retirarPostulacion({ id_participacion: PART_UUID })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('estado_invalido_retiro')
  })

  it('retira la postulación exitosamente', async () => {
    mockedServer.mockResolvedValue(
      withAuth((table) => {
        if (table === 'estudiantes') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { id_estudiante: EST_ID },
                  error: null,
                }),
              })),
            })),
          }
        }
        if (table === 'participaciones') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({
                data: { id_participacion: PART_UUID, estado: 'enviada' },
                error: null,
              }),
            })),
            update: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ error: null }),
            })),
          }
        }
        return {}
      }) as never,
    )

    const result = await retirarPostulacion({ id_participacion: PART_UUID })
    expect(result.ok).toBe(true)
  })
})
