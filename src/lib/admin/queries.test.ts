import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))
vi.mock('@/lib/auth/guards', () => ({ requireRole: vi.fn() }))
vi.mock('@/lib/supabase/admin', () => ({ createSupabaseAdminClient: vi.fn() }))

import { listGraduateVerifications, listCompanyVerifications } from './queries'
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
