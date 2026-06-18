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

  it('devuelve el array cuando raw es un array', () => {
    const data = [
      { role: 'user', content: 'Hola' },
      { role: 'assistant', content: 'Hola!' },
    ]
    const result = parseHistorial(data as Json)
    expect(Array.isArray(result)).toBe(true)
    expect(result).toHaveLength(2)
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

  it('devuelve el objeto cuando raw es un objeto plano', () => {
    const data = { plazo: 30, presupuesto: 500 }
    const result = parseLogistica(data as Json)
    expect(result).not.toBeNull()
    expect(result).toEqual(data)
  })

  it('devuelve objeto vacío cuando raw es un objeto vacío', () => {
    const result = parseLogistica({})
    expect(result).toEqual({})
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

  it('devuelve el objeto cuando raw es un objeto plano', () => {
    const data = {
      titulo: 'App de gestión',
      descripcion: 'Descripción completa',
      area: 'Tecnología',
    }
    const result = parseProposal(data as Json)
    expect(result).not.toBeNull()
    expect(result).toEqual(data)
  })

  it('devuelve null para booleano', () => {
    expect(parseProposal(true as Json)).toBeNull()
  })
})
