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

function isPendingApprovalPath(pathname: string): boolean {
  return /^\/(es|en)\/pending-approval(\/|$)/.test(pathname)
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

  // A partir de aquí: usuario autenticado.
  // Se cachea el estado de cuenta para reutilizarlo en los casos B-E
  // sin duplicar la llamada a Supabase.
  let cachedAccountStatus: string | null = null

  // GATE DE ESTADO DE CUENTA: suspensión, desactivación y cuenta pendiente.
  // Se evalúa para rutas protegidas, páginas públicas de auth, onboarding
  // y la propia página de espera.
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

    cachedAccountStatus = accountStatus ?? null

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

    // Bloqueo blando: cuenta pendiente de aprobación por el admin.
    // No cierra la sesión — el usuario solo no puede acceder al sistema.
    // /pending-approval y /onboarding siguen siendo accesibles para que el
    // usuario pueda ver su estado y completar el onboarding si todavía no lo hizo.
    if (accountStatus === 'pendiente' && isProtected(pathname)) {
      return NextResponse.redirect(
        new URL(`/${locale}/pending-approval`, request.url),
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
      // Rol incorrecto → redirect silencioso al home propio
      return NextResponse.redirect(
        new URL(`/${locale}${ROLE_HOME[role]}`, request.url),
      )
    }

    return intlResponse
  }

  // CASO C: Página pública de auth (login, register, etc.) con usuario autenticado.
  // Si ya tiene rol y la cuenta está activa → home del rol.
  // Si ya tiene rol pero la cuenta está pendiente → pending-approval (no al home).
  // Si no tiene rol → onboarding (todavía no eligió).
  if (isPublicAuthPage(pathname)) {
    const { data: roleRaw } = await supabase.rpc('get_my_role')
    const role = normalizeRole(roleRaw)

    if (role) {
      if (cachedAccountStatus !== 'activa') {
        return NextResponse.redirect(
          new URL(`/${locale}/pending-approval`, request.url),
        )
      }
      return NextResponse.redirect(
        new URL(`/${locale}${ROLE_HOME[role]}`, request.url),
      )
    }
    // Sin rol → onboarding (ya tiene sesión pero aún no eligió rol)
    return NextResponse.redirect(new URL(`/${locale}/onboarding`, request.url))
  }

  // CASO D: /onboarding con usuario autenticado.
  // Si ya tiene rol: cuenta activa → home; cuenta pendiente → pending-approval.
  // Sin rol → onboarding normal (deja pasar).
  if (isOnboardingPath(pathname)) {
    const { data: roleRaw } = await supabase.rpc('get_my_role')
    const role = normalizeRole(roleRaw)

    if (role) {
      if (cachedAccountStatus === 'activa') {
        return NextResponse.redirect(
          new URL(`/${locale}${ROLE_HOME[role]}`, request.url),
        )
      }
      // Tiene rol pero cuenta pendiente → pending-approval
      return NextResponse.redirect(
        new URL(`/${locale}/pending-approval`, request.url),
      )
    }
    // Sin rol → onboarding normal
    return intlResponse
  }

  // CASO E: /pending-approval con usuario autenticado.
  // Si la cuenta ya está activa y tiene rol → rebotar al home (ya fue aprobado).
  // Cualquier otro estado → dejar pasar (es la pantalla de espera).
  if (isPendingApprovalPath(pathname)) {
    if (cachedAccountStatus === 'activa') {
      const { data: roleRaw } = await supabase.rpc('get_my_role')
      const role = normalizeRole(roleRaw)
      if (role) {
        return NextResponse.redirect(
          new URL(`/${locale}${ROLE_HOME[role]}`, request.url),
        )
      }
    }
    return intlResponse
  }

  return intlResponse
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}
