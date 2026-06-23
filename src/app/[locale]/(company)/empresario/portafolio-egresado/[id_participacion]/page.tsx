import { notFound, redirect } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import { getPublicStudentProfileByParticipacion } from '@/lib/portfolio/actions'
import { isCompanyProfileComplete } from '@/lib/company/actions'
import { PortfolioViewer } from '@/components/features/marketplace/PortfolioViewer'
import { BackButton } from '@/components/features/shared'
import { CompanyShell } from '@/components/layout/CompanyShell'
import { SidebarEmpresaNuevo } from '@/components/layout/SidebarEmpresaNuevo'

interface PortafolioEgresadoPageProps {
  params: Promise<{ id_participacion: string }>
}

export default async function PortafolioEgresadoPage({
  params,
}: PortafolioEgresadoPageProps) {
  const { id_participacion } = await params
  const locale = await getLocale()

  const complete = await isCompanyProfileComplete()
  if (!complete.ok || !complete.data) {
    redirect(`/${locale}/empresario/formulario-empresa`)
  }

  const profileResult =
    await getPublicStudentProfileByParticipacion(id_participacion)

  if (!profileResult.ok || !profileResult.data) {
    // Si da error por privacidad o no lo encuentra, redirige al 404
    notFound()
  }

  const t = await getTranslations('ProjectDetail')

  return (
    <CompanyShell>
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col lg:flex-row gap-8">
        <SidebarEmpresaNuevo />
        <main className="flex-1 space-y-6 max-w-4xl mx-auto w-full">
          <div>
            <BackButton label={t('backToParticipations')} />
          </div>
          <PortfolioViewer profile={profileResult.data} />
        </main>
      </div>
    </CompanyShell>
  )
}
