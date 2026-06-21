import { PortfolioManager } from '@/components/features/marketplace/PortfolioManager'
import { getTranslations } from 'next-intl/server'
import { getStudentProfile } from '@/lib/portfolio/actions'
import { EgresadoShell } from '@/components/layout/EgresadoShell'
import { PageTitle } from '@/components/features/brand/PageTitle'

export default async function PortfolioPage() {
  const t = await getTranslations('Portfolio')

  const profileResult = await getStudentProfile()
  const initialProfile = profileResult.ok ? profileResult.data : null

  return (
    <EgresadoShell>
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <main className="flex-1 min-w-0">
          <PageTitle
            title={t('title')}
            description={t('description')}
            dotColor="text-primary"
          />

          <div className="mt-8">
            <PortfolioManager initialProfile={initialProfile} />
          </div>
        </main>
      </div>
    </EgresadoShell>
  )
}
