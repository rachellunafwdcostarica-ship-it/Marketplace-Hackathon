'use client'

import React, { useState, useEffect } from 'react'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { useRouter } from '@/i18n/routing'
import { useAppState } from '@/lib/StateContext'
import { MOCK_COMPANY_ID } from '@/lib/constants/mockData'
import { CompanyProfileSidebar } from '@/components/features/companies/CompanyProfileSidebar'
import { CompanyProfileBanner } from '@/components/features/companies/CompanyProfileBanner'
import { CompanyProfileDetails } from '@/components/features/companies/CompanyProfileDetails'
import { CompanyProjectsTab } from '@/components/features/companies/CompanyProjectsTab'

type TabType = 'profile' | 'projects'

export default function EmpresaPerfilPage() {
  const [activeTab, setActiveTab] = useState<TabType>('profile')
  const router = useRouter()
  const { companies } = useAppState()
  const company = companies.find((c) => c.id === MOCK_COMPANY_ID)

  useEffect(() => {
    if (company && !company.isProfileFilled) {
      router.replace('/empresa/formulario-empresa')
    }
  }, [company, router])

  // Tecnologías preparadas para ser integradas posteriormente con el backend (F2)
  const tecnologias: { id: string; nombre: string }[] = []

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />

      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col lg:flex-row gap-8">
        {/* Sidebar modularizado (F1) */}
        <CompanyProfileSidebar
          company={company}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />

        {/* Contenido Principal modularizado (F1) */}
        <main className="flex-1 space-y-8">
          {/* Banner modularizado (F1) */}
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
