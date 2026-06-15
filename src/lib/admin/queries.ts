import { z } from 'zod'
import { ok, err, type Result } from '@/lib/result'
import { logger } from '@/lib/logger'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { requireRole } from '@/lib/auth/guards'
import type { Database } from '@/types/database'

export interface PendingGraduate {
  id_usuario: string
  nombre: string
  apellido_1: string
  correo: string
}

/**
 * Egresados pendientes de verificación (RF-64): estudiantes con
 * estado_verificacion = 'pendiente'. Es la bandeja del cotejo de egreso, NO la
 * aprobación de cuenta (eso es estado_cuenta, en gestión de usuarios).
 *
 * Solo un admin puede invocarla. Usa el cliente de servicio para bypassear RLS.
 */
export async function getPendingGraduateVerifications(): Promise<
  Result<PendingGraduate[]>
> {
  const authResult = await requireRole('admin')
  if (!authResult.ok) {
    return authResult
  }

  const adminClient = createSupabaseAdminClient()

  const { data: estudiantes, error: estudiantesError } = await adminClient
    .from('estudiantes')
    .select('id_usuario')
    .eq('estado_verificacion', 'pendiente')
  if (estudiantesError) {
    logger.error('getPendingGraduateVerifications: fallo al leer estudiantes', {
      error: estudiantesError.message,
    })
    return err(estudiantesError.message)
  }

  const ids = (estudiantes ?? []).map((e) => e.id_usuario)
  if (ids.length === 0) {
    return ok([])
  }

  const { data, error } = await adminClient
    .from('usuarios')
    .select('id_usuario, nombre, apellido_1, correo')
    .in('id_usuario', ids)
    .order('fecha_registro', { ascending: true })
  if (error) {
    logger.error('getPendingGraduateVerifications failed', {
      error: error.message,
    })
    return err(error.message)
  }

  return ok((data ?? []) as PendingGraduate[])
}

export type AdminAccountStatus =
  Database['public']['Enums']['estado_cuenta_enum']

// Nombres de rol tal como viven en la tabla `roles` (modelo XXI).
export const ADMIN_USER_ROLES = [
  'administrador',
  'egresado',
  'empresario',
] as const

export const ADMIN_ACCOUNT_STATUSES = [
  'pendiente',
  'activa',
  'suspendida',
  'suspendida_severa',
] as const

export interface AdminUserListItem {
  id_usuario: string
  nombre: string
  apellido_1: string
  apellido_2: string | null
  correo: string
  estado_cuenta: AdminAccountStatus
  is_active: boolean
  cantidad_strikes: number
  fecha_registro: string
  nombre_rol: string | null
}

const MAX_USERS_PER_QUERY = 100

const ListUsersFiltersSchema = z.object({
  search: z.string().trim().min(1).max(120).optional(),
  role: z.enum(ADMIN_USER_ROLES).optional(),
  status: z.enum(ADMIN_ACCOUNT_STATUSES).optional(),
})

export type ListUsersFilters = z.input<typeof ListUsersFiltersSchema>

/**
 * Lista cuentas para la gestión de usuarios del admin (RF-63): busca por
 * nombre/correo y filtra por rol y estado de cuenta.
 *
 * Solo un admin puede invocarla. Usa el cliente de servicio para bypassear RLS
 * (las políticas solo dejan ver el propio registro). Limita el resultado a
 * MAX_USERS_PER_QUERY; cuando la base crezca se reemplaza por paginación real.
 */
export async function listUsers(
  filters: ListUsersFilters = {},
): Promise<Result<AdminUserListItem[]>> {
  const authResult = await requireRole('admin')
  if (!authResult.ok) {
    return authResult
  }

  const parsed = ListUsersFiltersSchema.safeParse(filters)
  if (!parsed.success) {
    return err('invalid_filters')
  }
  const { search, role, status } = parsed.data

  const adminClient = createSupabaseAdminClient()

  // Mapa id_rol <-> nombre_rol (tabla pequeña) para traducir el filtro de rol
  // y resolver el nombre del rol de cada usuario sin un embed tipado frágil.
  const { data: rolesRows, error: rolesError } = await adminClient
    .from('roles')
    .select('id_rol, nombre_rol')
  if (rolesError) {
    logger.error('listUsers: fallo al leer roles', {
      error: rolesError.message,
    })
    return err(rolesError.message)
  }
  const roleNameById = new Map<number, string>(
    (rolesRows ?? []).map((r) => [r.id_rol, r.nombre_rol]),
  )
  const roleIdByName = new Map<string, number>(
    (rolesRows ?? []).map((r) => [r.nombre_rol, r.id_rol]),
  )

  let query = adminClient
    .from('usuarios')
    .select(
      'id_usuario, nombre, apellido_1, apellido_2, correo, estado_cuenta, is_active, cantidad_strikes, fecha_registro, id_rol',
    )
    .order('fecha_registro', { ascending: false })
    .limit(MAX_USERS_PER_QUERY)

  if (status) {
    query = query.eq('estado_cuenta', status)
  }

  if (role) {
    const roleId = roleIdByName.get(role)
    if (roleId === undefined) {
      return ok([])
    }
    query = query.eq('id_rol', roleId)
  }

  if (search) {
    // Neutralizar los caracteres con significado en el filtro `or` de PostgREST.
    const term = search.replace(/[,()*%]/g, ' ').trim()
    if (term.length > 0) {
      query = query.or(
        `nombre.ilike.%${term}%,apellido_1.ilike.%${term}%,correo.ilike.%${term}%`,
      )
    }
  }

  const { data, error } = await query
  if (error) {
    logger.error('listUsers failed', { error: error.message })
    return err(error.message)
  }

  const users: AdminUserListItem[] = (data ?? []).map((u) => ({
    id_usuario: u.id_usuario,
    nombre: u.nombre,
    apellido_1: u.apellido_1,
    apellido_2: u.apellido_2,
    correo: u.correo,
    estado_cuenta: u.estado_cuenta,
    is_active: u.is_active,
    cantidad_strikes: u.cantidad_strikes,
    fecha_registro: u.fecha_registro,
    nombre_rol: u.id_rol === null ? null : (roleNameById.get(u.id_rol) ?? null),
  }))

  return ok(users)
}

export interface AdminUserStats {
  total: number
  pendientes: number
  activas: number
  desactivadas: number
  egresados: number
  empresarios: number
  administradores: number
}

/**
 * Métricas de cuentas para el dashboard admin (datos reales). Solo un admin
 * puede invocarla. Usa `count: 'exact', head: true` para contar sin traer filas
 * y el cliente de servicio para bypassear RLS.
 */
export async function getUserStats(): Promise<Result<AdminUserStats>> {
  const authResult = await requireRole('admin')
  if (!authResult.ok) {
    return authResult
  }

  const adminClient = createSupabaseAdminClient()

  const { data: rolesRows, error: rolesError } = await adminClient
    .from('roles')
    .select('id_rol, nombre_rol')
  if (rolesError) {
    logger.error('getUserStats: fallo al leer roles', {
      error: rolesError.message,
    })
    return err(rolesError.message)
  }
  const roleIdByName = new Map<string, number>(
    (rolesRows ?? []).map((r) => [r.nombre_rol, r.id_rol]),
  )

  const usuariosCount = () =>
    adminClient.from('usuarios').select('*', { count: 'exact', head: true })

  const egresadoId = roleIdByName.get('egresado') ?? -1
  const empresarioId = roleIdByName.get('empresario') ?? -1
  const administradorId = roleIdByName.get('administrador') ?? -1

  const [
    totalRes,
    pendientesRes,
    activasRes,
    desactivadasRes,
    egresadosRes,
    empresariosRes,
    administradoresRes,
  ] = await Promise.all([
    usuariosCount(),
    usuariosCount().eq('estado_cuenta', 'pendiente'),
    usuariosCount().eq('estado_cuenta', 'activa'),
    usuariosCount().eq('is_active', false),
    usuariosCount().eq('id_rol', egresadoId),
    usuariosCount().eq('id_rol', empresarioId),
    usuariosCount().eq('id_rol', administradorId),
  ])

  const allResults = [
    totalRes,
    pendientesRes,
    activasRes,
    desactivadasRes,
    egresadosRes,
    empresariosRes,
    administradoresRes,
  ]
  const failed = allResults.find((r) => r.error)
  if (failed?.error) {
    logger.error('getUserStats failed', { error: failed.error.message })
    return err(failed.error.message)
  }

  return ok({
    total: totalRes.count ?? 0,
    pendientes: pendientesRes.count ?? 0,
    activas: activasRes.count ?? 0,
    desactivadas: desactivadasRes.count ?? 0,
    egresados: egresadosRes.count ?? 0,
    empresarios: empresariosRes.count ?? 0,
    administradores: administradoresRes.count ?? 0,
  })
}
