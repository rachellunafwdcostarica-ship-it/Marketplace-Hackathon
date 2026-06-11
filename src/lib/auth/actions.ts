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
import { AssignRoleSchema, type AssignRoleInput } from './schemas'
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
 * Aprueba la cuenta de un usuario (estado_cuenta → 'activa').
 * Solo puede ser llamada por un usuario con rol 'admin'.
 * Usa el cliente de servicio para bypassear RLS.
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
    .update({ estado_cuenta: 'activa' })
    .eq('id_usuario', parsed.data)

  if (error) {
    logger.error('approveUser failed', { error: error.message, userId })
    return err(error.message)
  }

  revalidatePath('/admin/validations', 'page')
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
      password: z.string().min(6),
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
