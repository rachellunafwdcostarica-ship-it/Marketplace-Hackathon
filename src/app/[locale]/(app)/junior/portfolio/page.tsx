import React from 'react'
import { PortfolioManager } from '@/components/features/marketplace/PortfolioManager'
import { getTranslations } from 'next-intl/server'
import { getStudentProfile } from '@/lib/portfolio/actions'

export default async function PortfolioPage() {
  const t = await getTranslations('Portfolio')

  const profileResult = await getStudentProfile()
  const initialProfile = profileResult.ok ? profileResult.data : null

  return (
    <div className="container mx-auto py-10 space-y-8 max-w-6xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {t('title')}
          <span className="text-primary">.</span>
        </h1>
        <p className="text-muted-foreground mt-2">{t('description')}</p>
      </div>

      <PortfolioManager initialProfile={initialProfile} />
    </div>
  )
}
