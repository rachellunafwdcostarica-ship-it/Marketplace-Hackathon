'use client'

import { useState } from 'react'
import { useRouter } from '@/i18n/routing'
import { useTranslations } from 'next-intl'
import { Plus, Minus, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
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
import { addStrike, removeStrike, resetStrikes } from '@/lib/admin/strike-actions'

interface StrikeActionsProps {
  userId: string
  userName: string
  cantidadStrikes: number
  isSelf: boolean
}

type ActionType = 'add' | 'remove' | 'reset'

/**
 * Acciones de moderación de strikes por usuario (panel de moderación).
 * Añadir, reducir y resetear, cada una con diálogo de confirmación.
 * El motivo es opcional en añadir, obligatorio en resetear (mínimo 5 chars).
 * Self-guard: oculta las acciones si el usuario es el propio admin.
 */
export function StrikeActions({
  userId,
  userName,
  cantidadStrikes,
  isSelf,
}: StrikeActionsProps) {
  const t = useTranslations('Admin')
  const tCommon = useTranslations('Common')
  const router = useRouter()

  const [openAction, setOpenAction] = useState<ActionType | null>(null)
  const [motivo, setMotivo] = useState('')
  const [loading, setLoading] = useState(false)

  if (isSelf) {
    return <span className="text-xs text-muted-foreground">{t('selfRow')}</span>
  }

  const handleOpen = (action: ActionType) => {
    setMotivo('')
    setOpenAction(action)
  }

  const handleClose = () => {
    if (!loading) setOpenAction(null)
  }

  const handleConfirm = async () => {
    setLoading(true)
    try {
      let result

      if (openAction === 'add') {
        result = await addStrike(userId, motivo.trim() || undefined)
        if (result.ok) {
          toast.success(t('strikeAdded', { name: userName }))
        }
      } else if (openAction === 'remove') {
        result = await removeStrike(userId)
        if (result.ok) {
          toast.success(t('strikeRemoved', { name: userName }))
        }
      } else if (openAction === 'reset') {
        result = await resetStrikes(userId, motivo.trim())
        if (result.ok) {
          toast.success(t('strikesReset', { name: userName }))
        }
      } else {
        return
      }

      if (result && !result.ok) {
        if (result.error === 'motivo_requerido') {
          toast.error(t('strikeResetMotivoRequired'))
        } else if (result.error === 'user_not_found') {
          toast.error(t('strikeUserNotFound'))
        } else {
          toast.error(t('strikeError'))
        }
        return
      }

      setOpenAction(null)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  const isResetDisabled = openAction === 'reset' && motivo.trim().length < 5
  const isConfirmDisabled = loading || isResetDisabled

  const dialogMeta: Record<ActionType, { title: string; desc: string }> = {
    add: {
      title: t('addStrikeTitle', { name: userName }),
      desc: t('addStrikeDesc', { name: userName }),
    },
    remove: {
      title: t('removeStrikeTitle', { name: userName }),
      desc: t('removeStrikeDesc', { name: userName, count: cantidadStrikes }),
    },
    reset: {
      title: t('resetStrikesTitle', { name: userName }),
      desc: t('resetStrikesDesc', { name: userName, count: cantidadStrikes }),
    },
  }

  return (
    <>
      <div className="flex items-center gap-1.5">
        {/* Añadir strike */}
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleOpen('add')}
          className="flex items-center gap-1 border-destructive/20 text-destructive hover:bg-destructive/10 hover:text-destructive"
          title={t('addStrike')}
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t('addStrike')}</span>
        </Button>

        {/* Reducir strike — solo si tiene strikes */}
        {cantidadStrikes > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleOpen('remove')}
            className="flex items-center gap-1 border-accent/20 text-accent hover:bg-accent/10 hover:text-accent"
            title={t('removeStrike')}
          >
            <Minus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t('removeStrike')}</span>
          </Button>
        )}

        {/* Resetear — solo si tiene 2+ strikes */}
        {cantidadStrikes >= 2 && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleOpen('reset')}
            className="flex items-center gap-1 border-warning/20 text-warning hover:bg-warning/10 hover:text-warning"
            title={t('resetStrikes')}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t('resetStrikes')}</span>
          </Button>
        )}
      </div>

      {/* Diálogo de confirmación compartido */}
      <Dialog open={openAction !== null} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md border border-border">
          {openAction && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-bold font-heading">
                  {dialogMeta[openAction].title}
                </DialogTitle>
                <DialogDescription className="mt-2 text-sm text-muted-foreground">
                  {dialogMeta[openAction].desc}
                </DialogDescription>
              </DialogHeader>

              {/* Campo motivo — opcional en 'add', obligatorio en 'reset' */}
              {(openAction === 'add' || openAction === 'reset') && (
                <div className="mt-3 space-y-1.5">
                  <Label htmlFor="strike-motivo" className="text-xs font-semibold text-muted-foreground">
                    {openAction === 'reset'
                      ? t('strikeMotivo') + ' *'
                      : t('strikeMotivo') + ' (' + t('strikeOptional') + ')'}
                  </Label>
                  <Textarea
                    id="strike-motivo"
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    placeholder={t('strikeMotivoPlaceholder')}
                    rows={3}
                    className="resize-none text-sm"
                    maxLength={500}
                  />
                  {openAction === 'reset' && motivo.trim().length < 5 && motivo.length > 0 && (
                    <p className="text-xs text-destructive">{t('strikeMotivoMin')}</p>
                  )}
                </div>
              )}

              <DialogFooter className="mt-4 flex gap-2 border-t border-border/40 pt-4 sm:justify-end">
                <Button variant="outline" onClick={handleClose} disabled={loading}>
                  {tCommon('cancel')}
                </Button>
                <Button
                  onClick={handleConfirm}
                  disabled={isConfirmDisabled}
                  className={
                    openAction === 'add'
                      ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                      : openAction === 'remove'
                        ? 'bg-accent text-accent-foreground hover:bg-accent/90'
                        : 'bg-warning text-warning-foreground hover:bg-warning/90'
                  }
                >
                  {loading
                    ? tCommon('loading')
                    : openAction === 'add'
                      ? t('addStrike')
                      : openAction === 'remove'
                        ? t('removeStrike')
                        : t('resetStrikes')}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
