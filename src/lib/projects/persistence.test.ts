import { describe, it, expect } from 'vitest'
import { parseHistorial, parseLogistica, parseProposal } from './persistence'
import type { Json } from '@/types/database'

describe('parseHistorial', () => {
  it('devuelve array vacío cuando raw es null', () => {
    expect(parseHistorial(null)).toEqual([])
  })

  it('devuelve array vacío cuando raw es un string', () => {
    expect(parseHistorial('no es array' as Json)).toEqual([])
  })

  it('devuelve array vacío cuando raw es un número', () => {
    expect(parseHistorial(42 as Json)).toEqual([])
  })

  it('devuelve array vacío cuando raw es un objeto plano', () => {
    expect(parseHistorial({ tipo: 'mensaje' } as Json)).toEqual([])
  })

  it('devuelve las entradas cuando el array valida contra el schema', () => {
    const data = [
      {
        rol: 'empresario',
        tipo: 'mensaje',
        contenido: 'Hola',
        fecha: '2026-01-01T00:00:00Z',
      },
      {
        rol: 'ia',
        tipo: 'mensaje',
        contenido: 'Hola!',
        fecha: '2026-01-01T00:01:00Z',
      },
    ]
    const result = parseHistorial(data as Json)
    expect(result).toHaveLength(2)
    expect(result[0]?.rol).toBe('empresario')
  })

  it('descarta el array cuyas entradas no tienen la forma esperada', () => {
    const data = [{ role: 'user', content: 'Hola' }]
    expect(parseHistorial(data as Json)).toEqual([])
  })

  it('devuelve array vacío cuando raw es array vacío', () => {
    expect(parseHistorial([])).toEqual([])
  })
})

describe('parseLogistica', () => {
  it('devuelve null cuando raw es null', () => {
    expect(parseLogistica(null)).toBeNull()
  })

  it('devuelve null cuando raw es un string', () => {
    expect(parseLogistica('texto' as Json)).toBeNull()
  })

  it('devuelve null cuando raw es un número', () => {
    expect(parseLogistica(0 as Json)).toBeNull()
  })

  it('devuelve null cuando raw es un array', () => {
    expect(parseLogistica([1, 2, 3])).toBeNull()
  })

  it('devuelve el draft cuando el objeto valida contra el schema', () => {
    const data = {
      titulo: 'Landing de café',
      modalidad: 'remoto',
      moneda: 'USD',
      presupuestoMin: 1000,
      presupuestoMax: 5000,
      plazoDias: 7,
      paisIso: null,
      region: null,
    }
    const result = parseLogistica(data as Json)
    expect(result).toEqual(data)
  })

  it('devuelve null cuando el objeto no tiene la forma del draft', () => {
    expect(parseLogistica({ plazo: 30, presupuesto: 500 } as Json)).toBeNull()
  })

  it('devuelve null cuando el objeto está vacío (no valida)', () => {
    expect(parseLogistica({})).toBeNull()
  })
})

describe('parseProposal', () => {
  it('devuelve null cuando raw es null', () => {
    expect(parseProposal(null)).toBeNull()
  })

  it('devuelve null cuando raw es un string', () => {
    expect(parseProposal('texto' as Json)).toBeNull()
  })

  it('devuelve null cuando raw es un número', () => {
    expect(parseProposal(99 as Json)).toBeNull()
  })

  it('devuelve null cuando raw es un array', () => {
    expect(parseProposal(['item'])).toBeNull()
  })

  it('devuelve la propuesta cuando el objeto valida contra el schema', () => {
    const data = {
      titulo: 'App de gestión',
      descripcion: 'Descripción completa',
      idArea: null,
      areaNombre: null,
      categorias: [],
      tecnologias: [],
      stackSugerido: [],
      involucraIa: false,
    }
    const result = parseProposal(data as Json)
    expect(result).toEqual(data)
  })

  it('devuelve null cuando el objeto no tiene la forma de la propuesta', () => {
    const data = { titulo: 'App', descripcion: 'X', area: 'Tecnología' }
    expect(parseProposal(data as Json)).toBeNull()
  })

  it('devuelve null para booleano', () => {
    expect(parseProposal(true as Json)).toBeNull()
  })
})
