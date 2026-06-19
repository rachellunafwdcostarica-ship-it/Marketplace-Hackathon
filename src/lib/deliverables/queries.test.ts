import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}))
vi.mock('@/lib/auth/guards', () => ({ requireRole: vi.fn() }))
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

import { getMiContratacion, getEntregablesDeProyecto } from './queries'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/guards'

const mockedServer = vi.mocked(createSupabaseServerClient)
const mockedRequireRole = vi.mocked(requireRole)

const USER_ID = 'usr-egresado-1'
const EST_ID = 'est-1'
const PROJ_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'

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

beforeEach(() => {
  vi.clearAllMocks()
  mockedRequireRole.mockResolvedValue({ ok: true, data: 'egresado' })
})

// ─────────────────────────────────────────────────────────────────────────────
// getMiContratacion
// ─────────────────────────────────────────────────────────────────────────────

describe('getMiContratacion', () => {
  it('propaga error si el rol no es egresado', async () => {
    mockedRequireRole.mockResolvedValue({ ok: false, error: 'forbidden' })
    const result = await getMiContratacion(PROJ_ID)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('forbidden')
  })

  it('retorna unauthenticated si no hay usuario', async () => {
    mockedServer.mockResolvedValue(withNoAuth() as never)
    const result = await getMiContratacion(PROJ_ID)
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

    const result = await getMiContratacion(PROJ_ID)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('estudiante_not_found')
  })

  it('retorna null si no hay participación activa', async () => {
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
              in: vi.fn(() => ({
                maybeSingle: vi
                  .fn()
                  .mockResolvedValue({ data: null, error: null }),
              })),
            })),
          }
        }
        return {}
      }) as never,
    )

    const result = await getMiContratacion(PROJ_ID)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data).toBeNull()
  })

  it('retorna los datos de contratación activa', async () => {
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
              in: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id_participacion: 'part-1' },
                  error: null,
                }),
              })),
            })),
          }
        }
        if (table === 'contrataciones') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id_contratacion: 'cont-1',
                    estado_periodo: 'activo',
                    fecha_inicio: '2024-01-01',
                    fecha_fin_estimada: '2024-06-01',
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

    const result = await getMiContratacion(PROJ_ID)
    expect(result.ok).toBe(true)
    if (result.ok && result.data) {
      expect(result.data.id_contratacion).toBe('cont-1')
      expect(result.data.estado_periodo).toBe('activo')
    }
  })

  it('retorna null si existe participación pero no contratación', async () => {
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
              in: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id_participacion: 'part-1' },
                  error: null,
                }),
              })),
            })),
          }
        }
        if (table === 'contrataciones') {
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
        return {}
      }) as never,
    )

    const result = await getMiContratacion(PROJ_ID)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data).toBeNull()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// getEntregablesDeProyecto
// ─────────────────────────────────────────────────────────────────────────────

describe('getEntregablesDeProyecto', () => {
  it('retorna unauthenticated si no hay usuario', async () => {
    mockedServer.mockResolvedValue(withNoAuth() as never)
    const result = await getEntregablesDeProyecto(PROJ_ID)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('unauthenticated')
  })

  it('retorna unauthorized si no existe el empresario', async () => {
    mockedServer.mockResolvedValue(
      withAuth((table) => {
        if (table === 'empresarios') {
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
        return {}
      }) as never,
    )

    const result = await getEntregablesDeProyecto(PROJ_ID)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('unauthorized')
  })

  it('retorna unauthorized si el proyecto no pertenece al empresario', async () => {
    mockedServer.mockResolvedValue(
      withAuth((table) => {
        if (table === 'empresarios') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id_empresario: 'emp-1' },
                  error: null,
                }),
              })),
            })),
          }
        }
        if (table === 'proyectos') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi
                .fn()
                .mockResolvedValue({ data: null, error: null }),
            })),
          }
        }
        return {}
      }) as never,
    )

    const result = await getEntregablesDeProyecto(PROJ_ID)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('unauthorized')
  })

  it('retorna [] si no hay participación activa', async () => {
    mockedServer.mockResolvedValue(
      withAuth((table) => {
        if (table === 'empresarios') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id_empresario: 'emp-1' },
                  error: null,
                }),
              })),
            })),
          }
        }
        if (table === 'proyectos') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id_proyecto: PROJ_ID },
                error: null,
              }),
            })),
          }
        }
        if (table === 'participaciones') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi
                .fn()
                .mockResolvedValue({ data: null, error: null }),
            })),
          }
        }
        return {}
      }) as never,
    )

    const result = await getEntregablesDeProyecto(PROJ_ID)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data).toEqual([])
  })

  it('retorna los entregables del contrato', async () => {
    const mockEntregable = {
      id_entregable: 'entr-1',
      tipo_entregable: 'parcial',
      version: 1,
      archivo_url: 'https://storage.test.com/file.pdf',
      estado: 'enviado',
      comentario_empresario: null,
      cargado_at: '2024-06-01T10:00:00Z',
    }

    mockedServer.mockResolvedValue(
      withAuth((table) => {
        if (table === 'empresarios') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id_empresario: 'emp-1' },
                  error: null,
                }),
              })),
            })),
          }
        }
        if (table === 'proyectos') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id_proyecto: PROJ_ID },
                error: null,
              }),
            })),
          }
        }
        if (table === 'participaciones') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id_participacion: 'part-1' },
                error: null,
              }),
            })),
          }
        }
        if (table === 'contrataciones') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id_contratacion: 'cont-1' },
                  error: null,
                }),
              })),
            })),
          }
        }
        if (table === 'entregables') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn().mockResolvedValue({
                  data: [mockEntregable],
                  error: null,
                }),
              })),
            })),
          }
        }
        return {}
      }) as never,
    )

    const result = await getEntregablesDeProyecto(PROJ_ID)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data).toHaveLength(1)
      expect(result.data[0]).toMatchObject({
        id_entregable: 'entr-1',
        tipo_entregable: 'parcial',
        estado: 'enviado',
      })
    }
  })
})
