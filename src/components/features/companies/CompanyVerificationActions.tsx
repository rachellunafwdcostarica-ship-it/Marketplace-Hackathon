'use client'

import { useState } from 'react'
import { useRouter } from '@/i18n/routing'
import { useTranslations } from 'next-intl'
import { CheckCircle, Ban } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ConfirmButton } from '@/components/features/shared/ConfirmButton'
import { verificarEmpresa, rechazarEmpresa } from '@/lib/admin/actions'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

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
  const tCommon = useTranslations('Common')
  const router = useRouter()

  const [rejectOpen, setRejectOpen] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [loading, setLoading] = useState(false)

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

  const handleRejectOpen = () => {
    setMotivo('')
    setRejectOpen(true)
  }

  const handleRejectClose = () => {
    if (!loading) setRejectOpen(false)
  }

  const handleRejectConfirm = async () => {
    setLoading(true)
    try {
      const result = await rechazarEmpresa(idEmpresario)
      if (result.ok) {
        toast.warning(t('companyRejected', { name: companyName }))
        setRejectOpen(false)
        router.refresh()
      } else if (result.error === 'empresa_no_encontrada') {
        toast.error(t('companyNotFound'))
      } else {
        toast.error(t('companyRejectError'))
      }
    } finally {
      setLoading(false)
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
      
      <Button
        variant="outline"
        onClick={handleRejectOpen}
        className="flex items-center gap-1.5 border-magenta/20 font-semibold text-magenta hover:bg-magenta/10 hover:text-magenta"
      >
        <Ban className="h-4 w-4" />
        {t('rejectCompany')}
      </Button>

      <Dialog open={rejectOpen} onOpenChange={handleRejectClose}>
        <DialogContent className="sm:max-w-md border border-border">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold font-heading">
              {t('confirmRejectCompanyTitle')}
            </DialogTitle>
            <DialogDescription className="mt-2 text-sm text-muted-foreground">
              {t('confirmRejectCompanyDesc', { name: companyName })}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-3 space-y-1.5">
            <Label htmlFor="reject-company-motivo" className="text-xs font-semibold text-muted-foreground">
              {t('rejectMotivo')}
            </Label>
            <Textarea
              id="reject-company-motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder={t('rejectMotivoPlaceholder')}
              rows={3}
              className="resize-none text-sm"
              maxLength={500}
            />
          </div>

          <DialogFooter className="mt-4 flex gap-2 border-t border-border/40 pt-4 sm:justify-end">
            <Button variant="outline" onClick={handleRejectClose} disabled={loading}>
              {tCommon('cancel')}
            </Button>
            <Button
              onClick={handleRejectConfirm}
              disabled={loading}
              className="bg-magenta text-magenta-foreground hover:bg-magenta/90"
            >
              {loading ? tCommon('loading') : t('confirmRejectionButton')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
