import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'
import { env } from '@/lib/env'

let instance: ReturnType<typeof createBrowserClient<Database>> | undefined

export function createSupabaseBrowserClient() {
  if (!instance) {
    instance = createBrowserClient<Database>(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    )
  }
  return instance
}
