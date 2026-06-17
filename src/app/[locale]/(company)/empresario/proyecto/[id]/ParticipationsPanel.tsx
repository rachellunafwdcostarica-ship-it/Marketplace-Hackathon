'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import {
  CheckCircle2,
  ExternalLink,
  FileText,
  GitBranch,
  Star,
  Users,
  XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useRouter } from '@/i18n/routing'
import { useAccountStatus } from '@/components/features/auth/AccountStatusContext'
import { cn } from '@/lib/utils/cn'
import { setParticipacionEstado } from '@/lib/projects/project-detail'
import type { ParticipacionEmpresario } from '@/lib/projects/project-detail'
import type { Result } from '@/lib/result'
import {
  PARTICIPACION_FILTERS,
  getParticipacionActions,
  matchesParticipacionFilter,
  type EstadoParticipacion,
  type ParticipacionAction,
  type ParticipacionFilter,
} from '@/lib/projects/project-detail-logic'

interface ParticipationsPanelProps {
  result: Result<ParticipacionEmpresario[]>
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
  participacion: ParticipacionEmpresario
}

export function ParticipationsPanel({ result }: ParticipationsPanelProps) {
  const t = useTranslations('ProjectDetail')
  const tCommon = useTranslations('Common')
  const tAccount = useTranslations('Account')
  const router = useRouter()
  const { isPending } = useAccountStatus()

  const [filter, setFilter] = useState<ParticipacionFilter>('todos')
  const [confirm, setConfirm] = useState<ConfirmState | null>(null)
  const [mutatingId, setMutatingId] = useState<string | null>(null)

  const participaciones = useMemo(
    () => (result.ok ? result.data : []),
    [result],
  )

  const visibles = useMemo(
    () => participaciones.filter((p) => matchesParticipacionFilter(p, filter)),
    [participaciones, filter],
  )

  const runAction = async (
    participacion: ParticipacionEmpresario,
    accion: ParticipacionAction,
  ) => {
    setMutatingId(participacion.idParticipacion)
    const res = await setParticipacionEstado({
      idParticipacion: participacion.idParticipacion,
      accion,
    })
    setMutatingId(null)
    setConfirm(null)
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
              isMutating={mutatingId === participacion.idParticipacion}
              isPending={isPending}
              pendingTitle={tAccount('actionDisabledPending')}
              onRevisar={() => void runAction(participacion, 'revisar')}
              onContratar={() =>
                setConfirm({ accion: 'contratar', participacion })
              }
              onRechazar={() =>
                setConfirm({ accion: 'rechazar', participacion })
              }
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
    </div>
  )
}

interface ParticipationCardProps {
  participacion: ParticipacionEmpresario
  isMutating: boolean
  isPending: boolean
  pendingTitle: string
  onRevisar: () => void
  onContratar: () => void
  onRechazar: () => void
}

function ParticipationCard({
  participacion,
  isMutating,
  isPending,
  pendingTitle,
  onRevisar,
  onContratar,
  onRechazar,
}: ParticipationCardProps) {
  const t = useTranslations('ProjectDetail')
  const acciones = getParticipacionActions(participacion.estado)
  const nombreCompleto =
    `${participacion.estudianteNombre} ${participacion.estudianteApellidos}`.trim()

  return (
    <Card className="border border-border/80 bg-card/40">
      <CardContent className="p-5 space-y-4">
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
              />
            ))}
            {participacion.documentacionTecnica && (
              <ExternalAnchor
                href={participacion.documentacionTecnica}
                label={t('techDocLabel')}
                icon={<FileText className="w-3.5 h-3.5" />}
              />
            )}
            {participacion.urlRepositorioProyecto && (
              <ExternalAnchor
                href={participacion.urlRepositorioProyecto}
                label={t('repoLabel')}
                icon={<GitBranch className="w-3.5 h-3.5" />}
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
            {participacion.calificacionPrototipo !== null && (
              <span>
                {t('prototypeRatingLabel')}:{' '}
                <span className="font-semibold text-foreground">
                  {participacion.calificacionPrototipo}/5
                </span>
              </span>
            )}
          </div>
        </div>

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
                  onRevisar={onRevisar}
                  onContratar={onContratar}
                  onRechazar={onRechazar}
                />
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ActionButton({
  accion,
  disabled,
  onRevisar,
  onContratar,
  onRechazar,
}: {
  accion: ParticipacionAction
  disabled: boolean
  onRevisar: () => void
  onContratar: () => void
  onRechazar: () => void
}) {
  const t = useTranslations('ProjectDetail')

  if (accion === 'revisar') {
    return (
      <Button
        type="button"
        size="sm"
        variant="default"
        disabled={disabled}
        onClick={onRevisar}
        className="font-semibold"
      >
        <CheckCircle2 className="w-3.5 h-3.5" />
        {t('actionRevisar')}
      </Button>
    )
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
}: {
  href: string
  label: string
  icon: ReactNode
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
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
