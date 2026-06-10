import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface InsightItem {
  title: string
  description: string
  icon: LucideIcon
}

interface InsightSectionProps {
  title: string
  insights: InsightItem[]
  className?: string
  dotColor?: string
}

export function InsightSection({
  title,
  insights,
  className,
  dotColor = 'text-accent',
}: InsightSectionProps) {
  return (
    <Card
      className={cn(
        'border border-border/80 bg-card/40 backdrop-blur-sm shadow-sm overflow-hidden relative',
        className,
      )}
    >
      {/* Visual decorative accents using official FWD colors */}
      <div className="absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r from-primary via-secondary to-accent" />

      <CardHeader className="pt-6 pb-2">
        <CardTitle className="text-lg font-bold tracking-tight text-foreground font-heading">
          {title}
          <span className={cn('font-bold', dotColor)}>.</span>
        </CardTitle>
      </CardHeader>

      <CardContent className="p-6 pt-2 space-y-4">
        {insights.map((insight, index) => {
          const Icon = insight.icon
          return (
            <div
              key={index}
              className="flex gap-4 items-start pb-4 border-b border-border/60 last:border-0 last:pb-0"
            >
              <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                <Icon className="w-4 h-4" />
              </div>
              <div className="space-y-1 min-w-0">
                <h5 className="text-sm font-semibold text-foreground leading-none">
                  {insight.title}
                </h5>
                <p className="text-xs text-muted-foreground leading-normal">
                  {insight.description}
                </p>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
