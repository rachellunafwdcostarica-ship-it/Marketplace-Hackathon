'use client'

import React, { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { ArrowLeft, RefreshCw, Edit2 } from 'lucide-react'
import { AuthCard } from '@/components/features/auth/AuthCard'
import { VerificationMessage } from '@/components/features/auth/VerificationMessage'

export default function VerifyEmailPage() {
  const tAuth = useTranslations('Auth')
  const [resending, setResending] = useState(false)

  const handleResend = () => {
    setResending(true)
    setTimeout(() => {
      setResending(false)
      toast.success('¡Enlace de verificación reenviado con éxito!')
    }, 1200)
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
            disabled={resending}
            variant="outline"
            className="w-full h-12 rounded-xl border border-gray-200 hover:bg-gray-50 bg-white font-bold text-gray-700 text-sm flex items-center justify-center gap-2 transition-all duration-200"
          >
            <RefreshCw
              className={`w-4 h-4 ${resending ? 'animate-spin' : ''}`}
            />
            {resending ? 'Reenviando...' : tAuth('resendEmail')}
          </Button>

          <Link href="/register" className="block w-full">
            <Button
              variant="ghost"
              className="w-full h-12 rounded-xl hover:bg-gray-50 font-bold text-[#0A6CB9] text-sm flex items-center justify-center gap-2 transition-all duration-200"
            >
              <Edit2 className="w-4 h-4" />
              {tAuth('changeEmail')}
            </Button>
          </Link>
        </div>

        <div className="text-center pt-2">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-xs font-bold text-[#0A6CB9] hover:underline"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Volver al inicio de sesión
          </Link>
        </div>
      </div>
    </AuthCard>
  )
}
