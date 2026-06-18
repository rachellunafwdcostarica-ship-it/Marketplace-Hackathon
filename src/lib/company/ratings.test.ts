import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}))
vi.mock('@/lib/auth/guards', () => ({ requireRole: vi.fn() }))
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), info: vi.fn() } }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import {
  getCompanyRatingForContract,
  getCompanyRatingForStudent,
  getAllCompanyRatingsForAdmin,
} from './ratings'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/guards'

const mockedServer = vi.mocked(createSupabaseServerClient)
const mockedRequireRole = vi.mocked(requireRole)

beforeEach(() => {
  vi.clearAllMocks()
  mockedRequireRole.mockResolvedValue({ ok: true, data: 'administrador' })
})

// ─────────────────────────────────────────────────────────────────────────────
// getCompanyRatingForContract
// ─────────────────────────────────────────────────────────────────────────────

describe('getCompanyRatingForContract', () => {
  it('devuelve la calificación del contrato', async () => {
    mockedServer.mockResolvedValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { puntuacion: 4, comentario: 'Excelente empresa' },
              error: null,
            }),
          })),
        })),
      })),
    } as never)

    const result = await getCompanyRatingForContract('contract-uuid')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data).toMatchObject({
        puntuacion: 4,
        comentario: 'Excelente empresa',
      })
    }
  })

  it('devuelve null si no hay calificación para ese contrato', async () => {
    mockedServer.mockResolvedValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          })),
        })),
      })),
    } as never)

    const result = await getCompanyRatingForContract('contract-uuid')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data).toBeNull()
  })

  it('devuelve error si la query falla', async () => {
    mockedServer.mockResolvedValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'db error' },
            }),
          })),
        })),
      })),
    } as never)

    const result = await getCompanyRatingForContract('contract-uuid')
    expect(result.ok).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// getCompanyRatingForStudent
// ─────────────────────────────────────────────────────────────────────────────

describe('getCompanyRatingForStudent', () => {
  it('devuelve null si el usuario no está autenticado', async () => {
    mockedServer.mockResolvedValue({
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: null }, error: null }),
      },
      from: vi.fn(),
    } as never)

    const result = await getCompanyRatingForStudent('emp-uuid')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data).toBeNull()
  })

  it('devuelve null si el estudiante no existe', async () => {
    mockedServer.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'usr-1' } },
          error: null,
        }),
      },
      from: vi.fn((table: string) => {
        if (table === 'estudiantes') {
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
      }),
    } as never)

    const result = await getCompanyRatingForStudent('emp-uuid')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data).toBeNull()
  })

  it('devuelve la calificación del estudiante para esa empresa', async () => {
    mockedServer.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'usr-1' } },
          error: null,
        }),
      },
      from: vi.fn((table: string) => {
        if (table === 'estudiantes') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id_estudiante: 'est-1' },
                  error: null,
                }),
              })),
            })),
          }
        }
        if (table === 'evaluaciones_empresarios') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: {
                      puntuacion: 5,
                      comentario: 'Muy buena experiencia',
                    },
                    error: null,
                  }),
                })),
              })),
            })),
          }
        }
        return {}
      }),
    } as never)

    const result = await getCompanyRatingForStudent('emp-uuid')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data?.puntuacion).toBe(5)
  })

  it('devuelve error si la query de evaluaciones falla', async () => {
    mockedServer.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'usr-1' } },
          error: null,
        }),
      },
      from: vi.fn((table: string) => {
        if (table === 'estudiantes') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id_estudiante: 'est-1' },
                  error: null,
                }),
              })),
            })),
          }
        }
        if (table === 'evaluaciones_empresarios') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: null,
                    error: { message: 'db error' },
                  }),
                })),
              })),
            })),
          }
        }
        return {}
      }),
    } as never)

    const result = await getCompanyRatingForStudent('emp-uuid')
    expect(result.ok).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// getAllCompanyRatingsForAdmin
// ─────────────────────────────────────────────────────────────────────────────

describe('getAllCompanyRatingsForAdmin', () => {
  it('propaga el error si el caller no es admin', async () => {
    mockedRequireRole.mockResolvedValue({ ok: false, error: 'forbidden' })
    const result = await getAllCompanyRatingsForAdmin()
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('forbidden')
  })

  it('devuelve lista vacía si no hay evaluaciones', async () => {
    mockedServer.mockResolvedValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        })),
      })),
    } as never)

    const result = await getAllCompanyRatingsForAdmin()
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data).toEqual([])
  })

  it('devuelve lista de calificaciones mapeadas', async () => {
    const mockRow = {
      id_evaluacion: 'eval-1',
      id_contratacion: 'contract-1',
      puntuacion: 4,
      comentario: 'Excelente',
      evaluado_at: '2024-06-01T10:00:00Z',
      estudiantes: {
        usuarios: { nombre: 'Ana', apellido_1: 'García', apellido_2: null },
      },
      empresarios: {
        nombre_empresa: 'Tech Corp',
        usuarios: { nombre: 'Carlos', apellido_1: 'López', apellido_2: null },
      },
      contrataciones: {
        participaciones: {
          proyectos: { titulo: 'App móvil' },
        },
      },
    }

    mockedServer.mockResolvedValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          order: vi.fn().mockResolvedValue({ data: [mockRow], error: null }),
        })),
      })),
    } as never)

    const result = await getAllCompanyRatingsForAdmin()
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data).toHaveLength(1)
      expect(result.data[0]).toMatchObject({
        idEvaluacion: 'eval-1',
        proyectoTitulo: 'App móvil',
        nombreEgresado: 'Ana García',
        nombreEmpresa: 'Tech Corp',
        puntuacion: 4,
      })
    }
  })

  it('usa título "Calificación General" si el proyecto no está en el contrato', async () => {
    const mockRow = {
      id_evaluacion: 'eval-2',
      id_contratacion: 'contract-2',
      puntuacion: 3,
      comentario: null,
      evaluado_at: '2024-06-02T10:00:00Z',
      estudiantes: {
        usuarios: { nombre: 'Luis', apellido_1: 'Pérez', apellido_2: null },
      },
      empresarios: {
        nombre_empresa: null,
        usuarios: { nombre: 'Marta', apellido_1: 'Ruíz', apellido_2: null },
      },
      contrataciones: null,
    }

    mockedServer.mockResolvedValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          order: vi.fn().mockResolvedValue({ data: [mockRow], error: null }),
        })),
      })),
    } as never)

    const result = await getAllCompanyRatingsForAdmin()
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data[0]?.proyectoTitulo).toBe('Calificación General')
      expect(result.data[0]?.nombreEmpresa).toBe('Marta Ruíz')
    }
  })

  it('devuelve error si la query falla', async () => {
    mockedServer.mockResolvedValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          order: vi
            .fn()
            .mockResolvedValue({ data: null, error: { message: 'db error' } }),
        })),
      })),
    } as never)

    const result = await getAllCompanyRatingsForAdmin()
    expect(result.ok).toBe(false)
  })
})
