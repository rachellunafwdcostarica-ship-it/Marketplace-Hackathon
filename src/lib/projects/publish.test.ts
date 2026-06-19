import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}))
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

import { publishProject } from './publish'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const mockedServer = vi.mocked(createSupabaseServerClient)

const USER_ID = 'usr-empresa-1'
const CONV_ID = 'conv-1'

const validPropuesta = {
  titulo: 'App de gestión de inventario',
  descripcion: 'Sistema de gestión de inventario para pymes',
  involucraIa: false,
  idArea: 'area-tecnologia',
  areaNombre: 'Tecnología',
  categorias: [{ id: 'cat-1', nombre: 'Web' }],
  tecnologias: [{ id: 'tech-1', nombre: 'React' }],
  stackSugerido: ['React', 'Node'],
}

const validLogistica = {
  titulo: 'App de gestión de inventario',
  modalidad: 'remoto',
  presupuestoMin: 500,
  presupuestoMax: 1500,
  plazoDias: 10,
  moneda: 'USD',
  paisProyecto: 'Costa Rica',
  ciudadProyecto: null,
}

function withAuth(
  fromImpl: (table: string) => unknown,
  rpcImpl?: () => unknown,
) {
  const client = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: USER_ID } },
        error: null,
      }),
    },
    from: vi.fn(fromImpl),
  }
  if (rpcImpl) {
    return Object.assign(client, { rpc: vi.fn(rpcImpl) })
  }
  return client
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
})

describe('publishProject', () => {
  it('retorna unauthorized si no hay usuario', async () => {
    mockedServer.mockResolvedValue(withNoAuth() as never)
    const result = await publishProject(CONV_ID)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('unauthorized')
  })

  it('retorna empresario_no_encontrado si el empresario no existe', async () => {
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

    const result = await publishProject(CONV_ID)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('empresario_no_encontrado')
  })

  it('retorna not_verified si el empresario no está verificado', async () => {
    mockedServer.mockResolvedValue(
      withAuth((table) => {
        if (table === 'empresarios') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id_empresario: 'emp-1',
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

    const result = await publishProject(CONV_ID)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('not_verified')
  })

  it('retorna save_failed si la conversación no existe o no pertenece al empresario', async () => {
    mockedServer.mockResolvedValue(
      withAuth((table) => {
        if (table === 'empresarios') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id_empresario: 'emp-1',
                    estado_verificacion: 'verificado',
                  },
                  error: null,
                }),
              })),
            })),
          }
        }
        if (table === 'conversaciones_ia') {
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

    const result = await publishProject(CONV_ID)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('save_failed')
  })

  it('retorna no_proposal si la conversación no tiene propuesta generada', async () => {
    mockedServer.mockResolvedValue(
      withAuth((table) => {
        if (table === 'empresarios') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id_empresario: 'emp-1',
                    estado_verificacion: 'verificado',
                  },
                  error: null,
                }),
              })),
            })),
          }
        }
        if (table === 'conversaciones_ia') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: { propuesta_generada: null, logistica: null },
                error: null,
              }),
            })),
          }
        }
        return {}
      }) as never,
    )

    const result = await publishProject(CONV_ID)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('no_proposal')
  })

  it('retorna invalid_input si la logistica tiene plazo fuera de rango', async () => {
    const logisticaConPlazoCero = { ...validLogistica, plazoDias: 0 }

    mockedServer.mockResolvedValue(
      withAuth((table) => {
        if (table === 'empresarios') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id_empresario: 'emp-1',
                    estado_verificacion: 'verificado',
                  },
                  error: null,
                }),
              })),
            })),
          }
        }
        if (table === 'conversaciones_ia') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  propuesta_generada: validPropuesta,
                  logistica: logisticaConPlazoCero,
                },
                error: null,
              }),
            })),
          }
        }
        return {}
      }) as never,
    )

    const result = await publishProject(CONV_ID)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('plazo')
  })

  it('retorna error mapeado si el RPC falla', async () => {
    mockedServer.mockResolvedValue(
      withAuth(
        (table) => {
          if (table === 'empresarios') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: {
                      id_empresario: 'emp-1',
                      estado_verificacion: 'verificado',
                    },
                    error: null,
                  }),
                })),
              })),
            }
          }
          if (table === 'conversaciones_ia') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn().mockReturnThis(),
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    propuesta_generada: validPropuesta,
                    logistica: validLogistica,
                  },
                  error: null,
                }),
              })),
            }
          }
          return {}
        },
        () =>
          Promise.resolve({
            data: null,
            error: { message: 'EMPRESARIO_NO_ENCONTRADO' },
          }),
      ) as never,
    )

    const result = await publishProject(CONV_ID)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('empresario_no_encontrado')
  })

  it('publica el proyecto exitosamente', async () => {
    mockedServer.mockResolvedValue(
      withAuth(
        (table) => {
          if (table === 'empresarios') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: {
                      id_empresario: 'emp-1',
                      estado_verificacion: 'verificado',
                    },
                    error: null,
                  }),
                })),
              })),
            }
          }
          if (table === 'conversaciones_ia') {
            return {
              select: vi.fn(() => ({
                eq: vi.fn().mockReturnThis(),
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    propuesta_generada: validPropuesta,
                    logistica: validLogistica,
                  },
                  error: null,
                }),
              })),
            }
          }
          return {}
        },
        () => Promise.resolve({ data: 'proj-nuevo-1', error: null }),
      ) as never,
    )

    const result = await publishProject(CONV_ID)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.projectId).toBe('proj-nuevo-1')
    }
  })

  it('retorna presupuestoEntero si CRC tiene valores decimales', async () => {
    const logisticaCrcDecimal = {
      ...validLogistica,
      moneda: 'CRC',
      presupuestoMin: 100.5,
      presupuestoMax: 200.5,
    }

    mockedServer.mockResolvedValue(
      withAuth((table) => {
        if (table === 'empresarios') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id_empresario: 'emp-1',
                    estado_verificacion: 'verificado',
                  },
                  error: null,
                }),
              })),
            })),
          }
        }
        if (table === 'conversaciones_ia') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  propuesta_generada: validPropuesta,
                  logistica: logisticaCrcDecimal,
                },
                error: null,
              }),
            })),
          }
        }
        return {}
      }) as never,
    )

    const result = await publishProject(CONV_ID)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('presupuestoEntero')
  })
})
