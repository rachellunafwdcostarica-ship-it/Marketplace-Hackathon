'use client'

import React, { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Link, useRouter } from '@/i18n/routing'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as zod from 'zod'
import { toast } from 'sonner'
import { Mail, User, Lock, ArrowRight, AlertTriangle } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { signUpWithPassword } from '@/lib/auth/actions'
import { isEgresadoEmailAllowed } from '@/lib/auth/egresado-allowlist'
import type { SignUpInput } from '@/lib/auth/schemas'
import { AuthCard } from '@/components/features/auth/AuthCard'
import { AuthHeader } from '@/components/features/auth/AuthHeader'
import { OAuthButtons } from '@/components/features/auth/OAuthButtons'
import { AuthFooter } from '@/components/features/auth/AuthFooter'
import { PasswordStrengthIndicator } from '@/components/features/auth/PasswordStrengthIndicator'
import { RoleSelector } from '@/components/features/auth/RoleSelector'
import type { UserRole } from '@/types'

interface RegisterFormValues {
  fullName: string
  email: string
  password: string
  confirmPassword: string
  tituloFwd?: 'frontend' | 'backend' | 'fullstack'
  tipoEmpresario?: 'empresa_formal' | 'emprendedor'
  nombreEmpresa?: string
  cedula?: string
  sitioWeb?: string
}

function createRegisterSchema(
  t: ReturnType<typeof useTranslations<'Validation'>>,
  role: UserRole,
) {
  const base = {
    fullName: zod.string().min(2, { message: t('nameMin') }),
    email: zod.string().email({ message: t('emailInvalid') }),
    password: zod.string().min(8, { message: t('passwordMin') }),
    confirmPassword: zod.string(),
  }

  const matchPassword = {
    message: t('passwordMismatch'),
    path: ['confirmPassword'],
  }

  if (role === 'empresario') {
    return zod
      .object({
        ...base,
        tipoEmpresario: zod.enum(['empresa_formal', 'emprendedor'], {
          message: t('required'),
        }),
        nombreEmpresa: zod.string().min(2, { message: t('required') }),
        cedula: zod.string().min(1, { message: t('required') }),
        sitioWeb: zod
          .string()
          .url({ message: t('linkInvalid') })
          .or(zod.literal(''))
          .optional(),
      })
      .refine((data) => data.password === data.confirmPassword, matchPassword)
  }

  return zod
    .object({
      ...base,
      tituloFwd: zod.enum(['frontend', 'backend', 'fullstack'], {
        message: t('required'),
      }),
    })
    .refine((data) => data.password === data.confirmPassword, matchPassword)
}

const inputBase =
  'pl-11 h-12 rounded-xl bg-surface-sunken/50 border-border focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary transition-all'
const selectBase =
  'w-full h-12 rounded-xl border border-border bg-surface-sunken/50 px-3 text-sm text-ink focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all duration-[var(--duration-fast)] ease-[var(--ease-out)] cursor-pointer'
const labelBase = 'text-xs font-bold text-ink uppercase tracking-wider'
const errorBase = 'text-xs font-semibold text-destructive mt-1'

export default function RegisterPage() {
  const tAuth = useTranslations('Auth')
  const tLogin = useTranslations('Login')
  const tValidation = useTranslations('Validation')
  const router = useRouter()

  const [loading, setLoading] = useState(false)
  const [selectedRole, setSelectedRole] = useState<UserRole>('egresado')

  const registerSchema = useMemo(
    () => createRegisterSchema(tValidation, selectedRole),
    [tValidation, selectedRole],
  )

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    // El schema cambia por rol (egresado/empresario), así que su tipo inferido
    // es una unión que no calza con RegisterFormValues (campos opcionales). El
    // cast tipado salva esa fricción de RHF+zod; la validación en runtime es la
    // del schema activo, correcta para el rol seleccionado.
    resolver: zodResolver(registerSchema) as Resolver<RegisterFormValues>,
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
    !isEgresadoEmailAllowed(emailValue)

  const onSubmit = async (data: RegisterFormValues) => {
    // Gate del egresado (stand-in de RF-64): la UI ya avisa, pero esto evita que
    // un correo fuera de la allowlist llegue al servidor si se fuerza el submit.
    if (selectedRole === 'egresado' && !isEgresadoEmailAllowed(data.email)) {
      return
    }

    let payload: SignUpInput
    if (selectedRole === 'empresario') {
      if (!data.tipoEmpresario || !data.nombreEmpresa || !data.cedula) {
        return
      }
      payload = {
        role: 'empresario',
        email: data.email,
        password: data.password,
        fullName: data.fullName,
        tipoEmpresario: data.tipoEmpresario,
        nombreEmpresa: data.nombreEmpresa,
        cedula: data.cedula,
        ...(data.sitioWeb ? { sitioWeb: data.sitioWeb } : {}),
      }
    } else {
      if (!data.tituloFwd) return
      payload = {
        role: 'egresado',
        email: data.email,
        password: data.password,
        fullName: data.fullName,
        tituloFwd: data.tituloFwd,
      }
    }

    setLoading(true)
    const result = await signUpWithPassword(payload)
    setLoading(false)

    const verifyPath = `/verify-email?email=${encodeURIComponent(data.email)}`

    if (!result.ok) {
      if (result.error === 'email_already_exists') {
        // Anti-enumeración: mostrar el mismo éxito que un registro nuevo, sin
        // revelar que el correo ya existía. No se inicia sesión.
        toast.success(tAuth('registerSuccess'))
        router.push(verifyPath)
        return
      }
      const message =
        result.error === 'email_not_allowed'
          ? tAuth('egresadoEmailInvalidMsg')
          : result.error === 'password_breached'
            ? tAuth('passwordBreached')
            : result.error === 'pwned_check_failed'
              ? tAuth('pwnedCheckFailed')
              : tAuth('errorUnexpected')
      toast.error(message)
      return
    }

    // Registro creado SIN sesión (RF-02): el usuario confirma su correo desde la
    // pantalla de verificación (enlace o código).
    toast.success(tAuth('registerSuccess'))
    router.push(verifyPath)
  }

  const handleOAuthLogin = async (provider: 'google' | 'github') => {
    setLoading(true)
    // Guardamos el rol en una cookie antes del redirect OAuth porque Supabase
    // no garantiza preservar query params personalizados en el redirectTo.
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

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
          noValidate
        >
          {/* Full Name */}
          <div className="space-y-1.5">
            <Label htmlFor="fullName" className={labelBase}>
              {tAuth('fullNameLabel')}
            </Label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-subtle" />
              <Input
                id="fullName"
                type="text"
                placeholder={tAuth('fullNamePlaceholder')}
                className={`${inputBase} ${errors.fullName ? 'border-destructive' : ''}`}
                {...register('fullName')}
              />
            </div>
            {errors.fullName && (
              <p className={errorBase}>{errors.fullName.message}</p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="email" className={labelBase}>
              {tAuth('emailLabel')}
            </Label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-subtle" />
              <Input
                id="email"
                type="email"
                placeholder={tAuth('emailPlaceholder')}
                className={`${inputBase} ${errors.email ? 'border-destructive' : ''}`}
                {...register('email')}
              />
            </div>
            {errors.email && (
              <p className={errorBase}>{errors.email.message}</p>
            )}
            {selectedRole === 'egresado' && !isEgresadoEmailInvalid && (
              <p className="text-[11px] text-ink-subtle font-medium mt-1">
                {tAuth('egresadoEmailHint')}
              </p>
            )}
          </div>

          {/* Bloque de contacto: correo fuera de la allowlist para egresado */}
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

          {/* Campos por rol */}
          {selectedRole === 'egresado' ? (
            <div className="space-y-1.5">
              <Label htmlFor="tituloFwd" className={labelBase}>
                {tAuth('tituloFwdLabel')}
              </Label>
              <select
                id="tituloFwd"
                className={`${selectBase} ${errors.tituloFwd ? 'border-destructive' : ''}`}
                defaultValue=""
                {...register('tituloFwd')}
              >
                <option value="" disabled>
                  {tAuth('tituloFwdPlaceholder')}
                </option>
                <option value="frontend">{tAuth('tituloFrontend')}</option>
                <option value="backend">{tAuth('tituloBackend')}</option>
                <option value="fullstack">{tAuth('tituloFullstack')}</option>
              </select>
              {errors.tituloFwd && (
                <p className={errorBase}>{errors.tituloFwd.message}</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="tipoEmpresario" className={labelBase}>
                  {tAuth('tipoEmpresarioLabel')}
                </Label>
                <select
                  id="tipoEmpresario"
                  className={`${selectBase} ${errors.tipoEmpresario ? 'border-destructive' : ''}`}
                  defaultValue=""
                  {...register('tipoEmpresario')}
                >
                  <option value="" disabled>
                    {tAuth('tipoEmpresarioPlaceholder')}
                  </option>
                  <option value="emprendedor">
                    {tAuth('tipoEmprendedor')}
                  </option>
                  <option value="empresa_formal">
                    {tAuth('tipoEmpresaFormal')}
                  </option>
                </select>
                {errors.tipoEmpresario && (
                  <p className={errorBase}>{errors.tipoEmpresario.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="nombreEmpresa" className={labelBase}>
                  {tAuth('companyNameLabel')}
                </Label>
                <Input
                  id="nombreEmpresa"
                  type="text"
                  placeholder={tAuth('companyNameLabel')}
                  className={`pl-3 h-12 rounded-xl bg-surface-sunken/50 border-border focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary transition-all ${errors.nombreEmpresa ? 'border-destructive' : ''}`}
                  {...register('nombreEmpresa')}
                />
                {errors.nombreEmpresa && (
                  <p className={errorBase}>{errors.nombreEmpresa.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cedula" className={labelBase}>
                  {tAuth('cedulaLabel')}
                </Label>
                <Input
                  id="cedula"
                  type="text"
                  placeholder={tAuth('cedulaLabel')}
                  className={`pl-3 h-12 rounded-xl bg-surface-sunken/50 border-border focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary transition-all ${errors.cedula ? 'border-destructive' : ''}`}
                  {...register('cedula')}
                />
                {errors.cedula && (
                  <p className={errorBase}>{errors.cedula.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="sitioWeb" className={labelBase}>
                  {tAuth('sitioWebLabel')}
                  <span className="ml-1 text-ink-subtle font-normal normal-case tracking-normal">
                    {tAuth('optionalMark')}
                  </span>
                </Label>
                <Input
                  id="sitioWeb"
                  type="url"
                  placeholder="https://"
                  className={`pl-3 h-12 rounded-xl bg-surface-sunken/50 border-border focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary transition-all ${errors.sitioWeb ? 'border-destructive' : ''}`}
                  {...register('sitioWeb')}
                />
                {errors.sitioWeb && (
                  <p className={errorBase}>{errors.sitioWeb.message}</p>
                )}
              </div>
            </div>
          )}

          {/* Password */}
          <div className="space-y-1.5">
            <Label htmlFor="password" className={labelBase}>
              {tAuth('passwordLabel')}
            </Label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-subtle" />
              <Input
                id="password"
                type="password"
                placeholder={tAuth('passwordPlaceholder')}
                className={`${inputBase} ${errors.password ? 'border-destructive' : ''}`}
                {...register('password')}
              />
            </div>
            <PasswordStrengthIndicator password={passwordValue} />
            {errors.password && (
              <p className={errorBase}>{errors.password.message}</p>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword" className={labelBase}>
              {tAuth('confirmPasswordLabel')}
            </Label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-subtle" />
              <Input
                id="confirmPassword"
                type="password"
                placeholder={tAuth('confirmPasswordPlaceholder')}
                className={`${inputBase} ${errors.confirmPassword ? 'border-destructive' : ''}`}
                {...register('confirmPassword')}
              />
            </div>
            {errors.confirmPassword && (
              <p className={errorBase}>{errors.confirmPassword.message}</p>
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
