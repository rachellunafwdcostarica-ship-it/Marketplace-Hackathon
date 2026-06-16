import { describe, it, expect } from 'vitest'
import { validateConfigValue, checkPlazoOrder } from './config-validation'

describe('validateConfigValue', () => {
  describe('integer', () => {
    it('acepta un entero no negativo y lo normaliza', () => {
      expect(validateConfigValue('integer', ' 03 ')).toEqual({
        ok: true,
        data: '3',
      })
    })

    it('rechaza decimales y texto', () => {
      expect(validateConfigValue('integer', '3.5')).toEqual({
        ok: false,
        error: 'invalid_integer',
      })
      expect(validateConfigValue('integer', 'abc')).toEqual({
        ok: false,
        error: 'invalid_integer',
      })
    })

    it('rechaza negativos', () => {
      expect(validateConfigValue('integer', '-1')).toEqual({
        ok: false,
        error: 'negative_value',
      })
    })
  })

  describe('decimal', () => {
    it('acepta un decimal no negativo', () => {
      expect(validateConfigValue('decimal', '2.50')).toEqual({
        ok: true,
        data: '2.50',
      })
    })

    it('rechaza valores no numéricos', () => {
      expect(validateConfigValue('decimal', '1,5')).toEqual({
        ok: false,
        error: 'invalid_decimal',
      })
    })

    it('rechaza negativos', () => {
      expect(validateConfigValue('decimal', '-0.1')).toEqual({
        ok: false,
        error: 'negative_value',
      })
    })
  })

  describe('boolean', () => {
    it('acepta "true" y "false"', () => {
      expect(validateConfigValue('boolean', 'true')).toEqual({
        ok: true,
        data: 'true',
      })
      expect(validateConfigValue('boolean', 'false')).toEqual({
        ok: true,
        data: 'false',
      })
    })

    it('rechaza cualquier otro valor', () => {
      expect(validateConfigValue('boolean', '1')).toEqual({
        ok: false,
        error: 'invalid_boolean',
      })
    })
  })

  describe('string', () => {
    it('acepta texto no vacío y lo recorta', () => {
      expect(validateConfigValue('string', '  hola  ')).toEqual({
        ok: true,
        data: 'hola',
      })
    })

    it('rechaza una cadena vacía', () => {
      expect(validateConfigValue('string', '   ')).toEqual({
        ok: false,
        error: 'empty_string',
      })
    })
  })
})

describe('checkPlazoOrder', () => {
  it('es válido cuando min <= max', () => {
    expect(checkPlazoOrder('5', '15')).toBe(true)
    expect(checkPlazoOrder('5', '5')).toBe(true)
  })

  it('es inválido cuando min > max', () => {
    expect(checkPlazoOrder('20', '15')).toBe(false)
  })

  it('es válido si falta alguno de los dos', () => {
    expect(checkPlazoOrder(undefined, '15')).toBe(true)
    expect(checkPlazoOrder('5', undefined)).toBe(true)
  })

  it('no bloquea si algún valor no es numérico (lo cubre validateConfigValue)', () => {
    expect(checkPlazoOrder('abc', '15')).toBe(true)
  })
})
