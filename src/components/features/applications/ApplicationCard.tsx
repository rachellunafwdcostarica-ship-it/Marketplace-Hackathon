'use client'

import { Application } from '@/types'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { StatusPill } from '@/components/features/StatusPill'
import { Button } from '@/components/ui/button'
import { Mail, Globe, FileText, Check, X, Calendar } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface ApplicationCardProps {
  application: Application
  viewMode: 'junior' | 'empresa'
  onAccept?: () => void
  onReject?: () => void
  onContact?: () => void
}

export function ApplicationCard({
  application,
  viewMode,
  onAccept,
  onReject,
  onContact,
}: ApplicationCardProps) {
  const tJunior = useTranslations('Junior')
  const tEmpresa = useTranslations('Empresa')

  return (
    <Card className="border border-border/80 bg-card/60 backdrop-blur-sm hover:shadow-sm transition-all duration-300">
      <CardHeader className="p-6 pb-4 flex flex-col sm:flex-row justify-between items-start gap-4">
        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <CardTitle className="text-lg font-bold tracking-tight text-foreground">
              {viewMode === 'junior'
                ? application.projectTitle
                : application.candidateName}
            </CardTitle>
            <StatusPill status={application.status} />
          </div>
          <p className="text-sm font-semibold text-primary font-heading">
            {viewMode === 'junior'
              ? application.companyName
              : application.candidateEmail}
          </p>
        </div>
        <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0 mt-1">
          <Calendar className="w-3.5 h-3.5" />
          {new Date(application.createdAt).toLocaleDateString()}
        </span>
      </CardHeader>

      <CardContent className="p-6 pt-0 space-y-4">
        {/* Cover letter section */}
        <div className="bg-muted/30 dark:bg-muted/10 p-4 rounded-xl border border-border/40">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            {tJunior('coverLetter')}
          </p>
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-line italic">
            &quot;{application.coverLetter}&quot;
          </p>
        </div>

        {/* Links section */}
        {viewMode === 'empresa' && (
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            {application.portfolioUrl && (
              <a
                href={application.portfolioUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs font-medium text-primary hover:underline"
              >
                <Globe className="w-4 h-4" />
                {tJunior('portfolioUrl')}
              </a>
            )}
            {application.cvUrl && (
              <a
                href={application.cvUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs font-medium text-primary hover:underline"
              >
                <FileText className="w-4 h-4" />
                {tJunior('cvUrl')}
              </a>
            )}
          </div>
        )}
      </CardContent>

      {/* Action buttons (only for Empresa and if the status is sent/viewed) */}
      {viewMode === 'empresa' &&
        (application.status === 'sent' || application.status === 'viewed') && (
          <CardFooter className="p-6 pt-0 border-t border-border/40 bg-muted/10 flex flex-wrap gap-2 pt-4">
            {onAccept && (
              <Button
                size="sm"
                onClick={onAccept}
                className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm flex items-center justify-center gap-1.5 px-4"
              >
                <Check className="w-4 h-4" />
                {tEmpresa('accept')}
              </Button>
            )}
            {onReject && (
              <Button
                size="sm"
                variant="outline"
                onClick={onReject}
                className="border-magenta/30 text-magenta hover:bg-magenta/10 hover:text-magenta flex items-center justify-center gap-1.5 px-4"
              >
                <X className="w-4 h-4" />
                {tEmpresa('reject')}
              </Button>
            )}
            {onContact && (
              <Button
                size="sm"
                variant="secondary"
                onClick={onContact}
                className="flex items-center justify-center gap-1.5 px-4 border border-border"
              >
                <Mail className="w-4 h-4" />
                {tEmpresa('contact')}
              </Button>
            )}
          </CardFooter>
        )}
    </Card>
  )
}
