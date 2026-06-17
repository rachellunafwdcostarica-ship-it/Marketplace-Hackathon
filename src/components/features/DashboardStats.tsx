import React from 'react'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

export interface StatItem {
  title: string
  value: string | number
  icon: LucideIcon
  description?: string
  colorClass?: string // e.g. 'text-primary bg-primary/10'
}

interface DashboardStatsProps {
  stats: StatItem[]
  className?: string
}

export function DashboardStats({ stats, className }: DashboardStatsProps) {
  return (
    <div
      className={cn(
        'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 my-6',
        className,
      )}
    >
      <style>{`
        @keyframes borderRainbow {
          0% { border-color: #008fd4; box-shadow: 0 4px 6px -1px rgba(0, 143, 212, 0.06), 0 2px 4px -1px rgba(0, 143, 212, 0.03); }
          17% { border-color: #662d91; box-shadow: 0 4px 6px -1px rgba(102, 45, 145, 0.06), 0 2px 4px -1px rgba(102, 45, 145, 0.03); }
          33% { border-color: #20bec6; box-shadow: 0 4px 6px -1px rgba(32, 190, 198, 0.06), 0 2px 4px -1px rgba(32, 190, 198, 0.03); }
          50% { border-color: #ffcb05; box-shadow: 0 4px 6px -1px rgba(255, 203, 5, 0.06), 0 2px 4px -1px rgba(255, 203, 5, 0.03); }
          67% { border-color: #f7901e; box-shadow: 0 4px 6px -1px rgba(247, 144, 30, 0.06), 0 2px 4px -1px rgba(247, 144, 30, 0.03); }
          83% { border-color: #ec008c; box-shadow: 0 4px 6px -1px rgba(236, 0, 140, 0.06), 0 2px 4px -1px rgba(236, 0, 140, 0.03); }
          100% { border-color: #008fd4; box-shadow: 0 4px 6px -1px rgba(0, 143, 212, 0.06), 0 2px 4px -1px rgba(0, 143, 212, 0.03); }
        }
        .animate-border-rainbow {
          animation: borderRainbow 12s linear infinite;
        }
      `}</style>
      {stats.map((stat, index) => {
        const Icon = stat.icon
        return (
          <div
            key={index}
            className="flex items-center gap-4 rounded-2xl border bg-white p-5 transition-all duration-200 group animate-border-rainbow"
          >
            {/* Icon box */}
            <div
              className={cn(
                'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105',
                stat.colorClass ?? 'bg-gray-100 text-gray-500',
              )}
            >
              <Icon className="h-5 w-5" />
            </div>
            {/* Text */}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold uppercase tracking-wide text-gray-400">
                {stat.title}
              </p>
              <p className="mt-0.5 text-2xl font-bold tabular-nums text-gray-900">
                {stat.value}
              </p>
              {stat.description && (
                <p className="mt-0.5 truncate text-xs text-gray-400">
                  {stat.description}
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
