'use client'

import React, { useState, useMemo, Suspense } from 'react'
import { useTranslations } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import { Link, useRouter } from '@/i18n/routing'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as zod from 'zod'
import { toast } from 'sonner'
import {
  Mail,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Lock,
} from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { signInWithPassword } from '@/lib/auth/actions'
import { AuthCard } from '@/components/features/auth/AuthCard'
import { AuthHeader } from '@/components/features/auth/AuthHeader'
import { OAuthButtons } from '@/components/features/auth/OAuthButtons'
import { AuthFooter } from '@/components/features/auth/AuthFooter'

type LoginMethod = 'password' | 'magic'

interface MagicFormValues {
  email: string
}

interface PasswordFormValues {
  email: string
  password: string
}

function createMagicSchema(
  t: ReturnType<typeof useTranslations<'Validation'>>,
) {
  return zod.object({
    email: zod.string().email({ message: t('emailInvalid') }),
  })
}

function createPasswordSchema(
  t: ReturnType<typeof useTranslations<'Validation'>>,
) {
  return zod.object({
    email: zod.string().email({ message: t('emailInvalid') }),
    password: zod.string().min(1, { message: t('passwordRequired') }),
  })
}

export default function LoginPage() {
  // useSearchParams exige un límite de Suspense para no romper el render estático.
  return (
    <Suspense
      fallback={
        <AuthCard>
          <div className="h-96" />
        </AuthCard>
      }
    >
      <LoginContent />
    </Suspense>
  )
}

function LoginContent() {
  const tLogin = useTranslations('Login')
  const tAuth = useTranslations('Auth')
  const tValidation = useTranslations('Validation')
  const router = useRouter()
  const searchParams = useSearchParams()
  const isSuspended = searchParams.get('reason') === 'suspended'

  const [method, setMethod] = useState<LoginMethod>('password')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const magicSchema = useMemo(
    () => createMagicSchema(tValidation),
    [tValidation],
  )
  const passwordSchema = useMemo(
    () => createPasswordSchema(tValidation),
    [tValidation],
  )

  const magicForm = useForm<MagicFormValues>({
    resolver: zodResolver(magicSchema),
    defaultValues: { email: '' },
  })

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { email: '', password: '' },
  })

  const onMagicSubmit = async (data: MagicFormValues) => {
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

  const onPasswordSubmit = async (data: PasswordFormValues) => {
    setLoading(true)
    const result = await signInWithPassword({
      email: data.email,
      password: data.password,
    })
    if (!result.ok) {
      setLoading(false)
      if (result.error === 'account_locked') {
        toast.error(tLogin('accountLocked'))
        return
      }
      toast.error(tLogin('invalidCredentials'))
      return
    }
    // El middleware enruta /onboarding al home del rol (o lo deja en onboarding
    // si aún no eligió), así que sirve como destino único tras autenticar.
    router.push('/onboarding')
    router.refresh()
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

  const tabClass = (active: boolean) =>
    `h-10 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
      active
        ? 'bg-surface text-ink-strong shadow-sm'
        : 'text-ink-muted hover:text-ink'
    }`

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
          {isSuspended && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/5 p-3.5 text-destructive"
            >
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <p className="text-xs font-semibold leading-relaxed">
                {tLogin('suspended')}
              </p>
            </div>
          )}

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

          <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface-sunken/60 p-1">
            <button
              type="button"
              onClick={() => setMethod('password')}
              className={tabClass(method === 'password')}
            >
              {tLogin('passwordTab')}
            </button>
            <button
              type="button"
              onClick={() => setMethod('magic')}
              className={tabClass(method === 'magic')}
            >
              {tLogin('magicLinkTab')}
            </button>
          </div>

          {method === 'password' ? (
            <form
              onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <Label
                  htmlFor="password-email"
                  className="text-xs font-bold text-ink uppercase tracking-wider"
                >
                  {tAuth('emailLabel')}
                </Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-subtle" />
                  <Input
                    id="password-email"
                    type="email"
                    placeholder={tAuth('emailPlaceholder')}
                    className={`pl-11 h-12 rounded-xl bg-surface-sunken/50 border-border focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary transition-all ${passwordForm.formState.errors.email ? 'border-destructive' : ''}`}
                    {...passwordForm.register('email')}
                  />
                </div>
                {passwordForm.formState.errors.email && (
                  <p className="text-xs font-semibold text-destructive mt-1">
                    {passwordForm.formState.errors.email.message}
                  </p>
                )}
              </div>

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
                    className={`pl-11 h-12 rounded-xl bg-surface-sunken/50 border-border focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary transition-all ${passwordForm.formState.errors.password ? 'border-destructive' : ''}`}
                    {...passwordForm.register('password')}
                  />
                </div>
                {passwordForm.formState.errors.password && (
                  <p className="text-xs font-semibold text-destructive mt-1">
                    {passwordForm.formState.errors.password.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all duration-200"
              >
                {loading ? tLogin('signingIn') : tLogin('signInButton')}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </Button>
            </form>
          ) : (
            <form
              onSubmit={magicForm.handleSubmit(onMagicSubmit)}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <Label
                  htmlFor="magic-email"
                  className="text-xs font-bold text-ink uppercase tracking-wider"
                >
                  {tAuth('emailLabel')}
                </Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-subtle" />
                  <Input
                    id="magic-email"
                    type="email"
                    placeholder={tAuth('emailPlaceholder')}
                    className={`pl-11 h-12 rounded-xl bg-surface-sunken/50 border-border focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary transition-all ${magicForm.formState.errors.email ? 'border-destructive' : ''}`}
                    {...magicForm.register('email')}
                  />
                </div>
                {magicForm.formState.errors.email && (
                  <p className="text-xs font-semibold text-destructive mt-1">
                    {magicForm.formState.errors.email.message}
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
          )}

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
