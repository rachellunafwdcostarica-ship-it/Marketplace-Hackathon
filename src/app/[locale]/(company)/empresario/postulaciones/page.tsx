'use client'

import React, { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { useDemoData } from '@/lib/StateContext'
import { Project, Application } from '@/types'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { SidebarEmpresaNuevo } from '@/components/layout/SidebarEmpresaNuevo'
import { PageTitle } from '@/components/features/brand/PageTitle'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import Image from 'next/image'
import {
  Users,
  Clock,
  ShieldCheck,
  Award,
  ChevronLeft,
  ChevronRight,
  Search,
  Sparkles,
  ExternalLink,
} from 'lucide-react'

// Mock static candidates to match the exact mockup provided
const MOCK_MOCKUP_CANDIDATES = [
  {
    id: 'mc-1',
    name: 'Camila López',
    role: 'Senior Product Designer',
    project: 'App Mobile Redesign',
    matchScore: 90,
    date: 'Oct 24, 2026',
    status: 'revision', // revision, nuevo, entrevista
    avatar:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&auto=format',
    email: 'camila.lopez@fwd.edu',
  },
  {
    id: 'mc-2',
    name: 'Marco Ruas',
    role: 'Full Stack Engineer',
    project: 'Backend Scaling',
    matchScore: 78,
    date: 'Oct 23, 2026',
    status: 'nuevo',
    avatar:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&auto=format',
    email: 'marco.ruas@fwd.edu',
  },
  {
    id: 'mc-3',
    name: 'Elena Smith',
    role: 'Creative Strategist',
    project: 'Brand Identity',
    matchScore: 96,
    date: 'Oct 22, 2026',
    status: 'entrevista',
    avatar:
      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&auto=format',
    email: 'elena.smith@fwd.edu',
  },
]

export default function CompanyPostulationsPage() {
  const t = useTranslations('CompanyPostulations')
  const tEmpresa = useTranslations('Empresa')

  const { projects, applications, currentCompany } = useDemoData()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProject, setSelectedProject] = useState('all')
  const [activeTab, setActiveTab] = useState<
    'all' | 'nuevo' | 'revision' | 'entrevista'
  >('all')
  const [matchScoreThreshold, setMatchScoreThreshold] = useState(75)

  // Retrieve projects published by this company
  const companyProjects = useMemo(() => {
    return projects.filter(
      (p: Project) => p.companyId === (currentCompany?.id || 'comp-1'),
    )
  }, [projects, currentCompany])

  // Combine real applications and mockup items
  const allCandidates = useMemo(() => {
    const realApps = applications
      .filter((app: Application) =>
        companyProjects.some((p: Project) => p.id === app.projectId),
      )
      .map((app: Application) => {
        // Map real application status to mockup status
        let mappedStatus = 'nuevo'
        if (app.status === 'viewed') mappedStatus = 'revision'
        if (app.status === 'accepted') mappedStatus = 'entrevista'

        // Determine a mock match score based on length of cover letter or email
        const generatedScore = Math.min(
          99,
          Math.max(60, 70 + (app.coverLetter.length % 30)),
        )

        return {
          id: app.id,
          name: app.candidateName,
          role: t('fallbackRole'),
          project: app.projectTitle,
          matchScore: generatedScore,
          date: new Date(app.createdAt).toLocaleDateString('es-ES', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }),
          status: mappedStatus,
          avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${app.candidateName}`,
          email: app.candidateEmail,
        }
      })

    return [...MOCK_MOCKUP_CANDIDATES, ...realApps]
  }, [applications, companyProjects, t])

  // Filter candidates based on current selection
  const filteredCandidates = useMemo(() => {
    return allCandidates.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.role.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesProject =
        selectedProject === 'all' ||
        c.project.toLowerCase().replace(/\s+/g, '-') === selectedProject

      const matchesTab = activeTab === 'all' || c.status === activeTab

      const matchesScore = c.matchScore >= matchScoreThreshold

      return matchesSearch && matchesProject && matchesTab && matchesScore
    })
  }, [
    allCandidates,
    searchTerm,
    selectedProject,
    activeTab,
    matchScoreThreshold,
  ])

  // Project select options
  const projectOptions = useMemo(() => {
    const uniqueProjects = Array.from(
      new Set(allCandidates.map((c) => c.project)),
    )
    return uniqueProjects.map((p) => ({
      label: p,
      value: p.toLowerCase().replace(/\s+/g, '-'),
    }))
  }, [allCandidates])

  const handleContact = (email: string) => {
    toast.info(tEmpresa('contactEmailInfo', { email }))
    const subject = encodeURIComponent(tEmpresa('contactEmailSubject'))
    window.location.assign(`mailto:${email}?subject=${subject}`)
  }

  // Circular progress matching style helper
  const getCircleColors = (score: number) => {
    if (score >= 90)
      return {
        stroke: 'stroke-accent',
        bg: 'bg-accent/10',
        text: 'text-accent',
      }
    if (score >= 75)
      return {
        stroke: 'stroke-primary',
        bg: 'bg-primary/10',
        text: 'text-primary',
      }
    return {
      stroke: 'stroke-secondary',
      bg: 'bg-secondary/10',
      text: 'text-secondary',
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />

      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col lg:flex-row gap-8">
        <SidebarEmpresaNuevo />

        <main className="flex-1 space-y-8">
          <PageTitle
            title={t('title')}
            description={t('subtitle')}
            dotColor="text-primary"
          />

          {/* Stats section grid matching mockup layout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-l-4 border-l-primary bg-card/50 transition-all duration-[var(--duration-base)] hover:-translate-y-0.5">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-muted-foreground tracking-wider uppercase">
                    {t('totalApplicants')}
                  </p>
                  <p className="text-3xl font-extrabold text-foreground font-heading mt-1">
                    1,248
                  </p>
                  <p className="text-[10px] text-accent font-bold mt-1">
                    {t('totalApplicantsSub')}
                  </p>
                </div>
                <div className="p-3 bg-primary/15 text-primary rounded-xl">
                  <Users className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-secondary bg-card/50 transition-all duration-[var(--duration-base)] hover:-translate-y-0.5">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-muted-foreground tracking-wider uppercase">
                    {t('pendingReview')}
                  </p>
                  <p className="text-3xl font-extrabold text-foreground font-heading mt-1">
                    452
                  </p>
                  <p className="text-[10px] text-secondary font-bold mt-1">
                    {t('pendingReviewSub')}
                  </p>
                </div>
                <div className="p-3 bg-secondary/15 text-secondary rounded-xl">
                  <Clock className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-accent bg-card/50 transition-all duration-[var(--duration-base)] hover:-translate-y-0.5">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-muted-foreground tracking-wider uppercase">
                    {t('selected')}
                  </p>
                  <p className="text-3xl font-extrabold text-foreground font-heading mt-1">
                    84
                  </p>
                  <p className="text-[10px] text-accent font-bold mt-1">
                    {t('selectedSub')}
                  </p>
                </div>
                <div className="p-3 bg-accent/15 text-accent rounded-xl">
                  <ShieldCheck className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-magenta bg-card/50 transition-all duration-[var(--duration-base)] hover:-translate-y-0.5">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-muted-foreground tracking-wider uppercase">
                    {t('hired')}
                  </p>
                  <p className="text-3xl font-extrabold text-foreground font-heading mt-1">
                    12
                  </p>
                  <p className="text-[10px] text-magenta font-bold mt-1">
                    {t('hiredSub')}
                  </p>
                </div>
                <div className="p-3 bg-magenta/15 text-magenta rounded-xl">
                  <Award className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filtering bar section */}
          <div className="bg-card/40 border border-border/60 rounded-2xl p-6 space-y-4">
            <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between">
              {/* Select Project */}
              <div className="space-y-1.5 min-w-[240px]">
                <Label
                  htmlFor="project-filter"
                  className="text-xs font-bold text-muted-foreground"
                >
                  {t('selectProject')}
                </Label>
                <select
                  id="project-filter"
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="w-full bg-background border border-border/80 rounded-xl px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <option value="all">{t('allActiveProjects')}</option>
                  {projectOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Pill status filter */}
              <div className="flex flex-wrap items-center gap-2 pt-4 md:pt-0">
                {(['all', 'nuevo', 'revision', 'entrevista'] as const).map(
                  (tab) => {
                    const isActive = activeTab === tab
                    return (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 rounded-full text-xs font-bold transition-all duration-[var(--duration-fast)] ${
                          isActive
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'bg-background hover:bg-muted text-muted-foreground'
                        }`}
                      >
                        {tab === 'all' && t('filterAll')}
                        {tab === 'nuevo' && t('filterNew')}
                        {tab === 'revision' && t('filterInReview')}
                        {tab === 'entrevista' && t('filterInterview')}
                      </button>
                    )
                  },
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-border/30">
              {/* Match Score slider */}
              <div className="flex items-center gap-4 flex-1 max-w-sm">
                <span className="text-xs font-bold text-muted-foreground shrink-0">
                  {t('matchScore')}:
                </span>
                <input
                  type="range"
                  min="50"
                  max="95"
                  value={matchScoreThreshold}
                  onChange={(e) =>
                    setMatchScoreThreshold(parseInt(e.target.value))
                  }
                  className="w-full accent-primary h-1.5 bg-muted rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-xs font-extrabold text-primary shrink-0">
                  +{matchScoreThreshold}%
                </span>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                <input
                  type="text"
                  placeholder={t('searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-background border border-border/80 rounded-xl pl-10 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-card/30 border border-border/60 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-muted/30 border-b border-border/40 text-[10px] font-extrabold tracking-wider text-muted-foreground uppercase">
                    <th className="px-6 py-4">{t('tableCandidate')}</th>
                    <th className="px-6 py-4">{t('tableProject')}</th>
                    <th className="px-6 py-4 text-center">
                      {t('tableMatchScore')}
                    </th>
                    <th className="px-6 py-4">{t('tableDate')}</th>
                    <th className="px-6 py-4">{t('tableStatus')}</th>
                    <th className="px-6 py-4 text-right">
                      {t('tableActions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30 text-sm">
                  {filteredCandidates.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-10 text-center text-muted-foreground italic"
                      >
                        {t('noApplicationsFound')}
                      </td>
                    </tr>
                  ) : (
                    filteredCandidates.map((c) => {
                      const colors = getCircleColors(c.matchScore)
                      return (
                        <tr
                          key={c.id}
                          className="hover:bg-muted/15 transition-all"
                        >
                          <td className="px-6 py-4 flex items-center gap-3">
                            <Image
                              src={c.avatar}
                              alt={c.name}
                              width={40}
                              height={40}
                              unoptimized
                              className="w-10 h-10 rounded-full object-cover bg-muted"
                            />
                            <div>
                              <p className="font-bold text-foreground leading-tight">
                                {c.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {c.role}
                              </p>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-semibold text-muted-foreground">
                            {c.project}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex justify-center">
                              {/* Radial Match Score representation */}
                              <div className="relative w-11 h-11 flex items-center justify-center">
                                <svg className="w-full h-full transform -rotate-90">
                                  <circle
                                    cx="22"
                                    cy="22"
                                    r="18"
                                    className="stroke-muted/40 fill-none"
                                    strokeWidth="3.5"
                                  />
                                  <circle
                                    cx="22"
                                    cy="22"
                                    r="18"
                                    className={`${colors.stroke} fill-none`}
                                    strokeWidth="3.5"
                                    strokeDasharray={`${2 * Math.PI * 18}`}
                                    strokeDashoffset={`${2 * Math.PI * 18 * (1 - c.matchScore / 100)}`}
                                  />
                                </svg>
                                <span
                                  className={`absolute text-[10px] font-extrabold ${colors.text}`}
                                >
                                  {c.matchScore}%
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-xs font-semibold text-muted-foreground/80">
                            {c.date}
                          </td>
                          <td className="px-6 py-4">
                            {/* Visual Status Tag */}
                            <span
                              className={`px-3 py-1 rounded-full text-[10px] font-extrabold tracking-wider uppercase inline-block ${
                                c.status === 'revision'
                                  ? 'bg-warning/15 text-warning border border-warning/15'
                                  : c.status === 'nuevo'
                                    ? 'bg-primary/15 text-primary border border-primary/15'
                                    : 'bg-secondary/15 text-secondary border border-secondary/15'
                              }`}
                            >
                              {c.status === 'revision' && t('filterInReview')}
                              {c.status === 'nuevo' && t('filterNew')}
                              {c.status === 'entrevista' &&
                                t('filterInterview')}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleContact(c.email)}
                              className="border-primary/20 text-primary hover:bg-primary/10 transition-all font-bold text-xs"
                            >
                              {tEmpresa('contact')}
                            </Button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination mockup footer */}
            <div className="bg-muted/10 border-t border-border/40 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs">
              <span className="font-semibold text-muted-foreground">
                {t('showingText', {
                  count: filteredCandidates.length,
                  total: allCandidates.length,
                })}
              </span>
              <div className="flex items-center gap-1.5 self-end sm:self-auto">
                <Button
                  variant="outline"
                  size="icon"
                  className="w-8 h-8 rounded-lg"
                  disabled
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="default"
                  size="icon"
                  className="w-8 h-8 rounded-lg bg-primary text-primary-foreground font-bold"
                >
                  1
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="w-8 h-8 rounded-lg text-muted-foreground"
                >
                  2
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="w-8 h-8 rounded-lg text-muted-foreground"
                >
                  3
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="w-8 h-8 rounded-lg"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Bottom section widgets */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4">
            {/* Funnel Efficiency Chart representation */}
            <Card className="lg:col-span-6 border-border/60 bg-card/30">
              <CardContent className="p-6 space-y-6">
                <div className="flex justify-between items-center pb-2 border-b border-border/40">
                  <h3 className="font-extrabold text-foreground font-heading">
                    {t('funnelTitle')}
                  </h3>
                  <Button
                    variant="link"
                    className="text-primary hover:text-primary/80 text-xs font-bold flex items-center gap-1 p-0 h-auto"
                  >
                    {t('viewReport')} <ExternalLink className="w-3.5 h-3.5" />
                  </Button>
                </div>
                {/* Visual funnels represented as simplified styled responsive bars */}
                <div className="flex items-end justify-between gap-4 h-32 px-4 pt-2">
                  <div className="flex flex-col items-center flex-1 space-y-2">
                    <div className="w-full bg-primary/20 rounded-t-lg transition-all h-[30%] hover:bg-primary/30" />
                    <span className="text-[10px] font-bold text-muted-foreground">
                      30%
                    </span>
                  </div>
                  <div className="flex flex-col items-center flex-1 space-y-2">
                    <div className="w-full bg-secondary/35 rounded-t-lg transition-all h-[60%] hover:bg-secondary/45" />
                    <span className="text-[10px] font-bold text-muted-foreground">
                      60%
                    </span>
                  </div>
                  <div className="flex flex-col items-center flex-1 space-y-2">
                    <div className="w-full bg-accent/40 rounded-t-lg transition-all h-[95%] hover:bg-accent/50" />
                    <span className="text-[10px] font-bold text-muted-foreground">
                      95%
                    </span>
                  </div>
                  <div className="flex flex-col items-center flex-1 space-y-2">
                    <div className="w-full bg-magenta/25 rounded-t-lg transition-all h-[45%] hover:bg-magenta/35" />
                    <span className="text-[10px] font-bold text-muted-foreground">
                      45%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* AI suggestions matching the mockup exactly */}
            <Card className="lg:col-span-6 border-border/60 bg-gradient-to-br from-primary/5 via-secondary/5 to-transparent relative overflow-hidden">
              <CardContent className="p-6 flex flex-col justify-between h-full space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-accent/20 text-accent rounded-lg">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <h3 className="font-extrabold text-foreground font-heading">
                      {t('aiMatchTitle')}
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {t('aiMatchDesc')}
                  </p>
                </div>
                <Button
                  onClick={() => toast.success(t('aiAnalyzing'))}
                  className="w-full bg-secondary hover:bg-secondary/95 text-secondary-foreground font-bold shadow-md rounded-xl py-5 flex items-center justify-center gap-2 cursor-pointer mt-auto"
                >
                  <Sparkles className="w-4 h-4 shrink-0" />
                  {t('aiMatchBtn')}
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      <Footer />
    </div>
  )
}
