'use client'

import React from 'react'
import { useTranslations } from 'next-intl'
import { useDemoData } from '@/lib/DemoDataContext'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { PageTitle } from '@/components/features/brand/PageTitle'
import { DashboardStats, StatItem } from '@/components/features/DashboardStats'
import { ProjectCard } from '@/components/features/marketplace/ProjectCard'
import { InsightSection } from '@/components/features/brand/InsightSection'
import { Link } from '@/i18n/routing'
import { MOCK_JUNIOR_NAME } from '@/lib/constants/mockData'
import {
  Send,
  CheckCircle2,
  AlertCircle,
  FileText,
  ArrowRight,
  Lightbulb,
  Rocket,
  Target,
} from 'lucide-react'

export default function EgresadoDashboard() {
  const tEgresado = useTranslations('Egresado')
  const tCommon = useTranslations('Common')
  const { projects, applications } = useDemoData()

  const myApps = applications.filter(
    (app) => app.candidateName === MOCK_JUNIOR_NAME,
  )
  const sentCount = myApps.filter(
    (app) => app.status === 'sent' || app.status === 'viewed',
  ).length
  const acceptedCount = myApps.filter((app) => app.status === 'accepted').length
  const totalCount = myApps.length

  const stats: StatItem[] = [
    {
      title: tEgresado('appliedProjects'),
      value: totalCount,
      icon: FileText,
      description: tEgresado('statAppliedDesc'),
      colorClass: 'text-primary bg-primary/10',
    },
    {
      title: tEgresado('activeApplications'),
      value: sentCount,
      icon: Send,
      description: tEgresado('statActiveDesc'),
      colorClass: 'text-accent bg-accent/10',
    },
    {
      title: tEgresado('acceptedProjects'),
      value: acceptedCount,
      icon: CheckCircle2,
      description: tEgresado('statAcceptedDesc'),
      colorClass: 'text-accent bg-accent/10',
    },
  ]

  const appliedProjectIds = myApps.map((app) => app.projectId)
  const recommendedProjects = projects
    .filter((p) => p.status === 'active' && !appliedProjectIds.includes(p.id))
    .slice(0, 2)

  const insights = [
    {
      title: tEgresado('insightTitle1'),
      description: tEgresado('insightDesc1'),
      icon: Lightbulb,
    },
    {
      title: tEgresado('insightTitle2'),
      description: tEgresado('insightDesc2'),
      icon: Target,
    },
    {
      title: tEgresado('insightTitle3'),
      description: tEgresado('insightDesc3'),
      icon: Rocket,
    },
  ]

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageTitle
          title={tEgresado('dashboard')}
          description={tEgresado('dashboardDesc')}
          dotColor="text-primary"
        />

        <DashboardStats stats={stats} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-10">
          <div className="lg:col-span-8 space-y-6">
            <div className="flex justify-between items-center pb-2 border-b border-border/60">
              <h2 className="text-xl font-bold tracking-tight text-foreground font-heading">
                {tEgresado('statsRecommended')}
                <span className="text-accent">.</span>
              </h2>
              <Link
                href="/junior/projects"
                className="text-sm font-semibold text-primary hover:underline flex items-center gap-1.5"
              >
                {tCommon('viewAll')}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {recommendedProjects.length === 0 ? (
              <div className="p-8 border border-dashed border-border rounded-xl text-center text-muted-foreground bg-card/20">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 text-muted-foreground/60" />
                {tEgresado('emptyRecommendations')}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {recommendedProjects.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-4">
            <InsightSection
              title={tEgresado('insightsSectionTitle')}
              insights={insights}
            />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
