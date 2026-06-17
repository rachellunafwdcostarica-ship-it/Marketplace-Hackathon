'use client'

import { useState, type ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { ArrowLeft, ChevronRight, Lock, Sparkles, XCircle } from 'lucide-react'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { SidebarEmpresaNuevo } from '@/components/layout/SidebarEmpresaNuevo'
import { PageTitle } from '@/components/features/brand/PageTitle'
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
import { Link, useRouter } from '@/i18n/routing'
import { useAccountStatus } from '@/components/features/auth/AccountStatusContext'
import { cancelProject } from '@/lib/projects/dashboard'
import { setProjectEstado } from '@/lib/projects/project-detail'
import type { PublishedProject } from '@/lib/projects/dashboard'
import type { ParticipacionEmpresario } from '@/lib/projects/project-detail'
import type { Result } from '@/lib/result'
import {
  getProjectForwardStates,
  type ProjectForwardTarget,
} from '@/lib/projects/project-detail-logic'
import {
  StatusPill,
  formatBudget,
} from '@/components/features/projects/PublishedProjectsBoard'
import { ParticipationsPanel } from '@/components/features/projects/ParticipationsPanel'

interface ProjectDetailClientProps {
  project: PublishedProject
  participationsResult: Result<ParticipacionEmpresario[]>
}

const KNOWN_CANCEL_ERRORS = new Set([
  'unauthorized',
  'empresario_no_encontrado',
  'cancel_failed',
  'unexpected',
])

function isCancelable(estado: PublishedProject['estado']): boolean {
  return estado !== 'finalizado' && estado !== 'cancelado'
}

export function ProjectDetailClient({
  project,
  participationsResult,
}: ProjectDetailClientProps) {
  const t = useTranslations('ProjectDetail')
  const tBoard = useTranslations('ProjectsBoard')
  const tCommon = useTranslations('Common')
  const tAccount = useTranslations('Account')
  const router = useRouter()
  const { isPending } = useAccountStatus()

  const [advanceTarget, setAdvanceTarget] =
    useState<ProjectForwardTarget | null>(null)
  const [advancing, setAdvancing] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelChecked, setCancelChecked] = useState(false)
  const [cancelMotivo, setCancelMotivo] = useState('')
  const [cancelling, setCancelling] = useState(false)

  const forwardStates = getProjectForwardStates(project.estadoEfectivo)
  const cancelable = isCancelable(project.estado)
  const budget = formatBudget(
    project.moneda,
    project.presupuestoMin,
    project.presupuestoMax,
    tBoard('budgetNonNegotiable'),
  )

  const confirmAdvance = async () => {
    if (!advanceTarget || advancing) return
    setAdvancing(true)
    const res = await setProjectEstado({
      idProyecto: project.id,
      destino: advanceTarget,
    })
    setAdvancing(false)
    if (res.ok) {
      toast.success(t('advanceSuccess'))
      setAdvanceTarget(null)
      router.refresh()
      return
    }
    toast.error(
      res.error === 'transicion_invalida'
        ? t('errors.transicion_invalida')
        : t('errors.generic'),
    )
  }

  const cerrarCancel = () => {
    setCancelOpen(false)
    setCancelChecked(false)
    setCancelMotivo('')
  }

  const confirmCancel = async () => {
    if (!cancelChecked || cancelling) return
    setCancelling(true)
    const res = await cancelProject(project.id, cancelMotivo)
    setCancelling(false)
    if (res.ok) {
      toast.success(tBoard('cancelSuccess'))
      cerrarCancel()
      router.refresh()
      return
    }
    const code = KNOWN_CANCEL_ERRORS.has(res.error) ? res.error : 'unexpected'
    toast.error(tBoard(`errors.${code}`))
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />

      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col lg:flex-row gap-8">
        <SidebarEmpresaNuevo />

        <main className="flex-1 space-y-8">
          <Link
            href="/empresario"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-primary transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)]"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('backToDashboard')}
          </Link>

          <PageTitle
            title={project.titulo}
            description={
              budget ? `${tCommon(project.modalidad)} · ${budget}` : undefined
            }
            dotColor="text-secondary"
            action={
              <StatusPill
                estado={project.estadoEfectivo}
                label={tBoard(`status_${project.estadoEfectivo}`)}
              />
            }
          />

          <Card className="border border-border/80 bg-card/40">
            <CardContent className="p-6 space-y-5">
              <SectionHeading>{t('projectInfoTitle')}</SectionHeading>
              <DetailField label={tBoard('descriptionLabel')}>
                <p className="text-foreground whitespace-pre-wrap text-sm">
                  {project.descripcion}
                </p>
              </DetailField>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {project.areaNombre && (
                  <DetailField label={tBoard('areaLabel')}>
                    {project.areaNombre}
                  </DetailField>
                )}
                <DetailField label={tBoard('modalityLabel')}>
                  {tCommon(project.modalidad)}
                </DetailField>
                {budget && (
                  <DetailField label={tBoard('budgetLabel')}>
                    {budget}
                  </DetailField>
                )}
                {project.modalidad !== 'remoto' &&
                  (project.paisProyecto || project.ciudadProyecto) && (
                    <DetailField label={tBoard('locationLabel')}>
                      {[project.ciudadProyecto, project.paisProyecto]
                        .filter(Boolean)
                        .join(', ')}
                    </DetailField>
                  )}
                {project.fechaPublicacion && (
                  <DetailField label={tBoard('publishDateLabel')}>
                    {project.fechaPublicacion.slice(0, 10)}
                  </DetailField>
                )}
                {project.fechaCierre && (
                  <DetailField label={tBoard('closeDateLabel')}>
                    {project.fechaCierre.slice(0, 10)}
                  </DetailField>
                )}
              </div>
              {project.categorias.length > 0 && (
                <DetailField label={tBoard('categoriesLabel')}>
                  <ChipRow items={project.categorias} />
                </DetailField>
              )}
              {project.tecnologias.length > 0 && (
                <DetailField label={tBoard('technologiesLabel')}>
                  <ChipRow items={project.tecnologias} />
                </DetailField>
              )}
              {project.involucraIa && (
                <ChipRow items={[tBoard('involvesAi')]} />
              )}
            </CardContent>
          </Card>

          <Card className="border border-border/80 bg-card/40">
            <CardContent className="p-6 space-y-4">
              <SectionHeading>{t('manageTitle')}</SectionHeading>
              {isPending ? (
                <p className="text-sm text-muted-foreground italic">
                  {tAccount('actionDisabledPending')}
                </p>
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  {forwardStates.map((destino) => (
                    <Button
                      key={destino}
                      type="button"
                      variant="secondary"
                      onClick={() => setAdvanceTarget(destino)}
                      className="font-semibold"
                    >
                      {t('advanceTo', { state: tBoard(`status_${destino}`) })}
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  ))}
                  {cancelable && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setCancelOpen(true)}
                      className="font-semibold text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <XCircle className="w-4 h-4" />
                      {tBoard('cancelAction')}
                    </Button>
                  )}
                  {forwardStates.length === 0 && !cancelable && (
                    <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground italic">
                      <Lock className="w-3.5 h-3.5" />
                      {t('noActionsAvailable')}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <section className="space-y-5">
            <div className="space-y-1.5">
              <h2 className="text-xl font-bold tracking-tight text-foreground font-heading flex items-center gap-2">
                {t('participationsTitle')}
                <span className="text-accent">.</span>
              </h2>
              <p className="text-sm text-muted-foreground">
                {t('participationsDesc')}
              </p>
            </div>
            <ParticipationsPanel result={participationsResult} />
          </section>
        </main>
      </div>

      <Footer />

      <Dialog
        open={advanceTarget !== null}
        onOpenChange={(open) => !open && setAdvanceTarget(null)}
      >
        <DialogContent className="sm:max-w-md border border-border">
          {advanceTarget && (
            <>
              <DialogHeader className="flex flex-col items-center text-center">
                <div className="p-3 rounded-full mb-3 bg-secondary/15 text-secondary">
                  <Sparkles className="w-6 h-6" />
                </div>
                <DialogTitle className="text-xl font-bold font-heading">
                  {t('advanceConfirmTitle')}
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground mt-2">
                  {t('advanceConfirmDesc', {
                    state: tBoard(`status_${advanceTarget}`),
                  })}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex gap-2 sm:justify-center pt-4 border-t border-border/40">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAdvanceTarget(null)}
                  disabled={advancing}
                  className="flex-1 sm:flex-initial"
                >
                  {tCommon('cancel')}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void confirmAdvance()}
                  disabled={advancing}
                  className="font-semibold flex-1 sm:flex-initial"
                >
                  {advancing ? t('advancing') : t('advanceConfirm')}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={cancelOpen}
        onOpenChange={(open) => !open && cerrarCancel()}
      >
        <DialogContent className="sm:max-w-md border border-border">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold font-heading text-destructive">
              {tBoard('cancelDialogTitle')}
            </DialogTitle>
            <DialogDescription className="text-base text-foreground">
              {tBoard('cancelDialogWarning')}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2">
            <p className="text-base font-semibold text-foreground truncate">
              {project.titulo}
            </p>
          </div>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="cancelMotivo" className="text-base font-semibold">
                {tBoard('cancelMotivoLabel')}
              </Label>
              <Textarea
                id="cancelMotivo"
                rows={2}
                value={cancelMotivo}
                onChange={(event) => setCancelMotivo(event.target.value)}
                disabled={cancelling}
                placeholder={tBoard('cancelMotivoPlaceholder')}
                className="bg-card/50 border-border focus-visible:ring-destructive resize-none"
              />
            </div>
            <label className="flex items-start gap-2 text-base text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={cancelChecked}
                onChange={(event) => setCancelChecked(event.target.checked)}
                disabled={cancelling}
                className="mt-0.5 accent-[var(--color-destructive)]"
              />
              {tBoard('cancelCheckbox')}
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
              onClick={() => void confirmCancel()}
              disabled={!cancelChecked || cancelling}
              className="bg-destructive hover:bg-destructive/90 text-primary-foreground font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cancelling ? tBoard('cancelling') : tBoard('cancelConfirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-lg font-bold font-heading text-foreground border-b border-border/60 pb-2">
      {children}
    </h2>
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
      {items.map((etiqueta) => (
        <span
          key={etiqueta}
          className="inline-flex items-center rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground"
        >
          {etiqueta}
        </span>
      ))}
    </div>
  )
}
