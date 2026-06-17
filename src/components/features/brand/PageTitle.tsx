import React from 'react'
import { cn } from '@/lib/utils/cn'

interface PageTitleProps {
  title: string
  description?: string | undefined
  className?: string | undefined
  action?: React.ReactNode | undefined
  dotColor?: string | undefined
}

export function PageTitle({
  title,
  description,
  className,
  action,
  dotColor = 'text-primary',
}: PageTitleProps) {
  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6',
        className,
      )}
    >
      <div className="space-y-1.5">
        <h1 className="text-4xl font-bold tracking-tight text-foreground font-heading leading-none">
          {title}
          <span className={cn('text-5xl', dotColor)}>.</span>
        </h1>
        {description && (
          <p className="text-muted-foreground text-sm max-w-2xl font-sans mt-2">
            {description}
          </p>
        )}
      </div>
      {action && <div className="flex items-center shrink-0">{action}</div>}
    </div>
  )
}
