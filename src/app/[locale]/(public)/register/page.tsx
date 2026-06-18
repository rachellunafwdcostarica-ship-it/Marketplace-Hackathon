'use client'

import React, { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Link, useRouter } from '@/i18n/routing'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as zod from 'zod'
import { toast } from 'sonner'
import { Mail, User, Lock, ArrowRight, AlertTriangle } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { signUpWithPassword } from '@/lib/auth/actions'
import { AuthCard } from '@/components/features/auth/AuthCard'
import { AuthHeader } from '@/components/features/auth/AuthHeader'
import { OAuthButtons } from '@/components/features/auth/OAuthButtons'
import { AuthFooter } from '@/components/features/auth/AuthFooter'
import { PasswordStrengthIndicator } from '@/components/features/auth/PasswordStrengthIndicator'
import { RoleSelector } from '@/components/features/auth/RoleSelector'
import { useAuth } from '@/lib/auth/AuthContext'
import type { UserRole } from '@/types'

interface RegisterFormValues {
  fullName: string
  email: string
  password: string
  confirmPassword: string
}

function createRegisterSchema(
  t: ReturnType<typeof useTranslations<'Validation'>>,
) {
  return zod
    .object({
      fullName: zod.string().min(2, { message: t('nameMin') }),
      email: zod.string().email({ message: t('emailInvalid') }),
      password: zod.string().min(8, { message: t('passwordMin') }),
      confirmPassword: zod.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t('passwordMismatch'),
      path: ['confirmPassword'],
    })
}

export default function RegisterPage() {
  const tAuth = useTranslations('Auth')
  const tLogin = useTranslations('Login')
  const tValidation = useTranslations('Validation')
  const router = useRouter()
  const { setUserRole } = useAuth()

  const [loading, setLoading] = useState(false)
  const [selectedRole, setSelectedRole] = useState<UserRole>('egresado')

  const registerSchema = useMemo(
    () => createRegisterSchema(tValidation),
    [tValidation],
  )

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  })

  const passwordValue = watch('password')
  const emailValue = watch('email')

  const isEgresadoEmailInvalid =
    selectedRole === 'egresado' &&
    emailValue.trim().length > 0 &&
    emailValue !== 'fwd@gmail.com'

  const onSubmit = async (data: RegisterFormValues) => {
    // Bloqueo de seguridad: la UI ya muestra el aviso, pero esto evita que
    // un correo no-FWD llegue al servidor si el usuario fuerza el submit.
    if (selectedRole === 'egresado' && data.email !== 'fwd@gmail.com') {
      return
    }
    setLoading(true)
    setUserRole(selectedRole)

    const result = await signUpWithPassword({
      email: data.email,
      password: data.password,
      fullName: data.fullName,
      role: selectedRole as 'egresado' | 'empresario',
    })

    const onboardingPath =
      selectedRole === 'empresario' ? '/onboarding/empresario' : '/onboarding'

    if (!result.ok) {
      if (result.error === 'email_already_exists') {
        // Anti-enumeración: mostrar éxito e intentar auto-login.
        // Si las credenciales coinciden, el usuario entra con su cuenta real.
        // Redirigir a /onboarding (no al path del rol elegido): el middleware
        // usa el rol real de la BD para mandarlo al destino correcto.
        toast.success(tAuth('registerSuccess'))
        const supabase = createSupabaseBrowserClient()
        await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        })
        router.push('/onboarding')
        setLoading(false)
        return
      }
      setLoading(false)
      const message =
        result.error === 'password_breached'
          ? tAuth('passwordBreached')
          : result.error === 'pwned_check_failed'
            ? tAuth('pwnedCheckFailed')
            : tAuth('errorUnexpected')
      toast.error(message)
      return
    }

    // Usuario creado y confirmado: hacer auto-login inmediato sin verificación
    // de correo. La ruta destino viene del rol elegido — no del metadata.
    const supabase = createSupabaseBrowserClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })

    setLoading(false)

    if (signInError) {
      toast.error(tAuth('errorUnexpected'))
      return
    }

    toast.success(tAuth('registerSuccess'))
    router.push(onboardingPath)
  }

  const handleOAuthLogin = async (provider: 'google' | 'github') => {
    setLoading(true)
    // Guardamos el rol en una cookie antes del redirect OAuth porque Supabase
    // no garantiza preservar query params personalizados en el redirectTo.
    // La cookie dura 5 min (tiempo suficiente para completar el flujo OAuth)
    // y el callback la lee como fuente primaria del rol.
    document.cookie = `pending-oauth-role=${selectedRole}; path=/; max-age=300; SameSite=Lax`
    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?role=${selectedRole}`,
      },
    })
    if (error) {
      toast.error(error.message)
      setLoading(false)
    }
  }

  return (
    <AuthCard>
      <div className="space-y-5">
        <AuthHeader
          welcomeText={tAuth('welcome')}
          title={tAuth('registerTitle')}
          subtitle={tAuth('registerSubtitle')}
        />

        {/* Role selector */}
        <RoleSelector
          selected={selectedRole}
          onChange={setSelectedRole}
          label={tAuth('roleTitle')}
        />

        <OAuthButtons
          onGoogleClick={() => handleOAuthLogin('google')}
          onGitHubClick={() => handleOAuthLogin('github')}
          disabled={loading}
          googleText={tLogin('google')}
          githubText={tLogin('github')}
        />

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-surface px-3 text-ink-subtle font-semibold uppercase tracking-wider text-[10px]">
              {tAuth('orWithEmail')}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Full Name */}
          <div className="space-y-1.5">
            <Label
              htmlFor="fullName"
              className="text-xs font-bold text-ink uppercase tracking-wider"
            >
              {tAuth('fullNameLabel')}
            </Label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-subtle" />
              <Input
                id="fullName"
                type="text"
                placeholder={tAuth('fullNamePlaceholder')}
                className={`pl-11 h-12 rounded-xl bg-surface-sunken/50 border-border focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary transition-all ${errors.fullName ? 'border-destructive' : ''}`}
                {...register('fullName')}
              />
            </div>
            {errors.fullName && (
              <p className="text-xs font-semibold text-destructive mt-1">
                {errors.fullName.message}
              </p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label
              htmlFor="email"
              className="text-xs font-bold text-ink uppercase tracking-wider"
            >
              {tAuth('emailLabel')}
            </Label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-subtle" />
              <Input
                id="email"
                type="email"
                placeholder={tAuth('emailPlaceholder')}
                className={`pl-11 h-12 rounded-xl bg-surface-sunken/50 border-border focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary transition-all ${errors.email ? 'border-destructive' : ''}`}
                {...register('email')}
              />
            </div>
            {errors.email && (
              <p className="text-xs font-semibold text-destructive mt-1">
                {errors.email.message}
              </p>
            )}
            {selectedRole === 'egresado' && !isEgresadoEmailInvalid && (
              <p className="text-[11px] text-ink-subtle font-medium mt-1">
                {tAuth('egresadoEmailHint')}
              </p>
            )}
          </div>

          {/* Bloque de contacto: correo no-FWD para egresado */}
          {isEgresadoEmailInvalid && (
            <div className="rounded-xl border border-warning/40 bg-warning/5 p-4 space-y-2 text-left">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                <p className="text-xs font-bold text-warning">
                  {tAuth('egresadoEmailInvalidTitle')}
                </p>
              </div>
              <p className="text-xs text-ink-muted leading-relaxed">
                {tAuth('egresadoEmailInvalidMsg')}
              </p>
              <div className="text-xs font-semibold text-ink space-y-0.5 pl-1">
                <p>Forward Costa Rica</p>
                <p>
                  e.{' '}
                  <span className="text-primary">
                    {tAuth('egresadoContactEmail')}
                  </span>
                </p>
                <p>
                  t:{' '}
                  <span className="text-primary">
                    {tAuth('egresadoContactPhone')}
                  </span>
                </p>
              </div>
              <p className="text-xs text-ink-subtle">
                {tAuth('egresadoContactSite')}
              </p>
            </div>
          )}

          {/* Password */}
          <div className="space-y-1.5">
            <Label
              htmlFor="password"
              className="text-xs font-bold text-ink uppercase tracking-wider"
            >
              {tAuth('passwordLabel')}
            </Label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-subtle" />
              <Input
                id="password"
                type="password"
                placeholder={tAuth('passwordPlaceholder')}
                className={`pl-11 h-12 rounded-xl bg-surface-sunken/50 border-border focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary transition-all ${errors.password ? 'border-destructive' : ''}`}
                {...register('password')}
              />
            </div>
            <PasswordStrengthIndicator password={passwordValue} />
            {errors.password && (
              <p className="text-xs font-semibold text-destructive mt-1">
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <Label
              htmlFor="confirmPassword"
              className="text-xs font-bold text-ink uppercase tracking-wider"
            >
              {tAuth('confirmPasswordLabel')}
            </Label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-subtle" />
              <Input
                id="confirmPassword"
                type="password"
                placeholder={tAuth('confirmPasswordPlaceholder')}
                className={`pl-11 h-12 rounded-xl bg-surface-sunken/50 border-border focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary transition-all ${errors.confirmPassword ? 'border-destructive' : ''}`}
                {...register('confirmPassword')}
              />
            </div>
            {errors.confirmPassword && (
              <p className="text-xs font-semibold text-destructive mt-1">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          <Button
            type="submit"
            disabled={loading || isEgresadoEmailInvalid}
            className="w-full h-12 rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all duration-200"
          >
            {loading ? tAuth('registering') : tAuth('createAccount')}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </Button>
        </form>

        <div className="text-center text-xs font-semibold pt-2 text-primary">
          <Link href="/login" className="hover:underline">
            {tAuth('haveAccount')} {tAuth('signIn')}
          </Link>
        </div>

        <AuthFooter />
      </div>
    </AuthCard>
  )
}
