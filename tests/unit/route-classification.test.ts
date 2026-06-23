import { describe, it, expect } from 'vitest'
import {
  isProtected,
  isPublicAuthPage,
  isVerifyEmailPath,
  isOnboardingPath,
  isPendingApprovalPath,
  isResetPasswordPath,
  isForbiddenPath,
  isRoleExemptPath,
  getRouteRole,
} from '@/lib/auth/route-classification'

describe('isResetPasswordPath', () => {
  it('acierta en es y en, con o sin slash final', () => {
    expect(isResetPasswordPath('/es/reset-password')).toBe(true)
    expect(isResetPasswordPath('/en/reset-password')).toBe(true)
    expect(isResetPasswordPath('/es/reset-password/')).toBe(true)
  })

  it('no confunde sufijos ni otras rutas de auth', () => {
    expect(isResetPasswordPath('/es/reset-passwordX')).toBe(false)
    expect(isResetPasswordPath('/es/forgot-password')).toBe(false)
    expect(isResetPasswordPath('/reset-password')).toBe(false)
  })
})

describe('isForbiddenPath', () => {
  it('acierta /403 en es y en', () => {
    expect(isForbiddenPath('/es/403')).toBe(true)
    expect(isForbiddenPath('/en/403')).toBe(true)
    expect(isForbiddenPath('/es/403/')).toBe(true)
  })

  it('no confunde sufijos', () => {
    expect(isForbiddenPath('/es/4030')).toBe(false)
    expect(isForbiddenPath('/es/40')).toBe(false)
  })
})

describe('isRoleExemptPath', () => {
  it('exime auth, onboarding, reset-password y 403', () => {
    for (const pathname of [
      '/es/login',
      '/en/register',
      '/es/forgot-password',
      '/es/verify-email',
      '/es/onboarding',
      '/es/reset-password',
      '/es/403',
    ]) {
      expect(isRoleExemptPath(pathname)).toBe(true)
    }
  })

  it('NO exime rutas que requieren rol', () => {
    for (const pathname of [
      '/es/marketplace',
      '/es/dashboard',
      '/es/showcase',
      '/es/egresado/projects',
      '/es/empresario',
      '/es/admin',
    ]) {
      expect(isRoleExemptPath(pathname)).toBe(false)
    }
  })
})

describe('isProtected', () => {
  it('detecta las rutas protegidas por prefijo de rol', () => {
    expect(isProtected('/es/egresado/projects')).toBe(true)
    expect(isProtected('/en/empresario')).toBe(true)
    expect(isProtected('/es/admin/users')).toBe(true)
  })

  it('no marca rutas públicas o no clasificadas', () => {
    expect(isProtected('/es/login')).toBe(false)
    expect(isProtected('/es/marketplace')).toBe(false)
  })
})

describe('isPublicAuthPage', () => {
  it('cubre login/register/forgot-password/verify-email', () => {
    expect(isPublicAuthPage('/es/login')).toBe(true)
    expect(isPublicAuthPage('/en/register')).toBe(true)
    expect(isPublicAuthPage('/es/forgot-password')).toBe(true)
    expect(isPublicAuthPage('/en/verify-email')).toBe(true)
  })

  it('NO cubre reset-password (clave del fix del catch-all)', () => {
    expect(isPublicAuthPage('/es/reset-password')).toBe(false)
  })
})

describe('getRouteRole', () => {
  it('mapea el prefijo de la ruta a su rol', () => {
    expect(getRouteRole('/es/egresado/projects')).toBe('egresado')
    expect(getRouteRole('/en/empresario')).toBe('empresario')
    expect(getRouteRole('/es/admin/users')).toBe('administrador')
  })

  it('devuelve null para rutas sin prefijo de rol', () => {
    expect(getRouteRole('/es/marketplace')).toBe(null)
    expect(getRouteRole('/es/login')).toBe(null)
  })
})

describe('isVerifyEmailPath / isOnboardingPath / isPendingApprovalPath', () => {
  it('aciertan su propia ruta', () => {
    expect(isVerifyEmailPath('/es/verify-email')).toBe(true)
    expect(isOnboardingPath('/en/onboarding')).toBe(true)
    expect(isPendingApprovalPath('/es/pending-approval')).toBe(true)
  })

  it('rechazan otras rutas', () => {
    expect(isVerifyEmailPath('/es/login')).toBe(false)
    expect(isOnboardingPath('/es/marketplace')).toBe(false)
    expect(isPendingApprovalPath('/es/egresado')).toBe(false)
  })
})
