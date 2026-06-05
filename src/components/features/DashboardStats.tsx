import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

export interface StatItem {
  title: string
  value: string | number
  icon: LucideIcon
  description?: string
  colorClass?: string // e.g. 'text-primary'
}

interface DashboardStatsProps {
  stats: StatItem[]
  className?: string
}

export function DashboardStats({ stats, className }: DashboardStatsProps) {
  return (
    <div
      className={cn(
        'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 my-6',
        className,
      )}
    >
      {stats.map((stat, index) => {
        const Icon = stat.icon
        return (
          <Card
            key={index}
            className="overflow-hidden border border-border bg-card/60 backdrop-blur-sm hover:shadow-lg hover:border-primary/30 transition-all duration-[var(--duration-slow)] ease-[var(--ease-out)] group"
          >
            <CardContent className="p-6 flex items-center space-x-4">
              <div
                className={cn(
                  'p-3 rounded-xl transition-all duration-[var(--duration-slow)] ease-[var(--ease-out)] group-hover:scale-110 ring-4 ring-muted/50 bg-muted text-muted-foreground',
                  stat.colorClass,
                )}
              >
                <Icon className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-muted-foreground truncate">
                  {stat.title}
                </p>
                <h4 className="text-2xl font-bold tracking-tight text-foreground mt-1">
                  {stat.value}
                </h4>
                {stat.description && (
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {stat.description}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
