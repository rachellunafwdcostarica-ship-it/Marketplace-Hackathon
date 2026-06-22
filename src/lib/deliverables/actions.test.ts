import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}))
vi.mock('@/lib/auth/guards', () => ({ requireRole: vi.fn() }))
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { subirHito, subirEntregableFinal, responderEntregable } from './actions'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/guards'

const mockedServer = vi.mocked(createSupabaseServerClient)
const mockedRequireRole = vi.mocked(requireRole)

const CONT_UUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
const ENTR_UUID = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
const PROJ_UUID = 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
const PART_UUID = 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
const STUD_UUID = 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
const USER_ID = 'usr-1'

const validSubirInput = {
  idContratacion: CONT_UUID,
  archivoPath: 'uploads/entregable.pdf',
  idProyecto: PROJ_UUID,
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
  mockedRequireRole.mockResolvedValue({ ok: true, data: 'egresado' })
})

// ─────────────────────────────────────────────────────────────────────────────
// subirHito
// ─────────────────────────────────────────────────────────────────────────────

describe('subirHito', () => {
  it('retorna invalid_input si el UUID de contratación es inválido', async () => {
    const result = await subirHito({
      ...validSubirInput,
      idContratacion: 'no-uuid',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('invalid_input')
  })

  it('propaga error si el rol no es egresado', async () => {
    mockedRequireRole.mockResolvedValue({ ok: false, error: 'forbidden' })
    const result = await subirHito(validSubirInput)
    expect(result.ok).toBe(false)
  })

  it('registra el hito parcial exitosamente', async () => {
    mockedServer.mockResolvedValue(
      withAuth((table) => {
        if (table === 'entregables') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() => ({
                  limit: vi.fn(() => ({
                    maybeSingle: vi
                      .fn()
                      .mockResolvedValue({ data: null, error: null }),
                  })),
                })),
              })),
            })),
            insert: vi.fn().mockResolvedValue({ error: null }),
          }
        }
        return {}
      }) as never,
    )

    const result = await subirHito(validSubirInput)
    expect(result.ok).toBe(true)
  })

  it('usa version incrementada si ya existe un hito previo', async () => {
    mockedServer.mockResolvedValue(
      withAuth((table) => {
        if (table === 'entregables') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() => ({
                  limit: vi.fn(() => ({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: { version: 2 },
                      error: null,
                    }),
                  })),
                })),
              })),
            })),
            insert: vi.fn().mockResolvedValue({ error: null }),
          }
        }
        return {}
      }) as never,
    )

    const result = await subirHito(validSubirInput)
    expect(result.ok).toBe(true)
  })

  it('retorna database_error si el insert falla', async () => {
    mockedServer.mockResolvedValue(
      withAuth((table) => {
        if (table === 'entregables') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() => ({
                  limit: vi.fn(() => ({
                    maybeSingle: vi
                      .fn()
                      .mockResolvedValue({ data: null, error: null }),
                  })),
                })),
              })),
            })),
            insert: vi
              .fn()
              .mockResolvedValue({ error: { message: 'insert failed' } }),
          }
        }
        return {}
      }) as never,
    )

    const result = await subirHito(validSubirInput)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('database_error')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// subirEntregableFinal
// ─────────────────────────────────────────────────────────────────────────────

describe('subirEntregableFinal', () => {
  it('retorna invalid_input si el archivoPath está vacío', async () => {
    const result = await subirEntregableFinal({
      ...validSubirInput,
      archivoPath: '',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('invalid_input')
  })

  it('registra el entregable final exitosamente', async () => {
    mockedServer.mockResolvedValue(
      withAuth((table) => {
        if (table === 'entregables') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() => ({
                  limit: vi.fn(() => ({
                    maybeSingle: vi
                      .fn()
                      .mockResolvedValue({ data: null, error: null }),
                  })),
                })),
              })),
            })),
            insert: vi.fn().mockResolvedValue({ error: null }),
          }
        }
        return {}
      }) as never,
    )

    const result = await subirEntregableFinal(validSubirInput)
    expect(result.ok).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// responderEntregable
// ─────────────────────────────────────────────────────────────────────────────

describe('responderEntregable', () => {
  const validInput = {
    idEntregable: ENTR_UUID,
    decision: 'aprobado' as const,
    comentario: 'Excelente trabajo.',
  }

  it('retorna invalid_input si la decisión no es válida', async () => {
    const result = await responderEntregable({
      idEntregable: ENTR_UUID,
      decision: 'rechazado' as never,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('invalid_input')
  })

  it('retorna unauthenticated si no hay usuario', async () => {
    mockedServer.mockResolvedValue(withNoAuth() as never)
    const result = await responderEntregable(validInput)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('unauthenticated')
  })

  it('retorna entregable_not_found si el entregable no existe', async () => {
    mockedServer.mockResolvedValue(
      withAuth((table) => {
        if (table === 'entregables') {
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

    const result = await responderEntregable(validInput)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('entregable_not_found')
  })

  it('retorna estado_invalido si el entregable no está en estado enviado', async () => {
    mockedServer.mockResolvedValue(
      withAuth((table) => {
        if (table === 'entregables') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id_entregable: ENTR_UUID,
                    estado: 'aprobado',
                    id_contratacion: CONT_UUID,
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

    const result = await responderEntregable(validInput)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('estado_invalido')
  })

  it('aprueba el entregable exitosamente', async () => {
    mockedServer.mockResolvedValue(
      withAuth((table) => {
        if (table === 'entregables') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id_entregable: ENTR_UUID,
                    estado: 'enviado',
                    id_contratacion: CONT_UUID,
                  },
                  error: null,
                }),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ error: null }),
            })),
          }
        }
        if (table === 'contrataciones') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id_participacion: PART_UUID },
                  error: null,
                }),
              })),
            })),
          }
        }
        if (table === 'participaciones') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id_proyecto: PROJ_UUID, id_estudiante: STUD_UUID },
                  error: null,
                }),
              })),
            })),
          }
        }
        if (table === 'estudiantes') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id_usuario: USER_ID },
                  error: null,
                }),
              })),
            })),
          }
        }
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
                data: { id_proyecto: PROJ_UUID, titulo: 'Proyecto Test' },
                error: null,
              }),
            })),
          }
        }
        if (table === 'comentarios_entregables') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
          }
        }
        return {}
      }) as never,
    )

    const result = await responderEntregable(validInput)
    expect(result.ok).toBe(true)
  })
})
