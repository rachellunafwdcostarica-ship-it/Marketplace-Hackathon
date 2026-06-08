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

function isAuthPage(pathname: string): boolean {
  return /^\/(es|en)\/login/.test(pathname)
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

  // Ruta protegida sin sesión → login
  if (isProtected(pathname) && !user) {
    return NextResponse.redirect(new URL(`/${locale}/login`, request.url))
  }

  // Usuario ya autenticado intenta entrar al login → dashboard
  if (isAuthPage(pathname) && user) {
    return NextResponse.redirect(new URL(`/${locale}/junior`, request.url))
  }

  return intlResponse
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}
