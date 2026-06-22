import { getTranslations } from 'next-intl/server'
import { PageTitle } from '@/components/features/brand/PageTitle'
import { AdminReportsInterface } from '@/components/features/admin/AdminReportsInterface'

export default async function AdminReportsPage() {
  const t = await getTranslations('Admin')

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <PageTitle
        title="Reportes Administrativos"
        description="Genera y exporta informes del sistema en formato CSV."
        dotColor="text-primary"
      />

      <div className="mt-8">
        <AdminReportsInterface />
      </div>
    </div>
  )
}
