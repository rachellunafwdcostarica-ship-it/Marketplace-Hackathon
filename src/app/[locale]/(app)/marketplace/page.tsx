import { getMarketplaceProjects } from '@/lib/projects/marketplace'
import { MarketplaceClient } from '@/components/features/marketplace/MarketplaceClient'

export default async function MarketplacePage() {
  const result = await getMarketplaceProjects()
  const initialProjects = result.ok ? result.data : []
  return <MarketplaceClient initialProjects={initialProjects} />
}
