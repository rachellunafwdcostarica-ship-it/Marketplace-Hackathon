import 'server-only'
import { cache } from 'react'
import { createSupabaseServerClient } from '@/lib/supabase/server'

/**
 * Obtiene el usuario autenticado actual, memoizado por render de servidor.
 * React.cache() colapsa llamadas paralelas/secuenciales dentro del mismo
 * request a una sola round-trip a Supabase Auth, eliminando la duplicación
 * en rutas donde layout + pages + actions invocan getUser() por separado (§4.2).
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
})
