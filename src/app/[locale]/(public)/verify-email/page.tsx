'use client'

import React, { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { ArrowLeft, RefreshCw, Edit2 } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { AuthCard } from '@/components/features/auth/AuthCard'
import { VerificationMessage } from '@/components/features/auth/VerificationMessage'

export default function VerifyEmailPage() {
  const tAuth = useTranslations('Auth')
  const [resending, setResending] = useState(false)
  const [email, setEmail] = useState<string | null>(null)

  // El correo llega como query param desde el registro (?email=...)
  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get('email')
    setEmail(value)
  }, [])

  const handleResend = async () => {
    if (!email) {
      toast.error(tAuth('resendNoEmail'))
      return
    }
    setResending(true)
    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
    })
    setResending(false)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success(tAuth('resendSuccess'))
  }

  return (
    <AuthCard>
      <div className="space-y-6">
        <VerificationMessage
          title={tAuth('verifyTitle')}
          description={tAuth('verifySubtitle')}
          success={false}
        />

        <div className="space-y-3 pt-4">
          <Button
            onClick={handleResend}
            disabled={resending || !email}
            variant="outline"
            className="w-full h-12 rounded-xl border border-border-strong hover:bg-surface-sunken bg-surface font-bold text-ink text-sm flex items-center justify-center gap-2 transition-all duration-200"
          >
            <RefreshCw
              className={`w-4 h-4 ${resending ? 'animate-spin' : ''}`}
            />
            {resending ? tAuth('resending') : tAuth('resendEmail')}
          </Button>

          <Link href="/register" className="block w-full">
            <Button
              variant="ghost"
              className="w-full h-12 rounded-xl hover:bg-surface-sunken font-bold text-primary text-sm flex items-center justify-center gap-2 transition-all duration-200"
            >
              <Edit2 className="w-4 h-4" />
              {tAuth('changeEmail')}
            </Button>
          </Link>
        </div>

        <div className="text-center pt-2">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-xs font-bold text-primary hover:underline"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {tAuth('signIn')}
          </Link>
        </div>
      </div>
    </AuthCard>
  )
}
