'use client'

/**
 * HUÉRFANO (código muerto preservado) — versión MOCK de la página de perfil del
 * empresario. Leía `currentCompany` de `StateContext` (mock) y usaba un
 * `useEffect` para el guard "perfil incompleto". Reemplazada por la versión
 * server-side real: `empresario/perfil/page.tsx` (guard + datos reales) +
 * `CompanyPerfilClient`.
 *
 * NO se importa en ningún lado. Se conserva por decisión del equipo
 * (ver `docs/deuda-tecnica-mocks.md`); git guarda el historial igual.
 */

import { useState, useEffect } from 'react'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { useRouter } from '@/i18n/routing'
import { useAppState } from '@/lib/StateContext'
import { CompanyProfileSidebar } from '@/components/features/companies/CompanyProfileSidebar'
import { CompanyProfileBanner } from '@/components/features/companies/CompanyProfileBanner'
import { CompanyProfileDetails } from '@/components/features/companies/CompanyProfileDetails'
import { CompanyProjectsTab } from '@/components/features/companies/CompanyProjectsTab'

type TabType = 'profile' | 'projects'

export function MockCompanyPerfilPage() {
  const [activeTab, setActiveTab] = useState<TabType>('profile')
  const router = useRouter()
  const { currentCompany: company } = useAppState()

  useEffect(() => {
    if (company && !company.isProfileFilled) {
      router.replace('/empresario/formulario-empresa')
    }
  }, [company, router])

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
