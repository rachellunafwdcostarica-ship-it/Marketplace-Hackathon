import createMiddleware from 'next-intl/middleware'
import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'
import { routing } from './i18n/routing'
import { normalizeRole, ROLE_HOME } from '@/lib/auth/roles'
import type { Database } from '@/types/database'
import { env } from '@/lib/env'

const intlMiddleware = createMiddleware(routing)

const PROTECTED_PREFIXES = ['/junior', '/empresario', '/admin']

function getLocale(pathname: string): string {
  return pathname.startsWith('/en') ? 'en' : 'es'
}

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((prefix) =>
    pathname.match(new RegExp(`^/(es|en)${prefix}`)),
  )
}

function isPublicAuthPage(pathname: string): boolean {
  return /^\/(es|en)\/(login|register|forgot-password|verify-email)(\/|$)/.test(
    pathname,
  )
}

function isOnboardingPath(pathname: string): boolean {
  return /^\/(es|en)\/onboarding(\/|$)/.test(pathname)
}

function getRouteRole(
  pathname: string,
): 'egresado' | 'empresario' | 'administrador' | null {
  if (/^\/(es|en)\/junior/.test(pathname)) return 'egresado'
  if (/^\/(es|en)\/empresario/.test(pathname)) return 'empresario'
  if (/^\/(es|en)\/admin/.test(pathname)) return 'administrador'
  return null
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // La ruta de callback de OAuth no necesita locale ni protección
  if (pathname === '/auth/callback') {
    return NextResponse.next()
  }

  // Server actions son POSTs. Ya hacen requireRole() internamente.
  // El middleware no agrega valor y sus llamadas a Supabase cuelgan la petición.
  if (request.method === 'POST') {
    return NextResponse.next()
  }

  // Construir respuesta base con next-intl
  const intlResponse = intlMiddleware(request)

  // Refrescar sesión de Supabase y propagar cookies
  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          cookiesToSet.forEach(({ name, value, options }) =>
            intlResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const locale = getLocale(pathname)

  // CASO A: Usuario NO autenticado
  if (!user) {
    // Si no es una página de autenticación pública, redirigir a /login
    if (!isPublicAuthPage(pathname)) {
      return NextResponse.redirect(new URL(`/${locale}/login`, request.url))
    }
    return intlResponse
  }

  // A partir de aquí: usuario autenticado

  // GATE DE SUSPENSIÓN (RF-65 / #83): una cuenta suspendida no puede usar la
  // plataforma. Se evalúa en rutas protegidas, de auth y onboarding. Si está
  // suspendida se cierra la sesión y se rebota a /login?reason=suspended.
  if (
    isProtected(pathname) ||
    isPublicAuthPage(pathname) ||
    isOnboardingPath(pathname)
  ) {
    const [{ data: accountStatus }, { data: usuarioRow }] = await Promise.all([
      supabase.rpc('get_my_account_status'),
      supabase
        .from('usuarios')
        .select('is_active')
        .eq('id_usuario', user.id)
        .maybeSingle(),
    ])

    // Bloqueo duro: cuenta suspendida (RF-65) o desactivada por un admin
    // (is_active = false). Ambos cierran sesión y rebotan a /login.
    let blockReason: 'suspended' | 'deactivated' | null = null
    if (
      accountStatus === 'suspendida' ||
      accountStatus === 'suspendida_severa'
    ) {
      blockReason = 'suspended'
    } else if (usuarioRow?.is_active === false) {
      blockReason = 'deactivated'
    }

    if (blockReason) {
      await supabase.auth.signOut()

      // Si ya está en una página de auth, dejarla renderizar (evita un bucle
      // de redirecciones contra /login).
      if (isPublicAuthPage(pathname)) {
        return intlResponse
      }

      const loginUrl = new URL(`/${locale}/login`, request.url)
      loginUrl.searchParams.set('reason', blockReason)
      const redirect = NextResponse.redirect(loginUrl)
      // Propagar las cookies de cierre de sesión escritas por signOut().
      intlResponse.cookies.getAll().forEach((cookie) => {
        redirect.cookies.set(cookie)
      })
      return redirect
    }
  }

  // CASO B: Ruta protegida
  if (isProtected(pathname)) {
    const { data: roleRaw } = await supabase.rpc('get_my_role')
    const role = normalizeRole(roleRaw)

    if (!role) {
      // Sin rol asignado → onboarding obligatorio
      return NextResponse.redirect(
        new URL(`/${locale}/onboarding`, request.url),
      )
    }

    const routeRole = getRouteRole(pathname)
    if (routeRole && routeRole !== role) {
      // Rol incorrecto → redirect silencioso al home propio (Q5)
      return NextResponse.redirect(
        new URL(`/${locale}${ROLE_HOME[role]}`, request.url),
      )
    }

    return intlResponse
  }

  // CASO C: Página pública de auth (login, register, etc.)
  if (isPublicAuthPage(pathname)) {
    const { data: roleRaw } = await supabase.rpc('get_my_role')
    const role = normalizeRole(roleRaw)

    if (role) {
      return NextResponse.redirect(
        new URL(`/${locale}${ROLE_HOME[role]}`, request.url),
      )
    }
    // Sin rol → onboarding (ya tiene sesión pero aún no eligió rol)
    return NextResponse.redirect(new URL(`/${locale}/onboarding`, request.url))
  }

  // CASO D: /onboarding con usuario autenticado
  if (isOnboardingPath(pathname)) {
    const { data: roleRaw } = await supabase.rpc('get_my_role')
    const role = normalizeRole(roleRaw)

    if (role) {
      // Ya tiene rol → rebotar a home (refuerza permanencia Q6)
      return NextResponse.redirect(
        new URL(`/${locale}${ROLE_HOME[role]}`, request.url),
      )
    }
    // Sin rol → onboarding normal
    return intlResponse
  }

  return intlResponse
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}
