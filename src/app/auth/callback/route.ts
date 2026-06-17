import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { normalizeRole, ROLE_HOME } from '@/lib/auth/roles'
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

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  const cookieStore = await cookies()
  // next-intl guarda el locale activo en la cookie NEXT_LOCALE
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

  // Un correo ya registrado con otro proveedor no produce duplicado: Supabase
  // enlaza automáticamente la nueva identidad al usuario existente cuando el
  // correo está verificado (default). No hay nada que rechazar aquí.

  // Flujos con destino explícito (p.ej. recuperación de contraseña →
  // /reset-password). Tiene prioridad sobre el enrutado por rol.
  const next = safeNext(searchParams.get('next'))
  if (next) {
    return NextResponse.redirect(`${origin}/${locale}${next}`)
  }

  // Detectar si el usuario tiene rol asignado (usuario nuevo vs. recurrente)
  const { data: roleRaw } = await supabase.rpc('get_my_role')
  const role = normalizeRole(roleRaw as string | null)

  if (role) {
    // Usuario recurrente → ir a su home
    return NextResponse.redirect(`${origin}/${locale}${ROLE_HOME[role]}`)
  }

  // Usuario nuevo (sin rol) → onboarding obligatorio
  return NextResponse.redirect(`${origin}/${locale}/onboarding`)
}
