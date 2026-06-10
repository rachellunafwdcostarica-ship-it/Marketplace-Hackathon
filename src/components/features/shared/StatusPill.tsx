import { useTranslations } from 'next-intl'
import { ApplicationStatus } from '@/types'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils/cn'

interface StatusPillProps {
  status: ApplicationStatus
  className?: string
}

export function StatusPill({ status, className }: StatusPillProps) {
  const t = useTranslations('Status')

  // Mapeo semantico sobre la paleta FWD (§5.1): info=primary, profundidad=secondary,
  // success=accent, destructive=magenta, neutro=muted.
  const styles: Record<ApplicationStatus, string> = {
    draft: 'bg-muted text-muted-foreground border-border',
    sent: 'bg-primary/10 text-primary border-primary/20',
    viewed: 'bg-secondary/10 text-secondary border-secondary/20',
    accepted: 'bg-accent/10 text-accent border-accent/20',
    rejected: 'bg-magenta/10 text-magenta border-magenta/20',
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        'px-2.5 py-0.5 text-xs font-semibold rounded-full border transition-all duration-[var(--duration-slow)] ease-[var(--ease-out)]',
        styles[status],
        className,
      )}
    >
      {t(status)}
    </Badge>
  )
}
