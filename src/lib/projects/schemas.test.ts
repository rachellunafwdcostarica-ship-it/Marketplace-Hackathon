import { describe, it, expect } from 'vitest'
import {
  buildLogisticsSchema,
  draftToFormValues,
  parseMoney,
  parsePlazo,
  toLogisticaDraft,
  type LogisticaDraft,
  type LogisticsFormValues,
} from './schemas'

function baseValues(
  overrides: Partial<LogisticsFormValues> = {},
): LogisticsFormValues {
  return {
    titulo: '',
    modalidad: 'remoto',
    moneda: 'USD',
    presupuestoMin: '1000',
    presupuestoMax: '5000',
    plazoDias: '7', // dentro de 5..15
    paisProyecto: '',
    ciudadProyecto: '',
    contextoInicial: 'Queremos una landing para captar leads de la marca.',
    ...overrides,
  }
}

describe('parsePlazo', () => {
  it('convierte texto entero', () => {
    expect(parsePlazo(' 7 ')).toBe(7)
  })
  it('trata el vacío como null', () => {
    expect(parsePlazo('')).toBeNull()
  })
  it('rechaza valores no enteros', () => {
    expect(parsePlazo('7.5')).toBeNull()
    expect(parsePlazo('abc')).toBeNull()
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
  const schema = buildLogisticsSchema()

  it('acepta una logística remota válida (título vacío, contexto suficiente)', () => {
    expect(schema.safeParse(baseValues()).success).toBe(true)
  })

  it('rechaza un plazo menor a 5 días', () => {
    const result = schema.safeParse(baseValues({ plazoDias: '4' }))
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message === 'plazo')).toBe(true)
    }
  })

  it('rechaza un plazo mayor a 15 días', () => {
    const result = schema.safeParse(baseValues({ plazoDias: '16' }))
    expect(result.success).toBe(false)
  })

  it('rechaza un plazo vacío', () => {
    const result = schema.safeParse(baseValues({ plazoDias: '' }))
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message === 'plazo')).toBe(true)
    }
  })

  it('acepta los bordes del rango (5 y 15 días)', () => {
    expect(schema.safeParse(baseValues({ plazoDias: '5' })).success).toBe(true)
    expect(schema.safeParse(baseValues({ plazoDias: '15' })).success).toBe(true)
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

  it('exige presupuesto mínimo y máximo (rechaza vacío)', () => {
    const result = schema.safeParse(
      baseValues({ presupuestoMin: '', presupuestoMax: '' }),
    )
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.message === 'presupuestoMin'),
      ).toBe(true)
    }
  })

  it('rechaza presupuesto 0 o negativo', () => {
    expect(schema.safeParse(baseValues({ presupuestoMin: '0' })).success).toBe(
      false,
    )
    expect(
      schema.safeParse(baseValues({ presupuestoMin: '-100' })).success,
    ).toBe(false)
  })

  it('acepta presupuesto fijo (min == max)', () => {
    const result = schema.safeParse(
      baseValues({ presupuestoMin: '1000', presupuestoMax: '1000' }),
    )
    expect(result.success).toBe(true)
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

  it('convierte el plazo a número', () => {
    const draft = toLogisticaDraft(baseValues({ plazoDias: '10' }))
    expect(draft.plazoDias).toBe(10)
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
      plazoDias: 10,
      paisProyecto: 'Costa Rica',
      ciudadProyecto: 'Cartago',
    }
    const values = draftToFormValues(draft, 'Contexto del proyecto guardado.')
    expect(values.titulo).toBe('App de pedidos')
    expect(values.modalidad).toBe('hibrido')
    expect(values.presupuestoMin).toBe('1000')
    expect(values.presupuestoMax).toBe('5000')
    expect(values.plazoDias).toBe('10')
    expect(values.ciudadProyecto).toBe('Cartago')
    expect(values.contextoInicial).toBe('Contexto del proyecto guardado.')
  })

  it('usa valores por defecto cuando el draft es null', () => {
    const values = draftToFormValues(null, '')
    expect(values.modalidad).toBe('')
    expect(values.moneda).toBe('USD')
    expect(values.presupuestoMin).toBe('')
    expect(values.plazoDias).toBe('')
    expect(values.titulo).toBe('')
  })
})
