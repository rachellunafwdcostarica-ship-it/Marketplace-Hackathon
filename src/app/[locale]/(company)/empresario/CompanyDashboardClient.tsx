'use client'

import { useTranslations } from 'next-intl'
import { useAccountStatus } from '@/components/features/auth/AccountStatusContext'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { PageTitle } from '@/components/features/brand/PageTitle'
import { DashboardStats, StatItem } from '@/components/features/DashboardStats'
import { PublishedProjectsBoard } from '@/components/features/projects/PublishedProjectsBoard'
import { Link } from '@/i18n/routing'
import { SidebarEmpresaNuevo } from '@/components/layout/SidebarEmpresaNuevo'
import { Briefcase, Users, Plus, UserCheck } from 'lucide-react'
import type { PublishedProject } from '@/lib/projects/dashboard'

interface CompanyDashboardClientProps {
  initialProjects: PublishedProject[]
  participationStats: { total: number; hired: number }
}

/**
 * Cuerpo (client) del dashboard del empresario. Proyectos y stats llegan YA
 * cargados por prop desde el server component (datos REALES, sin mock ni
 * useEffect de fetch). Las postulaciones se revisan en `/empresario/postulaciones`
 * y dentro de cada proyecto, no en el dashboard.
 */
export function CompanyDashboardClient({
  initialProjects,
  participationStats,
}: CompanyDashboardClientProps) {
  const tEmpresa = useTranslations('Empresa')
  const tAccount = useTranslations('Account')
  const { isPending } = useAccountStatus()

  const activeRealCount = initialProjects.filter(
    (p) => p.estadoEfectivo === 'abierto',
  ).length

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
      value: participationStats.total,
      icon: Users,
      description: tEmpresa('statsTotalAppsDesc'),
      colorClass: 'text-secondary bg-secondary/10',
    },
    {
      title: tEmpresa('statsHired'),
      value: participationStats.hired,
      icon: UserCheck,
      description: tEmpresa('statsHiredDesc'),
      colorClass: 'text-accent bg-accent/10',
    },
  ]

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
                    href="/empresario/new-project"
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

          <div className="space-y-6">
            <h2 className="text-xl font-bold tracking-tight text-foreground font-heading pb-2 border-b border-border/60">
              {tEmpresa('myPublishedProjects')}
              <span className="text-secondary">.</span>
            </h2>

            <PublishedProjectsBoard projects={initialProjects} />
          </div>
        </main>
      </div>

      <Footer />
    </div>
  )
}
