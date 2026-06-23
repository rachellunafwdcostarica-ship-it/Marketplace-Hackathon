import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { getPublicStudentProfile } from '@/lib/portfolio/actions'
import { CompanyShell } from '@/components/layout/CompanyShell'
import { SidebarEmpresaNuevo } from '@/components/layout/SidebarEmpresaNuevo'
import { BackButton } from '@/components/features/shared'
import { PortfolioViewer } from '@/components/features/marketplace/PortfolioViewer'
import { ReportButton } from '@/components/features/moderation/ReportButton'

interface EmpresaRankingProfileProps {
  params: Promise<{ id_estudiante: string }>
}

export default async function EmpresaRankingProfilePage({
  params,
}: EmpresaRankingProfileProps) {
  const { id_estudiante } = await params
  const t = await getTranslations('Common')

  const profileResult = await getPublicStudentProfile(id_estudiante)

  if (!profileResult.ok || !profileResult.data) {
    notFound()
  }

  return (
    <CompanyShell>
      <div className="flex-1 w-full flex flex-col lg:flex-row">
        <SidebarEmpresaNuevo />
        <div className="flex-1 w-full">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <main className="space-y-6 max-w-4xl mx-auto w-full">
              <div className="flex items-center justify-between gap-3">
                <BackButton label={t('back')} />
                <ReportButton
                  target={{
                    tipo: 'usuario',
                    id: profileResult.data.id_usuario,
                  }}
                />
              </div>
              <PortfolioViewer profile={profileResult.data} />
            </main>
          </div>
        </div>
      </div>
    </CompanyShell>
  )
}
