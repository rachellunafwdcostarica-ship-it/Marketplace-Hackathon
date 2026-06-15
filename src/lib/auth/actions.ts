'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import type { Database } from '@/types/database'
import { z } from 'zod'
import { ok, err, type Result } from '@/lib/result'
import { logger } from '@/lib/logger'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import {
  AssignRoleSchema,
  SignInSchema,
  type AssignRoleInput,
  type SignInInput,
} from './schemas'
import { getUserRole } from './queries'
import { requireRole } from './guards'
import { checkPwnedPassword } from './check-pwned-password'

export async function getCurrentUserRole(): Promise<Result<string>> {
  return getUserRole()
}

export async function signOut(): Promise<Result<void>> {
  const cookieStore = await cookies()

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
 * Asigna el rol al usuario actual durante el onboarding.
 *
 * - Solo acepta 'junior' o 'empresario' (Q6: nunca admin).
 * - En la BD (modelo XXI) el rol del junior se llama 'egresado';
 *   la traducción ocurre aquí, en la frontera.
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

  const dbRole = parsed.data.role === 'junior' ? 'egresado' : parsed.data.role

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.rpc('assign_my_role', {
    p_role: dbRole,
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
  const authResult = await requireRole('admin')
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
  role: 'junior' | 'empresa'
}): Promise<Result<void>> {
  const parsed = z
    .object({
      email: z.string().email(),
      password: z.string().min(8),
      fullName: z.string().min(2),
      role: z.enum(['junior', 'empresa']),
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
 * - En credenciales inválidas incrementa `intentos_fallidos`; al alcanzar
 *   `intentos_login_max` fija `bloqueado_hasta = now() + tiempo_bloqueo_minutos`.
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

  // Configuración del bloqueo (con defaults si faltara alguna fila).
  const { data: configRows } = await admin
    .from('configuracion_sistema')
    .select('clave, valor')
    .in('clave', ['intentos_login_max', 'tiempo_bloqueo_minutos'])

  const readIntConfig = (clave: string, fallback: number): number => {
    const row = configRows?.find((r) => r.clave === clave)
    const value = row ? Number.parseInt(row.valor, 10) : Number.NaN
    return Number.isFinite(value) ? value : fallback
  }
  const maxAttempts = readIntConfig('intentos_login_max', 5)
  const lockMinutes = readIntConfig('tiempo_bloqueo_minutos', 30)

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
    if (usuario) {
      const newCount = usuario.intentos_fallidos + 1
      const updates: { intentos_fallidos: number; bloqueado_hasta?: string } = {
        intentos_fallidos: newCount,
      }
      if (newCount >= maxAttempts) {
        updates.bloqueado_hasta = new Date(
          Date.now() + lockMinutes * 60_000,
        ).toISOString()
      }
      const { error: updateError } = await admin
        .from('usuarios')
        .update(updates)
        .eq('id_usuario', usuario.id_usuario)
      if (updateError) {
        logger.error('signInWithPassword: fallo al incrementar intentos', {
          error: updateError.message,
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
