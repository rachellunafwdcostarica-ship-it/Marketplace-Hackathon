import createMiddleware from 'next-intl/middleware'
import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'
import { routing } from './i18n/routing'
import type { UserRole } from '@/types'

const intlMiddleware = createMiddleware(routing)

const PROTECTED_PREFIXES = ['/junior', '/empresa', '/admin']

const ROLE_HOME: Record<UserRole, string> = {
  junior: '/junior',
  empresario: '/empresa',
  admin: '/admin',
}

function getLocale(pathname: string): string {
  return pathname.startsWith('/en') ? 'en' : 'es'
}

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((prefix) =>
    pathname.match(new RegExp(`^/(es|en)${prefix}`)),
  )
}

function isPublicAuthPage(pathname: string): boolean {
  return /^\/(es|en)\/(login|register|forgot-password|verify-email|role-select)(\/|$)/.test(
    pathname,
  )
}

function getPathRole(pathname: string): string | null {
  const match = pathname.match(/^\/(es|en)\/(junior|empresa|admin)(\/|$)/)
  return match ? (match[2] ?? null) : null
}

function getRouteRole(pathname: string): UserRole | null {
  if (/^\/(es|en)\/junior/.test(pathname)) return 'junior'
  if (/^\/(es|en)\/empresa/.test(pathname)) return 'empresario'
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
  const supabase = createServerClient(
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
  const roleCookie = request.cookies.get('fwd_role')?.value

  // CASO A: Usuario NO autenticado
  if (!user) {
    // Si intenta acceder a rutas protegidas o a role-select, redirigir a login
    if (
      isProtected(pathname) ||
      pathname.match(new RegExp(`^/(es|en)/role-select`))
    ) {
      return NextResponse.redirect(new URL(`/${locale}/login`, request.url))
    }
    return intlResponse
  }

  // Ruta protegida con sesión → verificar rol
  if (isProtected(pathname) && user) {
    const { data: role } = await supabase.rpc('get_my_role')

    if (!role) {
      // TODO: redirigir a onboarding cuando el equipo defina el flujo (Q1, Q2)
      return NextResponse.redirect(new URL(`/${locale}/login`, request.url))
    }

    const routeRole = getRouteRole(pathname)
    if (routeRole && routeRole !== (role as UserRole)) {
      return NextResponse.redirect(new URL(`/${locale}/403`, request.url))
    }
  }

  // Usuario autenticado intenta acceder al login → su home según rol
  if (isAuthPage(pathname) && user) {
    const { data: role } = await supabase.rpc('get_my_role')
    const home = role ? (ROLE_HOME[role as UserRole] ?? '/junior') : '/junior'
    return NextResponse.redirect(new URL(`/${locale}${home}`, request.url))
  }

  return intlResponse
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}
