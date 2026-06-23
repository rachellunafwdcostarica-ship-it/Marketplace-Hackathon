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

// Los 5 objetivos polimórficos de una denuncia (RF-69).
export const TARGET_TIPOS = [
  'usuario',
  'proyecto',
  'mensaje',
  'entregable',
  'portafolio',
] as const
export type TargetTipo = (typeof TARGET_TIPOS)[number]

type PolymorphicColumn =
  | 'id_reportado'
  | 'id_proyecto'
  | 'id_mensaje'
  | 'id_entregable'
  | 'id_portafolio'

// targetTipo → columna polimórfica en reportes_moderacion.
export const TARGET_TIPO_TO_COLUMN: Record<TargetTipo, PolymorphicColumn> = {
  usuario: 'id_reportado',
  proyecto: 'id_proyecto',
  mensaje: 'id_mensaje',
  entregable: 'id_entregable',
  portafolio: 'id_portafolio',
}

export const CrearReporteSchema = z.object({
  targetTipo: z.enum(TARGET_TIPOS),
  targetId: z.string().uuid(),
  tipoReporte: z.enum(TIPO_REPORTE_VALUES),
  descripcion: z.string().trim().min(10).max(1000),
})
export type CrearReporteInput = z.input<typeof CrearReporteSchema>

export const ResolverReporteSchema = z.object({
  idReporte: z.string().uuid(),
  decision: z.enum(RESOLUCION_DECISIONS),
  resolucion: z.string().trim().min(5).max(500),
  aplicarStrike: z.boolean(),
})
export type ResolverReporteInput = z.input<typeof ResolverReporteSchema>

export interface ReportTarget {
  tipo: TargetTipo
  id: string
  nombre: string
}

export interface AdminReportQueueItem {
  id_reporte: string
  tipo_reporte: TipoReporte
  descripcion: string
  estado_moderacion: EstadoModeracion
  reportado_at: string
  id_reportante: string
  reportante_nombre: string
  target: ReportTarget | null
}

// tipo_reporte → motivo de strike, cuando la denuncia procede y se sanciona.
export const TIPO_A_MOTIVO_STRIKE: Record<TipoReporte, MotivoStrike> = {
  conducta_abusiva: 'conducta_inapropiada',
  contenido_inapropiado: 'conducta_inapropiada',
  spam: 'conducta_inapropiada',
  fraude: 'fraude',
  otro: 'otro',
}
