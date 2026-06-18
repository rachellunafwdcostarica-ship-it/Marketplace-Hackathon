import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}))
vi.mock('@/lib/auth/dal', () => ({ getCurrentUser: vi.fn() }))
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

import { getMyPublishedProjects, cancelProject } from './dashboard'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/dal'

const mockedServer = vi.mocked(createSupabaseServerClient)
const mockedGetCurrentUser = vi.mocked(getCurrentUser)

const USER_ID = 'usr-emp-1'
const EMP_ID = 'emp-1'
const PROJ_ID = 'proj-1'

const mockRawProject = {
  id_proyecto: PROJ_ID,
  titulo: 'App de ventas',
  descripcion: 'Sistema de ventas online',
  estado: 'abierto' as const,
  modalidad: 'remoto' as const,
  moneda: 'USD' as const,
  presupuesto_min: 500,
  presupuesto_max: 1500,
  pais_proyecto: 'Costa Rica',
  ciudad_proyecto: null,
  fecha_publicacion: '2024-06-01T00:00:00Z',
  fecha_cierre: null,
  involucra_ia: false,
  areas_negocio: { nombre: 'Tecnología' },
  proyecto_categorias: [
    { categorias: { nombre: 'Web' } },
    { categorias: null },
  ],
  proyecto_tecnologias: [{ tecnologias: { nombre: 'React' } }],
}

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
  mockedGetCurrentUser.mockResolvedValue({ id: USER_ID } as never)
})

// ─────────────────────────────────────────────────────────────────────────────
// getMyPublishedProjects
// ─────────────────────────────────────────────────────────────────────────────

describe('getMyPublishedProjects', () => {
  it('retorna unauthorized si no hay usuario', async () => {
    mockedGetCurrentUser.mockResolvedValue(null)
    const result = await getMyPublishedProjects()
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('unauthorized')
  })

  it('retorna empresario_no_encontrado si no existe el empresario', async () => {
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

    const result = await getMyPublishedProjects()
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('empresario_no_encontrado')
  })

  it('retorna unexpected si hay error al leer empresario', async () => {
    mockedServer.mockResolvedValue(
      withAuth((table) => {
        if (table === 'empresarios') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'db error' },
                }),
              })),
            })),
          }
        }
        return {}
      }) as never,
    )

    const result = await getMyPublishedProjects()
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('unexpected')
  })

  it('retorna lista vacía si el empresario no tiene proyectos', async () => {
    mockedServer.mockResolvedValue(
      withAuth((table) => {
        if (table === 'empresarios') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id_empresario: EMP_ID },
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
                order: vi.fn().mockResolvedValue({ data: [], error: null }),
              })),
            })),
          }
        }
        return {}
      }) as never,
    )

    const result = await getMyPublishedProjects()
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data).toEqual([])
  })

  it('mapea correctamente el proyecto y sus relaciones', async () => {
    mockedServer.mockResolvedValue(
      withAuth((table) => {
        if (table === 'empresarios') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id_empresario: EMP_ID },
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
                order: vi
                  .fn()
                  .mockResolvedValue({ data: [mockRawProject], error: null }),
              })),
            })),
          }
        }
        return {}
      }) as never,
    )

    const result = await getMyPublishedProjects()
    expect(result.ok).toBe(true)
    if (result.ok) {
      const project = result.data[0]
      expect(project).toBeDefined()
      expect(project?.id).toBe(PROJ_ID)
      expect(project?.titulo).toBe('App de ventas')
      expect(project?.estadoEfectivo).toBe('abierto')
      expect(project?.areaNombre).toBe('Tecnología')
      expect(project?.categorias).toEqual(['Web'])
      expect(project?.tecnologias).toEqual(['React'])
    }
  })

  it('calcula estadoEfectivo como en_evaluacion si el plazo venció', async () => {
    const proyectoCerrado = {
      ...mockRawProject,
      estado: 'abierto' as const,
      fecha_cierre: '2020-01-01T00:00:00Z',
    }

    mockedServer.mockResolvedValue(
      withAuth((table) => {
        if (table === 'empresarios') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id_empresario: EMP_ID },
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
                order: vi
                  .fn()
                  .mockResolvedValue({ data: [proyectoCerrado], error: null }),
              })),
            })),
          }
        }
        return {}
      }) as never,
    )

    const result = await getMyPublishedProjects()
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data[0]?.estadoEfectivo).toBe('en_evaluacion')
    }
  })

  it('retorna unexpected si la query de proyectos falla', async () => {
    mockedServer.mockResolvedValue(
      withAuth((table) => {
        if (table === 'empresarios') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id_empresario: EMP_ID },
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
                order: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'db fail' },
                }),
              })),
            })),
          }
        }
        return {}
      }) as never,
    )

    const result = await getMyPublishedProjects()
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('unexpected')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// cancelProject
// ─────────────────────────────────────────────────────────────────────────────

describe('cancelProject', () => {
  it('retorna unauthorized si no hay usuario', async () => {
    mockedServer.mockResolvedValue(withNoAuth() as never)
    const result = await cancelProject(PROJ_ID, 'Sin actividad')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('unauthorized')
  })

  it('retorna empresario_no_encontrado si no existe el empresario', async () => {
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

    const result = await cancelProject(PROJ_ID, 'Sin actividad')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('empresario_no_encontrado')
  })

  it('retorna cancel_failed si el proyecto no es del empresario o ya es terminal', async () => {
    const chainable: Record<string, unknown> = {
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    }
    chainable.eq = vi.fn().mockReturnValue(chainable)
    chainable.neq = vi.fn().mockReturnValue(chainable)
    chainable.select = vi.fn().mockReturnValue(chainable)

    mockedServer.mockResolvedValue(
      withAuth((table) => {
        if (table === 'empresarios') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id_empresario: EMP_ID },
                  error: null,
                }),
              })),
            })),
          }
        }
        if (table === 'proyectos') {
          return {
            update: vi.fn().mockReturnValue(chainable),
          }
        }
        return {}
      }) as never,
    )

    const result = await cancelProject(PROJ_ID, 'Sin actividad')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('cancel_failed')
  })

  it('cancela el proyecto exitosamente', async () => {
    const chainable: Record<string, unknown> = {
      maybeSingle: vi
        .fn()
        .mockResolvedValue({ data: { id_proyecto: PROJ_ID }, error: null }),
    }
    chainable.eq = vi.fn().mockReturnValue(chainable)
    chainable.neq = vi.fn().mockReturnValue(chainable)
    chainable.select = vi.fn().mockReturnValue(chainable)

    mockedServer.mockResolvedValue(
      withAuth((table) => {
        if (table === 'empresarios') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id_empresario: EMP_ID },
                  error: null,
                }),
              })),
            })),
          }
        }
        if (table === 'proyectos') {
          return {
            update: vi.fn().mockReturnValue(chainable),
          }
        }
        return {}
      }) as never,
    )

    const result = await cancelProject(PROJ_ID, 'Sin actividad')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.cancelled).toBe(true)
  })

  it('retorna cancel_failed si el update de DB falla', async () => {
    const chainable: Record<string, unknown> = {
      maybeSingle: vi
        .fn()
        .mockResolvedValue({ data: null, error: { message: 'db error' } }),
    }
    chainable.eq = vi.fn().mockReturnValue(chainable)
    chainable.neq = vi.fn().mockReturnValue(chainable)
    chainable.select = vi.fn().mockReturnValue(chainable)

    mockedServer.mockResolvedValue(
      withAuth((table) => {
        if (table === 'empresarios') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id_empresario: EMP_ID },
                  error: null,
                }),
              })),
            })),
          }
        }
        if (table === 'proyectos') {
          return {
            update: vi.fn().mockReturnValue(chainable),
          }
        }
        return {}
      }) as never,
    )

    const result = await cancelProject(PROJ_ID, '')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('cancel_failed')
  })
})
