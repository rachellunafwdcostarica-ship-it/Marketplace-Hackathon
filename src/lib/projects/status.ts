import type { Database } from '@/types/database'
import type { ProjectStatus } from '@/types'

type EstadoProyecto = Database['public']['Enums']['estado_proyecto_enum']

/**
 * Proyecta el `estado` de BD (enum en español, fuente de verdad) al
 * `ProjectStatus` de la UI (inglés). Único punto de mapeo, compartido por el
 * marketplace y el panel admin (reglas.md §8: sin duplicación), en lugar del
 * antiguo `estado as ProjectStatus` que mentía sobre el valor real.
 */
export function estadoToStatus(estado: EstadoProyecto): ProjectStatus {
  switch (estado) {
    case 'borrador':
      return 'draft'
    case 'finalizado':
    case 'cancelado':
      return 'closed'
    default:
      return 'active'
  }
}
