'use client'

import React from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog'
import { ExternalLink, GitBranch, Globe, Lock } from 'lucide-react'
import type { StudentProfileView } from '@/lib/portfolio/actions'
import { ReportButton } from '@/components/features/moderation/ReportButton'

interface PortfolioViewerProps {
  profile: StudentProfileView
}

export function PortfolioViewer({ profile }: PortfolioViewerProps) {
  const t = useTranslations('Portfolio')

  const {
    firstName,
    lastName1,
    lastName2,
    tituloFwd,
    profilePhoto,
    portafolio_visible_publicamente: visibilityPublic,
    descripcion: portfolioBio,
    skills,
    projects,
  } = profile

  return (
    <Card className="h-full border border-primary/20 bg-surface shadow-sm w-full max-w-4xl mx-auto">
      <CardHeader className="border-b bg-muted/20 pb-4">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full overflow-hidden border border-primary/20 shrink-0 bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl">
              {profilePhoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profilePhoto as string}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                firstName?.charAt(0) || 'U'
              )}
            </div>
            <div>
              <CardTitle className="text-xl font-bold font-display">
                {firstName} {lastName1} {lastName2}
              </CardTitle>
              <p className="text-sm font-medium text-primary mt-0.5 capitalize">
                {tituloFwd || 'Estudiante FWD'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {t('visibilityText')}{' '}
                <span className="font-semibold text-primary">
                  {visibilityPublic
                    ? t('visibilityPublic')
                    : t('visibilityCompanies')}
                </span>
              </p>
            </div>
          </div>
          <Badge
            variant={visibilityPublic ? 'default' : 'secondary'}
            className="gap-1"
          >
            {visibilityPublic ? (
              <Globe className="h-3 w-3" />
            ) : (
              <Lock className="h-3 w-3" />
            )}
            {visibilityPublic
              ? t('visibilityPublic')
              : t('visibilityCompanies')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-6 font-sans">
        {/* === Biografía === */}
        <div className="space-y-2">
          <div className="flex items-center gap-4">
            <div className="h-px flex-1 bg-primary/20"></div>
            <div className="text-sm font-semibold tracking-wider text-muted-foreground font-display uppercase">
              {t('bioSection')}
            </div>
            <div className="h-px flex-1 bg-primary/20"></div>
          </div>
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
            {portfolioBio ? (
              portfolioBio
            ) : (
              <span className="text-muted-foreground italic">{t('noBio')}</span>
            )}
          </p>
        </div>

        {/* === Habilidades === */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center gap-4">
            <div className="h-px flex-1 bg-primary/20"></div>
            <div className="text-sm font-semibold tracking-wider text-muted-foreground font-display uppercase">
              {t('skillsSection')}
            </div>
            <div className="h-px flex-1 bg-primary/20"></div>
          </div>
          {skills.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              {t('noSkills')}
            </p>
          ) : (
            <div className="space-y-1 pl-2 border-l-2 border-primary/20">
              {skills.map((skill) => (
                <div key={skill.id} className="text-sm text-foreground">
                  {skill.name} <span className="opacity-50 mx-1">—</span>{' '}
                  {skill.level === 'avanzado'
                    ? t('levelAdvanced')
                    : skill.level === 'intermedio'
                      ? t('levelIntermediate')
                      : t('levelBasic')}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* === Proyectos === */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-4">
            <div className="h-px flex-1 bg-primary/20"></div>
            <div className="text-sm font-semibold tracking-wider text-muted-foreground font-display uppercase">
              {t('projectsSection')}
            </div>
            <div className="h-px flex-1 bg-primary/20"></div>
          </div>
          {projects.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              {t('noProjects')}
            </p>
          ) : (
            <div className="space-y-4">
              {projects.map((proj) => (
                <div
                  key={proj.id}
                  className="space-y-1 pl-2 border-l-2 border-primary/20"
                >
                  <div className="font-semibold text-sm text-foreground flex items-center justify-between gap-2">
                    <span>{proj.title}</span>
                    <span className="flex items-center gap-1">
                      {proj.completionDate && (
                        <span className="text-xs text-muted-foreground font-normal">
                          ({new Date(proj.completionDate).toLocaleDateString()})
                        </span>
                      )}
                      <ReportButton
                        target={{ tipo: 'portafolio', id: proj.id }}
                        iconOnly
                      />
                    </span>
                  </div>
                  {proj.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {proj.description}
                    </p>
                  )}
                  <div className="text-xs text-muted-foreground font-semibold pt-1">
                    {t('technologiesUsed')}:
                  </div>
                  <div className="text-xs text-foreground font-medium">
                    {proj.technologies.join(', ')}
                  </div>
                  <div className="flex gap-2 pt-1 text-xs">
                    {proj.repositoryUrl && (
                      <a
                        href={proj.repositoryUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-0.5"
                      >
                        <GitBranch className="h-3 w-3" /> {t('repo')}
                      </a>
                    )}
                    {proj.demoUrl && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <button className="text-primary hover:underline flex items-center gap-0.5 cursor-pointer">
                            <ExternalLink className="h-3 w-3" /> {t('demo')}
                          </button>
                        </DialogTrigger>
                        <DialogContent
                          showCloseButton={false}
                          className="max-w-4xl h-[80vh] flex flex-col gap-0 p-0 overflow-hidden bg-background rounded-xl"
                        >
                          <DialogHeader className="p-3 border-b bg-muted/30 flex flex-row items-center">
                            <div className="flex items-center gap-2 pl-1">
                              <DialogClose asChild>
                                <button
                                  className="w-3 h-3 rounded-full bg-[#ff5f56] hover:bg-[#ff5f56]/80 focus:outline-none"
                                  aria-label="Cerrar modal"
                                />
                              </DialogClose>
                              <a
                                href={proj.demoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-3 h-3 rounded-full bg-[#27c93f] hover:bg-[#27c93f]/80 focus:outline-none"
                                aria-label="Abrir en otra ventana"
                              />
                            </div>
                            <DialogTitle className="flex-1 text-center text-xs font-medium text-muted-foreground pr-10">
                              {proj.title} Demo
                            </DialogTitle>
                          </DialogHeader>
                          <div className="flex-1 w-full bg-muted/10 relative">
                            <iframe
                              src={proj.demoUrl}
                              className="w-full h-full border-0"
                            />
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
