import { redirect } from 'next/navigation'
import { getLocale } from 'next-intl/server'
import { getMyPublishedProjects } from '@/lib/projects/dashboard'
import { getEmpresarioParticipationStats } from '@/lib/projects/project-detail'
import { isCompanyProfileComplete } from '@/lib/company/actions'
import { getTalentRanking } from '@/lib/ranking/actions'
import { CompanyDashboardClient } from './CompanyDashboardClient'

/**
 * Dashboard del empresario. Server component: el guard de "perfil completo" vive
 * en el server (sin `useEffect`); si el perfil está incompleto, redirige al
 * formulario. Proyectos y stats de postulaciones (datos REALES) se traen en el
 * server y se pasan al cuerpo client.
 */
export default async function CompanyDashboardPage() {
  const locale = await getLocale()

  const complete = await isCompanyProfileComplete()
  if (!complete.ok || !complete.data) {
    redirect(`/${locale}/empresario/formulario-empresa`)
  }

  const [projectsResult, statsResult, rankingResult] = await Promise.all([
    getMyPublishedProjects(),
    getEmpresarioParticipationStats(),
    getTalentRanking({ page: 1, pageSize: 2 }),
  ])

  return (
    <CompanyDashboardClient
      initialProjects={projectsResult.ok ? projectsResult.data : []}
      participationStats={
        statsResult.ok
          ? statsResult.data
          : { total: 0, hired: 0, countsByProject: {} }
      }
      topTalents={rankingResult.ok ? rankingResult.data.items : []}
      locale={locale}
    />
  )
}
