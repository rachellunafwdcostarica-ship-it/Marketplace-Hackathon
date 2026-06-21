import type {
  NotificacionInput,
  TipoNotificacion,
} from '@/lib/notifications/create-logic'

export interface AfectadoAdjudicacion {
  idUsuario: string
  estado: 'contratada' | 'no_seleccionada'
}

/**
 * Construye las notificaciones de una adjudicación (RF-37/39): al ganador
 * (`contratada` → `participacion_contratada`) y a cada no seleccionado
 * (`no_seleccionada` → `participacion_no_seleccionada`). Pura: el productor pasa
 * los afectados ya resueltos y el título; la elección de tipo, el copy fallback
 * y los params viven aquí para poder testearlos sin tocar la base.
 *
 * Se reutiliza también para el rechazo individual del empresario durante la
 * revisión (un solo afectado en `no_seleccionada`): comparten `tipo_evento`, así
 * que el copy es neutro y sirve a ambos flujos.
 */
export function buildAdjudicacionNotificaciones(input: {
  titulo: string
  urlProyecto: string
  afectados: AfectadoAdjudicacion[]
}): NotificacionInput[] {
  const { titulo, urlProyecto, afectados } = input
  return afectados.map((afectado) => {
    const esGanador = afectado.estado === 'contratada'
    const tipoEvento: TipoNotificacion = esGanador
      ? 'participacion_contratada'
      : 'participacion_no_seleccionada'
    const mensaje = esGanador
      ? `¡Felicitaciones! La empresa te eligió para "${titulo}". Pronto se pondrán en contacto.`
      : `Tu propuesta para "${titulo}" no fue seleccionada en esta ocasión. Gracias por postularte; pronto habrá nuevas oportunidades.`
    return {
      idUsuario: afectado.idUsuario,
      tipoEvento,
      mensaje,
      params: { titulo },
      urlDestino: urlProyecto,
    }
  })
}
