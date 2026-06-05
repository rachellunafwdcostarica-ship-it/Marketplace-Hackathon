'use client'

import React from 'react'
import { useTranslations } from 'next-intl'
import { useAppState } from '@/lib/stateContext'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { PageTitle } from '@/components/features/PageTitle'
import { ApplicationCard } from '@/components/features/applications/ApplicationCard'
import { EmptyState } from '@/components/features/EmptyState'
import { Link } from '@/i18n/routing'
import { Briefcase } from 'lucide-react'

export default function JuniorApplicationsPage() {
  const tJunior = useTranslations('Junior')
  const { applications } = useAppState()

  const myApps = applications.filter(
    (app) => app.candidateName === 'Juan Pérez',
  )

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageTitle
          title={tJunior('applications')}
          description="Realiza el seguimiento de tus candidaturas enviadas a las distintas empresas."
          dotColor="text-primary"
        />

        <div className="mt-8">
          {myApps.length === 0 ? (
            <EmptyState
              title={tJunior('emptyApplications')}
              description="Navega por nuestro catálogo de proyectos, encuentra el que mejor se adapte a tu stack y envíale tu propuesta a la empresa."
              icon={Briefcase}
              actionText="Explorar Marketplace"
              onAction={() => {}}
            />
          ) : (
            <div className="space-y-6">
              {myApps.map((application) => (
                <ApplicationCard
                  key={application.id}
                  application={application}
                  viewMode="junior"
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
              Explorar más proyectos en el Marketplace
            </Link>
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}
