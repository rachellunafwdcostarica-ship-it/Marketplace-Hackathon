'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { ok, err, type Result } from '@/lib/result'
import { logger } from '@/lib/logger'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { AssignRoleSchema, type AssignRoleInput } from './schemas'
import { getUserRole } from './queries'

export async function getCurrentUserRole(): Promise<Result<string>> {
  return getUserRole()
}

export async function signOut(): Promise<Result<void>> {
  const cookieStore = await cookies()

  const supabase = createServerClient(
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
  const roleResult = await getUserRole()
  if (!roleResult.ok) {
    return err('unauthenticated')
  }
  if (roleResult.data !== 'admin') {
    return err('forbidden')
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
