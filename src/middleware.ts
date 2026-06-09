import createMiddleware from 'next-intl/middleware'
import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'
import { routing } from './i18n/routing'

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
  return /^\/(es|en)\/(login|register|forgot-password|verify-email|role-select)(\/|$)/.test(
    pathname,
  )
}

function getPathRole(pathname: string): string | null {
  const match = pathname.match(/^\/(es|en)\/(junior|empresa|admin)(\/|$)/)
  return match ? (match[2] ?? null) : null
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

  // CASO B: Usuario autenticado
  // B.1. Usuario ya tiene un rol seleccionado
  if (roleCookie && ['junior', 'empresa', 'admin'].includes(roleCookie)) {
    // Si intenta acceder a páginas públicas de auth (login, register, role-select, etc)
    if (isPublicAuthPage(pathname)) {
      return NextResponse.redirect(
        new URL(`/${locale}/${roleCookie}`, request.url),
      )
    }
    // Si intenta acceder al dashboard de OTRO rol (ej: es junior e intenta entrar a /empresa)
    const pathRole = getPathRole(pathname)
    if (pathRole && pathRole !== roleCookie) {
      return NextResponse.redirect(
        new URL(`/${locale}/${roleCookie}`, request.url),
      )
    }
  }
  // B.2. Usuario NO tiene un rol seleccionado aún
  else {
    // Si intenta acceder a un área protegida sin haber seleccionado rol, forzar a /role-select
    if (isProtected(pathname)) {
      return NextResponse.redirect(
        new URL(`/${locale}/role-select`, request.url),
      )
    }
  }

  return intlResponse
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}
