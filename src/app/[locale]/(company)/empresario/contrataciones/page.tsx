import { redirect } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import { CompanyShell } from '@/components/layout/CompanyShell'
import { SidebarEmpresaNuevo } from '@/components/layout/SidebarEmpresaNuevo'
import { PageTitle } from '@/components/features/brand/PageTitle'
import { ContratacionesList } from '@/components/features/projects/ContratacionesList'
import { getEmpresarioParticipations } from '@/lib/projects/project-detail'
import { isCompanyProfileComplete } from '@/lib/company/actions'

/**
 * Vista exclusiva de las Contrataciones del empresario.
 * Es casi idéntica a /postulaciones pero filtra los datos obtenidos
 * para enviar a ParticipationsPanel únicamente a los estudiantes
 * que están en estado "contratada" o "finalizada".
 */
export default async function CompanyContratacionesPage() {
  const locale = await getLocale()
  const t = await getTranslations('EmpresaPerfil')

  const complete = await isCompanyProfileComplete()
  if (!complete.ok || !complete.data) {
    redirect(`/${locale}/empresario/formulario-empresa`)
  }

  const result = await getEmpresarioParticipations()

  // Filtramos para quedarnos solo con contratados
  const contratacionesData = result.ok
    ? result.data.filter(
        (p) => p.estado === 'contratada' || p.estado === 'finalizada',
      )
    : []

  return (
    <CompanyShell>
      <div className="flex-1 w-full flex flex-col lg:flex-row">
        <SidebarEmpresaNuevo />

        <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          <PageTitle
            title={t('menuContrataciones')}
            description={t('contratacionesDesc')}
            dotColor="text-primary"
          />
          <ContratacionesList contrataciones={contratacionesData} />
        </main>
      </div>
    </CompanyShell>
  )
}
