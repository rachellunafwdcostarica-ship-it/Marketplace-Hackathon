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
import { Mail, User, Lock, ArrowRight } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { signUpWithPassword } from '@/lib/auth/actions'
import { AuthCard } from '@/components/features/auth/AuthCard'
import { AuthHeader } from '@/components/features/auth/AuthHeader'
import { OAuthButtons } from '@/components/features/auth/OAuthButtons'
import { AuthFooter } from '@/components/features/auth/AuthFooter'
import { PasswordStrengthIndicator } from '@/components/features/auth/PasswordStrengthIndicator'
import { RoleSelector } from '@/components/features/auth/RoleSelector'
import { useAppState } from '@/lib/StateContext'
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
      fullName: zod.string().min(2, { message: t('titleMin') }),
      email: zod.string().email({ message: t('emailInvalid') }),
      password: zod.string().min(6, { message: t('titleMin') }),
      confirmPassword: zod.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: 'Las contraseñas no coinciden',
      path: ['confirmPassword'],
    })
}

export default function RegisterPage() {
  const tAuth = useTranslations('Auth')
  const tValidation = useTranslations('Validation')
  const router = useRouter()
  const { setUserRole } = useAppState()

  const [loading, setLoading] = useState(false)
  const [selectedRole, setSelectedRole] = useState<UserRole>('junior')

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

  const onSubmit = async (data: RegisterFormValues) => {
    setLoading(true)
    setUserRole(selectedRole)
    const result = await signUpWithPassword({
      email: data.email,
      password: data.password,
      fullName: data.fullName,
      role: selectedRole as 'junior' | 'empresa',
    })
    setLoading(false)
    if (!result.ok) {
      const message =
        result.error === 'password_breached'
          ? tAuth('passwordBreached')
          : result.error === 'pwned_check_failed'
            ? tAuth('pwnedCheckFailed')
            : result.error
      toast.error(message)
      return
    }
    toast.success(
      '¡Registro exitoso! Revisa tu correo para verificar tu cuenta.',
    )
    router.push(`/verify-email?email=${encodeURIComponent(data.email)}`)
  }

  const handleOAuthLogin = async (provider: 'google' | 'github') => {
    setLoading(true)
    setUserRole(selectedRole)
    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
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
          label="¿Cómo vas a usar FWD Talent?"
        />

        <OAuthButtons
          onGoogleClick={() => handleOAuthLogin('google')}
          onGitHubClick={() => handleOAuthLogin('github')}
          disabled={loading}
          googleText="Continuar con Google"
          githubText="Continuar con GitHub"
        />

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-surface px-3 text-ink-subtle font-semibold uppercase tracking-wider text-[10px]">
              o registrate con tu correo
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
          </div>

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
            disabled={loading}
            className="w-full h-12 rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all duration-200"
          >
            {loading ? 'Registrando...' : tAuth('createAccount')}
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
