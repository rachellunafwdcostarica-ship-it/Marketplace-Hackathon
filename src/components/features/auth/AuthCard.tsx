import React from 'react'
import { useTranslations } from 'next-intl'
import { Trophy } from 'lucide-react'

interface AuthCardProps {
  children: React.ReactNode
}

export function AuthCard({ children }: AuthCardProps) {
  const t = useTranslations('Auth')

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-secondary relative overflow-hidden px-4 py-12">
      {/* Decorative geometries */}
      <div className="absolute right-0 top-0 h-full w-[25%] bg-secondary-foreground/15 transform skew-x-12 origin-top-right hidden md:block opacity-40 pointer-events-none" />
      <div className="absolute right-0 top-0 h-full w-[10%] bg-ink-strong/25 transform skew-x-6 origin-top-right hidden md:block opacity-60 pointer-events-none" />

      {/* Main card */}
      <div className="w-full max-w-[500px] bg-surface rounded-[2.5rem] shadow-2xl p-8 md:p-12 relative z-10 animate-fade-in">
        {children}
      </div>

      {/* Footer / Award */}
      <div className="mt-8 text-center text-secondary-foreground/80 z-10 flex flex-col items-center gap-2">
        {/* Award seal (simulated visually) */}
        <div className="flex items-center justify-center gap-1 text-highlight text-xl font-bold">
          <Trophy className="w-6 h-6" />
        </div>
        <p className="text-xs font-semibold tracking-wider uppercase text-secondary-foreground/70">
          {t('awardText')}
        </p>
      </div>
    </div>
  )
}
