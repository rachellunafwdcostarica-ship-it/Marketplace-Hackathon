import { describe, it, expect } from 'vitest'
import { ok, err, type Result } from './result'

describe('ok', () => {
  it('construye un Result exitoso con el dato dado', () => {
    const result = ok(42)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data).toBe(42)
  })

  it('acepta null como dato', () => {
    const result = ok(null)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data).toBeNull()
  })

  it('acepta undefined como dato', () => {
    const result = ok(undefined)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data).toBeUndefined()
  })

  it('acepta un objeto como dato', () => {
    const payload = { id: '1', nombre: 'Ana' }
    const result = ok(payload)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data).toEqual(payload)
  })

  it('acepta un array como dato', () => {
    const result = ok([1, 2, 3])
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data).toEqual([1, 2, 3])
  })
})

describe('err', () => {
  it('construye un Result fallido con el error dado', () => {
    const result = err('not_found')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('not_found')
  })

  it('acepta cualquier tipo como error', () => {
    const result = err(404)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe(404)
  })

  it('acepta un objeto como error', () => {
    const errObj = { code: 'UNAUTHORIZED', status: 401 }
    const result = err(errObj)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toEqual(errObj)
  })
})

describe('Result type narrowing', () => {
  function mayFail(fail: boolean): Result<string> {
    return fail ? err('fallo') : ok('exito')
  }

  it('discrimina correctamente el ok caso', () => {
    const r = mayFail(false)
    if (r.ok) {
      expect(r.data).toBe('exito')
    } else {
      throw new Error('no debería llegar aquí')
    }
  })

  it('discrimina correctamente el error caso', () => {
    const r = mayFail(true)
    if (!r.ok) {
      expect(r.error).toBe('fallo')
    } else {
      throw new Error('no debería llegar aquí')
    }
  })
})
