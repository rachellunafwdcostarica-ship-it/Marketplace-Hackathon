import { describe, it, expect } from 'vitest'
import {
  CompanyProfileDbSchema,
  createCompanyProfileSchema,
  MINIMUM_EMPRESARIO_AGE,
} from './schemas'

// Mock simple de la función `t` de next-intl: devuelve la clave como mensaje.
const t = (key: string) => key

describe('CompanyProfileDbSchema', () => {
  const FECHA_ADULTO = '1985-06-15'

  const validBase = {
    firstName: 'María',
    lastName1: 'González',
    birthDate: FECHA_ADULTO,
    profilePhoto: '',
    name: 'Empresa Demo SA',
    companyType: 'formal' as const,
    sector: 'Tecnología',
    cedula: '3-101-999999',
    description: '',
    contactEmail: 'maria@empresa.com',
    website: '',
    logo: '',
    country: 'Costa Rica',
    operatingScope: 'nacional' as const,
  }

  it('acepta un objeto completamente válido', () => {
    const result = CompanyProfileDbSchema.safeParse(validBase)
    expect(result.success).toBe(true)
  })

  it('acepta con city opcional', () => {
    const result = CompanyProfileDbSchema.safeParse({
      ...validBase,
      city: 'San José',
    })
    expect(result.success).toBe(true)
  })

  it('acepta con lastName2 opcional', () => {
    const result = CompanyProfileDbSchema.safeParse({
      ...validBase,
      lastName2: 'Mora',
    })
    expect(result.success).toBe(true)
  })

  it('acepta companyType "emprendedor"', () => {
    const result = CompanyProfileDbSchema.safeParse({
      ...validBase,
      companyType: 'emprendedor',
    })
    expect(result.success).toBe(true)
  })

  it('acepta operatingScope "internacional"', () => {
    const result = CompanyProfileDbSchema.safeParse({
      ...validBase,
      operatingScope: 'internacional',
    })
    expect(result.success).toBe(true)
  })

  it('acepta operatingScope "ambos"', () => {
    const result = CompanyProfileDbSchema.safeParse({
      ...validBase,
      operatingScope: 'ambos',
    })
    expect(result.success).toBe(true)
  })

  it('rechaza firstName con menos de 2 caracteres', () => {
    const result = CompanyProfileDbSchema.safeParse({
      ...validBase,
      firstName: 'A',
    })
    expect(result.success).toBe(false)
  })

  it('rechaza lastName1 con menos de 2 caracteres', () => {
    const result = CompanyProfileDbSchema.safeParse({
      ...validBase,
      lastName1: 'G',
    })
    expect(result.success).toBe(false)
  })

  it('rechaza name (empresa) con menos de 2 caracteres', () => {
    const result = CompanyProfileDbSchema.safeParse({
      ...validBase,
      name: 'A',
    })
    expect(result.success).toBe(false)
  })

  it('rechaza sector con menos de 2 caracteres', () => {
    const result = CompanyProfileDbSchema.safeParse({
      ...validBase,
      sector: 'T',
    })
    expect(result.success).toBe(false)
  })

  it('rechaza country con menos de 2 caracteres', () => {
    const result = CompanyProfileDbSchema.safeParse({
      ...validBase,
      country: 'C',
    })
    expect(result.success).toBe(false)
  })

  it('rechaza contactEmail inválido', () => {
    const result = CompanyProfileDbSchema.safeParse({
      ...validBase,
      contactEmail: 'no-es-email',
    })
    expect(result.success).toBe(false)
  })

  it('rechaza cédula con menos de 4 caracteres (superRefine)', () => {
    const result = CompanyProfileDbSchema.safeParse({
      ...validBase,
      cedula: '123',
    })
    expect(result.success).toBe(false)
  })

  it('acepta cédula undefined (superRefine la valida como vacía → error)', () => {
    const result = CompanyProfileDbSchema.safeParse({
      ...validBase,
      cedula: undefined,
    })
    // cedula undefined → (cedula ?? '').trim().length < 4 → error
    expect(result.success).toBe(false)
  })

  it('rechaza operatingScope undefined (superRefine lo exige)', () => {
    const result = CompanyProfileDbSchema.safeParse({
      ...validBase,
      operatingScope: undefined,
    })
    expect(result.success).toBe(false)
  })

  it('rechaza birthDate vacío (superRefine lo exige)', () => {
    const result = CompanyProfileDbSchema.safeParse({
      ...validBase,
      birthDate: '',
    })
    expect(result.success).toBe(false)
  })

  it('rechaza birthDate de menor de 18 años (superRefine)', () => {
    const result = CompanyProfileDbSchema.safeParse({
      ...validBase,
      birthDate: '2020-01-01',
    })
    expect(result.success).toBe(false)
  })

  it('rechaza website con URL inválida', () => {
    const result = CompanyProfileDbSchema.safeParse({
      ...validBase,
      website: 'no-es-url',
    })
    expect(result.success).toBe(false)
  })

  it('acepta website vacío (URL opcional)', () => {
    const result = CompanyProfileDbSchema.safeParse({
      ...validBase,
      website: '',
    })
    expect(result.success).toBe(true)
  })

  it('acepta website con URL http válida', () => {
    const result = CompanyProfileDbSchema.safeParse({
      ...validBase,
      website: 'http://empresa.com',
    })
    expect(result.success).toBe(true)
  })

  it('acepta website con URL https válida', () => {
    const result = CompanyProfileDbSchema.safeParse({
      ...validBase,
      website: 'https://empresa.com/sobre',
    })
    expect(result.success).toBe(true)
  })

  it('acepta description vacía (opcional)', () => {
    const result = CompanyProfileDbSchema.safeParse({
      ...validBase,
      description: '',
    })
    expect(result.success).toBe(true)
  })

  it('rechaza description con 1 a 19 caracteres (debe estar vacía o tener ≥20)', () => {
    const result = CompanyProfileDbSchema.safeParse({
      ...validBase,
      description: 'Muy corta',
    })
    expect(result.success).toBe(false)
  })

  it('acepta description con 20 o más caracteres', () => {
    const result = CompanyProfileDbSchema.safeParse({
      ...validBase,
      description: 'Esta descripción tiene más de 20 caracteres.',
    })
    expect(result.success).toBe(true)
  })
})

describe('createCompanyProfileSchema', () => {
  const FECHA_ADULTO = '1985-06-15'
  const schema = createCompanyProfileSchema(
    t as ReturnType<typeof import('next-intl').useTranslations<'Validation'>>,
  )

  const validBase = {
    firstName: 'Pedro',
    lastName1: 'López',
    birthDate: FECHA_ADULTO,
    profilePhoto: '',
    name: 'Tech Startup SRL',
    companyType: 'formal' as const,
    sector: 'Fintech',
    cedula: '3-101-888888',
    description: '',
    contactEmail: 'pedro@tech.com',
    website: '',
    logo: '',
    country: 'México',
    operatingScope: 'nacional' as const,
  }

  it('acepta datos válidos y usa la función t para mensajes', () => {
    const result = schema.safeParse(validBase)
    expect(result.success).toBe(true)
  })

  it('rechaza cédula corta y el mensaje de error es la clave i18n', () => {
    const result = schema.safeParse({ ...validBase, cedula: 'ab' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const cedulaError = result.error.issues.find(
        (i) => i.path[0] === 'cedula',
      )
      expect(cedulaError?.message).toBe('cedulaRequired')
    }
  })

  it('rechaza operatingScope faltante con mensaje correcto', () => {
    const result = schema.safeParse({ ...validBase, operatingScope: undefined })
    expect(result.success).toBe(false)
    if (!result.success) {
      const issue = result.error.issues.find(
        (i) => i.path[0] === 'operatingScope',
      )
      expect(issue?.message).toBe('scopeRequired')
    }
  })

  it('rechaza birthDate vacío con mensaje correcto', () => {
    const result = schema.safeParse({ ...validBase, birthDate: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === 'birthDate')
      expect(issue?.message).toBe('birthDateRequired')
    }
  })

  it('rechaza menor de edad con mensaje correcto', () => {
    const result = schema.safeParse({ ...validBase, birthDate: '2020-06-01' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === 'birthDate')
      expect(issue?.message).toBe('birthDateMinAge')
    }
  })
})

describe('MINIMUM_EMPRESARIO_AGE', () => {
  it('es 18 (mayoría de edad CR)', () => {
    expect(MINIMUM_EMPRESARIO_AGE).toBe(18)
  })
})
