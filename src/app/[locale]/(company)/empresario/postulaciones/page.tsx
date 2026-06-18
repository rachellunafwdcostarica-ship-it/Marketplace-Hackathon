import { redirect } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import { CompanyShell } from '@/components/layout/CompanyShell'
import { PageTitle } from '@/components/features/brand/PageTitle'
import { ParticipationsPanel } from '@/components/features/projects/ParticipationsPanel'
import { getEmpresarioParticipations } from '@/lib/projects/project-detail'
import { isCompanyProfileComplete } from '@/lib/company/actions'

/**
 * Postulaciones del empresario, vista cross-project (datos REALES). Server
 * component: trae todas las participaciones de todos sus proyectos y las pasa al
 * panel compartido, que las filtra y permite el trío de acciones. Cada tarjeta
 * enlaza a su proyecto.
 */
export default async function CompanyPostulationsPage() {
  const locale = await getLocale()
  const t = await getTranslations('CompanyPostulations')

  const complete = await isCompanyProfileComplete()
  if (!complete.ok || !complete.data) {
    redirect(`/${locale}/empresario/formulario-empresa`)
  }

  const result = await getEmpresarioParticipations()

  return (
    <CompanyShell>
      <div className="space-y-8">
        <PageTitle
          title={t('title')}
          description={t('subtitle')}
          dotColor="text-primary"
        />
        <ParticipationsPanel result={result} />
      </div>
    </CompanyShell>
  )
}
