'use client'

import { useState } from 'react'
import { useRouter } from '@/i18n/routing'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { CompanyProfileSidebar } from '@/components/features/companies/CompanyProfileSidebar'
import { CompanyProfileBanner } from '@/components/features/companies/CompanyProfileBanner'
import { CompanyProfileDetails } from '@/components/features/companies/CompanyProfileDetails'
import { PublishedProjectsBoard } from '@/components/features/projects/PublishedProjectsBoard'
import type { Company } from '@/types'
import type { PublishedProject } from '@/lib/projects/dashboard'

type TabType = 'profile' | 'projects'

interface CompanyPerfilClientProps {
  company: Company
  projects: PublishedProject[]
}

/**
 * Cuerpo (client) del perfil del empresario. El company y los proyectos llegan
 * YA cargados por prop desde el server component (datos reales, sin `useEffect`).
 * La pestaña "Proyectos" reusa `PublishedProjectsBoard` (proyectos reales).
 */
export function CompanyPerfilClient({
  company,
  projects,
}: CompanyPerfilClientProps) {
  const [activeTab, setActiveTab] = useState<TabType>('profile')
  const router = useRouter()

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />

      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col lg:flex-row gap-8">
        <CompanyProfileSidebar
          company={company}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />

        <main className="flex-1 space-y-8">
          <CompanyProfileBanner company={company} />

          {activeTab === 'profile' && (
            <CompanyProfileDetails
              company={company}
              setActiveTab={setActiveTab}
            />
          )}

          {activeTab === 'projects' && (
            <PublishedProjectsBoard
              projects={projects}
              onRefetch={() => router.refresh()}
            />
          )}
        </main>
      </div>

      <Footer />
    </div>
  )
}
