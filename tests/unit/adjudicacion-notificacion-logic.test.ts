import { describe, it, expect } from 'vitest'
import { buildAdjudicacionNotificaciones } from '@/lib/projects/adjudicacion-notificacion-logic'

const GANADOR = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
const OTRO = 'b1ffce11-9c0b-4ef8-bb6d-6bb9bd380a22'
const URL = '/es/egresado/projects/p1'
const TITULO = 'App de inventario'

describe('buildAdjudicacionNotificaciones', () => {
  it('al ganador le asigna participacion_contratada con params y url', () => {
    const [n] = buildAdjudicacionNotificaciones({
      titulo: TITULO,
      urlProyecto: URL,
      afectados: [{ idUsuario: GANADOR, estado: 'contratada' }],
    })
    expect(n?.tipoEvento).toBe('participacion_contratada')
    expect(n?.params).toEqual({ titulo: TITULO })
    expect(n?.urlDestino).toBe(URL)
    expect(n?.mensaje).toBe(`Fuiste seleccionado para el proyecto "${TITULO}".`)
  })

  it('al no seleccionado le asigna participacion_no_seleccionada', () => {
    const [n] = buildAdjudicacionNotificaciones({
      titulo: TITULO,
      urlProyecto: URL,
      afectados: [{ idUsuario: OTRO, estado: 'no_seleccionada' }],
    })
    expect(n?.tipoEvento).toBe('participacion_no_seleccionada')
    expect(n?.mensaje).toBe(
      `Tu propuesta para "${TITULO}" no fue seleccionada.`,
    )
  })

  it('procesa el lote completo (ganador + varios no seleccionados)', () => {
    const ns = buildAdjudicacionNotificaciones({
      titulo: TITULO,
      urlProyecto: URL,
      afectados: [
        { idUsuario: GANADOR, estado: 'contratada' },
        { idUsuario: OTRO, estado: 'no_seleccionada' },
        { idUsuario: GANADOR, estado: 'no_seleccionada' },
      ],
    })
    expect(ns).toHaveLength(3)
    expect(
      ns.filter((n) => n.tipoEvento === 'participacion_contratada'),
    ).toHaveLength(1)
    expect(
      ns.filter((n) => n.tipoEvento === 'participacion_no_seleccionada'),
    ).toHaveLength(2)
  })

  it('un lote vacío no genera notificaciones', () => {
    expect(
      buildAdjudicacionNotificaciones({
        titulo: TITULO,
        urlProyecto: URL,
        afectados: [],
      }),
    ).toEqual([])
  })
})
