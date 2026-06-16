import { getTranslations } from 'next-intl/server'
import { Settings } from 'lucide-react'
import { PageTitle } from '@/components/features/brand/PageTitle'
import { EmptyState } from '@/components/features/shared/EmptyState'
import { SystemConfigForm } from '@/components/features/admin/SystemConfigForm'
import { getSystemConfig } from '@/lib/admin/queries'

export default async function AdminSettingsPage() {
  const t = await getTranslations('AdminConfig')

  const result = await getSystemConfig()
  const items = result.ok ? result.data : []

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <PageTitle
        title={t('title')}
        description={t('description')}
        dotColor="text-magenta"
      />

      <div className="mt-8">
        {items.length === 0 ? (
          <EmptyState
            title={t('empty')}
            description={t('emptyDesc')}
            icon={Settings}
          />
        ) : (
          <SystemConfigForm items={items} />
        )}
      </div>
    </div>
  )
}
