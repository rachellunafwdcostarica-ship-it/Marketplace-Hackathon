import { describe, it, expect } from 'vitest'
import {
  buildNotificacionRows,
  validateNotificacionInputs,
  MENSAJE_MAX_LEN,
  type NotificacionInput,
} from '@/lib/notifications/create-logic'

const UUID = '123e4567-e89b-12d3-a456-426614174000'

function input(overrides: Partial<NotificacionInput> = {}): NotificacionInput {
  return {
    idUsuario: UUID,
    tipoEvento: 'proyecto_modificado',
    mensaje: 'El proyecto actualizó su descripción.',
    ...overrides,
  }
}

describe('buildNotificacionRows', () => {
  it('mapea camelCase del dominio a snake_case de la tabla', () => {
    const [row] = buildNotificacionRows([
      input({ urlDestino: '/egresado/projects/1', params: { titulo: 'Demo' } }),
    ])
    expect(row).toEqual({
      id_usuario: UUID,
      tipo_evento: 'proyecto_modificado',
      mensaje: 'El proyecto actualizó su descripción.',
      url_destino: '/egresado/projects/1',
      params: { titulo: 'Demo' },
      leida: false,
    })
  })

  it('cae a null cuando no hay urlDestino ni params', () => {
    const [row] = buildNotificacionRows([input()])
    expect(row?.url_destino).toBeNull()
    expect(row?.params).toBeNull()
    expect(row?.leida).toBe(false)
  })

  it('preserva el orden y la cantidad del lote', () => {
    const rows = buildNotificacionRows([input(), input({ mensaje: 'otra' })])
    expect(rows).toHaveLength(2)
    expect(rows[1]?.mensaje).toBe('otra')
  })
})

describe('validateNotificacionInputs', () => {
  it('acepta un lote válido', () => {
    expect(validateNotificacionInputs([input()]).ok).toBe(true)
  })

  it('acepta un lote vacío', () => {
    expect(validateNotificacionInputs([]).ok).toBe(true)
  })

  it('rechaza idUsuario que no es uuid', () => {
    expect(
      validateNotificacionInputs([input({ idUsuario: 'no-uuid' })]).ok,
    ).toBe(false)
  })

  it('rechaza mensaje vacío o de solo espacios', () => {
    expect(validateNotificacionInputs([input({ mensaje: '   ' })]).ok).toBe(
      false,
    )
  })

  it('rechaza mensaje que excede el límite de la columna', () => {
    const largo = 'a'.repeat(MENSAJE_MAX_LEN + 1)
    expect(validateNotificacionInputs([input({ mensaje: largo })]).ok).toBe(
      false,
    )
  })
})
