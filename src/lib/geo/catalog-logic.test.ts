import { describe, it, expect } from 'vitest'
import {
  type CountryRecord,
  type Subdivision,
  filterSubdivisionsByCountry,
  hasCountryCodeFormat,
  hasSubdivisionCodeFormat,
  isKnownCountry,
  isSubdivisionOfCountry,
  resolveCountryName,
  toCountryOptions,
} from './catalog-logic'

const COUNTRIES: CountryRecord[] = [
  { code: 'CR', nameEs: 'Costa Rica', nameEn: 'Costa Rica' },
  { code: 'BR', nameEs: 'Brasil', nameEn: 'Brazil' },
]

const SUBDIVISIONS: Subdivision[] = [
  { code: 'CR-SJ', name: 'San José', parent: 'CR' },
  { code: 'CR-A', name: 'Alajuela', parent: 'CR' },
  { code: 'BR-SP', name: 'São Paulo', parent: 'BR' },
]

describe('resolveCountryName', () => {
  it('usa el nombre en español por defecto', () => {
    expect(resolveCountryName(COUNTRIES[0]!, 'es')).toBe('Costa Rica')
  })

  it('usa el nombre en inglés con locale en', () => {
    expect(resolveCountryName(COUNTRIES[1]!, 'en')).toBe('Brazil')
  })
})

describe('toCountryOptions', () => {
  it('resuelve cada país al locale pedido', () => {
    expect(toCountryOptions(COUNTRIES, 'en')).toEqual([
      { code: 'CR', name: 'Costa Rica' },
      { code: 'BR', name: 'Brazil' },
    ])
  })
})

describe('filterSubdivisionsByCountry', () => {
  it('devuelve solo las subdivisiones del país', () => {
    expect(filterSubdivisionsByCountry(SUBDIVISIONS, 'CR')).toHaveLength(2)
  })

  it('devuelve vacío para un país sin subdivisiones', () => {
    expect(filterSubdivisionsByCountry(SUBDIVISIONS, 'XX')).toEqual([])
  })
})

describe('isKnownCountry', () => {
  it('reconoce un país del catálogo', () => {
    expect(isKnownCountry(COUNTRIES, 'CR')).toBe(true)
  })

  it('rechaza un código ausente', () => {
    expect(isKnownCountry(COUNTRIES, 'ZZ')).toBe(false)
  })
})

describe('isSubdivisionOfCountry', () => {
  it('acepta una subdivisión que pertenece al país', () => {
    expect(isSubdivisionOfCountry(SUBDIVISIONS, 'CR-SJ', 'CR')).toBe(true)
  })

  it('rechaza la combinación imposible San José + Brasil', () => {
    expect(isSubdivisionOfCountry(SUBDIVISIONS, 'CR-SJ', 'BR')).toBe(false)
  })
})

describe('hasCountryCodeFormat', () => {
  it('acepta dos mayúsculas', () => {
    expect(hasCountryCodeFormat('CR')).toBe(true)
  })

  it('rechaza minúsculas o longitud incorrecta', () => {
    expect(hasCountryCodeFormat('cr')).toBe(false)
    expect(hasCountryCodeFormat('CRC')).toBe(false)
  })
})

describe('hasSubdivisionCodeFormat', () => {
  it('acepta el formato XX-YYY (letras o dígitos)', () => {
    expect(hasSubdivisionCodeFormat('CR-SJ')).toBe(true)
    expect(hasSubdivisionCodeFormat('AD-02')).toBe(true)
  })

  it('rechaza un formato sin guion', () => {
    expect(hasSubdivisionCodeFormat('CRSJ')).toBe(false)
  })
})
