import { describe, it, expect } from 'vitest'
import {
  buildLogisticsSchema,
  daysBetween,
  draftToFormValues,
  parseMoney,
  toLogisticaDraft,
  type LogisticaDraft,
  type LogisticsFormValues,
} from './schemas'

const HOY = '2026-06-13'

function baseValues(
  overrides: Partial<LogisticsFormValues> = {},
): LogisticsFormValues {
  return {
    titulo: '',
    modalidad: 'remoto',
    moneda: 'USD',
    presupuestoMin: '',
    presupuestoMax: '',
    fechaCierre: '2026-06-20', // 7 días desde HOY → dentro de 5..15
    paisProyecto: '',
    ciudadProyecto: '',
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

describe('buildLogisticsSchema', () => {
  const schema = buildLogisticsSchema(HOY)

  it('acepta una logística remota válida (título vacío, contexto suficiente)', () => {
    expect(schema.safeParse(baseValues()).success).toBe(true)
  })

  it('rechaza un plazo menor a 5 días', () => {
    const result = schema.safeParse(baseValues({ fechaCierre: '2026-06-16' }))
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message === 'plazo')).toBe(true)
    }
  })

  it('rechaza un plazo mayor a 15 días', () => {
    const result = schema.safeParse(baseValues({ fechaCierre: '2026-07-13' }))
    expect(result.success).toBe(false)
  })

  it('exige país y ciudad cuando no es remoto', () => {
    const result = schema.safeParse(
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
    const result = schema.safeParse(
      baseValues({ presupuestoMin: '900', presupuestoMax: '500' }),
    )
    expect(result.success).toBe(false)
  })

  it('rechaza un contexto demasiado corto', () => {
    const result = schema.safeParse(baseValues({ contextoInicial: 'corto' }))
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message === 'fondoMin')).toBe(
        true,
      )
    }
  })
})

describe('toLogisticaDraft', () => {
  it('anula país/ciudad y deja título null cuando es remoto y vacío', () => {
    const draft = toLogisticaDraft(
      baseValues({ paisProyecto: 'Costa Rica', ciudadProyecto: 'San José' }),
    )
    expect(draft.paisProyecto).toBeNull()
    expect(draft.ciudadProyecto).toBeNull()
    expect(draft.titulo).toBeNull()
  })

  it('conserva país/ciudad y título cuando es presencial', () => {
    const draft = toLogisticaDraft(
      baseValues({
        titulo: 'Landing institucional',
        modalidad: 'presencial',
        paisProyecto: 'Costa Rica',
        ciudadProyecto: 'San José',
      }),
    )
    expect(draft.paisProyecto).toBe('Costa Rica')
    expect(draft.ciudadProyecto).toBe('San José')
    expect(draft.titulo).toBe('Landing institucional')
  })
})

describe('draftToFormValues', () => {
  it('reconstruye los valores del form desde el draft + contexto', () => {
    const draft: LogisticaDraft = {
      titulo: 'App de pedidos',
      modalidad: 'hibrido',
      moneda: 'CRC',
      presupuestoMin: 1000,
      presupuestoMax: 5000,
      fechaCierre: '2026-06-25',
      paisProyecto: 'Costa Rica',
      ciudadProyecto: 'Cartago',
    }
    const values = draftToFormValues(draft, 'Contexto del proyecto guardado.')
    expect(values.titulo).toBe('App de pedidos')
    expect(values.modalidad).toBe('hibrido')
    expect(values.presupuestoMin).toBe('1000')
    expect(values.presupuestoMax).toBe('5000')
    expect(values.ciudadProyecto).toBe('Cartago')
    expect(values.contextoInicial).toBe('Contexto del proyecto guardado.')
  })

  it('usa valores por defecto cuando el draft es null', () => {
    const values = draftToFormValues(null, '')
    expect(values.modalidad).toBe('')
    expect(values.moneda).toBe('USD')
    expect(values.presupuestoMin).toBe('')
    expect(values.titulo).toBe('')
  })
})
