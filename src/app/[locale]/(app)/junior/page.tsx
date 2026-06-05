'use client'

import React from 'react'
import { useTranslations } from 'next-intl'
import { useAppState } from '@/lib/stateContext'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { PageTitle } from '@/components/features/PageTitle'
import { DashboardStats, StatItem } from '@/components/features/DashboardStats'
import { ProjectCard } from '@/components/features/ProjectCard'
import { InsightSection } from '@/components/features/InsightSection'
import { Link } from '@/i18n/routing'
import { MOCK_JUNIOR_NAME } from '@/constants/mockData'
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

export default function JuniorDashboard() {
  const tJunior = useTranslations('Junior')
  const tCommon = useTranslations('Common')
  const { projects, applications } = useAppState()

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
      title: tJunior('appliedProjects'),
      value: totalCount,
      icon: FileText,
      description: tJunior('statAppliedDesc'),
      colorClass: 'text-primary bg-primary/10',
    },
    {
      title: tJunior('activeApplications'),
      value: sentCount,
      icon: Send,
      description: tJunior('statActiveDesc'),
      colorClass: 'text-accent bg-accent/10',
    },
    {
      title: tJunior('acceptedProjects'),
      value: acceptedCount,
      icon: CheckCircle2,
      description: tJunior('statAcceptedDesc'),
      colorClass: 'text-accent bg-accent/10',
    },
  ]

  const appliedProjectIds = myApps.map((app) => app.projectId)
  const recommendedProjects = projects
    .filter((p) => p.status === 'active' && !appliedProjectIds.includes(p.id))
    .slice(0, 2)

  const insights = [
    {
      title: tJunior('insightTitle1'),
      description: tJunior('insightDesc1'),
      icon: Lightbulb,
    },
    {
      title: tJunior('insightTitle2'),
      description: tJunior('insightDesc2'),
      icon: Target,
    },
    {
      title: tJunior('insightTitle3'),
      description: tJunior('insightDesc3'),
      icon: Rocket,
    },
  ]

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageTitle
          title={tJunior('dashboard')}
          description={tJunior('dashboardDesc')}
          dotColor="text-primary"
        />

        <DashboardStats stats={stats} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-10">
          <div className="lg:col-span-8 space-y-6">
            <div className="flex justify-between items-center pb-2 border-b border-border/60">
              <h2 className="text-xl font-bold tracking-tight text-foreground font-heading">
                {tJunior('statsRecommended')}
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
                {tJunior('emptyRecommendations')}
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
              title={tJunior('insightsSectionTitle')}
              insights={insights}
            />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
