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
import { Mail, ArrowRight, ArrowLeft } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { AuthCard } from '@/components/features/auth/AuthCard'
import { AuthHeader } from '@/components/features/auth/AuthHeader'
import { VerificationMessage } from '@/components/features/auth/VerificationMessage'

interface ForgotPasswordFormValues {
  email: string
}

function createForgotSchema(
  t: ReturnType<typeof useTranslations<'Validation'>>,
) {
  return zod.object({
    email: zod.string().email({ message: t('emailInvalid') }),
  })
}

export default function ForgotPasswordPage() {
  const tAuth = useTranslations('Auth')
  const tValidation = useTranslations('Validation')

  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const forgotSchema = useMemo(
    () => createForgotSchema(tValidation),
    [tValidation],
  )

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: '' },
  })

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    setLoading(true)
    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    })
    setLoading(false)
    if (error) {
      toast.error(error.message)
      return
    }
    setSuccess(true)
    toast.success(tAuth('successSent'))
  }

  return (
    <AuthCard>
      <div className="space-y-6">
        {success ? (
          <div className="space-y-6">
            <VerificationMessage
              title={tAuth('checkInbox')}
              description={tAuth('successSent')}
              success={true}
            />
            <div className="text-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-xs font-bold text-[#0A6CB9] hover:underline"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Volver al inicio de sesión
              </Link>
            </div>
          </div>
        ) : (
          <>
            <AuthHeader
              welcomeText={tAuth('welcome')}
              title={tAuth('forgotTitle')}
              subtitle={tAuth('forgotSubtitle')}
            />

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label
                  htmlFor="email"
                  className="text-xs font-bold text-gray-700 uppercase tracking-wider"
                >
                  {tAuth('emailLabel')}
                </Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder={tAuth('emailPlaceholder')}
                    className={`pl-11 h-12 rounded-xl bg-gray-50/50 border-gray-100 focus-visible:ring-1 focus-visible:ring-[#0A6CB9] focus-visible:border-[#0A6CB9] transition-all ${errors.email ? 'border-destructive' : ''}`}
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
                className="w-full h-12 rounded-xl bg-[#0A6CB9] hover:bg-[#0A6CB9]/95 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all duration-200"
              >
                {loading ? 'Enviando...' : tAuth('sendLink')}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </Button>
            </form>

            <div className="text-center pt-2">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-xs font-bold text-[#0A6CB9] hover:underline"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Volver al inicio de sesión
              </Link>
            </div>
          </>
        )}
      </div>
    </AuthCard>
  )
}
