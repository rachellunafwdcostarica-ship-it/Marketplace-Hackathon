'use client'

import React, { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as zod from 'zod'
import { toast } from 'sonner'
import { Mail, ArrowRight, CheckCircle2 } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { AuthCard } from '@/components/features/auth/AuthCard'
import { AuthHeader } from '@/components/features/auth/AuthHeader'
import { OAuthButtons } from '@/components/features/auth/OAuthButtons'
import { AuthFooter } from '@/components/features/auth/AuthFooter'

interface LoginFormValues {
  email: string
}

function createLoginSchema(
  t: ReturnType<typeof useTranslations<'Validation'>>,
) {
  return zod.object({
    email: zod.string().email({ message: t('emailInvalid') }),
  })
}

export default function LoginPage() {
  const tLogin = useTranslations('Login')
  const tAuth = useTranslations('Auth')
  const tValidation = useTranslations('Validation')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const loginSchema = useMemo(
    () => createLoginSchema(tValidation),
    [tValidation],
  )

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '' },
  })

  const onSubmit = async (data: LoginFormValues) => {
    setLoading(true)
    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.auth.signInWithOtp({
      email: data.email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        // No crear cuentas nuevas desde el login: el alta es en /register.
        // Evita cuentas fantasma para cualquier correo tecleado aquí.
        shouldCreateUser: false,
      },
    })
    setLoading(false)
    if (error) {
      toast.error(error.message)
      return
    }
    setSuccess(true)
    toast.success(tLogin('success'))
  }

  const handleOAuthLogin = async (provider: 'google' | 'github') => {
    setLoading(true)
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
      {success ? (
        <div className="text-center space-y-6 py-6 animate-fade-in">
          <div className="flex justify-center">
            <div className="p-4 rounded-full bg-accent/10 text-accent">
              <CheckCircle2 className="w-16 h-16" />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold font-heading text-ink-strong">
              {tLogin('success')}
            </h2>
            <p className="text-sm text-ink-muted font-medium">
              {tLogin('redirecting')}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <AuthHeader
            welcomeText={tAuth('welcome')}
            title={tAuth('loginTitle')}
            subtitle={tAuth('loginSubtitle')}
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
                {tLogin('orContinueWith')}
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all duration-200"
            >
              {loading ? tLogin('sending') : tAuth('sendLink')}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </Button>
          </form>

          <div className="flex flex-col gap-2.5 pt-2 text-center text-xs font-semibold text-primary">
            <Link href="/register" className="hover:underline">
              {tAuth('noAccount')}
            </Link>
            <Link href="/forgot-password" className="hover:underline">
              {tAuth('forgotPasswordLink')}
            </Link>
          </div>

          <AuthFooter />
        </div>
      )}
    </AuthCard>
  )
}
