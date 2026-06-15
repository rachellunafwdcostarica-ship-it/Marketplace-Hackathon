'use client'

/**
 * HUÉRFANO / CÓDIGO MUERTO — preservado a pedido del equipo.
 *
 * Era el dashboard del admin en `/[locale]/(admin)/admin/page.tsx` cuando leía
 * datos MOCK de `StateContext` (`useAppState`): stats, empresas pendientes y
 * proyectos activos en memoria. Se reemplazó: ahora `/admin` redirige a la
 * gestión de usuarios real (`/admin/users`, datos de Supabase). NO se importa
 * en ningún lado: queda solo de referencia para quien lo escribió.
 * Ver `docs/deuda-tecnica-mocks.md`. Borrar cuando el dashboard real madure.
 */

import React from 'react'
import { useTranslations } from 'next-intl'
import { useAppState } from '@/lib/StateContext'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { PageTitle } from '@/components/features/brand/PageTitle'
import { DashboardStats, StatItem } from '@/components/features/DashboardStats'
import { CompanyCard } from '@/components/features/companies/CompanyCard'
import { ProjectCard } from '@/components/features/marketplace/ProjectCard'
import { Button } from '@/components/ui/button'
import { Link } from '@/i18n/routing'
import { toast } from 'sonner'
import {
  Building,
  Briefcase,
  Layers,
  ShieldCheck,
  CheckSquare,
  AlertOctagon,
  ArrowRight,
} from 'lucide-react'

export function MockAdminDashboard() {
  const tAdmin = useTranslations('Admin')
  const tCommon = useTranslations('Common')

  const {
    projects,
    applications,
    companies,
    updateCompanyStatus,
    updateProjectStatus,
  } = useAppState()

  const totalCompanies = companies.length
  const pendingCompanies = companies.filter((c) => c.status === 'pending')
  const activeProjects = projects.filter((p) => p.status === 'active')
  const totalApplications = applications.length

  const stats: StatItem[] = [
    {
      title: tAdmin('statsTotalCompanies'),
      value: totalCompanies,
      icon: Building,
      description: tAdmin('statsTotalCompaniesDesc'),
      colorClass: 'text-primary bg-primary/10',
    },
    {
      title: tAdmin('statsPendingApprovals'),
      value: pendingCompanies.length,
      icon: ShieldCheck,
      description: tAdmin('statsPendingDesc'),
      colorClass: 'text-warning bg-warning/10',
    },
    {
      title: tAdmin('statsActiveJobs'),
      value: activeProjects.length,
      icon: Briefcase,
      description: tAdmin('statsActiveJobsDesc'),
      colorClass: 'text-accent bg-accent/10',
    },
    {
      title: tAdmin('statsApplicationsCount'),
      value: totalApplications,
      icon: Layers,
      description: tAdmin('statsApplicationsDesc'),
      colorClass: 'text-magenta bg-magenta/10',
    },
  ]

  const handleApproveCompany = (id: string, name: string) => {
    updateCompanyStatus(id, 'approved')
    toast.success(tAdmin('companyApproved', { name }))
  }

  const handleRejectCompany = (id: string, name: string) => {
    updateCompanyStatus(id, 'rejected')
    toast.error(tAdmin('companyRejected', { name }))
  }

  const handleHideProject = (id: string, title: string) => {
    updateProjectStatus(id, 'closed')
    toast.warning(tAdmin('projectHidden', { title }))
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageTitle
          title={tAdmin('dashboard')}
          description={tAdmin('dashboardDesc')}
          dotColor="text-magenta"
        />

        <DashboardStats stats={stats} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-10">
          <div className="lg:col-span-6 space-y-6">
            <div className="flex justify-between items-center pb-2 border-b border-border/60">
              <h2 className="text-xl font-bold tracking-tight text-foreground font-heading">
                {tAdmin('verifyCompany')} ({pendingCompanies.length})
                <span className="text-warning">.</span>
              </h2>
              <Link
                href="/admin/companies"
                className="text-sm font-semibold text-primary hover:underline flex items-center gap-1"
              >
                {tCommon('viewAll')}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {pendingCompanies.length === 0 ? (
              <div className="p-8 border border-dashed border-border rounded-xl text-center text-muted-foreground bg-card/20">
                <CheckSquare className="w-8 h-8 mx-auto mb-2 text-accent" />
                {tAdmin('noPendingCompanies')}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {pendingCompanies.slice(0, 2).map((company) => (
                  <CompanyCard
                    key={company.id}
                    company={company}
                    onApprove={() =>
                      handleApproveCompany(company.id, company.name)
                    }
                    onReject={() =>
                      handleRejectCompany(company.id, company.name)
                    }
                  />
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-6 space-y-6">
            <div className="flex justify-between items-center pb-2 border-b border-border/60">
              <h2 className="text-xl font-bold tracking-tight text-foreground font-heading">
                {tAdmin('moderateProject')} ({activeProjects.length})
                <span className="text-accent">.</span>
              </h2>
              <Link
                href="/admin/projects"
                className="text-sm font-semibold text-primary hover:underline flex items-center gap-1"
              >
                {tCommon('viewAll')}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {activeProjects.length === 0 ? (
              <div className="p-8 border border-dashed border-border rounded-xl text-center text-muted-foreground bg-card/20">
                <AlertOctagon className="w-8 h-8 mx-auto mb-2 text-muted-foreground/60" />
                {tAdmin('noPendingCompanies')}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {activeProjects.slice(0, 2).map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    actionButton={
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          handleHideProject(project.id, project.title)
                        }
                        className="w-full border-destructive/20 text-destructive hover:bg-destructive/10 hover:text-destructive flex items-center justify-center gap-1.5"
                      >
                        <AlertOctagon className="w-4 h-4" />
                        {tAdmin('hideFromMarketplace')}
                      </Button>
                    }
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
