import { describe, it, expect } from 'vitest'
import { buildStrikeNotificacion } from '@/lib/admin/strike-notificacion-logic'

describe('buildStrikeNotificacion', () => {
  it('marca strike normal cuando no alcanza el límite', () => {
    const r = buildStrikeNotificacion(1, 3)
    expect(r.tipoEvento).toBe('strike_recibido')
    expect(r.params).toEqual({ cantidad: '1', maximo: '3' })
    expect(r.mensaje).toContain('1 de 3')
  })

  it('suspende la cuenta al alcanzar el límite', () => {
    const r = buildStrikeNotificacion(3, 3)
    expect(r.tipoEvento).toBe('cuenta_suspendida')
    expect(r.params).toEqual({ cantidad: '3' })
    expect(r.mensaje).toContain('suspendida')
  })

  it('suspende la cuenta al superar el límite', () => {
    const r = buildStrikeNotificacion(4, 3)
    expect(r.tipoEvento).toBe('cuenta_suspendida')
    expect(r.params).toEqual({ cantidad: '4' })
  })

  it('convierte los conteos a string para los params i18n', () => {
    const r = buildStrikeNotificacion(2, 5)
    expect(r.params['cantidad']).toBe('2')
    expect(r.params['maximo']).toBe('5')
  })
})
