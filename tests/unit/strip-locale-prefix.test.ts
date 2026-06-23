import { describe, it, expect } from 'vitest'
import { stripLocalePrefix } from '@/lib/i18n/strip-locale-prefix'

describe('stripLocalePrefix', () => {
  it('quita el prefijo /es del inicio de la ruta', () => {
    expect(stripLocalePrefix('/es/egresado/projects/abc')).toBe(
      '/egresado/projects/abc',
    )
  })

  it('quita el prefijo /en del inicio de la ruta', () => {
    expect(stripLocalePrefix('/en/empresario/proyecto/abc/entregables')).toBe(
      '/empresario/proyecto/abc/entregables',
    )
  })

  it('preserva el query string al quitar el prefijo', () => {
    expect(stripLocalePrefix('/es/egresado/mensajes?proyecto=abc')).toBe(
      '/egresado/mensajes?proyecto=abc',
    )
  })

  it('es no-op para rutas ya sin prefijo de locale', () => {
    expect(stripLocalePrefix('/egresado/projects/abc')).toBe(
      '/egresado/projects/abc',
    )
    expect(stripLocalePrefix('/empresario/mensajes?proyecto=abc')).toBe(
      '/empresario/mensajes?proyecto=abc',
    )
    expect(stripLocalePrefix('/admin/moderation')).toBe('/admin/moderation')
  })

  it('no confunde un segmento que solo empieza con el locale', () => {
    // '/escritorio' empieza con 'es' pero no es el prefijo '/es/'
    expect(stripLocalePrefix('/escritorio/abc')).toBe('/escritorio/abc')
  })

  it('convierte la ruta de solo-locale en la raíz', () => {
    expect(stripLocalePrefix('/es')).toBe('/')
    expect(stripLocalePrefix('/en')).toBe('/')
  })
})
