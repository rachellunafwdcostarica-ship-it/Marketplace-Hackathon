import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

const VALID_ROLES = ['junior', 'empresa', 'admin']

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

  // Si el usuario ya tiene un rol guardado en cookie, redirigir a ese dashboard
  const roleCookie = request.cookies.get('fwd_role')?.value
  const role =
    roleCookie && VALID_ROLES.includes(roleCookie) ? roleCookie : null

  if (role) {
    return NextResponse.redirect(`${origin}/es/${role}`)
  }

  // Si no tiene rol, ir a la pantalla de selección de rol
  return NextResponse.redirect(`${origin}/es/role-select`)
}
