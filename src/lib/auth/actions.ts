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
import { normalizeRole } from './roles'
import { checkPwnedPassword } from './check-pwned-password'

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

  // Usar service_role para bypassear RLS (admin no pasa por políticas)
  const adminClient = createSupabaseAdminClient()
  const { error } = await adminClient
    .from('usuarios')
    .update({ estado_cuenta: 'activa', is_active: true })
    .eq('id_usuario', parsed.data)

  if (error) {
    logger.error('approveUser failed', { error: error.message, userId })
    return err(error.message)
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

  const reqHeaders = await headers()
  const host =
    reqHeaders.get('x-forwarded-host') ??
    reqHeaders.get('host') ??
    'localhost:3000'
  const proto = reqHeaders.get('x-forwarded-proto') ?? 'https'
  const redirectTo = `${proto}://${host}/auth/callback`

  const adminClient = createSupabaseAdminClient()
  const { data: existingUser } = await adminClient
    .from('usuarios')
    .select('id_usuario')
    .eq('correo', parsed.data.email)
    .maybeSingle()

  if (existingUser) {
    // Anti-enumeración: la UI debe mostrar el mismo mensaje de éxito que un
    // registro nuevo. No revelar que el correo ya está registrado.
    return err('email_already_exists')
  }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.fullName,
        role: parsed.data.role,
      },
      emailRedirectTo: redirectTo,
    },
  })

  if (error) {
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
      pais_sede: parsed.data.pais,
      ciudad_sede: parsed.data.ciudad,
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
    logger.error('updatePassword failed', { error: error.message })
    return err(error.message)
  }

  return ok(undefined)
}
