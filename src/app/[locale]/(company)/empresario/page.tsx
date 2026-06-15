import { redirect } from 'next/navigation'
import { getLocale } from 'next-intl/server'
import { getMyPublishedProjects } from '@/lib/projects/dashboard'
import { isCompanyProfileComplete } from '@/lib/company/actions'
import { CompanyDashboardClient } from './CompanyDashboardClient'

/**
 * Dashboard del empresario. Server component: el guard de "perfil completo" vive
 * en el server (sin `useEffect`); si el perfil está incompleto, redirige al
 * formulario. Los proyectos publicados se traen en el server y se pasan al
 * cuerpo client. El refetch tras cancelar lo hace `router.refresh()`.
 */
export default async function CompanyDashboardPage() {
  const locale = await getLocale()

  const complete = await isCompanyProfileComplete()
  if (!complete.ok || !complete.data) {
    redirect(`/${locale}/empresario/formulario-empresa`)
  }

  const result = await getMyPublishedProjects()
  return (
    <CompanyDashboardClient initialProjects={result.ok ? result.data : []} />
  )
}
