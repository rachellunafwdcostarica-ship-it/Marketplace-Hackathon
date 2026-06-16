import { getMarketplaceProjects } from '@/lib/projects/marketplace'
import { JuniorDashboardClient } from '@/components/features/dashboard/JuniorDashboardClient'

export default async function EgresadoDashboard() {
  // Obtenemos los proyectos activos de Supabase
  const result = await getMarketplaceProjects()

  // Si la petición fue exitosa, tomamos los primeros 2 proyectos como recomendados
  const recommendedProjects = result.ok ? result.data.slice(0, 2) : []

  return <JuniorDashboardClient recommendedProjects={recommendedProjects} />
}
