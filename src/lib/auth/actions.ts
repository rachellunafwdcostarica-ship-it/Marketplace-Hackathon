'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import type { Database } from '@/types/database'
import { z } from 'zod'
import { ok, err, type Result } from '@/lib/result'
import { logger } from '@/lib/logger'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { env } from '@/lib/env'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createGmailTransport, getGmailFrom } from '@/lib/email/gmail'
import {
  accountApprovedHtml,
  accountApprovedSubject,
} from '@/lib/email/templates/account-approved'
import {
  AssignRoleSchema,
  SaveEmpresarioProfileSchema,
  SignInSchema,
  type AssignRoleInput,
  type SaveEmpresarioProfileInput,
  type SignInInput,
} from './schemas'
import { getUserRole } from './queries'
import { requireRole } from './guards'
import { getCurrentUser } from './dal'
import { normalizeRole, ROLE_HOME } from './roles'
import { checkPwnedPassword } from './check-pwned-password'
import { evaluateAdminManagement } from '@/lib/admin/admin-management'
import { resolveAdminTargetContext } from '@/lib/admin/admin-management-server'
import { crearNotificacion } from '@/lib/notifications/create'
import { DEFAULT_LOCALE } from '@/i18n/config'

export async function getCurrentUserRole(): Promise<Result<string>> {
  return getUserRole()
}

export async function signOut(): Promise<Result<void>> {
  const cookieStore = await cookies()

  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // no-op desde Server Component
          }
        },
      },
    },
  )

  const { error } = await supabase.auth.signOut()

  if (error) {
    logger.error('signOut failed', { error: error.message })
    return err(error.message)
  }

  revalidatePath('/', 'layout')
  return ok(undefined)
}

/**
 * Solicita un enlace de recuperación de contraseña (RF-04).
 *
 * Supabase Auth devuelve éxito incluso si el correo no existe en el sistema,
 * de modo que la respuesta nunca revela si una cuenta está registrada
 * (anti-enumeración por diseño del proveedor). Si llega un error es operacional
 * (rate limit, config inválida) — se registra pero no se expone al usuario.
 */
export async function requestPasswordReset(
  email: string,
): Promise<Result<void>> {
  const parsed = z.string().email().safeParse(email)
  if (!parsed.success) return err('invalid_email')

  const reqHeaders = await headers()
  const host =
    reqHeaders.get('x-forwarded-host') ??
    reqHeaders.get('host') ??
    'localhost:3000'
  const proto = reqHeaders.get('x-forwarded-proto') ?? 'https'
  const redirectTo = `${proto}://${host}/auth/callback?next=/reset-password`

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo,
  })

  if (error) {
    logger.error('requestPasswordReset failed', { error: error.message })
    return err('reset_failed')
  }

  return ok(undefined)
}

/**
 * Asigna el rol al usuario actual durante el onboarding.
 *
 * - Solo acepta 'egresado' o 'empresario' (nunca 'administrador'; Q6).
 * - El valor ya coincide con nombre_rol de la BD: no se necesita traducción.
 * - El rol es PERMANENTE: si ya tiene uno, retorna err('role_already_assigned').
 * - La permanencia se refuerza también a nivel BD en assign_my_role().
 */
export async function assignRole(
  input: AssignRoleInput,
): Promise<Result<void>> {
  const parsed = AssignRoleSchema.safeParse(input)
  if (!parsed.success) {
    return err('invalid_role')
  }

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.rpc('assign_my_role', {
    p_role: parsed.data.role,
  })

  if (error) {
    logger.error('assignRole failed', { error: error.message })
    return err(error.message)
  }

  if (data === false) {
    // La BD rechazó la asignación: el usuario ya tiene un rol
    return err('role_already_assigned')
  }

  revalidatePath('/', 'layout')
  return ok(undefined)
}

/**
 * Registra el consentimiento explícito del egresado para el cotejo de su correo
 * contra la base de egresados de FWD (RNF-38). Lo otorga el propio usuario en su
 * sesión; la policy `consentimientos_insert_own` permite el insert. Es requisito
 * para que un admin pueda verificarlo (gate en `verificarEgresado`).
 */
export async function registrarConsentimientoCotejo(): Promise<Result<void>> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) {
    return err('unauthenticated')
  }

  const reqHeaders = await headers()
  const ipOrigen =
    reqHeaders.get('x-forwarded-for')?.split(',')[0]?.trim().slice(0, 60) ??
    null
  const userAgent = reqHeaders.get('user-agent')?.slice(0, 255) ?? null

  const { error } = await supabase.from('consentimientos').insert({
    id_usuario: user.id,
    tipo_consentimiento: 'cotejo_fwd',
    otorgado: true,
    ip_origen: ipOrigen,
    user_agent: userAgent,
  })

  if (error) {
    logger.error('registrarConsentimientoCotejo failed', {
      error: error.message,
    })
    return err(error.message)
  }

  return ok(undefined)
}

/**
 * Aprueba la cuenta de un usuario (estado_cuenta → 'activa', is_active → true).
 * Solo puede ser llamada por un usuario con rol 'admin'.
 * Usa el cliente de servicio para bypassear RLS.
 *
 * Setea is_active = true a propósito: aprobar reactiva también a una cuenta que
 * el admin haya desactivado antes (ver `deactivateUser`).
 */
export async function approveUser(userId: string): Promise<Result<void>> {
  const parsed = z.string().uuid().safeParse(userId)
  if (!parsed.success) {
    return err('invalid_user_id')
  }

  // Verificar que el caller es admin
  const authResult = await requireRole('administrador')
  if (!authResult.ok) {
    return authResult
  }

  const actor = await getCurrentUser()
  if (!actor) {
    return err('unauthenticated')
  }

  // Usar service_role para bypassear RLS (admin no pasa por políticas)
  const adminClient = createSupabaseAdminClient()

  const { data: usuario, error: fetchError } = await adminClient
    .from('usuarios')
    .select('nombre, correo, roles(nombre_rol)')
    .eq('id_usuario', parsed.data)
    .maybeSingle()

  if (fetchError) {
    logger.error('approveUser: fallo al obtener datos del usuario', {
      error: fetchError.message,
      userId,
    })
  }

  // Extraer rol para verificar estado antes de aprobar
  const rolRaw = Array.isArray(usuario?.roles)
    ? usuario?.roles[0]?.nombre_rol
    : (usuario?.roles as { nombre_rol?: string } | null)?.nombre_rol

  // Reactivar/aprobar a un administrador es acción de superadmin: mismas reglas
  // que la baja (gate de superadmin + antigüedad), para que el control de
  // desactivación no se evada reactivando desde aquí.
  if (rolRaw === 'administrador') {
    const ctx = await resolveAdminTargetContext(
      adminClient,
      actor.id,
      parsed.data,
    )
    const verdict = evaluateAdminManagement({
      action: 'reactivate',
      actorNivel: ctx.actorNivel,
      actorFechaRegistro: ctx.actorFechaRegistro ?? '',
      targetNivel: ctx.targetNivel,
      targetFechaRegistro: ctx.targetFechaRegistro ?? '',
      activeSuperadminCount: ctx.activeSuperadminCount,
    })
    if (!verdict.allowed) {
      return err(verdict.reason)
    }
  }

  // Bloquear aprobación si el usuario no fue verificado primero
  if (rolRaw === 'egresado') {
    const { data: estudiante } = await adminClient
      .from('estudiantes')
      .select('estado_verificacion')
      .eq('id_usuario', parsed.data)
      .maybeSingle()
    if (estudiante?.estado_verificacion !== 'verificado') {
      return err('user_not_verified')
    }
  } else if (rolRaw === 'empresario') {
    const { data: empresario } = await adminClient
      .from('empresarios')
      .select('estado_verificacion')
      .eq('id_usuario', parsed.data)
      .maybeSingle()
    if (empresario?.estado_verificacion !== 'verificado') {
      return err('user_not_verified')
    }
  }

  const { error } = await adminClient
    .from('usuarios')
    .update({ estado_cuenta: 'activa', is_active: true })
    .eq('id_usuario', parsed.data)

  if (error) {
    logger.error('approveUser failed', { error: error.message, userId })
    return err(error.message)
  }

  // Notificación in-app: el usuario la ve al primer login. Best-effort.
  if (rolRaw !== 'administrador') {
    const rolParaNotif: 'egresado' | 'empresario' =
      rolRaw === 'empresario' ? 'empresario' : 'egresado'
    await crearNotificacion({
      idUsuario: parsed.data,
      tipoEvento: 'cuenta_verificada',
      mensaje: 'content.cuenta_verificada',
      urlDestino: `/${DEFAULT_LOCALE}${ROLE_HOME[rolParaNotif]}`,
    })
  }

  // Enviar correo de aprobación (solo egresado/empresario: la plantilla es
  // específica de esos roles). Los admins se activan con su flujo de invitación.
  if (usuario?.correo && rolRaw !== 'administrador') {
    const reqHeaders = await headers()
    const host =
      reqHeaders.get('x-forwarded-host') ??
      reqHeaders.get('host') ??
      'localhost:3000'
    const proto = reqHeaders.get('x-forwarded-proto') ?? 'https'
    const baseUrl = `${proto}://${host}`

    const rol: 'egresado' | 'empresario' =
      rolRaw === 'empresario' ? 'empresario' : 'egresado'

    // Generar magic link de acceso directo hacia /auth/confirm (verifyOtp con
    // token_hash). Si falla, se usa el login estático como fallback.
    let accessUrl = `${baseUrl}/login`
    let isMagicLink = false
    const { data: linkData, error: linkError } =
      await adminClient.auth.admin.generateLink({
        type: 'magiclink',
        email: usuario.correo,
      })

    if (linkError) {
      logger.error('approveUser: fallo al generar magic link', {
        error: linkError.message,
        userId,
      })
    } else {
      const tokenHash = linkData.properties?.hashed_token
      const otpType = linkData.properties?.verification_type
      if (tokenHash && otpType) {
        const params = new URLSearchParams({
          token_hash: tokenHash,
          type: otpType,
          next: ROLE_HOME[rol],
        })
        accessUrl = `${baseUrl}/auth/confirm?${params.toString()}`
        isMagicLink = true
      } else {
        logger.error('approveUser: el magic link no incluye token_hash', {
          userId,
        })
      }
    }

    let emailError: Error | null = null
    try {
      const transport = createGmailTransport()
      await transport.sendMail({
        from: getGmailFrom(),
        to: usuario.correo,
        subject: accountApprovedSubject(),
        html: accountApprovedHtml({
          nombre: usuario.nombre ?? 'Usuario',
          rol,
          accessUrl,
          isMagicLink,
        }),
      })
    } catch (e) {
      emailError = e instanceof Error ? e : new Error(String(e))
    }

    if (emailError) {
      logger.error('approveUser: fallo al enviar correo de aprobación', {
        error: emailError.message,
        userId,
      })
    }
  }

  if (rolRaw === 'administrador') {
    const { error: auditError } = await adminClient.from('auditoria').insert({
      id_actor: actor.id,
      accion: 'reactivar_admin',
      entidad: 'usuarios',
      id_entidad: parsed.data,
      valores_despues: { estado_cuenta: 'activa', is_active: true },
    })
    if (auditError) {
      logger.error('approveUser: fallo al registrar en auditoria', {
        error: auditError.message,
        userId,
      })
    }
  }

  revalidatePath('/admin/validations', 'page')
  revalidatePath('/admin/users', 'page')
  return ok(undefined)
}

export async function signUpWithPassword(input: {
  email: string
  password: string
  fullName: string
  role: 'egresado' | 'empresario'
}): Promise<Result<void>> {
  const parsed = z
    .object({
      email: z.string().email(),
      password: z.string().min(8),
      fullName: z.string().min(2),
      role: z.enum(['egresado', 'empresario']),
    })
    .safeParse(input)

  if (!parsed.success) return err('invalid_input')

  let pwnedCount: number
  try {
    pwnedCount = await checkPwnedPassword(parsed.data.password)
  } catch {
    return err('pwned_check_failed')
  }

  if (pwnedCount > 0) return err('password_breached')

  const adminClient = createSupabaseAdminClient()

  const { data: existingUser } = await adminClient
    .from('usuarios')
    .select('id_usuario')
    .eq('correo', parsed.data.email)
    .maybeSingle()

  if (existingUser) {
    // Anti-enumeración: no revelar que el correo ya está registrado.
    return err('email_already_exists')
  }

  // Ningún rol requiere verificación de correo: se usa admin.createUser con
  // email_confirm: true para que el usuario quede activo de inmediato y pueda
  // hacer auto-login desde el cliente sin pasar por un link de confirmación.
  const { error } = await adminClient.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: {
      full_name: parsed.data.fullName,
      role: parsed.data.role,
    },
  })

  if (error) {
    if (
      error.message.toLowerCase().includes('already') ||
      error.message.toLowerCase().includes('exist')
    ) {
      return err('email_already_exists')
    }
    logger.error('signUpWithPassword failed', { error: error.message })
    return err(error.message)
  }

  return ok(undefined)
}

/**
 * Login con contraseña + bloqueo por intentos fallidos (RF-03).
 *
 * El bloqueo vive solo en el servidor con el cliente admin (service role): un
 * login fallido no tiene sesión, así que la escritura en `usuarios` no podría
 * pasar por RLS. OTP y OAuth quedan fuera del contador.
 *
 * - Pre-chequea `bloqueado_hasta`; si sigue vigente devuelve err('account_locked').
 * - Solo en credenciales inválidas (código `invalid_credentials`) invoca el RPC
 *   `register_failed_login`, que realiza el incremento de forma atómica en una
 *   sola sentencia UPDATE (sin race condition de lectura previa). Otros errores
 *   de Supabase (email sin confirmar, rate-limit, etc.) NO incrementan el contador.
 * - En login exitoso resetea el contador.
 * - El error de credenciales es neutro: no revela si el correo existe.
 */
export async function signInWithPassword(
  input: SignInInput,
): Promise<Result<void>> {
  const parsed = SignInSchema.safeParse(input)
  if (!parsed.success) return err('invalid_input')

  const { email, password } = parsed.data

  const admin = createSupabaseAdminClient()

  // Estado de bloqueo actual del usuario (si la cuenta existe).
  const { data: usuario } = await admin
    .from('usuarios')
    .select('id_usuario, intentos_fallidos, bloqueado_hasta')
    .eq('correo', email)
    .maybeSingle()

  if (
    usuario?.bloqueado_hasta &&
    new Date(usuario.bloqueado_hasta) > new Date()
  ) {
    return err('account_locked')
  }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    // Solo incrementar el contador si el error es de credenciales inválidas.
    // Otros códigos (email_not_confirmed, over_request_rate_limit, etc.) no
    // representan un intento de fuerza bruta y no deben penalizar al usuario.
    if (usuario && error.code === 'invalid_credentials') {
      const { error: rpcError } = await admin.rpc('register_failed_login', {
        p_email: email,
      })
      if (rpcError) {
        logger.error('signInWithPassword: fallo al registrar intento fallido', {
          error: rpcError.message,
        })
      }
    }
    return err('invalid_credentials')
  }

  // Login exitoso: resetear el contador si traía intentos o bloqueo previo.
  if (usuario && (usuario.intentos_fallidos > 0 || usuario.bloqueado_hasta)) {
    const { error: resetError } = await admin
      .from('usuarios')
      .update({ intentos_fallidos: 0, bloqueado_hasta: null })
      .eq('id_usuario', usuario.id_usuario)
    if (resetError) {
      logger.error('signInWithPassword: fallo al resetear intentos', {
        error: resetError.message,
      })
    }
  }

  revalidatePath('/', 'layout')
  return ok(undefined)
}

/**
 * Guarda el perfil del empresario al completar el onboarding (RF-06 / RF-16).
 *
 * - Verifica que el usuario esté autenticado y tenga rol 'empresario'.
 * - UPDATE en usuarios (nombre, apellidos, fecha de nacimiento, foto de perfil).
 * - UPSERT en empresarios (idempotente si el usuario re-envía el formulario).
 * - INSERT en consentimientos con tipo 'terminos_servicio'.
 */
export async function saveEmpresarioProfile(
  input: SaveEmpresarioProfileInput,
): Promise<Result<void>> {
  const parsed = SaveEmpresarioProfileSchema.safeParse(input)
  if (!parsed.success) return err('invalid_input')

  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return err('unauthorized')

  const { data: roleRaw } = await supabase.rpc('get_my_role')
  if (normalizeRole(roleRaw as string | null) !== 'empresario') {
    return err('forbidden')
  }

  const { error: usuariosError } = await supabase
    .from('usuarios')
    .update({
      nombre: parsed.data.nombre,
      apellido_1: parsed.data.primer_apellido,
      apellido_2: parsed.data.segundo_apellido || null,
      fecha_nacimiento: parsed.data.fecha_nacimiento,
      foto_perfil: parsed.data.foto_perfil_url ?? null,
    })
    .eq('id_usuario', user.id)

  if (usuariosError) {
    logger.error('saveEmpresarioProfile: fallo al actualizar usuarios', {
      error: usuariosError.message,
    })
    return err(usuariosError.message)
  }

  const { error: empresarioError } = await supabase.from('empresarios').upsert(
    {
      id_usuario: user.id,
      tipo_empresario: parsed.data.tipo_empresario,
      nombre_empresa: parsed.data.nombre_empresa,
      pais_iso_sede: parsed.data.pais,
      region_sede: parsed.data.ciudad,
      alcance_operativo: parsed.data.alcance_operativo,
    },
    { onConflict: 'id_usuario' },
  )

  if (empresarioError) {
    logger.error('saveEmpresarioProfile: fallo al upsert empresarios', {
      error: empresarioError.message,
    })
    return err(empresarioError.message)
  }

  const reqHeaders = await headers()
  const ipOrigen =
    reqHeaders.get('x-forwarded-for')?.split(',')[0]?.trim().slice(0, 60) ??
    null
  const userAgent = reqHeaders.get('user-agent')?.slice(0, 255) ?? null

  const { error: consentError } = await supabase
    .from('consentimientos')
    .insert({
      id_usuario: user.id,
      tipo_consentimiento: 'terminos_servicio',
      otorgado: true,
      ip_origen: ipOrigen,
      user_agent: userAgent,
    })

  if (consentError) {
    logger.error('saveEmpresarioProfile: fallo al registrar consentimiento', {
      error: consentError.message,
    })
  }

  revalidatePath('/', 'layout')
  return ok(undefined)
}

export async function updatePassword(password: string): Promise<Result<void>> {
  const parsed = z.string().min(8).safeParse(password)
  if (!parsed.success) return err('password_too_short')

  let pwnedCount: number
  try {
    pwnedCount = await checkPwnedPassword(parsed.data)
  } catch {
    return err('pwned_check_failed')
  }

  if (pwnedCount > 0) return err('password_breached')

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.updateUser({ password: parsed.data })

  if (error) {
    const code = (error as { code?: string }).code ?? ''
    const detail = error.message?.toLowerCase() ?? ''
    logger.error('updatePassword failed', { error: error.message, code })
    if (code === 'same_password' || detail.includes('different from the old')) {
      return err('password_same_as_old')
    }
    if (
      code === 'weak_password' ||
      detail.includes('password should be') ||
      detail.includes('weak')
    ) {
      return err('password_weak')
    }
    if (
      code === 'session_not_found' ||
      detail.includes('session') ||
      detail.includes('jwt') ||
      detail.includes('not authenticated')
    ) {
      return err('session_expired')
    }
    return err('update_failed')
  }

  // Activación del admin invitado (Opción 1): un administrador nace 'pendiente'
  // y se activa SOLO al fijar su contraseña por primera vez. La condición es
  // estrecha (rol administrador + estado pendiente), así que es no-op para un
  // reset normal (cuentas ya activas) y para un admin desactivado (sigue
  // 'activa' con is_active = false; su reactivación pasa por approveUser).
  const {
    data: { user: invitedUser },
  } = await supabase.auth.getUser()
  if (invitedUser) {
    const adminClient = createSupabaseAdminClient()
    const { data: row } = await adminClient
      .from('usuarios')
      .select('estado_cuenta, roles(nombre_rol)')
      .eq('id_usuario', invitedUser.id)
      .maybeSingle()
    const rolNombre = Array.isArray(row?.roles)
      ? row?.roles[0]?.nombre_rol
      : (row?.roles as { nombre_rol?: string } | null)?.nombre_rol
    if (rolNombre === 'administrador' && row?.estado_cuenta === 'pendiente') {
      const { error: activateError } = await adminClient
        .from('usuarios')
        .update({ estado_cuenta: 'activa', is_active: true })
        .eq('id_usuario', invitedUser.id)
      if (activateError) {
        logger.error('updatePassword: fallo al activar admin invitado', {
          error: activateError.message,
        })
      }
    }
  }

  // Endurecimiento: el enlace de recuperación/invitación crea una sesión
  // completa, no solo "permiso para cambiar la clave". Dejarla viva equivale a
  // un login persistente obtenido sin conocer la contraseña. Cerramos la sesión
  // (scope global: revoca también otras sesiones del usuario tras el cambio) y
  // así forzamos un login fresco con la contraseña nueva.
  const { error: signOutError } = await supabase.auth.signOut()
  if (signOutError) {
    logger.error('updatePassword: fallo al cerrar la sesión de recuperación', {
      error: signOutError.message,
    })
  }

  return ok(undefined)
}
