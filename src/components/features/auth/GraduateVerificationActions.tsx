'use client'

import { useRouter } from '@/i18n/routing'
import { useTranslations } from 'next-intl'
import { GraduationCap, Ban } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmButton } from '@/components/features/shared/ConfirmButton'
import { verificarEgresado, rechazarEgresado } from '@/lib/admin/actions'

interface GraduateVerificationActionsProps {
  userId: string
  userName: string
}

/**
 * Acciones de verificación de egresado (RF-64): verificar (outline) y rechazar
 * (token magenta), con confirmación. Mismo patrón que la verificación de
 * empresa. El cotejo automático contra la base FWD (RNF-30) sigue pendiente.
 */
export function GraduateVerificationActions({
  userId,
  userName,
}: GraduateVerificationActionsProps) {
  const t = useTranslations('Admin')
  const router = useRouter()

  const handleVerify = async () => {
    const result = await verificarEgresado(userId)
    if (result.ok) {
      toast.success(t('graduateVerified', { name: userName }))
      router.refresh()
    } else if (result.error === 'not_a_student') {
      toast.error(t('graduateVerifyNotStudent'))
    } else if (result.error === 'sin_consentimiento_cotejo') {
      toast.error(t('graduateNoConsent'))
    } else {
      toast.error(t('graduateVerifyError'))
    }
  }

  const handleReject = async () => {
    const result = await rechazarEgresado(userId)
    if (result.ok) {
      toast.warning(t('graduateRejected', { name: userName }))
      router.refresh()
    } else if (result.error === 'not_a_student') {
      toast.error(t('graduateVerifyNotStudent'))
    } else {
      toast.error(t('graduateRejectError'))
    }
  }

  return (
    <div className="flex items-center gap-2 shrink-0">
      <ConfirmButton
        onConfirm={handleVerify}
        title={t('confirmVerifyGraduateTitle')}
        description={t('confirmVerifyGraduateDesc', { name: userName })}
        confirmLabel={t('verifyGraduate')}
        variant="outline"
        className="flex items-center gap-1.5 font-semibold"
      >
        <GraduationCap className="h-4 w-4" />
        {t('verifyGraduate')}
      </ConfirmButton>
      <ConfirmButton
        onConfirm={handleReject}
        title={t('confirmRejectGraduateTitle')}
        description={t('confirmRejectGraduateDesc', { name: userName })}
        confirmLabel={t('rejectGraduate')}
        variant="outline"
        className="flex items-center gap-1.5 border-magenta/20 font-semibold text-magenta hover:bg-magenta/10 hover:text-magenta"
        confirmClassName="bg-magenta text-magenta-foreground hover:bg-magenta/90"
      >
        <Ban className="h-4 w-4" />
        {t('rejectGraduate')}
      </ConfirmButton>
    </div>
  )
}
