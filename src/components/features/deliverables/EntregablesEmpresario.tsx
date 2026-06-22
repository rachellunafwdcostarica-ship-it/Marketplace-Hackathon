'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/routing'
import { toast } from 'sonner'
import {
  CheckCircle2,
  Download,
  MessageSquare,
  Package,
  RotateCcw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils/cn'
import {
  getSignedUrlEntregable,
  type ComentarioEntregable,
  type EntregableEmpresario,
} from '@/lib/deliverables/queries'
import {
  comentarEntregable,
  responderEntregable,
} from '@/lib/deliverables/actions'
import type { Result } from '@/lib/result'

const ESTADO_STYLE: Record<string, string> = {
  enviado: 'bg-warning/10 text-warning border-warning/20',
  en_revision: 'bg-primary/10 text-primary border-primary/20',
  aprobado: 'bg-accent/10 text-accent border-accent/20',
  con_cambios: 'bg-destructive/10 text-destructive border-destructive/20',
}

const TIPO_COMENTARIO_STYLE: Record<string, string> = {
  aprobacion: 'bg-accent/10 text-accent border-accent/20',
  revision_solicitada: 'bg-warning/10 text-warning border-warning/20',
  aclaracion: 'bg-primary/10 text-primary border-primary/20',
  rechazo: 'bg-magenta/10 text-magenta border-magenta/20',
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
          <div className="flex items-center justify-between gap-2">
            <span
              className={cn(
                'text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0',
                TIPO_COMENTARIO_STYLE[c.tipo_comentario] ??
                  'bg-muted text-muted-foreground border-border',
              )}
            >
              {t(
                `tipoComentario_${c.tipo_comentario}` as Parameters<
                  typeof t
                >[0],
              )}
            </span>
            <span className="text-[10px] text-muted-foreground shrink-0">
              {c.comentado_at.slice(0, 10)}
            </span>
          </div>
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
  const [respondingId, setRespondingId] = useState<string | null>(null)
  const [respondComment, setRespondComment] = useState('')
  const [submittingId, setSubmittingId] = useState<string | null>(null)
  const [commentingId, setCommentingId] = useState<string | null>(null)
  const [commentText, setCommentText] = useState('')
  const [sendingCommentId, setSendingCommentId] = useState<string | null>(null)

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
      window.open(res.data.url, '_blank')
      return
    }
    toast.error(t('downloadError'))
  }

  const handleRespond = async (
    idEntregable: string,
    decision: 'aprobado' | 'con_cambios',
  ) => {
    if (decision === 'con_cambios' && respondComment.trim() === '') return
    setSubmittingId(idEntregable)
    const res = await responderEntregable({
      idEntregable,
      decision,
      ...(respondComment.trim() ? { comentario: respondComment.trim() } : {}),
    })
    setSubmittingId(null)
    if (res.ok) {
      toast.success(
        res.data.finalizado ? t('finalizarSuccess') : t('responderSuccess'),
      )
      setRespondingId(null)
      setRespondComment('')
      router.refresh()
      return
    }
    toast.error(t('responderError'))
  }

  const handleComentario = async (idEntregable: string) => {
    if (commentText.trim() === '') return
    setSendingCommentId(idEntregable)
    const res = await comentarEntregable({
      idEntregable,
      contenido: commentText.trim(),
    })
    setSendingCommentId(null)
    if (res.ok) {
      toast.success(t('comentarExitoso'))
      setCommentingId(null)
      setCommentText('')
      router.refresh()
      return
    }
    toast.error(t('comentarError'))
  }

  return (
    <div className="space-y-4">
      {entregables.map((e) => (
        <Card
          key={e.id_entregable}
          className="border border-border/80 bg-card/40"
        >
          <CardContent className="p-5 space-y-3">
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
              <span
                className={cn(
                  'text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0',
                  ESTADO_STYLE[e.estado] ??
                    'bg-muted text-muted-foreground border-border',
                )}
              >
                {t(`estadoEntregable_${e.estado}`)}
              </span>
            </div>

            <div className="space-y-2 border-t border-border/40 pt-3">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {t('comentariosLabel')}
              </p>
              <ComentariosList comentarios={e.comentarios} t={t} />
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {e.archivo_url && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={downloadingId === e.id_entregable}
                  onClick={() => void handleDownload(e.id_entregable)}
                  className="font-semibold"
                >
                  <Download className="w-3.5 h-3.5" />
                  {downloadingId === e.id_entregable
                    ? t('downloading')
                    : t('downloadBtn')}
                </Button>
              )}

              {e.estado === 'enviado' && respondingId !== e.id_entregable && (
                <>
                  <Button
                    type="button"
                    size="sm"
                    variant="accent"
                    disabled={submittingId === e.id_entregable}
                    onClick={() =>
                      void handleRespond(e.id_entregable, 'aprobado')
                    }
                    className="font-semibold"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {t('aprobarBtn')}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setRespondingId(e.id_entregable)
                      setRespondComment('')
                    }}
                    className="font-semibold text-warning hover:text-warning hover:bg-warning/10"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    {t('solicitarCambiosBtn')}
                  </Button>
                </>
              )}

              {commentingId !== e.id_entregable && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setCommentingId(e.id_entregable)
                    setCommentText('')
                  }}
                  className="font-semibold text-primary hover:text-primary hover:bg-primary/10"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  {t('agregarComentarioBtn')}
                </Button>
              )}
            </div>

            {e.estado === 'enviado' && respondingId === e.id_entregable && (
              <div className="space-y-2 pt-2 border-t border-border/40">
                <Textarea
                  value={respondComment}
                  onChange={(ev) => setRespondComment(ev.target.value)}
                  placeholder={t('responderCommentPlaceholder')}
                  rows={2}
                  disabled={submittingId === e.id_entregable}
                  className="bg-card/50 border-border text-sm resize-none"
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={
                      submittingId === e.id_entregable ||
                      respondComment.trim() === ''
                    }
                    onClick={() =>
                      void handleRespond(e.id_entregable, 'con_cambios')
                    }
                    className="font-semibold text-warning hover:text-warning hover:bg-warning/10"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    {t('confirmarCambiosBtn')}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={submittingId === e.id_entregable}
                    onClick={() => setRespondingId(null)}
                    className="font-semibold text-muted-foreground"
                  >
                    {tCommon('cancel')}
                  </Button>
                </div>
              </div>
            )}

            {commentingId === e.id_entregable && (
              <div className="space-y-2 pt-2 border-t border-border/40">
                <Textarea
                  value={commentText}
                  onChange={(ev) => setCommentText(ev.target.value)}
                  placeholder={t('agregarComentarioPlaceholder')}
                  rows={2}
                  disabled={sendingCommentId === e.id_entregable}
                  className="bg-card/50 border-border text-sm resize-none"
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="default"
                    disabled={
                      sendingCommentId === e.id_entregable ||
                      commentText.trim() === ''
                    }
                    onClick={() => void handleComentario(e.id_entregable)}
                    className="font-semibold"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    {sendingCommentId === e.id_entregable
                      ? t('comentandoBtn')
                      : t('agregarComentarioBtn')}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={sendingCommentId === e.id_entregable}
                    onClick={() => setCommentingId(null)}
                    className="font-semibold text-muted-foreground"
                  >
                    {tCommon('cancel')}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
