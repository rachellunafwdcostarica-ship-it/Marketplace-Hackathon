'use client'

import React, { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useAppState } from '@/lib/stateContext'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { PageTitle } from '@/components/features/PageTitle'
import { DashboardStats, StatItem } from '@/components/features/DashboardStats'
import { ApplicationCard } from '@/components/features/applications/ApplicationCard'
import { EmptyState } from '@/components/features/EmptyState'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Link } from '@/i18n/routing'
import { toast } from 'sonner'
import { MOCK_COMPANY_ID } from '@/constants/mockData'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Briefcase,
  Users,
  CheckCircle,
  FileText,
  Plus,
  PowerOff,
  UserCheck,
  AlertTriangle,
} from 'lucide-react'

export default function CompanyDashboard() {
  const tEmpresa = useTranslations('Empresa')
  const tCommon = useTranslations('Common')

  const {
    projects,
    applications,
    updateApplicationStatus,
    updateProjectStatus,
  } = useAppState()

  const myProjects = projects.filter((p) => p.companyId === MOCK_COMPANY_ID)
  const activeProjects = myProjects.filter((p) => p.status === 'active')
  const myProjectIds = myProjects.map((p) => p.id)
  const receivedApps = applications.filter((app) =>
    myProjectIds.includes(app.projectId),
  )

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    type: 'accept' | 'reject' | 'close-project'
    targetId: string
    title: string
  }>({ isOpen: false, type: 'accept', targetId: '', title: '' })

  const stats: StatItem[] = [
    {
      title: tEmpresa('statsActiveProjects'),
      value: activeProjects.length,
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
    type: 'accept' | 'reject' | 'close-project',
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
    } else if (type === 'reject') {
      updateApplicationStatus(targetId, 'rejected')
      toast.error(tEmpresa('rejectSuccess'))
    } else if (type === 'close-project') {
      updateProjectStatus(targetId, 'closed')
      toast.success(tEmpresa('closeProjectSuccess'))
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
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageTitle
          title={tEmpresa('dashboard')}
          description={tEmpresa('dashboardDesc')}
          dotColor="text-secondary"
          action={
            <Link
              href="/empresa/new-project"
              className="bg-primary hover:bg-primary/95 text-white font-semibold flex items-center justify-center gap-1.5 shadow-md rounded-lg text-sm h-8 px-3 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              {tEmpresa('publishProject')}
            </Link>
          }
        />

        <DashboardStats stats={stats} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-10">
          <div className="lg:col-span-6 space-y-6">
            <h2 className="text-xl font-bold tracking-tight text-foreground font-heading pb-2 border-b border-border/60">
              {tEmpresa('myPublishedProjects')}
              <span className="text-secondary">.</span>
            </h2>

            {myProjects.length === 0 ? (
              <EmptyState
                title={tEmpresa('noProjects')}
                description={tEmpresa('noProjectsDesc')}
                icon={Briefcase}
              />
            ) : (
              <div className="space-y-4">
                {myProjects.map((project) => (
                  <Card
                    key={project.id}
                    className="border border-border/80 bg-card/40 backdrop-blur-sm overflow-hidden hover:shadow-sm transition-all duration-300"
                  >
                    <CardContent className="p-5 flex justify-between items-start gap-4">
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-base truncate leading-snug">
                            {project.title}
                          </h4>
                          <Badge
                            variant={
                              project.status === 'active'
                                ? 'default'
                                : 'secondary'
                            }
                            className={`text-[10px] font-semibold px-2 rounded-full ${
                              project.status === 'active'
                                ? 'bg-accent/10 text-accent border border-accent/20'
                                : 'bg-muted text-muted-foreground border border-border'
                            }`}
                          >
                            {project.status === 'active'
                              ? tCommon('statusActive')
                              : tCommon('statusClosed')}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {tCommon('budget')}:{' '}
                          <span className="font-bold text-foreground">
                            ${project.budget} USD
                          </span>{' '}
                          • {tCommon('duration')}:{' '}
                          <span className="font-semibold text-foreground">
                            {project.duration}
                          </span>
                        </p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {project.stack.slice(0, 3).map((s) => (
                            <span
                              key={s}
                              className="text-[10px] bg-secondary/5 text-secondary border border-border px-1.5 rounded"
                            >
                              {s}
                            </span>
                          ))}
                          {project.stack.length > 3 && (
                            <span className="text-[10px] text-muted-foreground">
                              + {project.stack.length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                      {project.status === 'active' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            handleActionClick(
                              'close-project',
                              project.id,
                              project.title,
                            )
                          }
                          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg shrink-0"
                          title="Cerrar Proyecto"
                        >
                          <PowerOff className="w-4 h-4" />
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
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
                    onContact={() => handleContactCandidate(app.candidateEmail)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <Dialog
          open={confirmDialog.isOpen}
          onOpenChange={(isOpen) => setConfirmDialog((p) => ({ ...p, isOpen }))}
        >
          <DialogContent className="sm:max-w-md border border-border">
            <DialogHeader className="flex flex-col items-center text-center">
              <div
                className={`p-3 rounded-full mb-3 ${
                  confirmDialog.type === 'accept'
                    ? 'bg-accent/15 text-accent'
                    : confirmDialog.type === 'reject'
                      ? 'bg-destructive/15 text-destructive'
                      : 'bg-warning/15 text-warning'
                }`}
              >
                {confirmDialog.type === 'accept' ? (
                  <CheckCircle className="w-6 h-6" />
                ) : confirmDialog.type === 'reject' ? (
                  <AlertTriangle className="w-6 h-6" />
                ) : (
                  <PowerOff className="w-6 h-6" />
                )}
              </div>
              <DialogTitle className="text-xl font-bold font-heading">
                {confirmDialog.type === 'accept'
                  ? tEmpresa('confirmAccept')
                  : confirmDialog.type === 'reject'
                    ? tEmpresa('confirmReject')
                    : tEmpresa('confirmCloseProject')}
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
                className={`font-semibold flex-1 sm:flex-initial text-white ${
                  confirmDialog.type === 'accept'
                    ? 'bg-accent hover:bg-accent/90'
                    : confirmDialog.type === 'reject'
                      ? 'bg-destructive hover:bg-destructive/90'
                      : 'bg-warning hover:bg-warning/90'
                }`}
              >
                {tCommon('confirm')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>

      <Footer />
    </div>
  )
}
