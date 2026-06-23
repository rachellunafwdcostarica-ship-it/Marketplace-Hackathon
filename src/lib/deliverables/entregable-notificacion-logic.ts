import type { NotificacionInput } from '@/lib/notifications/create-logic'
import { DEFAULT_LOCALE } from '@/i18n/config'

/**
 * Construye la notificación in-app para el empresario cuando el egresado sube
 * un entregable (hito parcial o final) a su proyecto (`entregable_enviado`,
 * RF-46). Pura: el productor pasa el destinatario y el título ya resueltos.
 */
export function buildEntregableEnviadoNotificacion(input: {
  idUsuarioEmpresario: string
  tituloProyecto: string
  idProyecto: string
}): NotificacionInput {
  return {
    idUsuario: input.idUsuarioEmpresario,
    tipoEvento: 'entregable_enviado',
    params: { titulo: input.tituloProyecto },
    urlDestino: `/${DEFAULT_LOCALE}/empresario/proyecto/${input.idProyecto}/entregables`,
    mensaje: `El egresado envió un entregable para tu proyecto "${input.tituloProyecto}".`,
  }
}
