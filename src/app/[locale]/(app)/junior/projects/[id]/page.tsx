'use client'

import React from 'react'
import { useParams } from 'next/navigation'
import { Link } from '@/i18n/routing'
import { useAppState } from '@/lib/StateContext'
import { useAccountStatus } from '@/components/features/auth/AccountStatusContext'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { PageTitle } from '@/components/features/brand/PageTitle'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Calendar,
  DollarSign,
  Clock,
  MapPin,
  ArrowLeft,
  Briefcase,
  CheckCircle,
  FileText,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { MOCK_JUNIOR_NAME } from '@/lib/constants/mockData'

export default function ProjectDetailsPage() {
  const params = useParams()
  const tCommon = useTranslations('Common')
  const tEgresado = useTranslations('Egresado')
  const tAccount = useTranslations('Account')

  const { projects, applications } = useAppState()
  const { isPending } = useAccountStatus()
  const id = params['id'] as string
  const project = projects.find((p) => p.id === id)

  if (!project) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 flex flex-col items-center justify-center p-8">
          <Briefcase className="w-12 h-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-bold">{tEgresado('projectNotFound')}</h2>
          <Link
            href="/junior/projects"
            className="mt-4 inline-flex items-center justify-center rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/95 h-9 px-4"
          >
            {tEgresado('backToMarketplace')}
          </Link>
        </main>
        <Footer />
      </div>
    )
  }

  const alreadyApplied = applications.some(
    (app) =>
      app.projectId === project.id && app.candidateName === MOCK_JUNIOR_NAME,
  )

  const modeColors: Record<string, string> = {
    remoto: 'bg-accent/10 text-accent border-accent/20',
    hibrido: 'bg-warning/10 text-warning border-warning/20',
    presencial: 'bg-secondary/10 text-secondary border-secondary/20',
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link
            href="/junior/projects"
            className="inline-flex items-center text-sm font-semibold text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {tEgresado('backToMarketplace')}
          </Link>
        </div>

        <PageTitle
          title={project.title}
          description={`${tEgresado('company')}: ${project.companyName}`}
          dotColor="text-accent"
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-6">
          <div className="lg:col-span-8 space-y-6">
            <Card className="border border-border/80 bg-card/40 backdrop-blur-sm">
              <CardContent className="p-6 space-y-6">
                <div className="space-y-3">
                  <h3 className="text-lg font-bold tracking-tight text-foreground font-heading">
                    {tEgresado('projectDescription')}
                    <span className="text-accent">.</span>
                  </h3>
                  <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">
                    {project.description}
                  </p>
                </div>
                <div className="space-y-3 pt-4 border-t border-border/60">
                  <h3 className="text-lg font-bold tracking-tight text-foreground font-heading">
                    {tEgresado('requirementsStack')}
                    <span className="text-accent">.</span>
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {project.stack.map((tech) => (
                      <Badge
                        key={tech}
                        variant="secondary"
                        className="text-sm bg-secondary/10 text-secondary-foreground border border-border"
                      >
                        {tech}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-4 space-y-6">
            <Card className="border border-border/80 bg-card/60 backdrop-blur-sm overflow-hidden relative">
              <div className="absolute top-0 left-0 w-full h-[4px] bg-primary" />
              <CardContent className="p-6 space-y-6 pt-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted text-muted-foreground">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wide leading-none">
                        {tEgresado('selectMode')}
                      </p>
                      <Badge
                        variant="outline"
                        className={`mt-1 rounded-full text-xs font-semibold ${modeColors[project.mode] ?? ''}`}
                      >
                        {tCommon(project.mode)}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted text-muted-foreground">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wide leading-none">
                        {tCommon('duration')}
                      </p>
                      <p className="text-sm font-bold text-foreground mt-0.5">
                        {project.duration}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted text-muted-foreground">
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wide leading-none">
                        {tCommon('budget')}
                      </p>
                      <p className="text-base font-extrabold text-accent mt-0.5">
                        ${project.budget} USD
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted text-muted-foreground">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wide leading-none">
                        {tEgresado('startDate')}
                      </p>
                      <p className="text-sm font-semibold text-foreground mt-0.5">
                        {project.startDate}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-border/60">
                  {alreadyApplied ? (
                    <Button
                      disabled
                      className="w-full bg-muted text-muted-foreground font-semibold h-11 flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      {tEgresado('alreadyApplied')}
                    </Button>
                  ) : isPending ? (
                    <Button
                      disabled
                      title={tAccount('actionDisabledPending')}
                      className="w-full bg-muted text-muted-foreground/50 font-semibold h-11 flex items-center justify-center gap-2 cursor-not-allowed"
                    >
                      <FileText className="w-4 h-4" />
                      {tEgresado('applyBtn')}
                    </Button>
                  ) : (
                    <Link
                      href={`/junior/projects/${project.id}/apply`}
                      className="w-full bg-primary hover:bg-primary/95 text-primary-foreground font-semibold h-11 shadow-md hover:scale-[1.02] transition-transform inline-flex items-center justify-center rounded-lg text-sm cursor-pointer"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      {tEgresado('applyBtn')}
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
