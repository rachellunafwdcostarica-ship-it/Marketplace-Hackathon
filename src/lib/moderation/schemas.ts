import { z } from 'zod'
import type { Database } from '@/types/database'

export type TipoReporte = Database['public']['Enums']['tipo_reporte_enum']
export type EstadoModeracion =
  Database['public']['Enums']['estado_moderacion_enum']
export type MotivoStrike = Database['public']['Enums']['motivo_strike_enum']

export const TIPO_REPORTE_VALUES = [
  'conducta_abusiva',
  'contenido_inapropiado',
  'spam',
  'fraude',
  'otro',
] as const

export const RESOLUCION_DECISIONS = [
  'resuelto_a_favor',
  'resuelto_en_contra',
  'descartado',
] as const

export const CrearReporteUsuarioSchema = z.object({
  idReportado: z.string().uuid(),
  tipoReporte: z.enum(TIPO_REPORTE_VALUES),
  descripcion: z.string().trim().min(10).max(1000),
})
export type CrearReporteUsuarioInput = z.input<typeof CrearReporteUsuarioSchema>

export const ResolverReporteSchema = z.object({
  idReporte: z.string().uuid(),
  decision: z.enum(RESOLUCION_DECISIONS),
  resolucion: z.string().trim().min(5).max(500),
  aplicarStrike: z.boolean(),
})
export type ResolverReporteInput = z.input<typeof ResolverReporteSchema>

export interface AdminReportQueueItem {
  id_reporte: string
  tipo_reporte: TipoReporte
  descripcion: string
  estado_moderacion: EstadoModeracion
  reportado_at: string
  id_reportante: string
  reportante_nombre: string
  id_reportado: string | null
  reportado_nombre: string | null
}

// tipo_reporte → motivo de strike, cuando la denuncia procede y se sanciona.
export const TIPO_A_MOTIVO_STRIKE: Record<TipoReporte, MotivoStrike> = {
  conducta_abusiva: 'conducta_inapropiada',
  contenido_inapropiado: 'conducta_inapropiada',
  spam: 'conducta_inapropiada',
  fraude: 'fraude',
  otro: 'otro',
}
