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
  const authResult = await requireRole('administrador')
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
  const authResult = await requireRole('administrador')
  if (!authResult.ok) {
    return authResult
  }

  const adminClient = createSupabaseAdminClient()

  const { data: empresas, error: empresasError } = await adminClient
    .from('empresarios')
    .select(
      'id_empresario, id_usuario, nombre_empresa, tipo_empresario, sector, descripcion, cedula, alcance_operativo, pais_iso_sede, region_sede, logo, sitio_web, estado_verificacion',
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
      pais_sede: e.pais_iso_sede,
      ciudad_sede: e.region_sede,
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
  nivel_admin: Database['public']['Enums']['nivel_admin_enum'] | null
}

export const MAX_STRIKES_LIMIT = 3

export const MAX_USERS_PER_QUERY = 100

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
  const authResult = await requireRole('administrador')
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
      'id_usuario, nombre, apellido_1, apellido_2, correo, estado_cuenta, is_active, cantidad_strikes, fecha_registro, id_rol, nivel_admin',
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
    nivel_admin: u.nivel_admin,
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
  const authResult = await requireRole('administrador')
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

export interface AdminProjectListItem {
  id_proyecto: string
  id_empresario: string
  titulo: string
  descripcion: string
  estado: Database['public']['Enums']['estado_proyecto_enum']
  modalidad: Database['public']['Enums']['modalidad_enum']
  moneda: Database['public']['Enums']['moneda_enum']
  presupuesto_min: number | null
  presupuesto_max: number | null
  fecha_publicacion: string | null
  fecha_cierre: string | null
  nombre_empresa: string | null
  tecnologias: string[]
}

const ADMIN_PROYECTO_SELECT =
  'id_proyecto, id_empresario, titulo, descripcion, estado, modalidad, moneda, presupuesto_min, presupuesto_max, fecha_publicacion, fecha_cierre, empresarios(nombre_empresa), proyecto_tecnologias(tecnologias(nombre))'

/**
 * Lista TODOS los proyectos de la plataforma para el admin (en cualquier estado,
 * incluso borradores y cancelados), con el nombre de la empresa y sus tecnologías.
 *
 * Solo un admin puede invocarla. Usa el cliente de servicio para bypassear RLS
 * (`proyectos_select_auth` solo deja al dueño ver los suyos).
 */
export async function listAllProjectsForAdmin(): Promise<
  Result<AdminProjectListItem[]>
> {
  const authResult = await requireRole('administrador')
  if (!authResult.ok) {
    return authResult
  }

  const adminClient = createSupabaseAdminClient()
  const { data, error } = await adminClient
    .from('proyectos')
    .select(ADMIN_PROYECTO_SELECT)
    .order('created_at', { ascending: false })
  if (error) {
    logger.error('listAllProjectsForAdmin: fallo al leer proyectos', {
      error: error.message,
    })
    return err(error.message)
  }

  const filas = data ?? []
  const proyectos: AdminProjectListItem[] = filas.map((p) => ({
    id_proyecto: p.id_proyecto,
    id_empresario: p.id_empresario,
    titulo: p.titulo,
    descripcion: p.descripcion,
    estado: p.estado,
    modalidad: p.modalidad,
    moneda: p.moneda,
    presupuesto_min: p.presupuesto_min,
    presupuesto_max: p.presupuesto_max,
    fecha_publicacion: p.fecha_publicacion,
    fecha_cierre: p.fecha_cierre,
    nombre_empresa: p.empresarios?.nombre_empresa ?? null,
    tecnologias: p.proyecto_tecnologias
      .map((pt) => pt.tecnologias?.nombre)
      .filter((nombre): nombre is string => Boolean(nombre)),
  }))

  return ok(proyectos)
}

export interface SystemConfigItem {
  clave: string
  valor: string
  tipo_dato: Database['public']['Enums']['tipo_dato_enum']
  descripcion: string | null
  modificado_at: string
}

/**
 * Lee los parámetros de `configuracion_sistema` para el panel de ajustes (RF: el
 * admin ve la configuración vigente y la modifica). Solo un admin puede invocarla.
 *
 * La RLS deja leer la tabla a cualquier autenticado, pero gateamos por rol acá
 * para que la pantalla sea solo-admin de punta a punta.
 */
export async function getSystemConfig(): Promise<Result<SystemConfigItem[]>> {
  const authResult = await requireRole('administrador')
  if (!authResult.ok) {
    return authResult
  }

  const adminClient = createSupabaseAdminClient()
  const { data, error } = await adminClient
    .from('configuracion_sistema')
    .select('clave, valor, tipo_dato, descripcion, modificado_at')
    .order('clave', { ascending: true })
  if (error) {
    logger.error('getSystemConfig: fallo al leer configuracion_sistema', {
      error: error.message,
    })
    return err(error.message)
  }

  const items: SystemConfigItem[] = (data ?? []).map((row) => ({
    clave: row.clave,
    valor: row.valor,
    tipo_dato: row.tipo_dato,
    descripcion: row.descripcion,
    modificado_at: row.modificado_at,
  }))

  return ok(items)
}

// ─────────────────────────────────────────────────────────────────────────────
// MODERACIÓN — Usuarios con strikes
// ─────────────────────────────────────────────────────────────────────────────

export interface AdminStrikeUserItem {
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

/**
 * Lista usuarios con al menos `minStrikes` strikes (default: 1) para el panel
 * de moderación. Solo un admin puede invocarla. Usa el cliente de servicio para
 * bypassear RLS.
 */
export async function listUsersWithStrikes(
  minStrikes = 1,
): Promise<Result<AdminStrikeUserItem[]>> {
  const authResult = await requireRole('administrador')
  if (!authResult.ok) {
    return authResult
  }

  const adminClient = createSupabaseAdminClient()

  const { data: rolesRows, error: rolesError } = await adminClient
    .from('roles')
    .select('id_rol, nombre_rol')
  if (rolesError) {
    logger.error('listUsersWithStrikes: fallo al leer roles', {
      error: rolesError.message,
    })
    return err(rolesError.message)
  }
  const roleNameById = new Map<number, string>(
    (rolesRows ?? []).map((r) => [r.id_rol, r.nombre_rol]),
  )

  const { data, error } = await adminClient
    .from('usuarios')
    .select(
      'id_usuario, nombre, apellido_1, apellido_2, correo, estado_cuenta, is_active, cantidad_strikes, fecha_registro, id_rol',
    )
    .gte('cantidad_strikes', minStrikes)
    .order('cantidad_strikes', { ascending: false })
    .limit(200)

  if (error) {
    logger.error('listUsersWithStrikes: fallo al leer usuarios', {
      error: error.message,
    })
    return err(error.message)
  }

  const users: AdminStrikeUserItem[] = (data ?? []).map((u) => ({
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

// ─────────────────────────────────────────────────────────────────────────────
// PROYECTOS — Lista filtrada y estadísticas
// ─────────────────────────────────────────────────────────────────────────────

type EstadoProyectoEnum = Database['public']['Enums']['estado_proyecto_enum']
type ModalidadEnum = Database['public']['Enums']['modalidad_enum']

export const ADMIN_PROJECT_ESTADOS: EstadoProyectoEnum[] = [
  'borrador',
  'abierto',
  'en_recepcion',
  'adjudicado',
  'en_desarrollo',
  'finalizado',
  'cancelado',
]

export const ADMIN_PROJECT_MODALIDADES: ModalidadEnum[] = [
  'remoto',
  'hibrido',
  'presencial',
]

export interface AdminProjectFilters {
  estado?: EstadoProyectoEnum
  modalidad?: ModalidadEnum
  search?: string
}

/**
 * Lista proyectos para el admin con filtros opcionales de estado, modalidad y búsqueda.
 * Es una extensión filtrada de `listAllProjectsForAdmin`. La función original
 * sigue intacta; esta la complementa cuando se necesitan filtros.
 *
 * Solo un admin puede invocarla. Usa el cliente de servicio para bypassear RLS.
 */
export async function listProjectsForAdmin(
  filters: AdminProjectFilters = {},
): Promise<Result<AdminProjectListItem[]>> {
  const authResult = await requireRole('administrador')
  if (!authResult.ok) {
    return authResult
  }

  const adminClient = createSupabaseAdminClient()
  let query = adminClient
    .from('proyectos')
    .select(ADMIN_PROYECTO_SELECT)
    .order('created_at', { ascending: false })

  if (filters.estado) {
    query = query.eq('estado', filters.estado)
  }
  if (filters.modalidad) {
    query = query.eq('modalidad', filters.modalidad)
  }
  if (filters.search) {
    const term = filters.search.replace(/[,()*%]/g, ' ').trim()
    if (term.length > 0) {
      query = query.or(`titulo.ilike.%${term}%,descripcion.ilike.%${term}%`)
    }
  }

  const { data, error } = await query
  if (error) {
    logger.error('listProjectsForAdmin: fallo al leer proyectos', {
      error: error.message,
    })
    return err(error.message)
  }

  const filas = data ?? []
  const proyectos: AdminProjectListItem[] = filas.map((p) => ({
    id_proyecto: p.id_proyecto,
    id_empresario: p.id_empresario,
    titulo: p.titulo,
    descripcion: p.descripcion,
    estado: p.estado,
    modalidad: p.modalidad,
    moneda: p.moneda,
    presupuesto_min: p.presupuesto_min,
    presupuesto_max: p.presupuesto_max,
    fecha_publicacion: p.fecha_publicacion,
    fecha_cierre: p.fecha_cierre,
    nombre_empresa: p.empresarios?.nombre_empresa ?? null,
    tecnologias: p.proyecto_tecnologias
      .map((pt) => pt.tecnologias?.nombre)
      .filter((nombre): nombre is string => Boolean(nombre)),
  }))

  return ok(proyectos)
}

export interface AdminProjectStats {
  total: number
  borrador: number
  abierto: number
  en_recepcion: number
  adjudicado: number
  en_desarrollo: number
  finalizado: number
  cancelado: number
}

/**
 * Conteos de proyectos por estado para el dashboard admin. Solo un admin puede
 * invocarla. Usa `count: 'exact', head: true` para contar sin traer filas.
 */
export async function getProjectStats(): Promise<Result<AdminProjectStats>> {
  const authResult = await requireRole('administrador')
  if (!authResult.ok) {
    return authResult
  }

  const adminClient = createSupabaseAdminClient()
  const countProyectos = () =>
    adminClient.from('proyectos').select('*', { count: 'exact', head: true })

  const [
    totalRes,
    borradorRes,
    abiertoRes,
    enRecepcionRes,
    adjudicadoRes,
    enDesarrolloRes,
    finalizadoRes,
    canceladoRes,
  ] = await Promise.all([
    countProyectos(),
    countProyectos().eq('estado', 'borrador'),
    countProyectos().eq('estado', 'abierto'),
    countProyectos().eq('estado', 'en_recepcion'),
    countProyectos().eq('estado', 'adjudicado'),
    countProyectos().eq('estado', 'en_desarrollo'),
    countProyectos().eq('estado', 'finalizado'),
    countProyectos().eq('estado', 'cancelado'),
  ])

  const failed = [
    totalRes,
    borradorRes,
    abiertoRes,
    enRecepcionRes,
    adjudicadoRes,
    enDesarrolloRes,
    finalizadoRes,
    canceladoRes,
  ].find((r) => r.error)

  if (failed?.error) {
    logger.error('getProjectStats failed', { error: failed.error.message })
    return err(failed.error.message)
  }

  return ok({
    total: totalRes.count ?? 0,
    borrador: borradorRes.count ?? 0,
    abierto: abiertoRes.count ?? 0,
    en_recepcion: enRecepcionRes.count ?? 0,
    adjudicado: adjudicadoRes.count ?? 0,
    en_desarrollo: enDesarrolloRes.count ?? 0,
    finalizado: finalizadoRes.count ?? 0,
    cancelado: canceladoRes.count ?? 0,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// AUDITORÍA — Historial real de strikes desde la tabla `strikes`
// ─────────────────────────────────────────────────────────────────────────────

export interface StrikeAuditItem {
  id_strike: string
  id_usuario: string
  nombre_usuario: string
  motivo: Database['public']['Enums']['motivo_strike_enum']
  descripcion: string | null
  revocado: boolean
  motivo_revocacion: string | null
  aplicado_at: string
  revocado_at: string | null
}

/**
 * Lista el historial completo de strikes (activos y revocados) para la
 * pantalla de auditoría del panel de moderación.
 * Solo un admin puede invocarla.
 */
export async function listStrikeAudit(
  limit = 100,
): Promise<Result<StrikeAuditItem[]>> {
  const authResult = await requireRole('administrador')
  if (!authResult.ok) return authResult

  const adminClient = createSupabaseAdminClient()

  const { data, error } = await adminClient
    .from('strikes')
    .select(
      'id_strike, id_usuario, motivo, descripcion, revocado, motivo_revocacion, aplicado_at, revocado_at',
    )
    .order('aplicado_at', { ascending: false })
    .limit(limit)

  if (error) {
    logger.error('listStrikeAudit: fallo al leer strikes', {
      error: error.message,
    })
    return err(error.message)
  }

  const rows = data ?? []
  if (rows.length === 0) return ok([])

  // Traer los nombres de los usuarios involucrados
  const userIds = [...new Set(rows.map((r) => r.id_usuario))]
  const { data: usuarios, error: usersError } = await adminClient
    .from('usuarios')
    .select('id_usuario, nombre, apellido_1')
    .in('id_usuario', userIds)

  if (usersError) {
    logger.error('listStrikeAudit: fallo al leer usuarios', {
      error: usersError.message,
    })
    return err(usersError.message)
  }

  const userNameById = new Map(
    (usuarios ?? []).map((u) => [u.id_usuario, `${u.nombre} ${u.apellido_1}`]),
  )

  const items: StrikeAuditItem[] = rows.map((r) => ({
    id_strike: r.id_strike,
    id_usuario: r.id_usuario,
    nombre_usuario: userNameById.get(r.id_usuario) ?? 'Usuario desconocido',
    motivo: r.motivo,
    descripcion: r.descripcion,
    revocado: r.revocado,
    motivo_revocacion: r.motivo_revocacion,
    aplicado_at: r.aplicado_at,
    revocado_at: r.revocado_at,
  }))

  return ok(items)
}

export interface AdminAuditItem {
  id_auditoria: string
  ocurrida_at: string
  accion: string
  entidad: string
  id_entidad: string
  actor_nombre: string | null
}

export const MAX_AUDIT_ROWS = 100

/**
 * Lista los eventos más recientes de `auditoria` para el reporte de actividad
 * (RF-67). Solo un admin puede invocarla. Resuelve el nombre del actor con una
 * segunda consulta (no embed) y usa el cliente de servicio para bypassear RLS.
 */
export async function listAuditoria(
  limit = MAX_AUDIT_ROWS,
): Promise<Result<AdminAuditItem[]>> {
  const authResult = await requireRole('administrador')
  if (!authResult.ok) return authResult

  const adminClient = createSupabaseAdminClient()
  const { data, error } = await adminClient
    .from('auditoria')
    .select('id_auditoria, ocurrida_at, accion, entidad, id_entidad, id_actor')
    .order('ocurrida_at', { ascending: false })
    .limit(limit)

  if (error) {
    logger.error('listAuditoria: fallo al leer auditoria', {
      error: error.message,
    })
    return err(error.message)
  }

  const rows = data ?? []
  if (rows.length === 0) return ok([])

  const actorIds = [
    ...new Set(
      rows.map((r) => r.id_actor).filter((id): id is string => id !== null),
    ),
  ]

  const actorNameById = new Map<string, string>()
  if (actorIds.length > 0) {
    const { data: usuarios, error: usersError } = await adminClient
      .from('usuarios')
      .select('id_usuario, nombre, apellido_1')
      .in('id_usuario', actorIds)

    if (usersError) {
      logger.error('listAuditoria: fallo al leer actores', {
        error: usersError.message,
      })
      return err(usersError.message)
    }

    for (const u of usuarios ?? []) {
      actorNameById.set(u.id_usuario, `${u.nombre} ${u.apellido_1}`)
    }
  }

  const items: AdminAuditItem[] = rows.map((r) => ({
    id_auditoria: r.id_auditoria,
    ocurrida_at: r.ocurrida_at,
    accion: r.accion,
    entidad: r.entidad,
    id_entidad: r.id_entidad,
    actor_nombre:
      r.id_actor === null ? null : (actorNameById.get(r.id_actor) ?? null),
  }))

  return ok(items)
}
