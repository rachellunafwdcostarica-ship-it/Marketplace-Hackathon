'use client'

import { useState } from 'react'
import { useRouter } from '@/i18n/routing'
import { useTranslations } from 'next-intl'
import { CheckCircle, Ban } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { verificarEmpresa, rechazarEmpresa } from '@/lib/admin/actions'

interface CompanyVerificationActionsProps {
  idEmpresario: string
  companyName: string
}

/**
 * Acciones de verificación de empresa (RF-17), por tarjeta en la pestaña
 * Empresas de Validaciones. Espejo de la verificación de egresados.
 */
export function CompanyVerificationActions({
  idEmpresario,
  companyName,
}: CompanyVerificationActionsProps) {
  const t = useTranslations('Admin')
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleVerify = async () => {
    setLoading(true)
    const result = await verificarEmpresa(idEmpresario)
    setLoading(false)

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
    setLoading(true)
    const result = await rechazarEmpresa(idEmpresario)
    setLoading(false)

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
    <div className="flex items-center gap-2">
      <Button
        onClick={handleVerify}
        disabled={loading}
        size="sm"
        className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold flex items-center gap-1.5"
      >
        <CheckCircle className="w-4 h-4" />
        {loading ? t('verifyingCompany') : t('verifyCompanyAction')}
      </Button>
      <Button
        onClick={handleReject}
        disabled={loading}
        size="sm"
        variant="outline"
        className="border-destructive/20 text-destructive hover:bg-destructive/10 hover:text-destructive font-semibold flex items-center gap-1.5"
      >
        <Ban className="w-4 h-4" />
        {loading ? t('rejectingCompany') : t('rejectCompany')}
      </Button>
    </div>
  )
}
