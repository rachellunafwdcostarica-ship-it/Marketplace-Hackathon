'use server'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { ok, err, type Result } from '@/lib/result'
import { logger } from '@/lib/logger'
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

// TODO: assignRole — pendiente decisión de equipo (Q6)
// Quién puede llamar: admin, usuario en onboarding, o ambos con lógica diferente
