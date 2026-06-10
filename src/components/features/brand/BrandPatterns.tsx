import { cn } from '@/lib/utils/cn'

interface PatternProps {
  className?: string | undefined
}

export function FwdParallelogram({ className }: PatternProps) {
  return (
    <div aria-hidden="true" className={cn('skew-x-12 rounded-sm', className)} />
  )
}

export function FwdDotGrid({ className }: PatternProps) {
  return (
    <svg
      aria-hidden="true"
      className={cn('h-full w-full', className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern
          id="fwd-dot-grid"
          width="24"
          height="24"
          patternUnits="userSpaceOnUse"
        >
          <circle cx="2" cy="2" r="1.5" className="fill-current" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#fwd-dot-grid)" />
    </svg>
  )
}
