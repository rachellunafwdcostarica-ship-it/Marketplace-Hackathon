'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useAppState } from '@/lib/StateContext'
import { useAccountStatus } from '@/components/features/auth/AccountStatusContext'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { PageTitle } from '@/components/features/brand/PageTitle'
import { DashboardStats, StatItem } from '@/components/features/DashboardStats'
import { ApplicationCard } from '@/components/features/applications/ApplicationCard'
import { PublishedProjectsBoard } from '@/components/features/projects/PublishedProjectsBoard'
import { Button } from '@/components/ui/button'
import { Link, useRouter } from '@/i18n/routing'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { SidebarEmpresaNuevo } from '@/components/layout/SidebarEmpresaNuevo'
import {
  Briefcase,
  Users,
  CheckCircle,
  Plus,
  UserCheck,
  AlertTriangle,
  Building2,
} from 'lucide-react'
import {
  getMyPublishedProjects,
  type PublishedProject,
} from '@/lib/projects/dashboard'

export default function CompanyDashboard() {
  const tEmpresa = useTranslations('Empresa')
  const tCommon = useTranslations('Common')
  const tAccount = useTranslations('Account')
  const tBoard = useTranslations('ProjectsBoard')
  const { isPending } = useAccountStatus()

  // Postulaciones siguen en mock (StateContext); los proyectos pasan a datos reales.
  const {
    projects,
    applications,
    updateApplicationStatus,
    currentCompany: company,
  } = useAppState()

  const router = useRouter()

  const [realProjects, setRealProjects] = useState<PublishedProject[]>([])
  const [loadingProjects, setLoadingProjects] = useState(true)

  const loadProjects = useCallback(async () => {
    setLoadingProjects(true)
    const result = await getMyPublishedProjects()
    if (result.ok) {
      setRealProjects(result.data)
    } else {
      toast.error(tBoard('errors.load'))
    }
    setLoadingProjects(false)
  }, [tBoard])

  useEffect(() => {
    void loadProjects()
  }, [loadProjects])

  useEffect(() => {
    if (company && !company.isProfileFilled) {
      router.replace('/empresa/formulario-empresa')
    }
  }, [company, router])

  // Postulaciones recibidas: mock, filtradas por los proyectos mock del contexto.
  const myProjectIds = projects
    .filter((p) => p.companyId === (company?.id || 'comp-1'))
    .map((p) => p.id)
  const receivedApps = applications.filter((app) =>
    myProjectIds.includes(app.projectId),
  )

  const activeRealCount = realProjects.filter(
    (p) => p.estadoEfectivo === 'abierto',
  ).length

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    type: 'accept' | 'reject'
    targetId: string
    title: string
  }>({ isOpen: false, type: 'accept', targetId: '', title: '' })

  const stats: StatItem[] = [
    {
      title: tEmpresa('statsActiveProjects'),
      value: activeRealCount,
      icon: Briefcase,
      description: tEmpresa('statsActiveProjectsDesc'),
      colorClass: 'text-primary bg-primary/10',
    },
    {
      title: tEmpresa('statsTotalApplications'),
      value: receivedApps.length,
      icon: Users,
      description: tEmpresa('statsTotalAppsDesc'),
      colorClass: 'text-secondary bg-secondary/10',
    },
    {
      title: tEmpresa('statsHired'),
      value: receivedApps.filter((app) => app.status === 'accepted').length,
      icon: UserCheck,
      description: tEmpresa('statsHiredDesc'),
      colorClass: 'text-accent bg-accent/10',
    },
  ]

  const handleActionClick = (
    type: 'accept' | 'reject',
    targetId: string,
    title: string,
  ) => {
    setConfirmDialog({ isOpen: true, type, targetId, title })
  }

  const handleConfirmAction = () => {
    const { type, targetId } = confirmDialog
    if (type === 'accept') {
      updateApplicationStatus(targetId, 'accepted')
      toast.success(tEmpresa('acceptSuccess'))
    } else {
      updateApplicationStatus(targetId, 'rejected')
      toast.error(tEmpresa('rejectSuccess'))
    }
    setConfirmDialog((prev) => ({ ...prev, isOpen: false }))
  }

  const handleContactCandidate = (email: string) => {
    toast.info(tEmpresa('contactEmailInfo', { email }))
    window.location.assign(
      `mailto:${email}?subject=Contacto%20FWD%20Talent%20Marketplace`,
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />

      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col lg:flex-row gap-8">
        <SidebarEmpresaNuevo />

        <main className="flex-1 space-y-8">
          <PageTitle
            title={tEmpresa('dashboard')}
            description={tEmpresa('dashboardDesc')}
            dotColor="text-secondary"
            action={
              <div className="flex items-center gap-2">
                <Link
                  href="/empresa/perfil"
                  className="border border-border bg-background text-foreground hover:bg-muted font-semibold flex items-center justify-center gap-1.5 rounded-lg text-sm h-8 px-3 cursor-pointer"
                >
                  <Building2 className="w-4 h-4" />
                  {tEmpresa('myProfile')}
                </Link>
                {isPending ? (
                  <span
                    aria-disabled="true"
                    title={tAccount('actionDisabledPending')}
                    className="bg-muted text-muted-foreground/50 font-semibold flex items-center justify-center gap-1.5 rounded-lg text-sm h-8 px-3 cursor-not-allowed select-none"
                  >
                    <Plus className="w-4 h-4" />
                    {tEmpresa('publishProject')}
                  </span>
                ) : (
                  <Link
                    href="/empresa/new-project"
                    className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold flex items-center justify-center gap-1.5 shadow-md rounded-lg text-sm h-8 px-3 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    {tEmpresa('publishProject')}
                  </Link>
                )}
              </div>
            }
          />

          <DashboardStats stats={stats} />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-10">
            <div className="lg:col-span-6 space-y-6">
              <h2 className="text-xl font-bold tracking-tight text-foreground font-heading pb-2 border-b border-border/60">
                {tEmpresa('myPublishedProjects')}
                <span className="text-secondary">.</span>
              </h2>

              <PublishedProjectsBoard
                projects={realProjects}
                loading={loadingProjects}
                onRefetch={() => void loadProjects()}
              />
            </div>

            <div className="lg:col-span-6 space-y-6">
              <h2 className="text-xl font-bold tracking-tight text-foreground font-heading pb-2 border-b border-border/60">
                {tEmpresa('applicationsReceived')}
                <span className="text-accent">.</span>
              </h2>

              {receivedApps.length === 0 ? (
                <div className="p-8 border border-dashed border-border rounded-xl text-center text-muted-foreground bg-card/20">
                  <Users className="w-8 h-8 mx-auto mb-2 text-muted-foreground/60" />
                  {tEmpresa('noApplicationsYet')}
                </div>
              ) : (
                <div className="space-y-6">
                  {receivedApps.map((app) => (
                    <ApplicationCard
                      key={app.id}
                      application={app}
                      viewMode="empresa"
                      onAccept={() =>
                        handleActionClick('accept', app.id, app.candidateName)
                      }
                      onReject={() =>
                        handleActionClick('reject', app.id, app.candidateName)
                      }
                      onContact={() =>
                        handleContactCandidate(app.candidateEmail)
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          <Dialog
            open={confirmDialog.isOpen}
            onOpenChange={(isOpen) =>
              setConfirmDialog((p) => ({ ...p, isOpen }))
            }
          >
            <DialogContent className="sm:max-w-md border border-border">
              <DialogHeader className="flex flex-col items-center text-center">
                <div
                  className={`p-3 rounded-full mb-3 ${
                    confirmDialog.type === 'accept'
                      ? 'bg-accent/15 text-accent'
                      : 'bg-destructive/15 text-destructive'
                  }`}
                >
                  {confirmDialog.type === 'accept' ? (
                    <CheckCircle className="w-6 h-6" />
                  ) : (
                    <AlertTriangle className="w-6 h-6" />
                  )}
                </div>
                <DialogTitle className="text-xl font-bold font-heading">
                  {confirmDialog.type === 'accept'
                    ? tEmpresa('confirmAccept')
                    : tEmpresa('confirmReject')}
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground mt-2">
                  {tEmpresa('confirmActionOn')}{' '}
                  <span className="font-semibold text-foreground">
                    &ldquo;{confirmDialog.title}&rdquo;
                  </span>
                  . {tEmpresa('confirmCannotUndo')}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex gap-2 sm:justify-center pt-4 border-t border-border/40 mt-4">
                <Button
                  variant="outline"
                  onClick={() =>
                    setConfirmDialog((p) => ({ ...p, isOpen: false }))
                  }
                  className="border-border hover:bg-muted font-semibold flex-1 sm:flex-initial"
                >
                  {tCommon('cancel')}
                </Button>
                <Button
                  onClick={handleConfirmAction}
                  className={`font-semibold flex-1 sm:flex-initial text-primary-foreground ${
                    confirmDialog.type === 'accept'
                      ? 'bg-accent hover:bg-accent/90'
                      : 'bg-destructive hover:bg-destructive/90'
                  }`}
                >
                  {tCommon('confirm')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </main>
      </div>

      <Footer />
    </div>
  )
}
