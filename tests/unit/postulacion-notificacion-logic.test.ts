import { describe, it, expect } from 'vitest'
import { buildPostulacionNotificacion } from '@/lib/applications/postulacion-notificacion-logic'

const EMPRESARIO = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
const URL = '/es/empresario/proyecto/p1'
const TITULO = 'App de inventario'

describe('buildPostulacionNotificacion', () => {
  it('arma la notificación para el empresario con tipo, params y url', () => {
    const n = buildPostulacionNotificacion({
      idUsuarioEmpresario: EMPRESARIO,
      titulo: TITULO,
      urlProyecto: URL,
    })
    expect(n.idUsuario).toBe(EMPRESARIO)
    expect(n.tipoEvento).toBe('postulacion_recibida')
    expect(n.params).toEqual({ titulo: TITULO })
    expect(n.urlDestino).toBe(URL)
    expect(n.mensaje).toContain(TITULO)
  })
})
