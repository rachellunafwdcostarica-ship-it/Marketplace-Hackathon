import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))
vi.mock('@/lib/auth/guards', () => ({ requireRole: vi.fn() }))
vi.mock('@/lib/supabase/admin', () => ({ createSupabaseAdminClient: vi.fn() }))

import {
  listGraduateVerifications,
  listCompanyVerifications,
  listUsers,
  getUserStats,
  listAllProjectsForAdmin,
  listProjectsForAdmin,
  getProjectStats,
  listUsersWithStrikes,
  listStrikeAudit,
  getSystemConfig,
} from './queries'
import { requireRole } from '@/lib/auth/guards'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

const mockedRequireRole = vi.mocked(requireRole)
const mockedAdmin = vi.mocked(createSupabaseAdminClient)

beforeEach(() => {
  vi.clearAllMocks()
  mockedRequireRole.mockResolvedValue({ ok: true, data: 'administrador' })
})

describe('listGraduateVerifications', () => {
  it('propaga el error si el caller no es admin', async () => {
    mockedRequireRole.mockResolvedValue({ ok: false, error: 'forbidden' })

    const result = await listGraduateVerifications('pendiente')

    expect(result).toEqual({ ok: false, error: 'forbidden' })
    expect(mockedAdmin).not.toHaveBeenCalled()
  })

  it('devuelve [] si no hay estudiantes en ese estado', async () => {
    mockedAdmin.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        })),
      })),
    } as never)

    const result = await listGraduateVerifications('verificado')

    expect(result).toEqual({ ok: true, data: [] })
  })

  it('une estudiantes + usuarios con titulo_fwd y estado', async () => {
    mockedAdmin.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'estudiantes') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({
                data: [
                  {
                    id_usuario: 'u1',
                    titulo_fwd: 'frontend',
                    estado_verificacion: 'pendiente',
                  },
                ],
                error: null,
              }),
            })),
          }
        }
        return {
          select: vi.fn(() => ({
            in: vi.fn().mockResolvedValue({
              data: [
                {
                  id_usuario: 'u1',
                  nombre: 'Ana',
                  apellido_1: 'Perez',
                  apellido_2: null,
                  correo: 'ana@x.com',
                  fecha_nacimiento: '1995-01-01',
                },
              ],
              error: null,
            }),
          })),
        }
      }),
    } as never)

    const result = await listGraduateVerifications('pendiente')

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data).toHaveLength(1)
      expect(result.data[0]).toMatchObject({
        id_usuario: 'u1',
        nombre: 'Ana',
        correo: 'ana@x.com',
        titulo_fwd: 'frontend',
        estado_verificacion: 'pendiente',
        fecha_nacimiento: '1995-01-01',
      })
    }
  })
})

// ─── helpers de mock ───────────────────────────────────────────────────────

/** Mock de tabla de roles: id_rol/nombre_rol */
const MOCK_ROLES = [
  { id_rol: 1, nombre_rol: 'egresado' },
  { id_rol: 2, nombre_rol: 'empresario' },
  { id_rol: 3, nombre_rol: 'administrador' },
]

/**
 * Builder encadenable: simula .order().limit().eq().or()... y es awaitable.
 * Devuelve `result` al resolver.
 */
function makeChainable(result: { data: unknown; error: unknown }) {
  const p = Promise.resolve(result)
  const b: Record<string, unknown> = {
    order: () => b,
    limit: () => b,
    eq: () => b,
    or: () => b,
    gte: () => b,
    then: p.then.bind(p),
    catch: p.catch.bind(p),
    finally: p.finally.bind(p),
  }
  return b
}

/**
 * Builder de conteo: awaitable y tiene .eq() que también es awaitable.
 * Ambos resuelven con `{ count, error: null }`.
 */
function makeCountBuilder(count: number, filteredCount = 0) {
  const directP = Promise.resolve({ count, error: null, data: null })
  return Object.assign(directP, {
    eq: vi
      .fn()
      .mockReturnValue(
        Promise.resolve({ count: filteredCount, error: null, data: null }),
      ),
  })
}

// ───────────────────────────────────────────────────────────────────────────

describe('listCompanyVerifications', () => {
  it('propaga el error si el caller no es admin', async () => {
    mockedRequireRole.mockResolvedValue({ ok: false, error: 'forbidden' })

    const result = await listCompanyVerifications('pendiente')

    expect(result).toEqual({ ok: false, error: 'forbidden' })
    expect(mockedAdmin).not.toHaveBeenCalled()
  })

  it('devuelve [] si no hay empresas en ese estado', async () => {
    mockedAdmin.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          })),
        })),
      })),
    } as never)

    const result = await listCompanyVerifications('rechazado')

    expect(result).toEqual({ ok: true, data: [] })
  })

  it('une empresarios + representante con estado_verificacion', async () => {
    mockedAdmin.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'empresarios') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn().mockResolvedValue({
                  data: [
                    {
                      id_empresario: 'm1',
                      id_usuario: 'u1',
                      nombre_empresa: 'Acme',
                      tipo_empresario: 'empresa_formal',
                      sector: 'Tech',
                      descripcion: null,
                      cedula: '3-101-123',
                      alcance_operativo: 'nacional',
                      pais_sede: 'CR',
                      ciudad_sede: 'SJO',
                      logo: null,
                      sitio_web: 'https://acme.com',
                      estado_verificacion: 'pendiente',
                    },
                  ],
                  error: null,
                }),
              })),
            })),
          }
        }
        return {
          select: vi.fn(() => ({
            in: vi.fn().mockResolvedValue({
              data: [
                {
                  id_usuario: 'u1',
                  nombre: 'Bob',
                  apellido_1: 'Gomez',
                  apellido_2: null,
                  correo: 'bob@acme.com',
                  fecha_nacimiento: null,
                },
              ],
              error: null,
            }),
          })),
        }
      }),
    } as never)

    const result = await listCompanyVerifications('pendiente')

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data).toHaveLength(1)
      expect(result.data[0]).toMatchObject({
        id_empresario: 'm1',
        nombre_empresa: 'Acme',
        tipo_empresario: 'empresa_formal',
        cedula: '3-101-123',
        sitio_web: 'https://acme.com',
        estado_verificacion: 'pendiente',
        nombre: 'Bob',
        correo: 'bob@acme.com',
      })
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// listUsers
// ─────────────────────────────────────────────────────────────────────────────

describe('listUsers', () => {
  const mockUser = {
    id_usuario: 'usr-1',
    nombre: 'Ana',
    apellido_1: 'García',
    apellido_2: null,
    correo: 'ana@test.com',
    estado_cuenta: 'activa',
    is_active: true,
    cantidad_strikes: 0,
    fecha_registro: '2024-01-01',
    id_rol: 1,
  }

  it('propaga el error si el caller no es admin', async () => {
    mockedRequireRole.mockResolvedValue({ ok: false, error: 'forbidden' })
    const result = await listUsers()
    expect(result).toEqual({ ok: false, error: 'forbidden' })
  })

  it('devuelve lista de usuarios sin filtros', async () => {
    mockedAdmin.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'roles') {
          return {
            select: vi
              .fn()
              .mockResolvedValue({ data: MOCK_ROLES, error: null }),
          }
        }
        return {
          select: vi
            .fn()
            .mockReturnValue(makeChainable({ data: [mockUser], error: null })),
        }
      }),
    } as never)

    const result = await listUsers()
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data).toHaveLength(1)
      expect(result.data[0]).toMatchObject({
        nombre: 'Ana',
        correo: 'ana@test.com',
      })
    }
  })

  it('filtra por estado de cuenta', async () => {
    mockedAdmin.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'roles') {
          return {
            select: vi
              .fn()
              .mockResolvedValue({ data: MOCK_ROLES, error: null }),
          }
        }
        return {
          select: vi
            .fn()
            .mockReturnValue(makeChainable({ data: [mockUser], error: null })),
        }
      }),
    } as never)

    const result = await listUsers({ status: 'activa' })
    expect(result.ok).toBe(true)
  })

  it('filtra por rol', async () => {
    mockedAdmin.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'roles') {
          return {
            select: vi
              .fn()
              .mockResolvedValue({ data: MOCK_ROLES, error: null }),
          }
        }
        return {
          select: vi
            .fn()
            .mockReturnValue(makeChainable({ data: [mockUser], error: null })),
        }
      }),
    } as never)

    const result = await listUsers({ role: 'egresado' })
    expect(result.ok).toBe(true)
  })

  it('filtra por búsqueda de texto', async () => {
    mockedAdmin.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'roles') {
          return {
            select: vi
              .fn()
              .mockResolvedValue({ data: MOCK_ROLES, error: null }),
          }
        }
        return {
          select: vi
            .fn()
            .mockReturnValue(makeChainable({ data: [mockUser], error: null })),
        }
      }),
    } as never)

    const result = await listUsers({ search: 'Ana' })
    expect(result.ok).toBe(true)
  })

  it('devuelve [] si el rol no existe en la tabla roles', async () => {
    mockedAdmin.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'roles') {
          return {
            select: vi.fn().mockResolvedValue({ data: [], error: null }),
          }
        }
        return {
          select: vi
            .fn()
            .mockReturnValue(makeChainable({ data: [], error: null })),
        }
      }),
    } as never)

    const result = await listUsers({ role: 'egresado' })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data).toEqual([])
  })

  it('devuelve error si la query de roles falla', async () => {
    mockedAdmin.mockReturnValue({
      from: vi.fn(() => ({
        select: vi
          .fn()
          .mockResolvedValue({ data: null, error: { message: 'db error' } }),
      })),
    } as never)

    const result = await listUsers()
    expect(result.ok).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// getUserStats
// ─────────────────────────────────────────────────────────────────────────────

describe('getUserStats', () => {
  it('propaga el error si el caller no es admin', async () => {
    mockedRequireRole.mockResolvedValue({ ok: false, error: 'forbidden' })
    const result = await getUserStats()
    expect(result).toEqual({ ok: false, error: 'forbidden' })
  })

  it('devuelve estadísticas de usuarios', async () => {
    mockedAdmin.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'roles') {
          return {
            select: vi
              .fn()
              .mockResolvedValue({ data: MOCK_ROLES, error: null }),
          }
        }
        // usuarios: builder que se puede await directo y tiene .eq()
        return { select: vi.fn().mockReturnValue(makeCountBuilder(50, 10)) }
      }),
    } as never)

    const result = await getUserStats()
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.total).toBe(50)
      expect(typeof result.data.pendientes).toBe('number')
      expect(typeof result.data.activas).toBe('number')
      expect(typeof result.data.egresados).toBe('number')
    }
  })

  it('devuelve error si la query de roles falla', async () => {
    mockedAdmin.mockReturnValue({
      from: vi.fn(() => ({
        select: vi
          .fn()
          .mockResolvedValue({ data: null, error: { message: 'db error' } }),
      })),
    } as never)

    const result = await getUserStats()
    expect(result.ok).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// listAllProjectsForAdmin
// ─────────────────────────────────────────────────────────────────────────────

describe('listAllProjectsForAdmin', () => {
  const mockProject = {
    id_proyecto: 'proj-1',
    id_empresario: 'emp-1',
    titulo: 'App móvil',
    descripcion: 'Descripción del proyecto',
    estado: 'abierto',
    modalidad: 'remoto',
    moneda: 'USD',
    presupuesto_min: 500,
    presupuesto_max: 1000,
    fecha_publicacion: '2024-01-01',
    fecha_cierre: null,
    empresarios: { nombre_empresa: 'Acme Corp' },
    proyecto_tecnologias: [
      { tecnologias: { nombre: 'TypeScript' } },
      { tecnologias: { nombre: 'React' } },
    ],
  }

  it('propaga el error si el caller no es admin', async () => {
    mockedRequireRole.mockResolvedValue({ ok: false, error: 'forbidden' })
    const result = await listAllProjectsForAdmin()
    expect(result).toEqual({ ok: false, error: 'forbidden' })
  })

  it('devuelve lista de proyectos con tecnologías', async () => {
    mockedAdmin.mockReturnValue({
      from: vi.fn(() => ({
        select: vi
          .fn()
          .mockReturnValue(makeChainable({ data: [mockProject], error: null })),
      })),
    } as never)

    const result = await listAllProjectsForAdmin()
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data).toHaveLength(1)
      expect(result.data[0]).toMatchObject({
        id_proyecto: 'proj-1',
        titulo: 'App móvil',
        nombre_empresa: 'Acme Corp',
        tecnologias: ['TypeScript', 'React'],
      })
    }
  })

  it('devuelve lista vacía si no hay proyectos', async () => {
    mockedAdmin.mockReturnValue({
      from: vi.fn(() => ({
        select: vi
          .fn()
          .mockReturnValue(makeChainable({ data: [], error: null })),
      })),
    } as never)

    const result = await listAllProjectsForAdmin()
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data).toEqual([])
  })

  it('devuelve error si la query falla', async () => {
    mockedAdmin.mockReturnValue({
      from: vi.fn(() => ({
        select: vi
          .fn()
          .mockReturnValue(
            makeChainable({ data: null, error: { message: 'db error' } }),
          ),
      })),
    } as never)

    const result = await listAllProjectsForAdmin()
    expect(result.ok).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// listProjectsForAdmin
// ─────────────────────────────────────────────────────────────────────────────

describe('listProjectsForAdmin', () => {
  const mockProject = {
    id_proyecto: 'proj-2',
    id_empresario: 'emp-2',
    titulo: 'Plataforma web',
    descripcion: 'Descripción',
    estado: 'borrador',
    modalidad: 'hibrido',
    moneda: 'CRC',
    presupuesto_min: null,
    presupuesto_max: null,
    fecha_publicacion: null,
    fecha_cierre: null,
    empresarios: { nombre_empresa: null },
    proyecto_tecnologias: [],
  }

  it('propaga el error si el caller no es admin', async () => {
    mockedRequireRole.mockResolvedValue({ ok: false, error: 'forbidden' })
    const result = await listProjectsForAdmin()
    expect(result).toEqual({ ok: false, error: 'forbidden' })
  })

  it('devuelve proyectos sin filtros', async () => {
    mockedAdmin.mockReturnValue({
      from: vi.fn(() => ({
        select: vi
          .fn()
          .mockReturnValue(makeChainable({ data: [mockProject], error: null })),
      })),
    } as never)

    const result = await listProjectsForAdmin()
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data).toHaveLength(1)
      expect(result.data[0].nombre_empresa).toBeNull()
    }
  })

  it('filtra por estado', async () => {
    mockedAdmin.mockReturnValue({
      from: vi.fn(() => ({
        select: vi
          .fn()
          .mockReturnValue(makeChainable({ data: [mockProject], error: null })),
      })),
    } as never)

    const result = await listProjectsForAdmin({ estado: 'borrador' })
    expect(result.ok).toBe(true)
  })

  it('filtra por modalidad', async () => {
    mockedAdmin.mockReturnValue({
      from: vi.fn(() => ({
        select: vi
          .fn()
          .mockReturnValue(makeChainable({ data: [], error: null })),
      })),
    } as never)

    const result = await listProjectsForAdmin({ modalidad: 'presencial' })
    expect(result.ok).toBe(true)
  })

  it('filtra por búsqueda de texto', async () => {
    mockedAdmin.mockReturnValue({
      from: vi.fn(() => ({
        select: vi
          .fn()
          .mockReturnValue(makeChainable({ data: [mockProject], error: null })),
      })),
    } as never)

    const result = await listProjectsForAdmin({ search: 'Plataforma' })
    expect(result.ok).toBe(true)
  })

  it('devuelve error si la query falla', async () => {
    mockedAdmin.mockReturnValue({
      from: vi.fn(() => ({
        select: vi
          .fn()
          .mockReturnValue(
            makeChainable({ data: null, error: { message: 'fallo db' } }),
          ),
      })),
    } as never)

    const result = await listProjectsForAdmin()
    expect(result.ok).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// getProjectStats
// ─────────────────────────────────────────────────────────────────────────────

describe('getProjectStats', () => {
  it('propaga el error si el caller no es admin', async () => {
    mockedRequireRole.mockResolvedValue({ ok: false, error: 'forbidden' })
    const result = await getProjectStats()
    expect(result).toEqual({ ok: false, error: 'forbidden' })
  })

  it('devuelve estadísticas de proyectos', async () => {
    mockedAdmin.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn().mockReturnValue(makeCountBuilder(20, 5)),
      })),
    } as never)

    const result = await getProjectStats()
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.total).toBe(20)
      expect(typeof result.data.borrador).toBe('number')
      expect(typeof result.data.abierto).toBe('number')
      expect(typeof result.data.finalizado).toBe('number')
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// listUsersWithStrikes
// ─────────────────────────────────────────────────────────────────────────────

describe('listUsersWithStrikes', () => {
  const mockStrikeUser = {
    id_usuario: 'usr-s1',
    nombre: 'Juan',
    apellido_1: 'Pérez',
    apellido_2: null,
    correo: 'juan@test.com',
    estado_cuenta: 'suspendida',
    is_active: false,
    cantidad_strikes: 2,
    fecha_registro: '2024-03-01',
    id_rol: 1,
  }

  it('propaga el error si el caller no es admin', async () => {
    mockedRequireRole.mockResolvedValue({ ok: false, error: 'forbidden' })
    const result = await listUsersWithStrikes()
    expect(result).toEqual({ ok: false, error: 'forbidden' })
  })

  it('devuelve usuarios con strikes', async () => {
    mockedAdmin.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'roles') {
          return {
            select: vi
              .fn()
              .mockResolvedValue({ data: MOCK_ROLES, error: null }),
          }
        }
        return {
          select: vi
            .fn()
            .mockReturnValue(
              makeChainable({ data: [mockStrikeUser], error: null }),
            ),
        }
      }),
    } as never)

    const result = await listUsersWithStrikes()
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data).toHaveLength(1)
      expect(result.data[0]).toMatchObject({
        nombre: 'Juan',
        cantidad_strikes: 2,
        nombre_rol: 'egresado',
      })
    }
  })

  it('devuelve error si la query de roles falla', async () => {
    mockedAdmin.mockReturnValue({
      from: vi.fn(() => ({
        select: vi
          .fn()
          .mockResolvedValue({ data: null, error: { message: 'db error' } }),
      })),
    } as never)

    const result = await listUsersWithStrikes()
    expect(result.ok).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// listStrikeAudit
// ─────────────────────────────────────────────────────────────────────────────

describe('listStrikeAudit', () => {
  const mockStrike = {
    id_strike: 'stk-1',
    id_usuario: 'usr-1',
    motivo: 'spam',
    descripcion: 'Publicación inapropiada',
    revocado: false,
    motivo_revocacion: null,
    aplicado_at: '2024-05-01T10:00:00Z',
    revocado_at: null,
  }

  it('propaga el error si el caller no es admin', async () => {
    mockedRequireRole.mockResolvedValue({ ok: false, error: 'forbidden' })
    const result = await listStrikeAudit()
    expect(result).toEqual({ ok: false, error: 'forbidden' })
  })

  it('devuelve [] si no hay strikes', async () => {
    mockedAdmin.mockReturnValue({
      from: vi.fn(() => ({
        select: vi
          .fn()
          .mockReturnValue(makeChainable({ data: [], error: null })),
      })),
    } as never)

    const result = await listStrikeAudit()
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data).toEqual([])
  })

  it('devuelve strikes con nombre de usuario', async () => {
    mockedAdmin.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'strikes') {
          return {
            select: vi
              .fn()
              .mockReturnValue(
                makeChainable({ data: [mockStrike], error: null }),
              ),
          }
        }
        // usuarios
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({
              data: [
                { id_usuario: 'usr-1', nombre: 'Ana', apellido_1: 'García' },
              ],
              error: null,
            }),
          }),
        }
      }),
    } as never)

    const result = await listStrikeAudit()
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data).toHaveLength(1)
      expect(result.data[0]).toMatchObject({
        id_strike: 'stk-1',
        motivo: 'spam',
        revocado: false,
        nombre_usuario: 'Ana García',
      })
    }
  })

  it('devuelve error si la query de strikes falla', async () => {
    mockedAdmin.mockReturnValue({
      from: vi.fn(() => ({
        select: vi
          .fn()
          .mockReturnValue(
            makeChainable({ data: null, error: { message: 'db error' } }),
          ),
      })),
    } as never)

    const result = await listStrikeAudit()
    expect(result.ok).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// getSystemConfig
// ─────────────────────────────────────────────────────────────────────────────

describe('getSystemConfig', () => {
  const mockConfig = {
    clave: 'max_strikes',
    valor: '3',
    tipo_dato: 'entero',
    descripcion: 'Máximo de strikes antes de suspensión',
    modificado_at: '2024-01-01T00:00:00Z',
  }

  it('propaga el error si el caller no es admin', async () => {
    mockedRequireRole.mockResolvedValue({ ok: false, error: 'forbidden' })
    const result = await getSystemConfig()
    expect(result).toEqual({ ok: false, error: 'forbidden' })
  })

  it('devuelve la configuración del sistema', async () => {
    mockedAdmin.mockReturnValue({
      from: vi.fn(() => ({
        select: vi
          .fn()
          .mockReturnValue(makeChainable({ data: [mockConfig], error: null })),
      })),
    } as never)

    const result = await getSystemConfig()
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data).toHaveLength(1)
      expect(result.data[0]).toMatchObject({
        clave: 'max_strikes',
        valor: '3',
      })
    }
  })

  it('devuelve lista vacía si no hay configuración', async () => {
    mockedAdmin.mockReturnValue({
      from: vi.fn(() => ({
        select: vi
          .fn()
          .mockReturnValue(makeChainable({ data: null, error: null })),
      })),
    } as never)

    const result = await getSystemConfig()
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data).toEqual([])
  })

  it('devuelve error si la query falla', async () => {
    mockedAdmin.mockReturnValue({
      from: vi.fn(() => ({
        select: vi
          .fn()
          .mockReturnValue(
            makeChainable({ data: null, error: { message: 'fallo db' } }),
          ),
      })),
    } as never)

    const result = await getSystemConfig()
    expect(result.ok).toBe(false)
  })
})
