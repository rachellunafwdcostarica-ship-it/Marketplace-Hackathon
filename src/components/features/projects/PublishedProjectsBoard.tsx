'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Eye, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
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
import { cancelProject } from '@/lib/projects/dashboard'
import type { EstadoEfectivo, PublishedProject } from '@/lib/projects/dashboard'

interface PublishedProjectsBoardProps {
  projects: PublishedProject[]
  onRefetch: () => void
}

const KNOWN_ERROR_CODES = new Set([
  'unauthorized',
  'empresario_no_encontrado',
  'cancel_failed',
  'unexpected',
])

const STATUS_STYLE: Record<EstadoEfectivo, string> = {
  abierto: 'bg-accent/10 text-accent border-accent/20',
  en_evaluacion: 'bg-warning/10 text-warning border-warning/20',
  adjudicado: 'bg-secondary/10 text-secondary border-secondary/20',
  en_desarrollo: 'bg-primary/10 text-primary border-primary/20',
  finalizado: 'bg-muted text-foreground border-border',
  cancelado: 'bg-destructive/10 text-destructive border-destructive/20',
  borrador: 'bg-muted text-muted-foreground border-border',
  en_recepcion: 'bg-primary/10 text-primary border-primary/20',
}

function isCancelable(project: PublishedProject): boolean {
  return project.estado !== 'finalizado' && project.estado !== 'cancelado'
}

function formatBudget(
  moneda: string,
  min: number | null,
  max: number | null,
  fijoLabel: string,
): string | null {
  if (min === null || max === null) return null
  return min === max
    ? `${moneda} ${min} · ${fijoLabel}`
    : `${moneda} ${min} – ${max}`
}

export function PublishedProjectsBoard({
  projects,
  onRefetch,
}: PublishedProjectsBoardProps) {
  const t = useTranslations('ProjectsBoard')
  const tCommon = useTranslations('Common')
  const [filter, setFilter] = useState<EstadoEfectivo | 'all'>('all')
  const [detail, setDetail] = useState<PublishedProject | null>(null)
  const [cancelTarget, setCancelTarget] = useState<PublishedProject | null>(
    null,
  )
  const [cancelChecked, setCancelChecked] = useState(false)
  const [cancelMotivo, setCancelMotivo] = useState('')
  const [cancelling, setCancelling] = useState(false)

  const estadosPresentes = useMemo(() => {
    const set = new Set<EstadoEfectivo>()
    projects.forEach((p) => set.add(p.estadoEfectivo))
    return Array.from(set)
  }, [projects])

  const visibles = useMemo(
    () =>
      filter === 'all'
        ? projects
        : projects.filter((p) => p.estadoEfectivo === filter),
    [projects, filter],
  )

  const cerrarCancel = () => {
    setCancelTarget(null)
    setCancelChecked(false)
    setCancelMotivo('')
  }

  const confirmarCancel = async () => {
    if (!cancelTarget || !cancelChecked || cancelling) return
    setCancelling(true)
    const result = await cancelProject(cancelTarget.id, cancelMotivo)
    setCancelling(false)
    if (result.ok) {
      toast.success(t('cancelSuccess'))
      cerrarCancel()
      onRefetch()
      return
    }
    const code = KNOWN_ERROR_CODES.has(result.error)
      ? result.error
      : 'unexpected'
    toast.error(t(`errors.${code}`))
  }

  if (projects.length === 0) {
    return (
      <div className="p-8 border border-dashed border-border rounded-xl text-center text-muted-foreground bg-card/20">
        <p className="font-semibold text-foreground">{t('empty')}</p>
        <p className="text-sm mt-1">{t('emptyDesc')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <FilterButton
          active={filter === 'all'}
          onClick={() => setFilter('all')}
          label={t('filterAll')}
        />
        {estadosPresentes.map((estado) => (
          <FilterButton
            key={estado}
            active={filter === estado}
            onClick={() => setFilter(estado)}
            label={t(`status_${estado}`)}
          />
        ))}
      </div>

      <div className="space-y-4">
        {visibles.map((project) => {
          const budget = formatBudget(
            project.moneda,
            project.presupuestoMin,
            project.presupuestoMax,
            t('budgetNonNegotiable'),
          )
          return (
            <Card
              key={project.id}
              className="border border-border/80 bg-card/40 backdrop-blur-sm overflow-hidden"
            >
              <CardContent className="p-5 flex justify-between items-start gap-4">
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-base truncate leading-snug">
                      {project.titulo}
                    </h4>
                    <StatusPill
                      estado={project.estadoEfectivo}
                      label={t(`status_${project.estadoEfectivo}`)}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {tCommon(project.modalidad)}
                    {budget && (
                      <>
                        {' · '}
                        <span className="font-semibold text-foreground">
                          {budget}
                        </span>
                      </>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setDetail(project)}
                    className="text-muted-foreground hover:text-primary inline-flex items-center gap-1.5"
                  >
                    <Eye className="w-4 h-4" />
                    {t('viewDetails')}
                  </Button>
                  {isCancelable(project) && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setCancelTarget(project)}
                      title={t('cancelAction')}
                      className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    >
                      <XCircle className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Dialog
        open={detail !== null}
        onOpenChange={(open) => !open && setDetail(null)}
      >
        <DialogContent className="sm:max-w-lg border border-border max-h-[85vh] overflow-y-auto">
          {detail && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 flex-wrap">
                  <DialogTitle className="text-lg font-bold font-heading">
                    {detail.titulo}
                  </DialogTitle>
                  <StatusPill
                    estado={detail.estadoEfectivo}
                    label={t(`status_${detail.estadoEfectivo}`)}
                  />
                </div>
              </DialogHeader>
              <div className="space-y-4 text-left text-sm">
                <DetailField label={t('descriptionLabel')}>
                  <p className="text-foreground whitespace-pre-wrap">
                    {detail.descripcion}
                  </p>
                </DetailField>
                <div className="grid grid-cols-2 gap-4">
                  {detail.areaNombre && (
                    <DetailField label={t('areaLabel')}>
                      {detail.areaNombre}
                    </DetailField>
                  )}
                  <DetailField label={t('modalityLabel')}>
                    {tCommon(detail.modalidad)}
                  </DetailField>
                  {formatBudget(
                    detail.moneda,
                    detail.presupuestoMin,
                    detail.presupuestoMax,
                    t('budgetNonNegotiable'),
                  ) && (
                    <DetailField label={t('budgetLabel')}>
                      {formatBudget(
                        detail.moneda,
                        detail.presupuestoMin,
                        detail.presupuestoMax,
                        t('budgetNonNegotiable'),
                      )}
                    </DetailField>
                  )}
                  {detail.modalidad !== 'remoto' &&
                    (detail.paisProyecto || detail.ciudadProyecto) && (
                      <DetailField label={t('locationLabel')}>
                        {[detail.ciudadProyecto, detail.paisProyecto]
                          .filter(Boolean)
                          .join(', ')}
                      </DetailField>
                    )}
                  {detail.fechaPublicacion && (
                    <DetailField label={t('publishDateLabel')}>
                      {detail.fechaPublicacion.slice(0, 10)}
                    </DetailField>
                  )}
                  {detail.fechaCierre && (
                    <DetailField label={t('closeDateLabel')}>
                      {detail.fechaCierre.slice(0, 10)}
                    </DetailField>
                  )}
                </div>
                {detail.categorias.length > 0 && (
                  <DetailField label={t('categoriesLabel')}>
                    <ChipRow items={detail.categorias} />
                  </DetailField>
                )}
                {detail.tecnologias.length > 0 && (
                  <DetailField label={t('technologiesLabel')}>
                    <ChipRow items={detail.tecnologias} />
                  </DetailField>
                )}
                {detail.involucraIa && <ChipRow items={[t('involvesAi')]} />}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={cancelTarget !== null}
        onOpenChange={(open) => !open && cerrarCancel()}
      >
        <DialogContent className="sm:max-w-md border border-border">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold font-heading text-destructive">
              {t('cancelDialogTitle')}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {t('cancelDialogWarning')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="cancelMotivo" className="text-sm font-semibold">
                {t('cancelMotivoLabel')}
              </Label>
              <Textarea
                id="cancelMotivo"
                rows={2}
                value={cancelMotivo}
                onChange={(event) => setCancelMotivo(event.target.value)}
                disabled={cancelling}
                placeholder={t('cancelMotivoPlaceholder')}
                className="bg-card/50 border-border focus-visible:ring-destructive resize-none"
              />
            </div>
            <label className="flex items-start gap-2 text-sm text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={cancelChecked}
                onChange={(event) => setCancelChecked(event.target.checked)}
                disabled={cancelling}
                className="mt-0.5 accent-[var(--color-destructive)]"
              />
              {t('cancelCheckbox')}
            </label>
          </div>
          <DialogFooter className="flex gap-2 sm:justify-end pt-4 border-t border-border/40">
            <Button
              type="button"
              variant="outline"
              onClick={cerrarCancel}
              disabled={cancelling}
            >
              {tCommon('cancel')}
            </Button>
            <Button
              type="button"
              onClick={() => void confirmarCancel()}
              disabled={!cancelChecked || cancelling}
              className="bg-destructive hover:bg-destructive/90 text-primary-foreground font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cancelling ? t('cancelling') : t('cancelConfirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
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

function StatusPill({
  estado,
  label,
}: {
  estado: EstadoEfectivo
  label: string
}) {
  return (
    <span
      className={cn(
        'text-[10px] font-semibold px-2 py-0.5 rounded-full border',
        STATUS_STYLE[estado],
      )}
    >
      {label}
    </span>
  )
}

function DetailField({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="space-y-1">
      <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </h4>
      <div className="text-foreground">{children}</div>
    </div>
  )
}

function ChipRow({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span
          key={item}
          className="inline-flex items-center rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground"
        >
          {item}
        </span>
      ))}
    </div>
  )
}
