import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { normalizeRole, ROLE_HOME } from '@/lib/auth/roles'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { env } from '@/lib/env'

function resolveLocale(value: string | undefined): 'es' | 'en' {
  return value === 'en' ? 'en' : 'es'
}

/**
 * Sólo permite rutas internas relativas para el parámetro `next`,
 * evitando open redirects (p.ej. `//evil.com` o `https://evil.com`).
 */
function safeNext(next: string | null): string | null {
  if (!next) return null
  if (!next.startsWith('/') || next.startsWith('//')) return null
  return next
}

function safeRole(
  raw: string | null | undefined,
): 'egresado' | 'empresario' | null {
  if (raw === 'egresado' || raw === 'empresario') return raw
  return null
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  const cookieStore = await cookies()
  const locale = resolveLocale(cookieStore.get('NEXT_LOCALE')?.value)

  if (!code) {
    return NextResponse.redirect(`${origin}/${locale}/login?error=missing_code`)
  }

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
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
    return NextResponse.redirect(
      `${origin}/${locale}/login?error=exchange_failed`,
    )
  }

  // Flujos con destino explícito (p.ej. recuperación de contraseña).
  // Tiene prioridad sobre el enrutado por rol.
  const next = safeNext(searchParams.get('next'))
  if (next) {
    return NextResponse.redirect(`${origin}/${locale}${next}`)
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Cookie como fuente primaria (garantizada a través del redirect OAuth),
  // URL param como respaldo por si el navegador bloqueó la cookie.
  const cookieRole = safeRole(cookieStore.get('pending-oauth-role')?.value)
  const oauthRole = cookieRole ?? safeRole(searchParams.get('role'))

  if (user && oauthRole) {
    const existingMetaRole = user.user_metadata?.role as string | undefined
    if (!existingMetaRole) {
      const admin = createSupabaseAdminClient()
      await admin.auth.admin.updateUserById(user.id, {
        user_metadata: {
          ...user.user_metadata,
          role: oauthRole,
        },
      })
    }
  }

  // Detectar si el usuario tiene rol asignado en BD (usuario recurrente).
  const { data: roleRaw } = await supabase.rpc('get_my_role')
  const role = normalizeRole(roleRaw as string | null)

  let redirectTarget: string
  if (role) {
    const { data: accountStatus } = await supabase.rpc('get_my_account_status')
    redirectTarget =
      accountStatus !== 'activa'
        ? `${origin}/${locale}/pending-approval`
        : `${origin}/${locale}${ROLE_HOME[role]}`
  } else {
    const metadataRole = safeRole(
      user?.user_metadata?.role as string | undefined,
    )
    const selectedRole = oauthRole ?? metadataRole

    if (!selectedRole) {
      await supabase.auth.signOut()
      const response = NextResponse.redirect(
        `${origin}/${locale}/register?error=missing_role`,
      )
      response.cookies.set('pending-oauth-role', '', { path: '/', maxAge: 0 })
      return response
    }

    // Usuario nuevo: onboarding unificado. La página ramifica por el rol elegido
    // (user_metadata.role, fijado arriba) entre el form de egresado y el de
    // empresario.
    redirectTarget = `${origin}/${locale}/onboarding`
  }

  const response = NextResponse.redirect(redirectTarget)
  // Limpiar la cookie de rol una vez consumida.
  response.cookies.set('pending-oauth-role', '', { path: '/', maxAge: 0 })
  return response
}
