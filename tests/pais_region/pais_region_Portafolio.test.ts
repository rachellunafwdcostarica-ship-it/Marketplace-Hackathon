import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import { saveStudentProfile } from '../../src/lib/portfolio/actions'
import { createSupabaseServerClient } from '../../src/lib/supabase/server'

// Mock de Supabase
vi.mock('../../src/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}))

describe('saveStudentProfile - Pais y Región', () => {
  let mockUpsert: Mock
  let mockFrom: Mock
  let mockGetUser: Mock

  beforeEach(() => {
    vi.clearAllMocks()

    mockUpsert = vi.fn().mockResolvedValue({ error: null })
    mockFrom = vi.fn().mockReturnValue({ upsert: mockUpsert })
    mockGetUser = vi.fn().mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    })
    ;(createSupabaseServerClient as Mock).mockResolvedValue({
      auth: { getUser: mockGetUser },
      from: mockFrom,
    })
  })

  it('debe enviar pais_iso_residencia y region_residencia cuando se proveen', async () => {
    const profile = {
      paisIsoResidencia: 'CR',
      regionResidencia: 'San José',
    }

    const result = await saveStudentProfile(profile)

    expect(result.ok).toBe(true)
    expect(mockFrom).toHaveBeenCalledWith('estudiantes')
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id_usuario: 'user-123',
        pais_iso_residencia: 'CR',
        region_residencia: 'San José',
      }),
      { onConflict: 'id_usuario' },
    )
  })

  it('no debe sobreescribir pais_iso_residencia ni region_residencia con nulos si no se envian', async () => {
    const profile = {
      descripcion: 'Nueva bio',
    }

    const result = await saveStudentProfile(profile)

    expect(result.ok).toBe(true)
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.not.objectContaining({
        pais_iso_residencia: expect.anything(),
        region_residencia: expect.anything(),
      }),
      { onConflict: 'id_usuario' },
    )

    // Validar que solo envía lo que está definido
    expect(mockUpsert).toHaveBeenCalledWith(
      {
        id_usuario: 'user-123',
        descripcion: 'Nueva bio',
      },
      { onConflict: 'id_usuario' },
    )
  })
})
