import { createClient } from '@supabase/supabase-js'

// Solo usar en Server Actions o Route Handlers — nunca en el cliente.
// SUPABASE_SERVICE_ROLE_KEY bypasea RLS: usar solo para operaciones de admin.
export function createSupabaseAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}
