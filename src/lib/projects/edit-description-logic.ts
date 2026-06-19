import type { PropuestaGeneradaRaw } from '@/lib/proposal-ai/schemas'
import type {
  EstadoEfectivoProyecto,
  EstadoParticipacion,
} from './project-detail-logic'

/**
 * Lógica pura de la edición de descripción de un proyecto publicado
 * (errolpendiente §4.1, "refinamiento post-MVP" de RF-24): editar sin republicar
 * es seguro SOLO si el contenido editado vuelve a pasar la validación de la IA
 * (#3) antes de guardar. Acá vive lo testeable sin BD ni IA; el orquestado vive
 * en `edit-description.ts` (server action).
 */

/**
 * Tope de caracteres de la descripción editada. La generación de la IA produce
 * descripciones muy por debajo de esto (límite de tokens de salida); el tope
 * acota el costo de la validación y evita pegar un texto desmedido. Generoso
 * para no bloquear la edición de una descripción larga ya existente.
 */
export const DESCRIPCION_MAX_LEN = 8000

/**
 * El empresario solo puede editar la descripción mientras el proyecto está
 * `abierto` REAL (dentro de plazo). El estado efectivo ya colapsa "abierto con
 * plazo vencido" en `en_evaluacion`, así que basta comparar contra `abierto`:
 * tras vencer el plazo o adjudicar, los oferentes ya no pueden reaccionar al
 * cambio, así que la edición se cierra (decisión confirmada con el dueño).
 */
export function canEditProjectDescription(
  estadoEfectivo: EstadoEfectivoProyecto,
): boolean {
  return estadoEfectivo === 'abierto'
}

/** Estados de participación de un oferente "activo" al que se le notifica el cambio. */
export const ESTADOS_OFERENTE_ACTIVO: readonly EstadoParticipacion[] = [
  'enviada',
  'en_revision',
] as const

export function esOferenteActivo(estado: EstadoParticipacion): boolean {
  return ESTADOS_OFERENTE_ACTIVO.includes(estado)
}

/** Contenido estructurado vigente del proyecto (de `proyectos` + puentes). */
export interface ProyectoContenido {
  titulo: string
  areaNombre: string | null
  categorias: string[]
  tecnologias: string[]
  involucraIa: boolean
}

/**
 * Reconstruye la propuesta que recibe la validación #3 (`validarPropuesta`):
 * los campos estructurados ACTUALES del proyecto + la descripción NUEVA. La
 * validación es AISLADA (no compara contra la versión anterior). `stackSugerido`
 * y `nivelTecnico` viven en la conversación, no en `proyectos`, y no inciden en
 * los tres criterios de validez (software/coherente/apropiada): se rellenan con
 * defaults neutros.
 */
export function buildPropuestaParaValidar(
  contenido: ProyectoContenido,
  descripcion: string,
): PropuestaGeneradaRaw {
  return {
    titulo: contenido.titulo,
    descripcion,
    area: contenido.areaNombre ?? '',
    categorias: contenido.categorias,
    tecnologias: contenido.tecnologias,
    stackSugerido: [],
    involucraIa: contenido.involucraIa,
    nivelTecnico: 'no_tecnico',
  }
}

/**
 * Mensaje de la notificación in-app para el oferente. La tabla `notificaciones`
 * guarda el texto literal (no hay i18n por fila), así que va en español, igual
 * que el email (decisión del dueño). Pura para poder testearla.
 */
export function buildNotificacionMensaje(tituloProyecto: string): string {
  return `El proyecto "${tituloProyecto}" al que postulaste actualizó su descripción.`
}
