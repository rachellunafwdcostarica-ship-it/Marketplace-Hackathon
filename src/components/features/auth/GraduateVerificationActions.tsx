'use client'

import { useState } from 'react'
import { useRouter } from '@/i18n/routing'
import { useTranslations } from 'next-intl'
import { GraduationCap, Ban } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ConfirmButton } from '@/components/features/shared/ConfirmButton'
import { verificarEgresado, rechazarEgresado } from '@/lib/admin/actions'
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
  const tCommon = useTranslations('Common')
  const router = useRouter()

  const [rejectOpen, setRejectOpen] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [loading, setLoading] = useState(false)

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
      // Pasamos el motivo en el logger de rechazarEgresado indirectamente si quisiéramos, 
      // pero por ahora llamamos a rechazarEgresado tal como está definido en su backend.
      const result = await rechazarEgresado(userId)
      if (result.ok) {
        toast.warning(t('graduateRejected', { name: userName }))
        setRejectOpen(false)
        router.refresh()
      } else if (result.error === 'not_a_student') {
        toast.error(t('graduateVerifyNotStudent'))
      } else {
        toast.error(t('graduateRejectError'))
      }
    } finally {
      setLoading(false)
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
      
      <Button
        variant="outline"
        onClick={handleRejectOpen}
        className="flex items-center gap-1.5 border-magenta/20 font-semibold text-magenta hover:bg-magenta/10 hover:text-magenta"
      >
        <Ban className="h-4 w-4" />
        {t('rejectGraduate')}
      </Button>

      <Dialog open={rejectOpen} onOpenChange={handleRejectClose}>
        <DialogContent className="sm:max-w-md border border-border">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold font-heading">
              {t('confirmRejectGraduateTitle')}
            </DialogTitle>
            <DialogDescription className="mt-2 text-sm text-muted-foreground">
              {t('confirmRejectGraduateDesc', { name: userName })}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-3 space-y-1.5">
            <Label htmlFor="reject-graduate-motivo" className="text-xs font-semibold text-muted-foreground">
              {t('rejectMotivo')}
            </Label>
            <Textarea
              id="reject-graduate-motivo"
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
