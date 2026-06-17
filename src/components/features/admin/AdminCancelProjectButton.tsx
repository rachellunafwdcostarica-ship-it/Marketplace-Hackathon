'use client'

import { useState } from 'react'
import { useRouter } from '@/i18n/routing'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Ban } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import { cancelProjectAsAdmin } from '@/lib/admin/project-actions'

interface AdminCancelProjectButtonProps {
  projectId: string
  projectTitle: string
}

/**
 * Botón para que el administrador cancele un proyecto.
 * Muestra un diálogo de confirmación con un campo opcional para el motivo.
 */
export function AdminCancelProjectButton({
  projectId,
  projectTitle,
}: AdminCancelProjectButtonProps) {
  const t = useTranslations('Admin')
  const tCommon = useTranslations('Common')
  const router = useRouter()

  const [open, setOpen] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [loading, setLoading] = useState(false)

  const handleOpen = () => {
    setMotivo('')
    setOpen(true)
  }

  const handleClose = () => {
    if (!loading) setOpen(false)
  }

  const handleConfirm = async () => {
    setLoading(true)
    try {
      const result = await cancelProjectAsAdmin(projectId, motivo.trim() || undefined)
      if (result.ok) {
        toast.success(t('cancelProjectSuccess'))
        setOpen(false)
        router.refresh()
      } else {
        if (result.error === 'already_terminal') {
          toast.error(t('cancelProjectAlreadyTerminal'))
        } else {
          toast.error(t('cancelProjectError'))
        }
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={handleOpen}
        className="flex items-center gap-1 border-destructive/20 text-destructive hover:bg-destructive/10 hover:text-destructive"
        title={t('cancelProject')}
      >
        <Ban className="h-3.5 w-3.5" />
        <span>{t('cancelProject')}</span>
      </Button>

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md border border-border">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold font-heading">
              {t('cancelProjectTitle')}
            </DialogTitle>
            <DialogDescription className="mt-2 text-sm text-muted-foreground">
              {t('cancelProjectDesc')}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-3 space-y-1.5">
            <Label htmlFor="cancel-project-motivo" className="text-xs font-semibold text-muted-foreground">
              {t('cancelProjectMotivo')}
            </Label>
            <Textarea
              id="cancel-project-motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder={t('cancelProjectMotivoPlaceholder')}
              rows={3}
              className="resize-none text-sm"
              maxLength={500}
            />
          </div>

          <DialogFooter className="mt-4 flex gap-2 border-t border-border/40 pt-4 sm:justify-end">
            <Button variant="outline" onClick={handleClose} disabled={loading}>
              {tCommon('cancel')}
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? tCommon('loading') : t('cancelProject')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
