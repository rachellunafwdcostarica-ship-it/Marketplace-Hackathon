import { describe, it, expect } from 'vitest'
import {
  DESCRIPCION_MAX_LEN,
  ESTADOS_OFERENTE_ACTIVO,
  buildNotificacionMensaje,
  buildPropuestaParaValidar,
  canEditProjectDescription,
  esOferenteActivo,
  type ProyectoContenido,
} from './edit-description-logic'

describe('canEditProjectDescription', () => {
  it('permite editar solo cuando el proyecto está abierto (dentro de plazo)', () => {
    expect(canEditProjectDescription('abierto')).toBe(true)
  })

  it('bloquea la edición en cualquier otro estado efectivo', () => {
    expect(canEditProjectDescription('borrador')).toBe(false)
    expect(canEditProjectDescription('en_recepcion')).toBe(false)
    // Plazo vencido pero aún sin adjudicar: el oferente ya no puede reaccionar.
    expect(canEditProjectDescription('en_evaluacion')).toBe(false)
    expect(canEditProjectDescription('adjudicado')).toBe(false)
    expect(canEditProjectDescription('en_desarrollo')).toBe(false)
    expect(canEditProjectDescription('finalizado')).toBe(false)
    expect(canEditProjectDescription('cancelado')).toBe(false)
  })
})

describe('esOferenteActivo', () => {
  it('considera activos a enviada y en_revision', () => {
    expect(esOferenteActivo('enviada')).toBe(true)
    expect(esOferenteActivo('en_revision')).toBe(true)
  })

  it('no notifica a participaciones terminales', () => {
    expect(esOferenteActivo('no_seleccionada')).toBe(false)
    expect(esOferenteActivo('contratada')).toBe(false)
    expect(esOferenteActivo('finalizada')).toBe(false)
    expect(esOferenteActivo('retirada')).toBe(false)
    expect(esOferenteActivo('cancelada')).toBe(false)
  })

  it('ESTADOS_OFERENTE_ACTIVO contiene exactamente los dos estados vivos', () => {
    expect([...ESTADOS_OFERENTE_ACTIVO]).toEqual(['enviada', 'en_revision'])
  })
})

describe('buildPropuestaParaValidar', () => {
  const base: ProyectoContenido = {
    titulo: 'Sistema de pedidos para juguería',
    areaNombre: 'Comercio',
    categorias: ['Aplicación web'],
    tecnologias: ['Next.js', 'PostgreSQL'],
    involucraIa: false,
  }

  it('usa la descripción NUEVA y conserva los campos estructurados actuales', () => {
    const propuesta = buildPropuestaParaValidar(
      base,
      'Descripción editada nueva.',
    )
    expect(propuesta.descripcion).toBe('Descripción editada nueva.')
    expect(propuesta.titulo).toBe(base.titulo)
    expect(propuesta.area).toBe('Comercio')
    expect(propuesta.categorias).toEqual(['Aplicación web'])
    expect(propuesta.tecnologias).toEqual(['Next.js', 'PostgreSQL'])
    expect(propuesta.involucraIa).toBe(false)
  })

  it('rellena con defaults neutros lo que no vive en proyectos', () => {
    const propuesta = buildPropuestaParaValidar(base, 'x')
    expect(propuesta.stackSugerido).toEqual([])
    expect(propuesta.nivelTecnico).toBe('no_tecnico')
  })

  it('mapea un área nula a string vacío (no rompe la validación)', () => {
    const propuesta = buildPropuestaParaValidar(
      { ...base, areaNombre: null },
      'x',
    )
    expect(propuesta.area).toBe('')
  })
})

describe('buildNotificacionMensaje', () => {
  it('incluye el título del proyecto en el mensaje', () => {
    const mensaje = buildNotificacionMensaje('App de inventario')
    expect(mensaje).toContain('App de inventario')
    expect(mensaje).toContain('actualizó su descripción')
  })
})

describe('DESCRIPCION_MAX_LEN', () => {
  it('es un tope positivo y holgado', () => {
    expect(DESCRIPCION_MAX_LEN).toBeGreaterThan(1000)
  })
})
