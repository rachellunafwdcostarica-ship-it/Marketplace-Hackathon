import { describe, it, expect } from 'vitest'
import {
  conversarResponseSchema,
  propuestaGeneradaSchema,
  validacionResponseSchema,
  NIVELES_TECNICOS,
  type NivelTecnico,
} from './schemas'

// Los helpers (toStringArray, toText, toBool, toNivel) no son exportados,
// pero se prueban indirectamente vía los z.preprocess de los schemas.

describe('conversarResponseSchema', () => {
  it('acepta un objeto válido', () => {
    const result = conversarResponseSchema.safeParse({
      mensaje: 'Hola, ¿en qué trabajas?',
      completo: false,
      faltan: ['sector', 'presupuesto'],
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.mensaje).toBe('Hola, ¿en qué trabajas?')
      expect(result.data.completo).toBe(false)
      expect(result.data.faltan).toEqual(['sector', 'presupuesto'])
    }
  })

  it('rechaza mensaje vacío', () => {
    const result = conversarResponseSchema.safeParse({
      mensaje: '',
      completo: false,
      faltan: [],
    })
    expect(result.success).toBe(false)
  })

  describe('preprocess: toBool en completo', () => {
    it('convierte string "true" a booleano true', () => {
      const result = conversarResponseSchema.safeParse({
        mensaje: 'ok',
        completo: 'true',
        faltan: [],
      })
      expect(result.success).toBe(true)
      if (result.success) expect(result.data.completo).toBe(true)
    })

    it('convierte string "false" a booleano false', () => {
      const result = conversarResponseSchema.safeParse({
        mensaje: 'ok',
        completo: 'false',
        faltan: [],
      })
      expect(result.success).toBe(true)
      if (result.success) expect(result.data.completo).toBe(false)
    })

    it('trata null como false', () => {
      const result = conversarResponseSchema.safeParse({
        mensaje: 'ok',
        completo: null,
        faltan: [],
      })
      expect(result.success).toBe(true)
      if (result.success) expect(result.data.completo).toBe(false)
    })
  })

  describe('preprocess: toStringArray en faltan', () => {
    it('convierte string separado por comas a array', () => {
      const result = conversarResponseSchema.safeParse({
        mensaje: 'ok',
        completo: false,
        faltan: 'sector, presupuesto, plazo',
      })
      expect(result.success).toBe(true)
      if (result.success)
        expect(result.data.faltan).toEqual(['sector', 'presupuesto', 'plazo'])
    })

    it('convierte string separado por saltos de línea', () => {
      const result = conversarResponseSchema.safeParse({
        mensaje: 'ok',
        completo: false,
        faltan: 'sector\npresupuesto\nplazo',
      })
      expect(result.success).toBe(true)
      if (result.success) expect(result.data.faltan).toHaveLength(3)
    })

    it('filtra elementos vacíos del array', () => {
      const result = conversarResponseSchema.safeParse({
        mensaje: 'ok',
        completo: false,
        faltan: ['sector', '', 'presupuesto', ''],
      })
      expect(result.success).toBe(true)
      if (result.success)
        expect(result.data.faltan).toEqual(['sector', 'presupuesto'])
    })

    it('devuelve array vacío para tipo no reconocido', () => {
      const result = conversarResponseSchema.safeParse({
        mensaje: 'ok',
        completo: false,
        faltan: 42,
      })
      expect(result.success).toBe(true)
      if (result.success) expect(result.data.faltan).toEqual([])
    })
  })
})

describe('propuestaGeneradaSchema', () => {
  const validBase = {
    titulo: 'App de gestión',
    descripcion: 'Plataforma de gestión de proyectos',
    area: 'Tecnología',
    categorias: ['web', 'mobile'],
    tecnologias: ['TypeScript', 'React'],
    stackSugerido: ['Next.js', 'Supabase'],
    involucraIa: false,
    nivelTecnico: 'intermedio',
  }

  it('acepta un objeto completamente válido', () => {
    const result = propuestaGeneradaSchema.safeParse(validBase)
    expect(result.success).toBe(true)
  })

  it('rechaza cuando categorias está vacío', () => {
    const result = propuestaGeneradaSchema.safeParse({
      ...validBase,
      categorias: [],
    })
    expect(result.success).toBe(false)
  })

  it('rechaza cuando tecnologias está vacío', () => {
    const result = propuestaGeneradaSchema.safeParse({
      ...validBase,
      tecnologias: [],
    })
    expect(result.success).toBe(false)
  })

  describe('preprocess: toText en titulo/descripcion/area', () => {
    it('une array de strings en texto separado por \\n', () => {
      const result = propuestaGeneradaSchema.safeParse({
        ...validBase,
        titulo: ['Parte 1', 'Parte 2'],
      })
      expect(result.success).toBe(true)
      if (result.success) expect(result.data.titulo).toBe('Parte 1\nParte 2')
    })

    it('convierte null a cadena vacía (que luego falla min(1))', () => {
      const result = propuestaGeneradaSchema.safeParse({
        ...validBase,
        titulo: null,
      })
      // null → '' → falla min(1)
      expect(result.success).toBe(false)
    })
  })

  describe('preprocess: toBool en involucraIa', () => {
    it('convierte "true" a true', () => {
      const result = propuestaGeneradaSchema.safeParse({
        ...validBase,
        involucraIa: 'true',
      })
      expect(result.success).toBe(true)
      if (result.success) expect(result.data.involucraIa).toBe(true)
    })

    it('convierte "false" a false', () => {
      const result = propuestaGeneradaSchema.safeParse({
        ...validBase,
        involucraIa: 'false',
      })
      expect(result.success).toBe(true)
      if (result.success) expect(result.data.involucraIa).toBe(false)
    })
  })

  describe('preprocess: toNivel en nivelTecnico', () => {
    const cases: Array<[string, NivelTecnico]> = [
      ['no_tecnico', 'no_tecnico'],
      ['no tecnico', 'no_tecnico'],
      ['no técnico', 'no_tecnico'],
      ['basico', 'basico'],
      ['básico', 'basico'],
      ['BASICO', 'basico'],
      ['intermedio', 'intermedio'],
      ['INTERMEDIO', 'intermedio'],
      ['avanzado', 'avanzado'],
      ['AVANZADO', 'avanzado'],
      ['desconocido', 'no_tecnico'],
    ]

    it.each(cases)('mapea "%s" a "%s"', (input, expected) => {
      const result = propuestaGeneradaSchema.safeParse({
        ...validBase,
        nivelTecnico: input,
      })
      expect(result.success).toBe(true)
      if (result.success) expect(result.data.nivelTecnico).toBe(expected)
    })

    it('acepta todos los valores válidos del enum directamente', () => {
      for (const nivel of NIVELES_TECNICOS) {
        const result = propuestaGeneradaSchema.safeParse({
          ...validBase,
          nivelTecnico: nivel,
        })
        expect(result.success).toBe(true)
        if (result.success) expect(result.data.nivelTecnico).toBe(nivel)
      }
    })
  })

  describe('preprocess: toStringArray en categorias/tecnologias/stackSugerido', () => {
    it('convierte string CSV a array', () => {
      const result = propuestaGeneradaSchema.safeParse({
        ...validBase,
        categorias: 'web, mobile, api',
      })
      expect(result.success).toBe(true)
      if (result.success)
        expect(result.data.categorias).toEqual(['web', 'mobile', 'api'])
    })

    it('convierte elementos no-string de array a string', () => {
      const result = propuestaGeneradaSchema.safeParse({
        ...validBase,
        tecnologias: [1, 'React', null],
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.tecnologias).toContain('React')
        expect(result.data.tecnologias).toContain('1')
      }
    })
  })
})

describe('validacionResponseSchema', () => {
  it('acepta objeto válido', () => {
    const result = validacionResponseSchema.safeParse({
      valido: true,
      razones: [],
      ajustes: [],
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.valido).toBe(true)
      expect(result.data.razones).toEqual([])
      expect(result.data.ajustes).toEqual([])
    }
  })

  it('convierte "true" en valido a booleano', () => {
    const result = validacionResponseSchema.safeParse({
      valido: 'true',
      razones: ['Razón 1'],
      ajustes: ['Ajuste 1'],
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.valido).toBe(true)
  })

  it('convierte razones como string CSV a array', () => {
    const result = validacionResponseSchema.safeParse({
      valido: false,
      razones: 'Muy corto; Falta presupuesto',
      ajustes: [],
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.razones).toHaveLength(2)
      expect(result.data.razones[0]).toBe('Muy corto')
    }
  })

  it('convierte null en razones/ajustes a arrays vacíos', () => {
    const result = validacionResponseSchema.safeParse({
      valido: false,
      razones: null,
      ajustes: null,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.razones).toEqual([])
      expect(result.data.ajustes).toEqual([])
    }
  })
})
