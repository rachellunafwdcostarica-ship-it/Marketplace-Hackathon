import createMiddleware from 'next-intl/middleware'
import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'
import { routing } from './i18n/routing'
import { normalizeRole, ROLE_HOME } from '@/lib/auth/roles'
import type { Database } from '@/types/database'
import { env } from '@/lib/env'

const intlMiddleware = createMiddleware(routing)

const PROTECTED_PREFIXES = ['/egresado', '/empresario', '/admin']

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

function isVerifyEmailPath(pathname: string): boolean {
  return /^\/(es|en)\/verify-email(\/|$)/.test(pathname)
}

function isOnboardingPath(pathname: string): boolean {
  return /^\/(es|en)\/onboarding(\/|$)/.test(pathname)
}

function isPendingApprovalPath(pathname: string): boolean {
  return /^\/(es|en)\/pending-approval(\/|$)/.test(pathname)
}

function getRouteRole(
  pathname: string,
): 'egresado' | 'empresario' | 'administrador' | null {
  if (/^\/(es|en)\/egresado/.test(pathname)) return 'egresado'
  if (/^\/(es|en)\/empresario/.test(pathname)) return 'empresario'
  if (/^\/(es|en)\/admin/.test(pathname)) return 'administrador'
  return null
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Las rutas de auth (callback de OAuth y confirm de enlaces de email) son
  // route handlers que gestionan su propia sesión: no necesitan locale ni el
  // gate de protección. Además, next-intl no debe prefijarles un locale, porque
  // viven sin él y el redirect a /es/auth/... terminaría en 404.
  if (pathname.startsWith('/auth/')) {
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

  // CASO LANDING: usuario autenticado en la raíz localizada (/es, /en).
  // El administrador no usa la landing compartida; se le envía a su panel.
  // Sin rol asignado → onboarding (Camino B / OAuth incompleto).
  // No se valida aquí is_active ni la sesión: el gate de la ruta protegida
  // /admin revalida sesión, is_active, suspensión y rol tras el redirect.
  // Egresado y empresario verificados permanecen en la landing (su home).
  if (pathname === `/${locale}`) {
    const { data: roleRaw } = await supabase.rpc('get_my_role')
    const role = normalizeRole(roleRaw)
    if (!role) {
      return NextResponse.redirect(
        new URL(`/${locale}/onboarding`, request.url),
      )
    }
    if (role === 'administrador') {
      return NextResponse.redirect(
        new URL(`/${locale}${ROLE_HOME.administrador}`, request.url),
      )
    }
    return intlResponse
  }

  // A partir de aquí: usuario autenticado.

  // GATE DE CONFIRMACIÓN DE CORREO (RF-02): sin el correo confirmado, la cuenta
  // queda 'pendiente' y no puede entrar a nada salvo la pantalla de
  // verificación. La fuente de verdad es el objeto de sesión (sin RPC extra).
  if (!user.email_confirmed_at && !isVerifyEmailPath(pathname)) {
    return NextResponse.redirect(
      new URL(`/${locale}/verify-email`, request.url),
    )
  }

  // GATE DE ESTADO DE CUENTA: bloqueo duro por suspensión (RF-65) o
  // desactivación por un admin (is_active = false). Cierra la sesión y rebota a
  // /login. (La cuenta 'pendiente' = correo sin confirmar ya la atrapó el gate
  // de arriba.)
  if (
    isProtected(pathname) ||
    isPublicAuthPage(pathname) ||
    isOnboardingPath(pathname) ||
    isPendingApprovalPath(pathname)
  ) {
    const [{ data: accountStatus }, { data: usuarioRow }] = await Promise.all([
      supabase.rpc('get_my_account_status'),
      supabase
        .from('usuarios')
        .select('is_active')
        .eq('id_usuario', user.id)
        .maybeSingle(),
    ])

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
      // Rol incorrecto → redirect silencioso al home propio
      return NextResponse.redirect(
        new URL(`/${locale}${ROLE_HOME[role]}`, request.url),
      )
    }

    return intlResponse
  }

  // CASO C: Página pública de auth con usuario (ya confirmado). Con rol → home;
  // sin rol → onboarding. La pantalla de "en revisión" la maneja el gate del
  // layout / la página /pending-approval.
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

  // CASO D: /onboarding. Sin rol → dejar elegir rol y completar el perfil
  // (Camino B / OAuth, formulario único por rol). Con rol → home (el gate del
  // layout lo lleva a "en revisión" si todavía no está verificado).
  if (isOnboardingPath(pathname)) {
    const { data: roleRaw } = await supabase.rpc('get_my_role')
    const role = normalizeRole(roleRaw)

    if (role) {
      return NextResponse.redirect(
        new URL(`/${locale}${ROLE_HOME[role]}`, request.url),
      )
    }
    // Sin rol → onboarding normal
    return intlResponse
  }

  // CASO E: /pending-approval. Requiere rol (perfil creado); sin rol → onboarding.
  // La propia página redirige al panel si el perfil ya está verificado.
  if (isPendingApprovalPath(pathname)) {
    const { data: roleRaw } = await supabase.rpc('get_my_role')
    if (!normalizeRole(roleRaw)) {
      return NextResponse.redirect(
        new URL(`/${locale}/onboarding`, request.url),
      )
    }
    return intlResponse
  }

  // GATE DE ROL (catch-all): rutas no clasificadas (showcase, reset-password,
  // etc.) exigen rol asignado. Cierra el hueco que dejaba pasar usuarios OAuth
  // sin completar onboarding fuera de /egresado, /empresario y /admin.
  if (!isOnboardingPath(pathname) && !isPublicAuthPage(pathname)) {
    const { data: roleRaw } = await supabase.rpc('get_my_role')
    if (!normalizeRole(roleRaw)) {
      return NextResponse.redirect(
        new URL(`/${locale}/onboarding`, request.url),
      )
    }
  }

  return intlResponse
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}
