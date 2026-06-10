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
        'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 pb-4 border-b border-border/80',
        className,
      )}
    >
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-foreground font-heading">
          {title}
          <span className={cn('text-4xl', dotColor)}>.</span>
        </h1>
        {description && (
          <p className="text-muted-foreground text-sm max-w-2xl font-sans">
            {description}
          </p>
        )}
      </div>
      {action && <div className="flex items-center shrink-0">{action}</div>}
    </div>
  )
}
