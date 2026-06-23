import { getMarketplaceProjects } from '@/lib/projects/marketplace'
import { getTalentRanking } from '@/lib/ranking/actions'
import { MarketplaceClient } from '@/components/features/marketplace/MarketplaceClient'
import { getLocale } from 'next-intl/server'

export default async function EgresadoProjectsMarketplace() {
  const [result, rankingResult] = await Promise.all([
    getMarketplaceProjects(),
    getTalentRanking({ page: 1, pageSize: 2 }),
  ])

  const initialProjects = result.ok ? result.data : []
  const topTalents = rankingResult.ok ? rankingResult.data.items : []
  const locale = await getLocale()

  return (
    <MarketplaceClient
      initialProjects={initialProjects}
      topTalents={topTalents}
      locale={locale}
    />
  )
}
