/**
 * Clasificación de rutas por `pathname` (lógica pura, sin dependencias de
 * `next/navigation` ni `next-intl/middleware`). El middleware y los tests
 * comparten exactamente estas funciones, y al no arrastrar el resolver de Next
 * corren en vitest (Node).
 */

const PROTECTED_PREFIXES = ['/egresado', '/empresario', '/admin']

export function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((prefix) =>
    pathname.match(new RegExp(`^/(es|en)${prefix}`)),
  )
}

export function isPublicAuthPage(pathname: string): boolean {
  return /^\/(es|en)\/(login|register|forgot-password|verify-email)(\/|$)/.test(
    pathname,
  )
}

export function isVerifyEmailPath(pathname: string): boolean {
  return /^\/(es|en)\/verify-email(\/|$)/.test(pathname)
}

export function isOnboardingPath(pathname: string): boolean {
  return /^\/(es|en)\/onboarding(\/|$)/.test(pathname)
}

export function isPendingApprovalPath(pathname: string): boolean {
  return /^\/(es|en)\/pending-approval(\/|$)/.test(pathname)
}

export function isResetPasswordPath(pathname: string): boolean {
  return /^\/(es|en)\/reset-password(\/|$)/.test(pathname)
}

export function isForbiddenPath(pathname: string): boolean {
  return /^\/(es|en)\/403(\/|$)/.test(pathname)
}

/**
 * Páginas que un usuario autenticado puede ver SIN un rol asignado: el flujo de
 * autenticación (login/register/forgot-password/verify-email), el onboarding,
 * la recuperación de contraseña (RF-04) y las páginas de error (403). El gate de
 * rol del middleware NO debe redirigir estas rutas a `/onboarding`.
 */
export function isRoleExemptPath(pathname: string): boolean {
  return (
    isPublicAuthPage(pathname) ||
    isOnboardingPath(pathname) ||
    isResetPasswordPath(pathname) ||
    isForbiddenPath(pathname)
  )
}

export function getRouteRole(
  pathname: string,
): 'egresado' | 'empresario' | 'administrador' | null {
  if (/^\/(es|en)\/egresado/.test(pathname)) return 'egresado'
  if (/^\/(es|en)\/empresario/.test(pathname)) return 'empresario'
  if (/^\/(es|en)\/admin/.test(pathname)) return 'administrador'
  return null
}
