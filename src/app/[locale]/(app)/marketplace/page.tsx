import { getMarketplaceProjects } from '@/lib/projects/marketplace'
import { MarketplaceClient } from '@/components/features/marketplace/MarketplaceClient'

import { getLocale } from 'next-intl/server'

export default async function MarketplacePage() {
  const result = await getMarketplaceProjects()
  const initialProjects = result.ok ? result.data : []
  const locale = await getLocale()
  return <MarketplaceClient initialProjects={initialProjects} locale={locale} />
}
