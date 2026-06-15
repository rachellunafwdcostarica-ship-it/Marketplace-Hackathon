import { z } from 'zod'
import { ok, err, type Result } from '@/lib/result'
import { logger } from '@/lib/logger'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { requireRole } from '@/lib/auth/guards'
import type { Database } from '@/types/database'

export const ADMIN_VERIFICATION_STATES = [
  'pendiente',
  'verificado',
  'rechazado',
] as const
export type AdminVerificationState = (typeof ADMIN_VERIFICATION_STATES)[number]

export interface GraduateVerificationItem {
  id_usuario: string
  nombre: string
  apellido_1: string
  apellido_2: string | null
  correo: string
  fecha_nacimiento: string | null
  titulo_fwd: Database['public']['Enums']['titulo_fwd_enum'] | null
  estado_verificacion: AdminVerificationState
}

/**
 * Lista egresados por estado de verificación (RF-64): pendientes para la cola
 * del cotejo, o verificado/rechazado para el historial. Trae los datos del
 * estudiante (titulo_fwd) y del representante (nombre, correo, fecha_nacimiento).
 *
 * Solo un admin puede invocarla. Usa el cliente de servicio para bypassear RLS.
 */
export async function listGraduateVerifications(
  estado: AdminVerificationState,
): Promise<Result<GraduateVerificationItem[]>> {
  const authResult = await requireRole('admin')
  if (!authResult.ok) {
    return authResult
  }

  const adminClient = createSupabaseAdminClient()

  const { data: estudiantes, error: estudiantesError } = await adminClient
    .from('estudiantes')
    .select('id_usuario, titulo_fwd, estado_verificacion')
    .eq('estado_verificacion', estado)
  if (estudiantesError) {
    logger.error('listGraduateVerifications: fallo al leer estudiantes', {
      error: estudiantesError.message,
    })
    return err(estudiantesError.message)
  }
  if (!estudiantes || estudiantes.length === 0) {
    return ok([])
  }

  const ids = estudiantes.map((e) => e.id_usuario)
  const { data: usuarios, error: usuariosError } = await adminClient
    .from('usuarios')
    .select(
      'id_usuario, nombre, apellido_1, apellido_2, correo, fecha_nacimiento',
    )
    .in('id_usuario', ids)
  if (usuariosError) {
    logger.error('listGraduateVerifications: fallo al leer usuarios', {
      error: usuariosError.message,
    })
    return err(usuariosError.message)
  }
  const userById = new Map((usuarios ?? []).map((u) => [u.id_usuario, u]))

  const items: GraduateVerificationItem[] = estudiantes.map((e) => {
    const u = userById.get(e.id_usuario)
    return {
      id_usuario: e.id_usuario,
      nombre: u?.nombre ?? '',
      apellido_1: u?.apellido_1 ?? '',
      apellido_2: u?.apellido_2 ?? null,
      correo: u?.correo ?? '',
      fecha_nacimiento: u?.fecha_nacimiento ?? null,
      titulo_fwd: e.titulo_fwd,
      estado_verificacion: e.estado_verificacion,
    }
  })

  return ok(items)
}

export interface CompanyVerificationItem {
  id_empresario: string
  nombre_empresa: string | null
  tipo_empresario: Database['public']['Enums']['tipo_empresario_enum']
  sector: string | null
  descripcion: string | null
  cedula: string | null
  alcance_operativo: Database['public']['Enums']['alcance_enum'] | null
  pais_sede: string | null
  ciudad_sede: string | null
  logo: string | null
  sitio_web: string | null
  estado_verificacion: AdminVerificationState
  // Representante (de usuarios)
  nombre: string
  apellido_1: string
  apellido_2: string | null
  correo: string
  fecha_nacimiento: string | null
}

/**
 * Lista empresas por estado de verificación (RF-17): pendientes para la cola, o
 * verificado/rechazado para el historial, con los datos del representante.
 *
 * Solo un admin puede invocarla. Usa el cliente de servicio: la policy
 * empresarios_select_own solo deja ver el registro propio.
 */
export async function listCompanyVerifications(
  estado: AdminVerificationState,
): Promise<Result<CompanyVerificationItem[]>> {
  const authResult = await requireRole('admin')
  if (!authResult.ok) {
    return authResult
  }

  const adminClient = createSupabaseAdminClient()

  const { data: empresas, error: empresasError } = await adminClient
    .from('empresarios')
    .select(
      'id_empresario, id_usuario, nombre_empresa, tipo_empresario, sector, descripcion, cedula, alcance_operativo, pais_sede, ciudad_sede, logo, sitio_web, estado_verificacion',
    )
    .eq('estado_verificacion', estado)
    .order('updated_at', { ascending: true })
  if (empresasError) {
    logger.error('listCompanyVerifications: fallo al leer empresarios', {
      error: empresasError.message,
    })
    return err(empresasError.message)
  }
  if (!empresas || empresas.length === 0) {
    return ok([])
  }

  const userIds = empresas.map((e) => e.id_usuario)
  const { data: usuarios, error: usuariosError } = await adminClient
    .from('usuarios')
    .select(
      'id_usuario, nombre, apellido_1, apellido_2, correo, fecha_nacimiento',
    )
    .in('id_usuario', userIds)
  if (usuariosError) {
    logger.error('listCompanyVerifications: fallo al leer usuarios', {
      error: usuariosError.message,
    })
    return err(usuariosError.message)
  }
  const userById = new Map((usuarios ?? []).map((u) => [u.id_usuario, u]))

  const companies: CompanyVerificationItem[] = empresas.map((e) => {
    const u = userById.get(e.id_usuario)
    return {
      id_empresario: e.id_empresario,
      nombre_empresa: e.nombre_empresa,
      tipo_empresario: e.tipo_empresario,
      sector: e.sector,
      descripcion: e.descripcion,
      cedula: e.cedula,
      alcance_operativo: e.alcance_operativo,
      pais_sede: e.pais_sede,
      ciudad_sede: e.ciudad_sede,
      logo: e.logo,
      sitio_web: e.sitio_web,
      estado_verificacion: e.estado_verificacion,
      nombre: u?.nombre ?? '',
      apellido_1: u?.apellido_1 ?? '',
      apellido_2: u?.apellido_2 ?? null,
      correo: u?.correo ?? '',
      fecha_nacimiento: u?.fecha_nacimiento ?? null,
    }
  })

  return ok(companies)
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
