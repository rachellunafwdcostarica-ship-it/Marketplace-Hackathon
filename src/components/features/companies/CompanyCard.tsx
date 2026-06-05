'use client'

import { Company } from '@/types'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Globe, Mail, Calendar, Check, X } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface CompanyCardProps {
  company: Company
  onApprove?: (() => void) | undefined
  onReject?: (() => void) | undefined
}

export function CompanyCard({
  company,
  onApprove,
  onReject,
}: CompanyCardProps) {
  const tAdmin = useTranslations('Admin')

  // Estado mapeado a tokens FWD (§5.1): approved=success/accent, pending=atencion/warning,
  // rejected=destructive/magenta.
  const statusColors = {
    approved: 'bg-accent/10 text-accent border-accent/20',
    pending: 'bg-warning/10 text-warning border-warning/20',
    rejected: 'bg-magenta/10 text-magenta border-magenta/20',
  }

  return (
    <Card className="flex flex-col h-full border border-border/80 bg-card/60 backdrop-blur-sm hover:shadow-md transition-all duration-[var(--duration-slow)] ease-[var(--ease-out)]">
      <CardHeader className="p-6 pb-4">
        <div className="flex gap-4 items-center">
          {/* Company Logo mock */}
          <div className="w-12 h-12 rounded-xl overflow-hidden bg-muted border border-border/80 shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={company.logo}
              alt={company.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-lg font-bold tracking-tight text-foreground truncate">
                {company.name}
              </CardTitle>
              <Badge
                variant="outline"
                className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusColors[company.status]}`}
              >
                {tAdmin(
                  `status${company.status.charAt(0).toUpperCase() + company.status.slice(1)}`,
                )}
              </Badge>
            </div>
            <span className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <Calendar className="w-3.5 h-3.5" />
              {new Date(company.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 pt-0 flex-1 flex flex-col justify-between gap-4">
        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
          {company.description}
        </p>

        <div className="space-y-2 border-t border-border/60 pt-4 mt-2">
          <div className="flex items-center text-xs text-muted-foreground gap-2">
            <Mail className="w-4 h-4 text-primary" />
            <a
              href={`mailto:${company.contactEmail}`}
              className="hover:underline truncate"
            >
              {company.contactEmail}
            </a>
          </div>
          {company.website && (
            <div className="flex items-center text-xs text-muted-foreground gap-2">
              <Globe className="w-4 h-4 text-primary" />
              <a
                href={company.website}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline truncate"
              >
                {company.website}
              </a>
            </div>
          )}
        </div>
      </CardContent>

      {company.status === 'pending' && (onApprove || onReject) && (
        <CardFooter className="p-6 pt-0 border-t border-border/40 bg-muted/10 flex gap-2">
          {onApprove && (
            <Button
              size="sm"
              onClick={onApprove}
              className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              {tAdmin('approve')}
            </Button>
          )}
          {onReject && (
            <Button
              size="sm"
              variant="outline"
              onClick={onReject}
              className="flex-1 border-magenta/30 text-magenta hover:bg-magenta/10 hover:text-magenta flex items-center justify-center gap-1.5"
            >
              <X className="w-4 h-4" />
              {tAdmin('reject')}
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  )
}
