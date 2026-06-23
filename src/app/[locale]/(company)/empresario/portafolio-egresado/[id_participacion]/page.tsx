import { notFound, redirect } from 'next/navigation'
import { getLocale, getTranslations } from 'next-intl/server'
import { getPublicStudentProfileByParticipacion } from '@/lib/portfolio/actions'
import { isCompanyProfileComplete } from '@/lib/company/actions'
import { getContratacionConRatingByParticipacion } from '@/lib/evaluaciones/actions'
import { PortfolioViewer } from '@/components/features/marketplace/PortfolioViewer'
import { EmpresarioRatingCard } from '@/components/features/evaluaciones/EmpresarioRatingCard'
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

  const [profileResult, contratacionResult] = await Promise.all([
    getPublicStudentProfileByParticipacion(id_participacion),
    getContratacionConRatingByParticipacion(id_participacion),
  ])

  if (!profileResult.ok || !profileResult.data) {
    notFound()
  }

  const t = await getTranslations('ProjectDetail')
  const contratacionConRating = contratacionResult.ok
    ? contratacionResult.data
    : null
  const isFinalizado = contratacionConRating?.estado_periodo === 'finalizado'

  return (
    <CompanyShell>
      <div className="flex-1 w-full flex flex-col lg:flex-row">
        <SidebarEmpresaNuevo />
        <div className="flex-1 w-full">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <main className="space-y-6 max-w-4xl mx-auto w-full pb-8 lg:self-start">
              <div>
                <BackButton label={t('backToParticipations')} />
              </div>
              <PortfolioViewer profile={profileResult.data} />
              {isFinalizado && contratacionConRating && (
                <EmpresarioRatingCard
                  idEstudiante={contratacionConRating.id_estudiante}
                  idContratacion={contratacionConRating.id_contratacion}
                  existingRating={contratacionConRating.existingRating}
                />
              )}
            </main>
          </div>
        </div>
      </div>
    </CompanyShell>
  )
}
