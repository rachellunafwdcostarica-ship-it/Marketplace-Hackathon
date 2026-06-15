'use client'

import React from 'react'
import { useTranslations } from 'next-intl'
import { useDemoData } from '@/lib/DemoDataContext'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { PageTitle } from '@/components/features/brand/PageTitle'
import { ApplicationCard } from '@/components/features/applications/ApplicationCard'
import { EmptyState } from '@/components/features/shared/EmptyState'
import { Link } from '@/i18n/routing'
import { Briefcase } from 'lucide-react'
import { MOCK_JUNIOR_NAME } from '@/lib/constants/mockData'

export default function EgresadoApplicationsPage() {
  const tEgresado = useTranslations('Egresado')
  const { applications } = useDemoData()

  const myApps = applications.filter(
    (app) => app.candidateName === MOCK_JUNIOR_NAME,
  )

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageTitle
          title={tEgresado('applications')}
          description={tEgresado('applicationsDesc')}
          dotColor="text-primary"
        />

        <div className="mt-8">
          {myApps.length === 0 ? (
            <EmptyState
              title={tEgresado('emptyApplications')}
              description={tEgresado('emptyApplicationsDesc')}
              icon={Briefcase}
              actionText={tEgresado('exploreMarketplace')}
              onAction={() => {}}
            />
          ) : (
            <div className="space-y-6">
              {myApps.map((application) => (
                <ApplicationCard
                  key={application.id}
                  application={application}
                  viewMode="egresado"
                />
              ))}
            </div>
          )}
        </div>

        {myApps.length > 0 && (
          <div className="mt-8 text-center">
            <Link
              href="/junior/projects"
              className="text-sm font-semibold text-primary hover:underline"
            >
              {tEgresado('exploreMoreProjects')}
            </Link>
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}
