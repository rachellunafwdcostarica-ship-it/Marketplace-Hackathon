import { getMyPublishedProjects } from '@/lib/projects/dashboard'
import { CompanyDashboardClient } from './CompanyDashboardClient'

/**
 * Dashboard del empresario. Server component: los proyectos publicados se traen
 * en el server (sin `useEffect` de fetch en el cliente) y se pasan al cuerpo
 * client. El refetch tras cancelar lo hace `router.refresh()` desde el cliente.
 */
export default async function CompanyDashboardPage() {
  const result = await getMyPublishedProjects()
  return (
    <CompanyDashboardClient initialProjects={result.ok ? result.data : []} />
  )
}
