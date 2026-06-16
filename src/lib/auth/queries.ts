import 'server-only'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { ok, err, type Result } from '@/lib/result'
import { logger } from '@/lib/logger'
import type { Database } from '@/types/database'
import { env } from '@/lib/env'

export async function getMyAccountStatus(): Promise<Result<string | null>> {
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
            // no-op cuando se llama desde un Server Component
          }
        },
      },
    },
  )

  const { data, error } = await supabase.rpc('get_my_account_status')

  if (error) {
    logger.error('getMyAccountStatus failed', { error: error.message })
    return err(error.message)
  }

  return ok(data)
}

export async function getUserRole(): Promise<Result<string>> {
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
            // no-op cuando se llama desde un Server Component
          }
        },
      },
    },
  )

  const { data, error } = await supabase.rpc('get_my_role')

  if (error) {
    logger.error('getUserRole failed', { error: error.message })
    return err(error.message)
  }

  if (!data) return err('no_role')

  return ok(data)
}
