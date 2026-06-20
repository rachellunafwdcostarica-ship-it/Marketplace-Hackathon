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

function isEmpresarioSetupPath(pathname: string): boolean {
  return /^\/(es|en)\/onboarding\/empresario(\/|$)/.test(pathname)
}

function isOnboardingPath(pathname: string): boolean {
  return (
    /^\/(es|en)\/onboarding(\/|$)/.test(pathname) &&
    !isEmpresarioSetupPath(pathname)
  )
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
  // No se valida aquí is_active ni la sesión: el gate de la ruta protegida
  // /admin revalida sesión, is_active, suspensión y rol tras el redirect.
  // Egresado y empresario permanecen en la landing (su home configurado).
  if (pathname === `/${locale}`) {
    const { data: roleRaw } = await supabase.rpc('get_my_role')
    if (normalizeRole(roleRaw) === 'administrador') {
      return NextResponse.redirect(
        new URL(`/${locale}${ROLE_HOME.administrador}`, request.url),
      )
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
    isPendingApprovalPath(pathname) ||
    isEmpresarioSetupPath(pathname)
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
  // Sin rol → onboarding normal (deja pasar para elegir rol y ver el formulario).
  // Con rol + activa → home del rol.
  // Con rol + pendiente:
  //   - empresario → formulario de perfil (puede que no lo haya completado aún)
  //   - egresado   → pending-approval (solo espera verificación)
  if (isOnboardingPath(pathname)) {
    const { data: roleRaw } = await supabase.rpc('get_my_role')
    const role = normalizeRole(roleRaw)

    if (role) {
      if (cachedAccountStatus === 'activa') {
        return NextResponse.redirect(
          new URL(`/${locale}${ROLE_HOME[role]}`, request.url),
        )
      }
      if (role === 'empresario') {
        return NextResponse.redirect(
          new URL(`/${locale}/onboarding/empresario`, request.url),
        )
      }
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

  // CASO F: /onboarding/empresario — formulario de perfil antes de pending-approval.
  // Accesible aunque la cuenta esté pendiente: es el paso previo a la aprobación.
  // Si aún no hay rol en BD (recién creado, trigger pendiente), la página se
  // encarga de asignarlo usando el metadata — no rebotar a /onboarding.
  // Las verificaciones de suspensión/desactivación ya se evaluaron en el gate.
  if (isEmpresarioSetupPath(pathname)) {
    const { data: roleRaw } = await supabase.rpc('get_my_role')
    const role = normalizeRole(roleRaw)
    if (role && role !== 'empresario') {
      // Tiene un rol distinto a empresario → su pantalla de espera
      return NextResponse.redirect(
        new URL(`/${locale}/pending-approval`, request.url),
      )
    }
    // Sin rol (page lo asigna) o ya es empresario → dejar pasar
    return intlResponse
  }

  return intlResponse
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}
