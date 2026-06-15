'use client'

import { useRouter } from '@/i18n/routing'
import { useTranslations } from 'next-intl'
import { CheckCircle, Ban } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmButton } from '@/components/features/shared/ConfirmButton'
import { verificarEmpresa, rechazarEmpresa } from '@/lib/admin/actions'

interface CompanyVerificationActionsProps {
  idEmpresario: string
  companyName: string
  tipoEmpresario: 'empresa_formal' | 'emprendedor'
}

/**
 * Acciones de verificación de empresa (RF-17), por tarjeta. Verificar usa el
 * mismo estilo (outline) que la verificación de egresados; rechazar usa el token
 * `magenta` (destructive FWD), no rojo. Ambas con confirmación.
 */
export function CompanyVerificationActions({
  idEmpresario,
  companyName,
  tipoEmpresario,
}: CompanyVerificationActionsProps) {
  const t = useTranslations('Admin')
  const router = useRouter()

  const verifyLabel =
    tipoEmpresario === 'empresa_formal'
      ? t('verifyCompanyFormal')
      : t('verifyCompanyEntrepreneur')

  const handleVerify = async () => {
    const result = await verificarEmpresa(idEmpresario)
    if (result.ok) {
      toast.success(t('companyVerified', { name: companyName }))
      router.refresh()
    } else if (result.error === 'empresa_no_encontrada') {
      toast.error(t('companyNotFound'))
    } else {
      toast.error(t('companyVerifyError'))
    }
  }

  const handleReject = async () => {
    const result = await rechazarEmpresa(idEmpresario)
    if (result.ok) {
      toast.warning(t('companyRejected', { name: companyName }))
      router.refresh()
    } else if (result.error === 'empresa_no_encontrada') {
      toast.error(t('companyNotFound'))
    } else {
      toast.error(t('companyRejectError'))
    }
  }

  return (
    <div className="flex items-center gap-2 shrink-0">
      <ConfirmButton
        onConfirm={handleVerify}
        title={t('confirmVerifyCompanyTitle')}
        description={t('confirmVerifyCompanyDesc', { name: companyName })}
        confirmLabel={verifyLabel}
        variant="outline"
        className="flex items-center gap-1.5 font-semibold"
      >
        <CheckCircle className="h-4 w-4" />
        {verifyLabel}
      </ConfirmButton>
      <ConfirmButton
        onConfirm={handleReject}
        title={t('confirmRejectCompanyTitle')}
        description={t('confirmRejectCompanyDesc', { name: companyName })}
        confirmLabel={t('rejectCompany')}
        variant="outline"
        className="flex items-center gap-1.5 border-magenta/20 font-semibold text-magenta hover:bg-magenta/10 hover:text-magenta"
        confirmClassName="bg-magenta text-magenta-foreground hover:bg-magenta/90"
      >
        <Ban className="h-4 w-4" />
        {t('rejectCompany')}
      </ConfirmButton>
    </div>
  )
}
