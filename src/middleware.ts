import createMiddleware from 'next-intl/middleware'
import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'
import { routing } from './i18n/routing'
import { normalizeRole, ROLE_HOME } from '@/lib/auth/roles'
import type { Database } from '@/types/database'

const intlMiddleware = createMiddleware(routing)

const PROTECTED_PREFIXES = ['/junior', '/empresa', '/admin']

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

function getRouteRole(pathname: string): 'junior' | 'empresa' | 'admin' | null {
  if (/^\/(es|en)\/junior/.test(pathname)) return 'junior'
  if (/^\/(es|en)\/empresa/.test(pathname)) return 'empresa'
  if (/^\/(es|en)\/admin/.test(pathname)) return 'admin'
  return null
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // La ruta de callback de OAuth no necesita locale ni protección
  if (pathname === '/auth/callback') {
    return NextResponse.next()
  }

  // Construir respuesta base con next-intl
  const intlResponse = intlMiddleware(request)

  // Refrescar sesión de Supabase y propagar cookies
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

  // Si acceden a la página de inicio (raíz), redirigir a su home correspondiente según su rol
  if (pathname === `/${locale}` || pathname === `/${locale}/`) {
    const { data: roleRaw } = await supabase.rpc('get_my_role')
    const role = normalizeRole(roleRaw)
    if (role) {
      return NextResponse.redirect(
        new URL(`/${locale}${ROLE_HOME[role]}`, request.url),
      )
    } else {
      return NextResponse.redirect(
        new URL(`/${locale}/onboarding`, request.url),
      )
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
