import { describe, it, expect } from 'vitest'
import { estadoToStatus } from './status'

describe('estadoToStatus', () => {
  it('mapea borrador a draft', () => {
    expect(estadoToStatus('borrador')).toBe('draft')
  })

  it('mapea finalizado y cancelado a closed', () => {
    expect(estadoToStatus('finalizado')).toBe('closed')
    expect(estadoToStatus('cancelado')).toBe('closed')
  })

  it('mapea los estados vivos a active', () => {
    expect(estadoToStatus('abierto')).toBe('active')
    expect(estadoToStatus('en_recepcion')).toBe('active')
    expect(estadoToStatus('adjudicado')).toBe('active')
    expect(estadoToStatus('en_desarrollo')).toBe('active')
  })
})
