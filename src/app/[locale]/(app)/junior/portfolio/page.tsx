import React from 'react'
import { PortfolioManager } from '@/components/features/marketplace/PortfolioManager'
import { useTranslations } from 'next-intl'

export default function PortfolioPage() {
  const t = useTranslations('Portfolio')

  return (
    <div className="container mx-auto py-10 space-y-8 max-w-6xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground mt-2">{t('description')}</p>
      </div>

      <PortfolioManager />
    </div>
  )
}
