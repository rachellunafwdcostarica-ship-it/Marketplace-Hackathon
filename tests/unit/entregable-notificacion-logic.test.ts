import { describe, it, expect } from 'vitest'
import { buildEntregableEnviadoNotificacion } from '@/lib/deliverables/entregable-notificacion-logic'

const EMPRESARIO = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
const PROYECTO_ID = 'b1ffcd00-1d0c-4ef8-cc7e-7cc0ce491b22'
const TITULO = 'Sistema de inventario'

describe('buildEntregableEnviadoNotificacion', () => {
  it('arma la notificación para el empresario con tipo, params y url', () => {
    const n = buildEntregableEnviadoNotificacion({
      idUsuarioEmpresario: EMPRESARIO,
      tituloProyecto: TITULO,
      idProyecto: PROYECTO_ID,
    })
    expect(n.idUsuario).toBe(EMPRESARIO)
    expect(n.tipoEvento).toBe('entregable_enviado')
    expect(n.params).toEqual({ titulo: TITULO })
    expect(n.urlDestino).toContain(PROYECTO_ID)
    expect(n.urlDestino).toContain('entregables')
    expect(n.mensaje).toContain(TITULO)
  })

  it('incluye el id del proyecto en la url de destino', () => {
    const n = buildEntregableEnviadoNotificacion({
      idUsuarioEmpresario: EMPRESARIO,
      tituloProyecto: TITULO,
      idProyecto: PROYECTO_ID,
    })
    expect(n.urlDestino).toBe(
      `/es/empresario/proyecto/${PROYECTO_ID}/entregables`,
    )
  })

  it('el mensaje fallback contiene el título del proyecto', () => {
    const titulo = 'Plataforma de e-commerce'
    const n = buildEntregableEnviadoNotificacion({
      idUsuarioEmpresario: EMPRESARIO,
      tituloProyecto: titulo,
      idProyecto: PROYECTO_ID,
    })
    expect(n.mensaje).toContain(titulo)
  })
})
