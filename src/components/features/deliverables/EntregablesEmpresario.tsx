'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/routing'
import { toast } from 'sonner'
import {
  CheckCircle2,
  Download,
  Loader2,
  Package,
  RotateCcw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils/cn'
import {
  getSignedUrlEntregable,
  type ComentarioEntregable,
  type EntregableEmpresario,
} from '@/lib/deliverables/queries'
import { responderEntregable } from '@/lib/deliverables/actions'
import type { Result } from '@/lib/result'

const ESTADO_STYLE: Record<string, string> = {
  enviado: 'bg-warning/10 text-warning border-warning/20',
  en_revision: 'bg-primary/10 text-primary border-primary/20',
  aprobado: 'bg-accent/10 text-accent border-accent/20',
  con_cambios: 'bg-destructive/10 text-destructive border-destructive/20',
}

function ComentariosList({
  comentarios,
  t,
}: {
  comentarios: ComentarioEntregable[]
  t: ReturnType<typeof useTranslations<'ProjectDetail'>>
}) {
  if (comentarios.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic">
        {t('sinComentarios')}
      </p>
    )
  }
  return (
    <ul className="space-y-2">
      {comentarios.map((c) => (
        <li
          key={c.id_comentario_entregable}
          className="rounded-lg border border-border/50 bg-muted/20 px-3 py-2 space-y-1"
        >
          <p className="text-[10px] text-muted-foreground">
            {c.comentado_at.slice(0, 10)}
          </p>
          {c.contenido && (
            <p className="text-sm text-foreground leading-snug">
              {c.contenido}
            </p>
          )}
        </li>
      ))}
    </ul>
  )
}

interface EntregablesEmpresarioProps {
  entregablesResult: Result<EntregableEmpresario[]>
}

export function EntregablesEmpresario({
  entregablesResult,
}: EntregablesEmpresarioProps) {
  const t = useTranslations('ProjectDetail')
  const tCommon = useTranslations('Common')
  const router = useRouter()

  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [pendingDecision, setPendingDecision] = useState<{
    id: string
    tipo: 'aprobado' | 'con_cambios'
  } | null>(null)
  const [pendingComment, setPendingComment] = useState('')
  const [submittingId, setSubmittingId] = useState<string | null>(null)

  if (!entregablesResult.ok) {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-sm text-foreground">
        {t('entregablesLoadError')}
      </div>
    )
  }

  const entregables = entregablesResult.data

  if (entregables.length === 0) {
    return (
      <div className="p-8 border border-dashed border-border rounded-xl text-center text-muted-foreground bg-card/20">
        <Package className="w-8 h-8 mx-auto mb-2 text-muted-foreground/60" />
        {t('noEntregables')}
      </div>
    )
  }

  const handleDownload = async (idEntregable: string) => {
    setDownloadingId(idEntregable)
    const res = await getSignedUrlEntregable(idEntregable)
    setDownloadingId(null)
    if (res.ok) {
      const a = document.createElement('a')
      a.href = res.data.url
      a.rel = 'noopener noreferrer'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      return
    }
    toast.error(t('downloadError'))
  }

  const handleConfirmDecision = async () => {
    if (!pendingDecision) return
    const { id, tipo } = pendingDecision
    setSubmittingId(id)
    const comentario =
      pendingComment.trim() ||
      (tipo === 'con_cambios' ? t('cambiosDefaultComment') : undefined)
    const res = await responderEntregable({
      idEntregable: id,
      decision: tipo,
      ...(comentario ? { comentario } : {}),
    })
    setSubmittingId(null)
    if (res.ok) {
      toast.success(
        res.data.finalizado ? t('finalizarSuccess') : t('responderSuccess'),
      )
      setPendingDecision(null)
      setPendingComment('')
      router.refresh()
      return
    }
    toast.error(t('responderError'))
  }

  const isAprobando = pendingDecision?.tipo === 'aprobado'
  const isSubmitting = submittingId === pendingDecision?.id

  return (
    <>
      <div className="space-y-4">
        {entregables.map((e) => (
          <Card
            key={e.id_entregable}
            className="border border-border/80 bg-card/40"
          >
            <CardContent className="p-5 space-y-3">
              {/* Header: info izquierda / estado + descarga derecha */}
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-0.5">
                  <p className="font-bold text-foreground text-sm">
                    {t(`tipoEntregable_${e.tipo_entregable}`)}
                    {' — '}
                    {t('versionLabel', { n: e.version })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t('uploadedAtLabel')}: {e.cargado_at.slice(0, 10)}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span
                    className={cn(
                      'text-[10px] font-semibold px-2 py-0.5 rounded-full border',
                      ESTADO_STYLE[e.estado] ??
                        'bg-muted text-muted-foreground border-border',
                    )}
                  >
                    {t(`estadoEntregable_${e.estado}`)}
                  </span>

                  {e.archivo_url && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={downloadingId === e.id_entregable}
                      onClick={() => void handleDownload(e.id_entregable)}
                      className="font-semibold h-7 text-xs gap-1"
                    >
                      {downloadingId === e.id_entregable ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Download className="w-3 h-3" />
                      )}
                      {downloadingId === e.id_entregable
                        ? t('downloading')
                        : t('downloadBtn')}
                    </Button>
                  )}
                </div>
              </div>

              {/* Historial de comentarios */}
              <div className="space-y-2 border-t border-border/40 pt-3">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  {t('comentariosLabel')}
                </p>
                <ComentariosList comentarios={e.comentarios} t={t} />
              </div>

              {/* Botones de decisión: solo cuando el entregable lo permite */}
              {(e.estado === 'enviado' || e.estado === 'en_revision') && (
                <div className="flex flex-wrap gap-2 pt-1 border-t border-border/40">
                  <Button
                    type="button"
                    size="sm"
                    variant="accent"
                    disabled={submittingId === e.id_entregable}
                    onClick={() => {
                      setPendingDecision({
                        id: e.id_entregable,
                        tipo: 'aprobado',
                      })
                      setPendingComment('')
                    }}
                    className="font-semibold"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {t('aprobarBtn')}
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    variant="warning"
                    disabled={submittingId === e.id_entregable}
                    onClick={() => {
                      setPendingDecision({
                        id: e.id_entregable,
                        tipo: 'con_cambios',
                      })
                      setPendingComment('')
                    }}
                    className="font-semibold"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    {t('solicitarCambiosBtn')}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Modal de confirmación — se abre al presionar Aprobar o Sugerir cambio */}
      <Dialog
        open={pendingDecision !== null}
        onOpenChange={(open) => {
          if (!open && !isSubmitting) {
            setPendingDecision(null)
            setPendingComment('')
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isAprobando ? t('aprobarDialogTitle') : t('cambiosDialogTitle')}
            </DialogTitle>
            <DialogDescription>
              {isAprobando ? t('aprobarDialogDesc') : t('cambiosDialogDesc')}
            </DialogDescription>
          </DialogHeader>

          {isAprobando && (
            <Textarea
              value={pendingComment}
              onChange={(ev) => setPendingComment(ev.target.value)}
              placeholder={t('aprobarCommentPlaceholder')}
              rows={3}
              disabled={isSubmitting}
              className="bg-card/50 border-border text-sm resize-none"
            />
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isSubmitting}
              onClick={() => {
                setPendingDecision(null)
                setPendingComment('')
              }}
              className="font-semibold"
            >
              {tCommon('cancel')}
            </Button>

            <Button
              type="button"
              size="sm"
              variant={isAprobando ? 'accent' : 'warning'}
              disabled={isSubmitting}
              onClick={() => void handleConfirmDecision()}
              className="font-semibold"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  {tCommon('loading')}
                </span>
              ) : isAprobando ? (
                t('aprobarConfirmBtn')
              ) : (
                t('cambiosConfirmBtn')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
