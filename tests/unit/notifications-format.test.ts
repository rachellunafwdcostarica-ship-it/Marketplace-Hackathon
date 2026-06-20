import { describe, it, expect } from 'vitest'
import {
  getNotificationTone,
  getNotificationTypeKey,
  resolveNotificationContent,
} from '@/lib/notifications/format'

describe('getNotificationTone', () => {
  it('asigna magenta a eventos negativos/destructivos', () => {
    expect(getNotificationTone('strike_recibido')).toBe('magenta')
    expect(getNotificationTone('cuenta_suspendida')).toBe('magenta')
    expect(getNotificationTone('participacion_no_seleccionada')).toBe('magenta')
    expect(getNotificationTone('entregable_rechazado')).toBe('magenta')
  })

  it('asigna accent a eventos positivos', () => {
    expect(getNotificationTone('participacion_contratada')).toBe('accent')
    expect(getNotificationTone('entregable_aprobado')).toBe('accent')
    expect(getNotificationTone('cuenta_verificada')).toBe('accent')
  })

  it('asigna warning a vencimientos', () => {
    expect(getNotificationTone('plazo_vence')).toBe('warning')
  })

  it('asigna primary a eventos informativos', () => {
    expect(getNotificationTone('proyecto_modificado')).toBe('primary')
    expect(getNotificationTone('mensaje_nuevo')).toBe('primary')
  })

  it('cae a primary ante un tipo desconocido', () => {
    expect(getNotificationTone('tipo_inexistente')).toBe('primary')
  })
})

describe('getNotificationTypeKey', () => {
  it('devuelve la clave del tipo cuando es conocido', () => {
    expect(getNotificationTypeKey('proyecto_modificado')).toBe(
      'types.proyecto_modificado',
    )
    expect(getNotificationTypeKey('strike_recibido')).toBe(
      'types.strike_recibido',
    )
  })

  it('cae a la clave genérica ante un tipo desconocido', () => {
    expect(getNotificationTypeKey('tipo_inexistente')).toBe('types.generic')
  })
})

describe('resolveNotificationContent', () => {
  it('usa el mensaje crudo cuando no hay parámetros', () => {
    expect(
      resolveNotificationContent({
        tipo: 'proyecto_modificado',
        mensaje: 'Texto guardado',
      }),
    ).toEqual({ kind: 'raw', text: 'Texto guardado' })
  })

  it('usa el mensaje crudo cuando params es un objeto vacío', () => {
    expect(
      resolveNotificationContent({
        tipo: 'proyecto_modificado',
        mensaje: 'Texto guardado',
        params: {},
      }),
    ).toEqual({ kind: 'raw', text: 'Texto guardado' })
  })

  it('traduce con clave i18n cuando hay params y el tipo tiene plantilla', () => {
    expect(
      resolveNotificationContent({
        tipo: 'proyecto_modificado',
        mensaje: 'Texto guardado',
        params: { titulo: 'Mi Proyecto' },
      }),
    ).toEqual({
      kind: 'i18n',
      key: 'content.proyecto_modificado',
      values: { titulo: 'Mi Proyecto' },
    })
  })

  it('cae al mensaje crudo si el tipo aún no tiene plantilla, aunque haya params', () => {
    expect(
      resolveNotificationContent({
        tipo: 'mensaje_nuevo',
        mensaje: 'Tienes un mensaje nuevo',
        params: { de: 'Ana' },
      }),
    ).toEqual({ kind: 'raw', text: 'Tienes un mensaje nuevo' })
  })
})
