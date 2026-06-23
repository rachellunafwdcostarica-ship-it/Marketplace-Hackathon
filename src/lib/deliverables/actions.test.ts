import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}))
vi.mock('@/lib/auth/guards', () => ({
  requireVerifiedEgresado: vi.fn(),
  requireVerifiedEmpresario: vi.fn(),
}))
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { subirHito, subirEntregableFinal, responderEntregable } from './actions'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import {
  requireVerifiedEgresado,
  requireVerifiedEmpresario,
} from '@/lib/auth/guards'

const mockedServer = vi.mocked(createSupabaseServerClient)
const mockedVerifiedEgresado = vi.mocked(requireVerifiedEgresado)
const mockedVerifiedEmpresario = vi.mocked(requireVerifiedEmpresario)

const CONT_UUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
const ENTR_UUID = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
const PROJ_UUID = 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
const PART_UUID = 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
const STUD_UUID = 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
const USER_ID = 'usr-1'

function makeFile(name = 'entregable.pdf') {
  return new File(['contenido del entregable'], name, {
    type: 'application/pdf',
  })
}

// El upload ahora viaja por FormData a la server action; armamos un FormData
// válido por defecto y dejamos sobreescribir cada campo (o quitar el archivo).
function makeSubirFormData(overrides?: {
  idContratacion?: string
  idProyecto?: string
  file?: File | null
}): FormData {
  const formData = new FormData()
  const file = overrides && 'file' in overrides ? overrides.file : makeFile()
  if (file) formData.append('file', file)
  formData.append('idContratacion', overrides?.idContratacion ?? CONT_UUID)
  formData.append('idProyecto', overrides?.idProyecto ?? PROJ_UUID)
  return formData
}

// Mock del Storage: por defecto upload/remove resuelven sin error; se le puede
// inyectar un error de upload para probar el path `storage_error`.
function makeStorage(uploadError: unknown = null) {
  return {
    from: vi.fn(() => ({
      upload: vi.fn().mockResolvedValue({ error: uploadError }),
      remove: vi.fn().mockResolvedValue({ error: null }),
    })),
  }
}

function withAuth(
  fromImpl: (table: string) => unknown,
  storage: unknown = makeStorage(),
) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: USER_ID } },
        error: null,
      }),
    },
    from: vi.fn(fromImpl),
    storage,
  }
}

type MockChain = {
  eq: () => MockChain
  order: () => MockChain
  limit: () => MockChain
  maybeSingle: () => Promise<{ data: unknown; error: null }>
}

// Mock de la tabla `entregables`. registrarEntregable hace DOS consultas:
//   - dedup:   select('id_entregable').eq().eq().limit().maybeSingle() -> { data: dup }
//   - version: select('version').eq().order().limit().maybeSingle()    -> { data: maxVersion }
// y luego insert() -> { error: insertError }.
function makeEntregablesTable({
  dup = null,
  maxVersion = null,
  insertError = null,
}: {
  dup?: unknown
  maxVersion?: unknown
  insertError?: unknown
} = {}): unknown {
  const dedupChain: MockChain = {
    eq: () => dedupChain,
    order: () => dedupChain,
    limit: () => dedupChain,
    maybeSingle: () => Promise.resolve({ data: dup, error: null }),
  }
  const versionChain: MockChain = {
    eq: () => versionChain,
    order: () => versionChain,
    limit: () => versionChain,
    maybeSingle: () => Promise.resolve({ data: maxVersion, error: null }),
  }
  return {
    select: (cols: string) =>
      String(cols).includes('version') ? versionChain : dedupChain,
    insert: vi.fn().mockResolvedValue({ error: insertError }),
  }
}

// fromImpl: la tabla `entregables` con el mock de arriba; el resto vacío.
function entregablesFrom(
  opts?: Parameters<typeof makeEntregablesTable>[0],
): (table: string) => unknown {
  return (table) => (table === 'entregables' ? makeEntregablesTable(opts) : {})
}

beforeEach(() => {
  vi.clearAllMocks()
  mockedVerifiedEgresado.mockResolvedValue({
    ok: true,
    data: { id_estudiante: STUD_UUID, id_usuario: USER_ID },
  })
  mockedVerifiedEmpresario.mockResolvedValue({
    ok: true,
    data: { id_empresario: 'emp-1', id_usuario: USER_ID },
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// subirHito
// ─────────────────────────────────────────────────────────────────────────────

describe('subirHito', () => {
  it('retorna invalid_input si el UUID de contratación es inválido', async () => {
    const result = await subirHito(
      makeSubirFormData({ idContratacion: 'no-uuid' }),
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('invalid_input')
  })

  it('retorna invalid_input si falta el archivo', async () => {
    const result = await subirHito(makeSubirFormData({ file: null }))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('invalid_input')
  })

  it('propaga el error del guard si el egresado no está verificado', async () => {
    mockedVerifiedEgresado.mockResolvedValue({
      ok: false,
      error: 'cuenta_no_verificada',
    })
    const result = await subirHito(makeSubirFormData())
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('cuenta_no_verificada')
  })

  it('retorna storage_error si falla el upload al storage', async () => {
    mockedServer.mockResolvedValue(
      withAuth(entregablesFrom(), makeStorage({ message: 'boom' })) as never,
    )

    const result = await subirHito(makeSubirFormData())
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('storage_error')
  })

  it('registra el hito parcial exitosamente', async () => {
    mockedServer.mockResolvedValue(withAuth(entregablesFrom()) as never)

    const result = await subirHito(makeSubirFormData())
    expect(result.ok).toBe(true)
  })

  it('usa version incrementada si ya existe un hito previo', async () => {
    mockedServer.mockResolvedValue(
      withAuth(entregablesFrom({ maxVersion: { version: 2 } })) as never,
    )

    const result = await subirHito(makeSubirFormData())
    expect(result.ok).toBe(true)
  })

  it('retorna database_error si el insert falla', async () => {
    mockedServer.mockResolvedValue(
      withAuth(
        entregablesFrom({ insertError: { message: 'insert failed' } }),
      ) as never,
    )

    const result = await subirHito(makeSubirFormData())
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('database_error')
  })

  it('retorna archivo_duplicado si el contenido ya existe en la contratación', async () => {
    mockedServer.mockResolvedValue(
      withAuth(entregablesFrom({ dup: { id_entregable: ENTR_UUID } })) as never,
    )

    const result = await subirHito(makeSubirFormData())
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('archivo_duplicado')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// subirEntregableFinal
// ─────────────────────────────────────────────────────────────────────────────

describe('subirEntregableFinal', () => {
  it('retorna invalid_input si falta el archivo', async () => {
    const result = await subirEntregableFinal(makeSubirFormData({ file: null }))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('invalid_input')
  })

  it('registra el entregable final exitosamente', async () => {
    mockedServer.mockResolvedValue(withAuth(entregablesFrom()) as never)

    const result = await subirEntregableFinal(makeSubirFormData())
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

  it('propaga el error del guard si el empresario no está verificado', async () => {
    mockedVerifiedEmpresario.mockResolvedValue({
      ok: false,
      error: 'not_verified',
    })
    const result = await responderEntregable(validInput)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('not_verified')
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

  it('retorna estado_invalido si el entregable está aprobado', async () => {
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

  it('retorna estado_invalido si el entregable está con_cambios', async () => {
    mockedServer.mockResolvedValue(
      withAuth((table) => {
        if (table === 'entregables') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id_entregable: ENTR_UUID,
                    estado: 'con_cambios',
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

  it('aprueba el entregable cuando estado es en_revision (RF-41)', async () => {
    mockedServer.mockResolvedValue(
      withAuth((table) => {
        if (table === 'entregables') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id_entregable: ENTR_UUID,
                    estado: 'en_revision',
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
