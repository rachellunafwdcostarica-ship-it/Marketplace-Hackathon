'use client'

import { useState } from 'react'
import { useRouter } from '@/i18n/routing'
import { useTranslations } from 'next-intl'
import { CheckCircle2, XCircle, Archive } from 'lucide-react'
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
import { resolverReporte } from '@/lib/moderation/report-actions'

type Decision = 'resuelto_a_favor' | 'resuelto_en_contra' | 'descartado'

interface ModerationReportActionsProps {
  reportId: string
  /** true cuando el reporte apunta a un usuario (id_reportado), que se puede sancionar. */
  canStrike: boolean
}

const MIN_RESOLUCION = 5
const MAX_RESOLUCION = 500

/**
 * Acciones de resolución de un reporte de moderación (RF-69): resolver a favor
 * (sanciona al reportado, con opción de strike), resolver en contra (infundada)
 * o descartar (spam/sin mérito). El copy deja explícito qué hace cada decisión.
 */
export function ModerationReportActions({
  reportId,
  canStrike,
}: ModerationReportActionsProps) {
  const t = useTranslations('Admin')
  const tCommon = useTranslations('Common')
  const router = useRouter()

  const [decision, setDecision] = useState<Decision | null>(null)
  const [resolucion, setResolucion] = useState('')
  const [aplicarStrike, setAplicarStrike] = useState(false)
  const [loading, setLoading] = useState(false)

  const open = (next: Decision) => {
    setResolucion('')
    setAplicarStrike(false)
    setDecision(next)
  }

  const close = () => {
    if (!loading) setDecision(null)
  }

  const handleConfirm = async () => {
    if (!decision) return
    setLoading(true)
    const result = await resolverReporte({
      idReporte: reportId,
      decision,
      resolucion: resolucion.trim(),
      aplicarStrike:
        decision === 'resuelto_a_favor' && canStrike && aplicarStrike,
    })
    setLoading(false)

    if (result.ok) {
      toast.success(t('reportResolved'))
      setDecision(null)
      router.refresh()
    } else if (result.error === 'resolved_but_strike_failed') {
      toast.error(t('reportResolveStrikeFailed'))
      setDecision(null)
      router.refresh()
    } else {
      toast.error(t('reportResolveError'))
    }
  }

  const hint =
    decision === 'resuelto_a_favor'
      ? t('reportResolveInFavorHint')
      : decision === 'resuelto_en_contra'
        ? t('reportResolveAgainstHint')
        : decision === 'descartado'
          ? t('reportDismissHint')
          : ''

  const confirmLabel =
    decision === 'resuelto_a_favor'
      ? t('reportResolveInFavor')
      : decision === 'resuelto_en_contra'
        ? t('reportResolveAgainst')
        : t('reportDismiss')

  const isConfirmDisabled = loading || resolucion.trim().length < MIN_RESOLUCION

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => open('resuelto_a_favor')}
          className="flex items-center gap-1 border-destructive/20 text-destructive hover:bg-destructive/10 hover:text-destructive"
          title={t('reportResolveInFavor')}
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t('reportResolveInFavor')}</span>
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={() => open('resuelto_en_contra')}
          className="flex items-center gap-1 border-accent/20 text-accent hover:bg-accent/10 hover:text-accent"
          title={t('reportResolveAgainst')}
        >
          <XCircle className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t('reportResolveAgainst')}</span>
        </Button>

        <Button
          size="sm"
          variant="ghost"
          onClick={() => open('descartado')}
          className="flex items-center gap-1 text-ink-muted hover:bg-muted"
          title={t('reportDismiss')}
        >
          <Archive className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t('reportDismiss')}</span>
        </Button>
      </div>

      <Dialog open={decision !== null} onOpenChange={close}>
        <DialogContent className="border border-border sm:max-w-md">
          {decision && (
            <>
              <DialogHeader>
                <DialogTitle className="font-heading text-xl font-bold">
                  {t('reportResolveTitle')}
                </DialogTitle>
                <DialogDescription className="mt-2 text-sm text-muted-foreground">
                  {hint}
                </DialogDescription>
              </DialogHeader>

              <div className="mt-3 space-y-4">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="report-resolucion"
                    className="text-xs font-semibold text-muted-foreground"
                  >
                    {t('reportResolutionLabel')}
                  </Label>
                  <Textarea
                    id="report-resolucion"
                    value={resolucion}
                    onChange={(e) => setResolucion(e.target.value)}
                    placeholder={t('reportResolutionPlaceholder')}
                    rows={3}
                    className="resize-none text-sm"
                    maxLength={MAX_RESOLUCION}
                  />
                  <p className="text-right text-[10px] text-muted-foreground">
                    {resolucion.length}/{MAX_RESOLUCION}
                  </p>
                </div>

                {decision === 'resuelto_a_favor' && canStrike && (
                  <label className="flex items-start gap-2 rounded-xl border border-border bg-surface p-3 text-sm">
                    <input
                      type="checkbox"
                      checked={aplicarStrike}
                      onChange={(e) => setAplicarStrike(e.target.checked)}
                      className="mt-0.5 h-4 w-4 accent-destructive"
                    />
                    <span>
                      <span className="font-semibold text-ink-strong">
                        {t('reportApplyStrike')}
                      </span>
                      <span className="block text-xs text-ink-muted">
                        {t('reportApplyStrikeHint')}
                      </span>
                    </span>
                  </label>
                )}
              </div>

              <DialogFooter className="mt-4 flex gap-2 border-t border-border/40 pt-4 sm:justify-end">
                <Button variant="outline" onClick={close} disabled={loading}>
                  {tCommon('cancel')}
                </Button>
                <Button
                  onClick={handleConfirm}
                  disabled={isConfirmDisabled}
                  className={
                    decision === 'resuelto_a_favor'
                      ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                      : decision === 'resuelto_en_contra'
                        ? 'bg-accent text-accent-foreground hover:bg-accent/90'
                        : ''
                  }
                >
                  {loading ? tCommon('loading') : confirmLabel}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
