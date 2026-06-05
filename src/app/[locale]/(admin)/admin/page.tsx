'use client'

import React from 'react'
import { useTranslations } from 'next-intl'
import { useAppState } from '@/lib/stateContext'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { PageTitle } from '@/components/features/PageTitle'
import { DashboardStats, StatItem } from '@/components/features/DashboardStats'
import { CompanyCard } from '@/components/features/companies/CompanyCard'
import { ProjectCard } from '@/components/features/ProjectCard'
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

export default function AdminDashboard() {
  const tAdmin = useTranslations('Admin')

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
      description: 'Empresas registradas en la base',
      colorClass: 'text-primary bg-primary/10',
    },
    {
      title: tAdmin('statsPendingApprovals'),
      value: pendingCompanies.length,
      icon: ShieldCheck,
      description: 'Empresas esperando verificación',
      colorClass: 'text-warning bg-warning/10',
    },
    {
      title: tAdmin('statsActiveJobs'),
      value: activeProjects.length,
      icon: Briefcase,
      description: 'Proyectos visibles en marketplace',
      colorClass: 'text-accent bg-accent/10',
    },
    {
      title: tAdmin('statsApplicationsCount'),
      value: totalApplications,
      icon: Layers,
      description: 'Candidaturas enviadas en total',
      colorClass: 'text-magenta bg-magenta/10',
    },
  ]

  const handleApproveCompany = (id: string, name: string) => {
    updateCompanyStatus(id, 'approved')
    toast.success(`Empresa "${name}" aprobada exitosamente.`)
  }

  const handleRejectCompany = (id: string, name: string) => {
    updateCompanyStatus(id, 'rejected')
    toast.error(`Registro de "${name}" rechazado.`)
  }

  const handleHideProject = (id: string, title: string) => {
    updateProjectStatus(id, 'closed')
    toast.warning(`Proyecto "${title}" ocultado del marketplace.`)
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageTitle
          title={tAdmin('dashboard')}
          description="Verifica empresas registradas, modera proyectos publicados y analiza métricas generales."
          dotColor="text-magenta"
        />

        <DashboardStats stats={stats} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-10">
          <div className="lg:col-span-6 space-y-6">
            <div className="flex justify-between items-center pb-2 border-b border-border/60">
              <h2 className="text-xl font-bold tracking-tight text-foreground font-heading">
                Verificación de Empresas ({pendingCompanies.length})
                <span className="text-warning">.</span>
              </h2>
              <Link
                href="/admin/companies"
                className="text-sm font-semibold text-primary hover:underline flex items-center gap-1"
              >
                Ver todas
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {pendingCompanies.length === 0 ? (
              <div className="p-8 border border-dashed border-border rounded-xl text-center text-muted-foreground bg-card/20">
                <CheckSquare className="w-8 h-8 mx-auto mb-2 text-emerald-600" />
                No hay empresas pendientes de aprobación en este momento.
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
                Moderación de Proyectos ({activeProjects.length})
                <span className="text-accent">.</span>
              </h2>
              <Link
                href="/admin/projects"
                className="text-sm font-semibold text-primary hover:underline flex items-center gap-1"
              >
                Ver todos
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {activeProjects.length === 0 ? (
              <div className="p-8 border border-dashed border-border rounded-xl text-center text-muted-foreground bg-card/20">
                <AlertOctagon className="w-8 h-8 mx-auto mb-2 text-muted-foreground/60" />
                No hay proyectos activos para moderar en este momento.
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
                        className="w-full border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 flex items-center justify-center gap-1.5"
                      >
                        <AlertOctagon className="w-4 h-4" />
                        {tAdmin('hide')} del Marketplace
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
