import { getMarketplaceProjects } from '@/lib/projects/marketplace'
import { getMisPostulacionesStats } from '@/lib/applications/queries'
import { JuniorDashboardClient } from '@/components/features/dashboard/JuniorDashboardClient'

export default async function EgresadoDashboard() {
  const [projectsResult, statsResult] = await Promise.all([
    getMarketplaceProjects(),
    getMisPostulacionesStats(),
  ])

  const recommendedProjects = projectsResult.ok
    ? projectsResult.data.slice(0, 2)
    : []

  const stats = statsResult.ok
    ? statsResult.data
    : { total: 0, activas: 0, contratadas: 0 }

  return (
    <JuniorDashboardClient
      recommendedProjects={recommendedProjects}
      stats={stats}
    />
  )
}
