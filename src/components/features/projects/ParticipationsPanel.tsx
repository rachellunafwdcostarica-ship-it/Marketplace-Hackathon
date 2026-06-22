'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import {
  Briefcase,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  FileText,
  GitBranch,
  Lock,
  Mail,
  MessageSquare,
  Star,
  Users,
  XCircle,
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
import { Link, useRouter } from '@/i18n/routing'
import { useAccountStatus } from '@/components/features/auth/AccountStatusContext'
import { cn } from '@/lib/utils/cn'
import {
  adjudicarParticipacion,
  calificarParticipacion,
  setParticipacionEstado,
} from '@/lib/projects/project-detail'
import type { ParticipacionEmpresario } from '@/lib/projects/project-detail'
import type { Result } from '@/lib/result'
import {
  PARTICIPACION_FILTERS,
  canOpenParticipacion,
  getParticipacionActions,
  isParticipacionSealed,
  matchesParticipacionFilter,
  type EstadoEfectivoProyecto,
  type EstadoParticipacion,
  type ParticipacionAction,
  type ParticipacionFilter,
} from '@/lib/projects/project-detail-logic'

/**
 * Item del panel. `proyecto` es opcional: la página de detalle no lo pasa (ya
 * estás dentro del proyecto); la vista cross-project de `/postulaciones` sí, y
 * la tarjeta muestra un chip que enlaza al proyecto.
 */
export type ParticipacionPanelItem = ParticipacionEmpresario & {
  proyecto?: { id: string; titulo: string }
}

interface ParticipationsPanelProps {
  result: Result<ParticipacionPanelItem[]>
  /** ID del proyecto en la vista de detalle. En la vista cross-project cada
   *  item trae `participacion.proyecto.id`. */
  projectId?: string
  /** Estado efectivo del proyecto en la vista de detalle: decide si los sobres
   *  sellados todavía se pueden abrir. Ausente en la vista cross-project. */
  projectEstado?: EstadoEfectivoProyecto
}

const ESTADO_STYLE: Record<EstadoParticipacion, string> = {
  enviada: 'bg-primary/10 text-primary border-primary/20',
  en_revision: 'bg-warning/10 text-warning border-warning/20',
  contratada: 'bg-accent/10 text-accent border-accent/20',
  no_seleccionada: 'bg-destructive/10 text-destructive border-destructive/20',
  retirada: 'bg-muted text-muted-foreground border-border',
  finalizada: 'bg-secondary/10 text-secondary border-secondary/20',
  cancelada: 'bg-destructive/10 text-destructive border-destructive/20',
}

interface ConfirmState {
  accion: Extract<ParticipacionAction, 'contratar' | 'rechazar'>
  participacion: ParticipacionPanelItem
}

export function ParticipationsPanel({
  result,
  projectId,
  projectEstado,
}: ParticipationsPanelProps) {
  const t = useTranslations('ProjectDetail')
  const tCommon = useTranslations('Common')
  const tAccount = useTranslations('Account')
  const router = useRouter()
  const { isPending } = useAccountStatus()

  const [filter, setFilter] = useState<ParticipacionFilter>('todos')
  const [confirm, setConfirm] = useState<ConfirmState | null>(null)
  const [openTarget, setOpenTarget] = useState<ParticipacionPanelItem | null>(
    null,
  )
  const [mutatingId, setMutatingId] = useState<string | null>(null)
  const [ratingMutatingId, setRatingMutatingId] = useState<string | null>(null)
  const [iframeUrl, setIframeUrl] = useState<string | null>(null)

  // Sin estado de proyecto (vista cross-project) dejamos abrir: ahí no hay
  // ciclo de vida de proyecto a la mano.
  const puedeAbrir =
    projectEstado === undefined ? true : canOpenParticipacion(projectEstado)

  const participaciones = useMemo(
    () => (result.ok ? result.data : []),
    [result],
  )

  const visibles = useMemo(
    () => participaciones.filter((p) => matchesParticipacionFilter(p, filter)),
    [participaciones, filter],
  )

  const runAction = async (
    participacion: ParticipacionPanelItem,
    accion: ParticipacionAction,
  ) => {
    setMutatingId(participacion.idParticipacion)
    setConfirm(null)

    if (accion === 'contratar') {
      const idProyecto = participacion.proyecto?.id ?? projectId
      if (!idProyecto) {
        setMutatingId(null)
        toast.error(t('errors.generic'))
        return
      }
      const res = await adjudicarParticipacion({
        idParticipacion: participacion.idParticipacion,
        idProyecto,
      })
      setMutatingId(null)
      if (res.ok) {
        toast.success(t('adjudicarSuccess'))
        router.refresh()
        return
      }
      toast.error(
        res.error === 'transicion_invalida'
          ? t('errors.transicion_invalida')
          : t('errors.adjudicacion_fallida'),
      )
      return
    }

    const res = await setParticipacionEstado({
      idParticipacion: participacion.idParticipacion,
      accion,
    })
    setMutatingId(null)
    if (res.ok) {
      toast.success(t('participationUpdateSuccess'))
      router.refresh()
      return
    }
    toast.error(
      res.error === 'transicion_invalida'
        ? t('errors.transicion_invalida')
        : t('errors.generic'),
    )
  }

  const runOpen = async (participacion: ParticipacionPanelItem) => {
    setMutatingId(participacion.idParticipacion)
    setOpenTarget(null)
    const res = await setParticipacionEstado({
      idParticipacion: participacion.idParticipacion,
      accion: 'revisar',
    })
    setMutatingId(null)
    if (res.ok) {
      toast.success(t('openSuccess'))
      router.refresh()
      return
    }
    // Carrera: si ya quedó abierta por otra pestaña, sincronizamos sin error.
    if (res.error === 'transicion_invalida') {
      router.refresh()
      return
    }
    toast.error(t('errors.generic'))
  }

  const runRate = async (
    participacion: ParticipacionPanelItem,
    calificacion: number,
    comentario: string | undefined,
  ) => {
    setRatingMutatingId(participacion.idParticipacion)
    const res = await calificarParticipacion({
      idParticipacion: participacion.idParticipacion,
      calificacion,
      ...(comentario !== undefined ? { comentario } : {}),
    })
    setRatingMutatingId(null)
    if (res.ok) {
      toast.success(t('ratingSuccess'))
      router.refresh()
      return
    }
    toast.error(t('errors.calificacion_fallida'))
  }

  if (!result.ok) {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-sm text-foreground">
        {t('participationsLoadError')}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {PARTICIPACION_FILTERS.map((clave) => (
          <FilterButton
            key={clave}
            active={filter === clave}
            onClick={() => setFilter(clave)}
            label={t(`filter_${clave}`)}
          />
        ))}
      </div>

      {participaciones.length === 0 ? (
        <EmptyState message={t('participationsEmpty')} />
      ) : visibles.length === 0 ? (
        <EmptyState message={t('noParticipationsInFilter')} />
      ) : (
        <div className="space-y-4">
          {visibles.map((participacion) => (
            <ParticipationCard
              key={participacion.idParticipacion}
              participacion={participacion}
              {...(projectId !== undefined ? { projectId } : {})}
              isMutating={mutatingId === participacion.idParticipacion}
              isRatingMutating={
                ratingMutatingId === participacion.idParticipacion
              }
              isPending={isPending}
              pendingTitle={tAccount('actionDisabledPending')}
              canOpen={puedeAbrir}
              onOpen={() => setOpenTarget(participacion)}
              onContratar={() =>
                setConfirm({ accion: 'contratar', participacion })
              }
              onRechazar={() =>
                setConfirm({ accion: 'rechazar', participacion })
              }
              onRate={(calificacion, comentario) =>
                runRate(participacion, calificacion, comentario)
              }
              onOpenIframe={setIframeUrl}
            />
          ))}
        </div>
      )}

      <Dialog
        open={confirm !== null}
        onOpenChange={(open) => !open && setConfirm(null)}
      >
        <DialogContent className="sm:max-w-md border border-border">
          {confirm && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-bold font-heading">
                  {confirm.accion === 'contratar'
                    ? t('confirmContratarTitle', {
                        name: confirm.participacion.estudianteNombre,
                      })
                    : t('confirmRechazarTitle', {
                        name: confirm.participacion.estudianteNombre,
                      })}
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  {confirm.accion === 'contratar'
                    ? t('confirmContratarDesc')
                    : t('confirmRechazarDesc')}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex gap-2 sm:justify-end pt-4 border-t border-border/40">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setConfirm(null)}
                  disabled={mutatingId !== null}
                >
                  {tCommon('cancel')}
                </Button>
                <Button
                  type="button"
                  variant={
                    confirm.accion === 'contratar' ? 'accent' : 'magenta'
                  }
                  onClick={() =>
                    void runAction(confirm.participacion, confirm.accion)
                  }
                  disabled={mutatingId !== null}
                  className="font-semibold"
                >
                  {confirm.accion === 'contratar'
                    ? t('actionContratar')
                    : t('actionRechazar')}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={openTarget !== null}
        onOpenChange={(open) => !open && setOpenTarget(null)}
      >
        <DialogContent className="sm:max-w-md border border-border">
          {openTarget && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-bold font-heading">
                  {t('openConfirmTitle')}
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  {t('openConfirmDesc', {
                    name: openTarget.estudianteNombre,
                  })}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex gap-2 sm:justify-end pt-4 border-t border-border/40">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpenTarget(null)}
                  disabled={mutatingId !== null}
                >
                  {tCommon('cancel')}
                </Button>
                <Button
                  type="button"
                  variant="default"
                  onClick={() => void runOpen(openTarget)}
                  disabled={mutatingId !== null}
                  className="font-semibold"
                >
                  <Mail className="w-4 h-4" />
                  {t('openConfirm')}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={iframeUrl !== null}
        onOpenChange={(open) => !open && setIframeUrl(null)}
      >
        <DialogContent className="max-w-[90vw] w-[1200px] h-[85vh] flex flex-col p-0 overflow-hidden border border-border">
          <DialogHeader className="p-4 border-b border-border/40 shrink-0 flex flex-row items-center justify-between">
            <DialogTitle className="text-lg font-bold font-heading truncate pr-4">
              {t('iframePreviewTitle')}
            </DialogTitle>
            {iframeUrl && (
              <a
                href={iframeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                {t('iframeOpenNewTab')}
              </a>
            )}
          </DialogHeader>
          <div className="flex-1 w-full bg-background relative">
            {iframeUrl && (
              <iframe
                src={iframeUrl}
                className="w-full h-full border-0"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

interface ParticipationCardProps {
  participacion: ParticipacionPanelItem
  projectId?: string
  isMutating: boolean
  isRatingMutating: boolean
  isPending: boolean
  pendingTitle: string
  canOpen: boolean
  onOpen: () => void
  onContratar: () => void
  onRechazar: () => void
  onRate: (
    calificacion: number,
    comentario: string | undefined,
  ) => Promise<void>
  onOpenIframe: (url: string) => void
}

function ParticipationCard({
  participacion,
  projectId,
  isMutating,
  isRatingMutating,
  isPending,
  pendingTitle,
  canOpen,
  onOpen,
  onContratar,
  onRechazar,
  onRate,
  onOpenIframe,
}: ParticipationCardProps) {
  const t = useTranslations('ProjectDetail')
  const sealed = isParticipacionSealed(participacion.estado)
  const acciones = getParticipacionActions(participacion.estado)
  const nombreCompleto =
    `${participacion.estudianteNombre} ${participacion.estudianteApellidos}`.trim()
  const effectiveProjectId = participacion.proyecto?.id ?? projectId

  return (
    <Card className="border border-border/80 bg-card/40">
      <CardContent className="p-5 space-y-4">
        {participacion.proyecto && (
          <Link
            href={`/empresario/proyecto/${participacion.proyecto.id}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)]"
          >
            <Briefcase className="w-3.5 h-3.5" />
            {participacion.proyecto.titulo}
          </Link>
        )}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <InitialsAvatar
              nombre={participacion.estudianteNombre}
              apellidos={participacion.estudianteApellidos}
            />
            <div className="min-w-0">
              <p className="font-bold text-foreground leading-tight truncate">
                {nombreCompleto}
              </p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {participacion.tituloFwd && (
                  <span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-semibold text-foreground">
                    {t(`fwd_${participacion.tituloFwd}`)}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Star className="w-3.5 h-3.5 text-highlight" />
                  {participacion.reputacion !== null
                    ? participacion.reputacion.toFixed(1)
                    : t('noReputation')}
                </span>
              </div>
            </div>
          </div>
          <span
            className={cn(
              'text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0',
              ESTADO_STYLE[participacion.estado],
            )}
          >
            {t(`pstatus_${participacion.estado}`)}
          </span>
        </div>

        {sealed ? (
          <SealedEnvelopeBody
            participacion={participacion}
            canOpen={canOpen}
            isMutating={isMutating}
            isPending={isPending}
            pendingTitle={pendingTitle}
            onOpen={onOpen}
          />
        ) : (
          <>
            <div className="space-y-3 text-sm">
              {participacion.cartaPostulacion && (
                <Field label={t('coverLetterLabel')}>
                  <p className="text-foreground whitespace-pre-wrap">
                    {participacion.cartaPostulacion}
                  </p>
                </Field>
              )}
              {participacion.planteamientoSolucion && (
                <Field label={t('solutionLabel')}>
                  <p className="text-foreground whitespace-pre-wrap">
                    {participacion.planteamientoSolucion}
                  </p>
                </Field>
              )}
              <div className="flex flex-wrap gap-3">
                {participacion.prototipoEnlaces.map((enlace) => (
                  <ExternalAnchor
                    key={enlace}
                    href={enlace}
                    label={t('prototypeLabel')}
                    icon={<ExternalLink className="w-3.5 h-3.5" />}
                    onClick={(e) => {
                      e.preventDefault()
                      onOpenIframe(enlace)
                    }}
                  />
                ))}
                {participacion.documentacionTecnica && (
                  <ExternalAnchor
                    href={participacion.documentacionTecnica}
                    label={t('techDocLabel')}
                    icon={<FileText className="w-3.5 h-3.5" />}
                    onClick={(e) => {
                      e.preventDefault()
                      onOpenIframe(participacion.documentacionTecnica!)
                    }}
                  />
                )}
                {participacion.urlRepositorioProyecto && (
                  <ExternalAnchor
                    href={participacion.urlRepositorioProyecto}
                    label={t('repoLabel')}
                    icon={<GitBranch className="w-3.5 h-3.5" />}
                    onClick={(e) => {
                      e.preventDefault()
                      onOpenIframe(participacion.urlRepositorioProyecto!)
                    }}
                  />
                )}
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
                <span>
                  {t('appliedOnLabel')}:{' '}
                  <span className="font-semibold text-foreground">
                    {participacion.fechaPostulacion.slice(0, 10)}
                  </span>
                </span>
                {participacion.fechaEntregaPrototipo && (
                  <span>
                    {t('deliveredOnLabel')}:{' '}
                    <span className="font-semibold text-foreground">
                      {participacion.fechaEntregaPrototipo.slice(0, 10)}
                    </span>
                  </span>
                )}
              </div>
            </div>

            {participacion.estado === 'en_revision' && (
              <StarRatingForm
                participacion={participacion}
                disabled={isMutating || isRatingMutating}
                onRate={onRate}
              />
            )}

            {participacion.calificacionPrototipo !== null &&
              participacion.estado !== 'en_revision' && (
                <RatingCollapsible
                  calificacion={participacion.calificacionPrototipo}
                  comentario={participacion.comentarioPrototipo}
                />
              )}

            {acciones.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-3 border-t border-border/40">
                {isPending ? (
                  <span
                    aria-disabled="true"
                    title={pendingTitle}
                    className="text-xs text-muted-foreground/70 italic"
                  >
                    {pendingTitle}
                  </span>
                ) : (
                  acciones.map((accion) => (
                    <ActionButton
                      key={accion}
                      accion={accion}
                      disabled={isMutating}
                      onContratar={onContratar}
                      onRechazar={onRechazar}
                    />
                  ))
                )}
              </div>
            )}

            {effectiveProjectId &&
              (participacion.estado === 'contratada' ||
                participacion.estado === 'finalizada') && (
                <div className="pt-3 border-t border-border/40">
                  <ContactButton idProyecto={effectiveProjectId} />
                </div>
              )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

interface SealedEnvelopeBodyProps {
  participacion: ParticipacionPanelItem
  canOpen: boolean
  isMutating: boolean
  isPending: boolean
  pendingTitle: string
  onOpen: () => void
}

/** Tapa del sobre cerrado: adjuntos por existencia (no contenido) + fecha + el
 *  botón "Abrir". El contenido real ni siquiera llega del servidor mientras la
 *  oferta esté `enviada`. */
function SealedEnvelopeBody({
  participacion,
  canOpen,
  isMutating,
  isPending,
  pendingTitle,
  onOpen,
}: SealedEnvelopeBodyProps) {
  const t = useTranslations('ProjectDetail')

  const adjuntos: { key: string; label: string; icon: ReactNode }[] = []
  if (participacion.tienePrototipo) {
    adjuntos.push({
      key: 'prototipo',
      label: t('envelopeHasPrototype'),
      icon: <ExternalLink className="w-3.5 h-3.5" />,
    })
  }
  if (participacion.tieneRepositorio) {
    adjuntos.push({
      key: 'repositorio',
      label: t('envelopeHasRepo'),
      icon: <GitBranch className="w-3.5 h-3.5" />,
    })
  }
  if (participacion.tieneDocumentacion) {
    adjuntos.push({
      key: 'documentacion',
      label: t('envelopeHasDoc'),
      icon: <FileText className="w-3.5 h-3.5" />,
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
        <Lock className="w-3.5 h-3.5 shrink-0" />
        {t('envelopeSealedHint')}
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        {adjuntos.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {adjuntos.map((adjunto) => (
              <span
                key={adjunto.key}
                className="inline-flex items-center gap-1 rounded-full border border-accent/20 bg-accent/10 px-2.5 py-0.5 text-[11px] font-semibold text-accent"
              >
                {adjunto.icon}
                {adjunto.label}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground italic">
            {t('envelopeNoAttachments')}
          </span>
        )}
        <span className="text-xs text-muted-foreground">
          {t('appliedOnLabel')}:{' '}
          <span className="font-semibold text-foreground">
            {participacion.fechaPostulacion.slice(0, 10)}
          </span>
        </span>
      </div>

      <div className="pt-3 border-t border-border/40">
        {isPending ? (
          <span
            aria-disabled="true"
            title={pendingTitle}
            className="text-xs text-muted-foreground/70 italic"
          >
            {pendingTitle}
          </span>
        ) : canOpen ? (
          <Button
            type="button"
            size="sm"
            variant="default"
            disabled={isMutating}
            onClick={onOpen}
            className="font-semibold"
          >
            <Mail className="w-3.5 h-3.5" />
            {t('openEnvelope')}
          </Button>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground italic">
            <Lock className="w-3.5 h-3.5" />
            {t('openUnavailable')}
          </span>
        )}
      </div>
    </div>
  )
}

interface StarRatingFormProps {
  participacion: ParticipacionPanelItem
  disabled: boolean
  onRate: (
    calificacion: number,
    comentario: string | undefined,
  ) => Promise<void>
}

function StarRatingForm({
  participacion,
  disabled,
  onRate,
}: StarRatingFormProps) {
  const t = useTranslations('ProjectDetail')
  const [stars, setStars] = useState(participacion.calificacionPrototipo ?? 0)
  const [comment, setComment] = useState(
    participacion.comentarioPrototipo ?? '',
  )
  const [submitting, setSubmitting] = useState(false)

  const isDisabled = disabled || submitting

  const handleSave = async () => {
    if (stars === 0 || isDisabled) return
    setSubmitting(true)
    await onRate(stars, comment.trim() !== '' ? comment.trim() : undefined)
    setSubmitting(false)
  }

  return (
    <div className="space-y-3 pt-3 border-t border-border/40">
      <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
        {t('ratePrototypeTitle')}
      </h4>
      <StarRating value={stars} onChange={setStars} disabled={isDisabled} />
      <Textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        disabled={isDisabled}
        placeholder={t('ratingCommentPlaceholder')}
        rows={2}
        className="bg-card/50 border-border text-sm resize-none"
      />
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={stars === 0 || isDisabled}
        onClick={() => void handleSave()}
        className="font-semibold"
      >
        {t('saveRating')}
      </Button>
    </div>
  )
}

function StarRating({
  value,
  onChange,
  disabled,
}: {
  value: number
  onChange: (v: number) => void
  disabled: boolean
}) {
  const [hovered, setHovered] = useState(0)
  const active = hovered > 0 ? hovered : value
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={disabled}
          onClick={() => onChange(n)}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          aria-label={String(n)}
          className="focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary rounded disabled:cursor-not-allowed"
        >
          <Star
            className={cn(
              'w-5 h-5 transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)]',
              active >= n
                ? 'text-highlight fill-highlight'
                : 'text-muted-foreground/30',
            )}
          />
        </button>
      ))}
    </div>
  )
}

function StarReadOnly({ value }: { value: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn(
            'w-4 h-4',
            value >= n
              ? 'text-highlight fill-highlight'
              : 'text-muted-foreground/30',
          )}
        />
      ))}
    </div>
  )
}

function RatingCollapsible({
  calificacion,
  comentario,
}: {
  calificacion: number
  comentario: string | null
}) {
  const t = useTranslations('ProjectDetail')
  const [open, setOpen] = useState(false)

  return (
    <div className="pt-2">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)]"
      >
        <Star className="w-3.5 h-3.5 text-highlight" />
        {t('prototypeRatingLabel')}: {calificacion}/5
        <ChevronDown
          className={cn(
            'w-3.5 h-3.5 transition-transform duration-[var(--duration-fast)] ease-[var(--ease-out)]',
            open && 'rotate-180',
          )}
        />
      </button>
      {open && (
        <div className="mt-2 space-y-2 pl-1">
          <StarReadOnly value={calificacion} />
          {comentario ? (
            <div className="space-y-0.5">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {t('ratingCommentLabel')}
              </p>
              <p className="text-sm text-foreground">{comentario}</p>
            </div>
          ) : (
            <p className="text-xs italic text-muted-foreground">
              {t('ratingNoComment')}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function ContactButton({ idProyecto }: { idProyecto: string }) {
  const t = useTranslations('ProjectDetail')
  return (
    <Link
      href={`/empresario/mensajes?proyecto=${idProyecto}`}
      className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)]"
    >
      <MessageSquare className="w-3.5 h-3.5" />
      {t('contactarBtn')}
    </Link>
  )
}

function ActionButton({
  accion,
  disabled,
  onContratar,
  onRechazar,
}: {
  accion: ParticipacionAction
  disabled: boolean
  onContratar: () => void
  onRechazar: () => void
}) {
  const t = useTranslations('ProjectDetail')

  // El sobre cerrado reemplazó al botón "revisar": abrir la oferta es lo que
  // dispara `enviada -> en_revision`. Acá solo quedan contratar y rechazar.
  if (accion === 'revisar') {
    return null
  }
  if (accion === 'contratar') {
    return (
      <Button
        type="button"
        size="sm"
        variant="accent"
        disabled={disabled}
        onClick={onContratar}
        className="font-semibold"
      >
        <CheckCircle2 className="w-3.5 h-3.5" />
        {t('actionContratar')}
      </Button>
    )
  }
  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      disabled={disabled}
      onClick={onRechazar}
      className="font-semibold text-destructive hover:text-destructive hover:bg-destructive/10"
    >
      <XCircle className="w-3.5 h-3.5" />
      {t('actionRechazar')}
    </Button>
  )
}

function FilterButton({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'rounded-full border px-3 py-1 text-xs font-semibold transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)]',
        active
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-border bg-card/50 text-muted-foreground hover:border-primary/50',
      )}
    >
      {label}
    </button>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="p-8 border border-dashed border-border rounded-xl text-center text-muted-foreground bg-card/20">
      <Users className="w-8 h-8 mx-auto mb-2 text-muted-foreground/60" />
      {message}
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </h4>
      <div className="text-foreground">{children}</div>
    </div>
  )
}

function ExternalAnchor({
  href,
  label,
  icon,
  onClick,
}: {
  href: string
  label: string
  icon: ReactNode
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline cursor-pointer"
    >
      {icon}
      {label}
    </a>
  )
}

function InitialsAvatar({
  nombre,
  apellidos,
}: {
  nombre: string
  apellidos: string
}) {
  const iniciales =
    `${nombre.charAt(0)}${apellidos.charAt(0)}`.toUpperCase() || '?'
  return (
    <div className="w-10 h-10 shrink-0 rounded-full bg-secondary/15 text-secondary flex items-center justify-center font-bold text-sm">
      {iniciales}
    </div>
  )
}
