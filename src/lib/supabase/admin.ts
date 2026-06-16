import 'server-only'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { env } from '@/lib/env'
import { serverEnv } from '@/lib/env.server'

// Solo usar en Server Actions o Route Handlers — nunca en el cliente.
// SUPABASE_SERVICE_ROLE_KEY bypasea RLS: usar solo para operaciones de admin.
// `server-only` falla el build si este módulo entra a un bundle de cliente.
export function createSupabaseAdminClient() {
  return createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}
