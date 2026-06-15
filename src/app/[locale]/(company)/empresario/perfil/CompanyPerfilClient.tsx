'use client'

import { useState } from 'react'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { CompanyProfileSidebar } from '@/components/features/companies/CompanyProfileSidebar'
import { CompanyProfileBanner } from '@/components/features/companies/CompanyProfileBanner'
import { CompanyProfileDetails } from '@/components/features/companies/CompanyProfileDetails'
import { CompanyProjectsTab } from '@/components/features/companies/CompanyProjectsTab'
import type { Company } from '@/types'

type TabType = 'profile' | 'projects'

interface CompanyPerfilClientProps {
  company: Company
}

/**
 * Cuerpo (client) del perfil del empresario. El company llega YA cargado por
 * prop desde el server component (datos reales de empresarios + usuarios, sin
 * `useEffect`). Solo maneja el estado de la pestaña activa.
 */
export function CompanyPerfilClient({ company }: CompanyPerfilClientProps) {
  const [activeTab, setActiveTab] = useState<TabType>('profile')
  const tecnologias: { id: string; nombre: string }[] = []

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
            <CompanyProjectsTab tecnologias={tecnologias} />
          )}
        </main>
      </div>

      <Footer />
    </div>
  )
}
