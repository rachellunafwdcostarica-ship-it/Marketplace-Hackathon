import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { normalizeRole, ROLE_HOME } from '@/lib/auth/roles'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(`${origin}/es/login?error=missing_code`)
  }

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
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    },
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    logger.error('auth/callback: code exchange failed', {
      message: error.message,
    })
    return NextResponse.redirect(`${origin}/es/login?error=exchange_failed`)
  }

  // Detectar si el usuario tiene rol asignado (usuario nuevo vs. recurrente)
  const { data: roleRaw } = await supabase.rpc('get_my_role')
  const role = normalizeRole(roleRaw as string | null)

  if (role) {
    // Usuario recurrente → ir a su home
    return NextResponse.redirect(`${origin}/es${ROLE_HOME[role]}`)
  }

  // Usuario nuevo (sin rol) → onboarding obligatorio
  return NextResponse.redirect(`${origin}/es/onboarding`)
}
