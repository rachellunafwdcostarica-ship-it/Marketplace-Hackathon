import { describe, it, expect, vi, beforeEach } from 'vitest'
import { rateCompany } from '@/lib/company/ratings'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/guards'
import { ok, err } from '@/lib/result'
import type { UserRole } from '@/types'

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}))

vi.mock('@/lib/auth/guards', () => ({
  requireRole: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
  },
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

describe('Company Ratings Server Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debería retornar error de validación (invalid_input) si los parámetros son inválidos', async () => {
    const res = await rateCompany({
      idEmpresario: 'no-es-uuid',
      idContratacion: 'no-es-uuid',
      puntuacion: 99,
      comentario: 'x',
    })
    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.error).toBe('invalid_input')
    }
  })

  it('debería retornar error de rol (forbidden) si el rol no es egresado', async () => {
    vi.mocked(requireRole).mockResolvedValue(err('forbidden'))

    const res = await rateCompany({
      idEmpresario: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      idContratacion: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      puntuacion: 4,
    })
    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.error).toBe('forbidden')
    }
  })

  it('debería retornar error de autenticación si no se detecta usuario', async () => {
    vi.mocked(requireRole).mockResolvedValue(ok('egresado' as UserRole))
    const mockSupabase = {
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: null }, error: null }),
      },
    }
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      mockSupabase as unknown as Awaited<
        ReturnType<typeof createSupabaseServerClient>
      >,
    )

    const res = await rateCompany({
      idEmpresario: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      idContratacion: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      puntuacion: 5,
    })
    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.error).toBe('unauthenticated')
    }
  })

  it('debería retornar error si el contrato no se encuentra en la base de datos', async () => {
    vi.mocked(requireRole).mockResolvedValue(ok('egresado' as UserRole))
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'usr-123' } },
          error: null,
        }),
      },
      from: vi.fn().mockImplementation((table) => {
        if (table === 'estudiantes') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id_estudiante: 'est-456' },
              error: null,
            }),
          }
        }
        if (table === 'contrataciones') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }
        }
        return {}
      }),
    }
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      mockSupabase as unknown as Awaited<
        ReturnType<typeof createSupabaseServerClient>
      >,
    )

    const res = await rateCompany({
      idEmpresario: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      idContratacion: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      puntuacion: 5,
    })
    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.error).toBe('contratacion_not_found')
    }
  })

  it('debería retornar error de autorización si el egresado no pertenece a la contratación', async () => {
    vi.mocked(requireRole).mockResolvedValue(ok('egresado' as UserRole))
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'usr-123' } },
          error: null,
        }),
      },
      from: vi.fn().mockImplementation((table) => {
        if (table === 'estudiantes') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id_estudiante: 'est-456' },
              error: null,
            }),
          }
        }
        if (table === 'contrataciones') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id_contratacion: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
                estado_periodo: 'finalizado',
                participaciones: {
                  id_estudiante: 'otro-estudiante-id',
                  id_proyecto: 'pro-1',
                  proyectos: {
                    id_empresario: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
                    id_proyecto: 'pro-1',
                  },
                },
              },
              error: null,
            }),
          }
        }
        return {}
      }),
    }
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      mockSupabase as unknown as Awaited<
        ReturnType<typeof createSupabaseServerClient>
      >,
    )

    const res = await rateCompany({
      idEmpresario: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      idContratacion: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      puntuacion: 5,
    })
    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.error).toBe('forbidden')
    }
  })

  it('debería retornar error si el contrato no está en estado finalizado', async () => {
    vi.mocked(requireRole).mockResolvedValue(ok('egresado' as UserRole))
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'usr-123' } },
          error: null,
        }),
      },
      from: vi.fn().mockImplementation((table) => {
        if (table === 'estudiantes') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id_estudiante: 'est-456' },
              error: null,
            }),
          }
        }
        if (table === 'contrataciones') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id_contratacion: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
                estado_periodo: 'pausado',
                participaciones: {
                  id_estudiante: 'est-456',
                  id_proyecto: 'pro-1',
                  proyectos: {
                    id_empresario: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
                    id_proyecto: 'pro-1',
                  },
                },
              },
              error: null,
            }),
          }
        }
        return {}
      }),
    }
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      mockSupabase as unknown as Awaited<
        ReturnType<typeof createSupabaseServerClient>
      >,
    )

    const res = await rateCompany({
      idEmpresario: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      idContratacion: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      puntuacion: 5,
    })
    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.error).toBe('contratacion_no_finalizada')
    }
  })

  it('debería registrar exitosamente la calificación de la empresa en estado finalizado', async () => {
    vi.mocked(requireRole).mockResolvedValue(ok('egresado' as UserRole))
    const mockInsert = vi.fn().mockResolvedValue({ error: null })
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'usr-123' } },
          error: null,
        }),
      },
      from: vi.fn().mockImplementation((table) => {
        if (table === 'estudiantes') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id_estudiante: 'est-456' },
              error: null,
            }),
          }
        }
        if (table === 'contrataciones') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id_contratacion: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
                estado_periodo: 'finalizado',
                participaciones: {
                  id_estudiante: 'est-456',
                  id_proyecto: 'pro-1',
                  proyectos: {
                    id_empresario: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
                    id_proyecto: 'pro-1',
                  },
                },
              },
              error: null,
            }),
          }
        }
        if (table === 'evaluaciones_empresarios') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            insert: mockInsert,
          }
        }
        return {}
      }),
    }
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      mockSupabase as unknown as Awaited<
        ReturnType<typeof createSupabaseServerClient>
      >,
    )

    const res = await rateCompany({
      idEmpresario: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      idContratacion: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      puntuacion: 5,
      comentario: 'Excelente mentoría',
    })

    expect(res.ok).toBe(true)
    expect(mockInsert).toHaveBeenCalledWith({
      id_contratacion: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      id_estudiante: 'est-456',
      id_empresario: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      puntuacion: 5,
      comentario: 'Excelente mentoría',
    })
  })

  it('debería rechazar la calificación de la empresa en estado vigente (solo finalizado)', async () => {
    vi.mocked(requireRole).mockResolvedValue(ok('egresado' as UserRole))
    const mockInsert = vi.fn().mockResolvedValue({ error: null })
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'usr-123' } },
          error: null,
        }),
      },
      from: vi.fn().mockImplementation((table) => {
        if (table === 'estudiantes') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id_estudiante: 'est-456' },
              error: null,
            }),
          }
        }
        if (table === 'contrataciones') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id_contratacion: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
                estado_periodo: 'vigente',
                participaciones: {
                  id_estudiante: 'est-456',
                  id_proyecto: 'pro-1',
                  proyectos: {
                    id_empresario: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
                    id_proyecto: 'pro-1',
                  },
                },
              },
              error: null,
            }),
          }
        }
        if (table === 'evaluaciones_empresarios') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            insert: mockInsert,
          }
        }
        return {}
      }),
    }
    vi.mocked(createSupabaseServerClient).mockResolvedValue(
      mockSupabase as unknown as Awaited<
        ReturnType<typeof createSupabaseServerClient>
      >,
    )

    const res = await rateCompany({
      idEmpresario: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      idContratacion: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      puntuacion: 4,
      comentario: 'Buena comunicación inicial',
    })

    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.error).toBe('contratacion_no_finalizada')
    }
    expect(mockInsert).not.toHaveBeenCalled()
  })
})
