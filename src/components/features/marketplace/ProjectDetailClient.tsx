'use client'

import React, { useState } from 'react'
import { Link } from '@/i18n/routing'
import { Project } from '@/types'
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
  CheckCircle,
  FileText,
  Star,
  Loader2,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { rateCompany } from '@/lib/company/ratings'
import type { MiContratacion } from '@/lib/deliverables/queries'

interface ProjectDetailClientProps {
  project: Project
  alreadyApplied: boolean
  contratacion: MiContratacion | null
  existingRating: { puntuacion: number; comentario: string | null } | null
}

export function ProjectDetailClient({
  project,
  alreadyApplied,
  contratacion,
  existingRating,
}: ProjectDetailClientProps) {
  const tCommon = useTranslations('Common')
  const tEgresado = useTranslations('Egresado')
  const tAccount = useTranslations('Account')
  const router = useRouter()

  const [ratingScore, setRatingScore] = useState(
    existingRating?.puntuacion ?? 0,
  )
  const [ratingComment, setRatingComment] = useState(
    existingRating?.comentario ?? '',
  )
  const [hoverScore, setHoverScore] = useState(0)
  const [submittingRating, setSubmittingRating] = useState(false)
  const [hasRated, setHasRated] = useState(existingRating !== null)

  const { isPending } = useAccountStatus()

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

            {true && (
              <Card className="border border-border/80 bg-card/65 backdrop-blur-sm shadow-md overflow-hidden relative">
                <div className="absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r from-warning to-highlight" />
                <CardContent className="p-6 pt-8 space-y-6">
                  <div className="space-y-1 text-left">
                    <h3 className="text-base font-extrabold font-heading text-foreground">
                      {tEgresado('rateCompanyTitle')}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {tEgresado('rateCompanyDesc')}
                    </p>
                  </div>

                  {hasRated ? (
                    <div className="space-y-4 text-left">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-muted-foreground mr-2">
                          {tEgresado('ratingLabel')}:
                        </span>
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-4 h-4 ${
                                star <= ratingScore
                                  ? 'text-highlight fill-highlight'
                                  : 'text-muted-foreground/25'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      {ratingComment && (
                        <div className="rounded-lg bg-muted/40 border border-border/60 px-3 py-2 text-xs text-foreground/90">
                          <span className="font-bold block mb-1 text-muted-foreground uppercase text-[10px]">
                            {tEgresado('commentLabel')}
                          </span>
                          {ratingComment}
                        </div>
                      )}
                      <p className="text-xs text-accent font-semibold">
                        {tEgresado('alreadyRated')}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4 text-left">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-muted-foreground">
                          {tEgresado('ratingLabel')} *
                        </span>
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              disabled={submittingRating}
                              onMouseEnter={() => setHoverScore(star)}
                              onMouseLeave={() => setHoverScore(0)}
                              onClick={() => setRatingScore(star)}
                              className="focus:outline-none transition-transform hover:scale-110 cursor-pointer bg-transparent border-0 p-0"
                            >
                              <Star
                                className={`w-5 h-5 ${
                                  star <= (hoverScore || ratingScore)
                                    ? 'text-highlight fill-highlight'
                                    : 'text-muted-foreground/30'
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label
                          htmlFor="rating-comment"
                          className="block text-xs font-bold text-muted-foreground"
                        >
                          {tEgresado('commentLabel')}
                        </label>
                        <textarea
                          id="rating-comment"
                          value={ratingComment}
                          onChange={(e) => setRatingComment(e.target.value)}
                          placeholder={tEgresado('rateCompanyDesc')}
                          disabled={submittingRating}
                          rows={3}
                          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          maxLength={1000}
                        />
                      </div>

                      <Button
                        type="button"
                        disabled={submittingRating || ratingScore === 0}
                        onClick={async () => {
                          if (ratingScore === 0) return
                          setSubmittingRating(true)
                          const res = await rateCompany({
                            idEmpresario: project.companyId,
                            idContratacion:
                              contratacion?.id_contratacion || undefined,
                            puntuacion: ratingScore,
                            comentario: ratingComment.trim() || undefined,
                          })
                          setSubmittingRating(false)
                          if (res.ok) {
                            toast.success(tEgresado('rateCompanySuccess'))
                            setHasRated(true)
                            router.refresh()
                          } else {
                            toast.error(res.error)
                          }
                        }}
                        className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold text-xs flex items-center gap-1.5"
                      >
                        {submittingRating && (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        )}
                        {tEgresado('submitRating')}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
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
