'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Link, useRouter } from '@/i18n/routing'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as zod from 'zod'
import { toast } from 'sonner'
import { Lock, ArrowRight, ArrowLeft } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { updatePassword } from '@/lib/auth/actions'
import { AuthCard } from '@/components/features/auth/AuthCard'
import { AuthHeader } from '@/components/features/auth/AuthHeader'
import { VerificationMessage } from '@/components/features/auth/VerificationMessage'
import { PasswordStrengthIndicator } from '@/components/features/auth/PasswordStrengthIndicator'

interface ResetFormValues {
  password: string
  confirmPassword: string
}

function createResetSchema(
  t: ReturnType<typeof useTranslations<'Validation'>>,
) {
  return zod
    .object({
      password: zod.string().min(8, { message: t('passwordMin') }),
      confirmPassword: zod.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t('passwordMismatch'),
      path: ['confirmPassword'],
    })
}

export default function ResetPasswordPage() {
  const tAuth = useTranslations('Auth')
  const tValidation = useTranslations('Validation')
  const router = useRouter()

  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  // null = comprobando; false = sin sesión de recuperación (enlace inválido)
  const [sessionOk, setSessionOk] = useState<boolean | null>(null)

  useEffect(() => {
    const supabase = createSupabaseBrowserClient()
    supabase.auth.getSession().then(({ data }) => {
      setSessionOk(Boolean(data.session))
    })
  }, [])

  const resetSchema = useMemo(
    () => createResetSchema(tValidation),
    [tValidation],
  )

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: '', confirmPassword: '' },
  })

  const passwordValue = watch('password')

  const onSubmit = async (data: ResetFormValues) => {
    setLoading(true)
    const result = await updatePassword(data.password)
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
    setSuccess(true)
    toast.success(tAuth('resetSuccessDesc'))
  }

  // Sesión de recuperación ausente → enlace inválido o expirado
  if (sessionOk === false && !success) {
    return (
      <AuthCard>
        <div className="space-y-6">
          <VerificationMessage
            title={tAuth('resetInvalidTitle')}
            description={tAuth('resetInvalidDesc')}
            success={false}
          />
          <div className="text-center">
            <Link
              href="/forgot-password"
              className="inline-flex items-center gap-2 text-xs font-bold text-primary hover:underline"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              {tAuth('forgotTitle')}
            </Link>
          </div>
        </div>
      </AuthCard>
    )
  }

  return (
    <AuthCard>
      <div className="space-y-6">
        {success ? (
          <div className="space-y-6">
            <VerificationMessage
              title={tAuth('resetSuccessTitle')}
              description={tAuth('resetSuccessDesc')}
              success={true}
            />
            <Button
              onClick={() => router.push('/login')}
              className="w-full h-12 rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all duration-200"
            >
              {tAuth('signIn')}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <>
            <AuthHeader
              welcomeText={tAuth('welcome')}
              title={tAuth('resetTitle')}
              subtitle={tAuth('resetSubtitle')}
            />

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
                disabled={loading || sessionOk !== true}
                className="w-full h-12 rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all duration-200"
              >
                {loading ? tAuth('resetSaving') : tAuth('resetButton')}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </Button>
            </form>

            <div className="text-center pt-2">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-xs font-bold text-primary hover:underline"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                {tAuth('signIn')}
              </Link>
            </div>
          </>
        )}
      </div>
    </AuthCard>
  )
}
