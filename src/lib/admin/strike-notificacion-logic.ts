import type { TipoNotificacion } from '@/lib/notifications/create-logic'

export interface StrikeNotificacion {
  tipoEvento: TipoNotificacion
  params: Record<string, string>
  mensaje: string
}

/**
 * Construye el contenido de la notificación in-app para el usuario sancionado
 * (RF-47). Pura: separa la elección de tipo y el copy fallback del I/O, para
 * poder testearla sin tocar la base.
 *
 * - Si el strike alcanza o supera el límite, la cuenta queda suspendida →
 *   `cuenta_suspendida`. Si no, es un strike normal → `strike_recibido`.
 * - `mensaje` es el texto español de respaldo (fallback de la campana y de las
 *   notificaciones previas al i18n-first); el render bilingüe lo arma el cliente
 *   con `params` y la plantilla `content.<tipo>`.
 */
export function buildStrikeNotificacion(
  nuevaCantidad: number,
  maxStrikesLimit: number,
): StrikeNotificacion {
  const suspendido = nuevaCantidad >= maxStrikesLimit
  if (suspendido) {
    return {
      tipoEvento: 'cuenta_suspendida',
      params: { cantidad: String(nuevaCantidad) },
      mensaje: `Tu cuenta fue suspendida tras acumular ${nuevaCantidad} strikes.`,
    }
  }
  return {
    tipoEvento: 'strike_recibido',
    params: {
      cantidad: String(nuevaCantidad),
      maximo: String(maxStrikesLimit),
    },
    mensaje: `Recibiste un strike (${nuevaCantidad} de ${maxStrikesLimit}) por incumplir las normas de la plataforma.`,
  }
}
