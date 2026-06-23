import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { getPublicStudentProfile } from '@/lib/portfolio/actions'
import { EgresadoShell } from '@/components/layout/EgresadoShell'
import { BackButton } from '@/components/features/shared'
import { PortfolioViewer } from '@/components/features/marketplace/PortfolioViewer'

interface EgresadoRankingProfileProps {
  params: Promise<{ id_estudiante: string }>
}

export default async function EgresadoRankingProfilePage({
  params,
}: EgresadoRankingProfileProps) {
  const { id_estudiante } = await params
  const t = await getTranslations('Common')

  const profileResult = await getPublicStudentProfile(id_estudiante)

  if (!profileResult.ok || !profileResult.data) {
    notFound()
  }

  return (
    <EgresadoShell>
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <main className="flex-1 space-y-6 max-w-4xl mx-auto w-full">
          <div>
            <BackButton label={t('back')} />
          </div>
          <PortfolioViewer profile={profileResult.data} />
        </main>
      </div>
    </EgresadoShell>
  )
}
