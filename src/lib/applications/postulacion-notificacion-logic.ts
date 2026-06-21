import type { NotificacionInput } from '@/lib/notifications/create-logic'

/**
 * Construye la notificación in-app para el empresario cuando un egresado se
 * postula a su proyecto (`postulacion_recibida`). Pura: el productor pasa el
 * destinatario (empresario) y el título ya resueltos; el copy fallback y los
 * params viven aquí para poder testearlos sin tocar la base.
 */
export function buildPostulacionNotificacion(input: {
  idUsuarioEmpresario: string
  titulo: string
  urlProyecto: string
}): NotificacionInput {
  return {
    idUsuario: input.idUsuarioEmpresario,
    tipoEvento: 'postulacion_recibida',
    mensaje: `Recibiste una nueva postulación en "${input.titulo}".`,
    params: { titulo: input.titulo },
    urlDestino: input.urlProyecto,
  }
}
