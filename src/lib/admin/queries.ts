import { z } from 'zod'
import { ok, err, type Result } from '@/lib/result'
import { logger } from '@/lib/logger'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { requireRole } from '@/lib/auth/guards'
import type { Database } from '@/types/database'

export interface PendingUser {
  id_usuario: string
  nombre: string
  apellido_1: string
  correo: string
  id_rol: number | null
  estado_cuenta: string
}

/**
 * Devuelve los usuarios con estado_cuenta = 'pendiente'.
 * Solo puede ser llamada por un usuario con rol 'admin'.
 * Usa el cliente de servicio para bypassear RLS.
 */
export async function getPendingUsers(): Promise<Result<PendingUser[]>> {
  // Verificar que el caller es admin (requireRole normaliza 'administrador' → 'admin')
  const authResult = await requireRole('admin')
  if (!authResult.ok) {
    return authResult
  }

  const adminClient = createSupabaseAdminClient()
  const { data, error } = await adminClient
    .from('usuarios')
    .select('id_usuario, nombre, apellido_1, correo, id_rol, estado_cuenta')
    .eq('estado_cuenta', 'pendiente')
    .order('fecha_registro', { ascending: true })

  if (error) {
    logger.error('getPendingUsers failed', { error: error.message })
    return err(error.message)
  }

  return ok((data ?? []) as PendingUser[])
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
