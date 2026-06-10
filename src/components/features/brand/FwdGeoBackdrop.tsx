import { cn } from '@/lib/utils/cn'
import { FwdParallelogram, FwdDotGrid } from './BrandPatterns'

interface FwdGeoBackdropProps {
  className?: string | undefined
}

export function FwdGeoBackdrop({ className }: FwdGeoBackdropProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute inset-0 overflow-hidden',
        className,
      )}
    >
      <FwdParallelogram className="absolute -right-12 top-0 h-full w-1/3 bg-secondary-foreground/10 opacity-40" />
      <FwdParallelogram className="absolute right-1/4 top-0 h-full w-1/6 bg-accent/20 opacity-30" />
      <FwdParallelogram className="absolute -left-12 top-0 h-full w-1/6 bg-highlight/15 opacity-30" />
      <FwdDotGrid className="absolute inset-0 text-primary/10" />
    </div>
  )
}
