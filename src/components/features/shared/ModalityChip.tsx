import { useTranslations } from 'next-intl'
import type { WorkMode } from '@/types'
import { cn } from '@/lib/utils/cn'

const MODE_STYLES: Record<WorkMode, string> = {
  remoto: 'bg-accent/10 text-accent border-accent/20',
  hibrido: 'bg-warning/10 text-warning border-warning/20',
  presencial: 'bg-secondary/10 text-secondary border-secondary/20',
}

interface ModalityChipProps {
  mode: WorkMode
  className?: string | undefined
}

export function ModalityChip({ mode, className }: ModalityChipProps) {
  const t = useTranslations('Common')

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold',
        MODE_STYLES[mode],
        className,
      )}
    >
      {t(mode)}
    </span>
  )
}
