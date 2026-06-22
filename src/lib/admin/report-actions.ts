'use server'

import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { requireRole } from '@/lib/auth/guards'
import { ok, err, type Result } from '@/lib/result'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const ReportFiltersSchema = z.object({
  fechaInicio: z.string().datetime().optional(),
  fechaFin: z.string().datetime().optional(),
})

type ReportFilters = z.infer<typeof ReportFiltersSchema>

function formatCSVValue(value: any): string {
  if (value === null || value === undefined) return '""'
  const stringValue = String(value)
  // Escapar comillas dobles y envolver en comillas
  return `"${stringValue.replace(/"/g, '""')}"`
}

export async function exportUsuariosCSV(filters: ReportFilters): Promise<Result<string>> {
  const authResult = await requireRole('administrador')
  if (!authResult.ok) return authResult

  const adminClient = createSupabaseAdminClient()
  let query = adminClient
    .from('usuarios')
    .select('id_usuario, nombre, apellido_1, correo, fecha_registro, is_active, estado_cuenta, roles(nombre_rol)')
    .order('fecha_registro', { ascending: false })

  if (filters.fechaInicio) query = query.gte('fecha_registro', filters.fechaInicio)
  if (filters.fechaFin) query = query.lte('fecha_registro', filters.fechaFin)

  const { data, error } = await query

  if (error) {
    logger.error('exportUsuariosCSV failed', { error: error.message })
    return err(error.message)
  }

  const header = ['ID', 'Nombre', 'Apellido', 'Correo', 'Rol', 'Estado Cuenta', 'Activo', 'Fecha Registro'].join(',')
  const rows = data.map(u => {
    const rol = Array.isArray(u.roles) ? u.roles[0]?.nombre_rol : (u.roles as any)?.nombre_rol
    return [
      formatCSVValue(u.id_usuario),
      formatCSVValue(u.nombre),
      formatCSVValue(u.apellido_1),
      formatCSVValue(u.correo),
      formatCSVValue(rol),
      formatCSVValue(u.estado_cuenta),
      formatCSVValue(u.is_active ? 'Si' : 'No'),
      formatCSVValue(new Date(u.fecha_registro).toISOString())
    ].join(',')
  })

  return ok([header, ...rows].join('\n'))
}

export async function exportProyectosCSV(filters: ReportFilters): Promise<Result<string>> {
  const authResult = await requireRole('administrador')
  if (!authResult.ok) return authResult

  const adminClient = createSupabaseAdminClient()
  let query = adminClient
    .from('proyectos')
    .select('id_proyecto, titulo, modalidad, estado, fecha_publicacion, presupuesto_max, usuarios!proyectos_id_empresario_fkey(nombre, apellido_1)')
    .order('fecha_publicacion', { ascending: false })

  if (filters.fechaInicio) query = query.gte('fecha_publicacion', filters.fechaInicio)
  if (filters.fechaFin) query = query.lte('fecha_publicacion', filters.fechaFin)

  const { data, error } = await query

  if (error) {
    logger.error('exportProyectosCSV failed', { error: error.message })
    return err(error.message)
  }

  const header = ['ID', 'Titulo', 'Modalidad', 'Estado', 'Empresario', 'Presupuesto Max', 'Fecha Publicacion'].join(',')
  const rows = data.map(p => {
    const empresario = (p.usuarios as any)?.nombre ? `${(p.usuarios as any).nombre} ${(p.usuarios as any).apellido_1 || ''}`.trim() : 'Desconocido'
    return [
      formatCSVValue(p.id_proyecto),
      formatCSVValue(p.titulo),
      formatCSVValue(p.modalidad),
      formatCSVValue(p.estado),
      formatCSVValue(empresario),
      formatCSVValue(p.presupuesto_max ?? 0),
      formatCSVValue(p.fecha_publicacion ? new Date(p.fecha_publicacion).toISOString() : '')
    ].join(',')
  })

  return ok([header, ...rows].join('\n'))
}

export async function exportAuditoriaCSV(filters: ReportFilters): Promise<Result<string>> {
  const authResult = await requireRole('administrador')
  if (!authResult.ok) return authResult

  const adminClient = createSupabaseAdminClient()
  let query = adminClient
    .from('auditoria')
    .select('id_auditoria, ocurrida_at, accion, entidad, id_entidad, usuarios(nombre, apellido_1)')
    .order('ocurrida_at', { ascending: false })

  if (filters.fechaInicio) query = query.gte('ocurrida_at', filters.fechaInicio)
  if (filters.fechaFin) query = query.lte('ocurrida_at', filters.fechaFin)

  const { data, error } = await query

  if (error) {
    logger.error('exportAuditoriaCSV failed', { error: error.message })
    return err(error.message)
  }

  const header = ['ID Log', 'Fecha', 'Actor', 'Accion', 'Entidad', 'ID Entidad'].join(',')
  const rows = data.map(a => {
    const actor = (a.usuarios as any)?.nombre ? `${(a.usuarios as any).nombre} ${(a.usuarios as any).apellido_1 || ''}`.trim() : 'Sistema'
    return [
      formatCSVValue(a.id_auditoria),
      formatCSVValue(new Date(a.ocurrida_at).toISOString()),
      formatCSVValue(actor),
      formatCSVValue(a.accion),
      formatCSVValue(a.entidad),
      formatCSVValue(a.id_entidad)
    ].join(',')
  })

  return ok([header, ...rows].join('\n'))
}
