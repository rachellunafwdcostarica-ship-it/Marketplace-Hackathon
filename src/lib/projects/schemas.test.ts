import { describe, it, expect } from 'vitest'
import {
  daysBetween,
  parseMoney,
  projectFormSchema,
  toPublishPayload,
  type ProjectFormValues,
} from './schemas'

function baseValues(
  overrides: Partial<ProjectFormValues> = {},
): ProjectFormValues {
  return {
    titulo: 'Landing page institucional en React',
    descripcion:
      'Necesitamos una landing page responsive con formulario de contacto.',
    idAreaNegocio: '',
    categorias: ['11111111-1111-4111-8111-111111111111'],
    tecnologias: ['22222222-2222-4222-8222-222222222222'],
    modalidad: 'remoto',
    paisProyecto: '',
    ciudadProyecto: '',
    moneda: 'USD',
    presupuestoMin: '',
    presupuestoMax: '',
    fechaPublicacion: '2026-06-13',
    fechaCierre: '2026-06-20',
    contextoInicial: 'Queremos una landing para captar leads de la marca.',
    ...overrides,
  }
}

describe('daysBetween', () => {
  it('cuenta los días entre dos fechas UTC', () => {
    expect(daysBetween('2026-06-13', '2026-06-20')).toBe(7)
  })
  it('devuelve null si falta una fecha', () => {
    expect(daysBetween('', '2026-06-20')).toBeNull()
  })
})

describe('parseMoney', () => {
  it('convierte texto numérico', () => {
    expect(parseMoney(' 500 ')).toBe(500)
  })
  it('trata el vacío como null', () => {
    expect(parseMoney('')).toBeNull()
  })
})

describe('projectFormSchema', () => {
  it('acepta un proyecto remoto válido', () => {
    expect(projectFormSchema.safeParse(baseValues()).success).toBe(true)
  })

  it('rechaza un plazo menor a 5 días', () => {
    const result = projectFormSchema.safeParse(
      baseValues({ fechaPublicacion: '2026-06-13', fechaCierre: '2026-06-16' }),
    )
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message === 'plazo')).toBe(true)
    }
  })

  it('rechaza un plazo mayor a 15 días', () => {
    const result = projectFormSchema.safeParse(
      baseValues({ fechaPublicacion: '2026-06-13', fechaCierre: '2026-07-13' }),
    )
    expect(result.success).toBe(false)
  })

  it('exige país y ciudad cuando no es remoto', () => {
    const result = projectFormSchema.safeParse(
      baseValues({
        modalidad: 'hibrido',
        paisProyecto: '',
        ciudadProyecto: '',
      }),
    )
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message === 'ubicacion')).toBe(
        true,
      )
    }
  })

  it('rechaza presupuesto mínimo mayor al máximo', () => {
    const result = projectFormSchema.safeParse(
      baseValues({ presupuestoMin: '900', presupuestoMax: '500' }),
    )
    expect(result.success).toBe(false)
  })
})

describe('toPublishPayload', () => {
  it('anula país/ciudad cuando es remoto y arma ISO de fechas', () => {
    const payload = toPublishPayload(
      baseValues({ paisProyecto: 'Costa Rica', ciudadProyecto: 'San José' }),
    )
    expect(payload.paisProyecto).toBeNull()
    expect(payload.ciudadProyecto).toBeNull()
    expect(payload.fechaPublicacionIso).toBe('2026-06-13T00:00:00.000Z')
  })

  it('conserva país/ciudad cuando es presencial', () => {
    const payload = toPublishPayload(
      baseValues({
        modalidad: 'presencial',
        paisProyecto: 'Costa Rica',
        ciudadProyecto: 'San José',
      }),
    )
    expect(payload.paisProyecto).toBe('Costa Rica')
    expect(payload.ciudadProyecto).toBe('San José')
  })
})
