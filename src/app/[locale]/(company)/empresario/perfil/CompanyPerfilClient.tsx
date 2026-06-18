'use client'

import { useState } from 'react'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { CompanyProfileSidebar } from '@/components/features/companies/CompanyProfileSidebar'
import { CompanyProfileBanner } from '@/components/features/companies/CompanyProfileBanner'
import { CompanyProfileDetails } from '@/components/features/companies/CompanyProfileDetails'
import { PublishedProjectsBoard } from '@/components/features/projects/PublishedProjectsBoard'
import { FwdLogo } from '@/components/features/brand/FwdLogo'
import type { Company } from '@/types'
import type { CompanyProfileView } from '@/lib/company/schemas'
import type { PublishedProject } from '@/lib/projects/dashboard'

interface CompanyPerfilClientProps {
  company: Company
  profile: CompanyProfileView
  projects: PublishedProject[]
}

/**
 * Cuerpo (client) del perfil del empresario: identidad (banner + datos de
 * empresa + representante). Permite cambiar a la pestaña de proyectos reales.
 * Usa el sidebar flotante específico del perfil.
 */
export function CompanyPerfilClient({
  company,
  profile,
  projects,
}: CompanyPerfilClientProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'projects'>('profile')

  return (
    <div className="flex flex-col min-h-screen bg-canvas">
      {/* Navbar at the top of the screen (full width) */}
      <Navbar />

      {/* Main container below the Navbar */}
      <div className="flex flex-1 flex-col md:flex-row min-w-0">
        {/* ── Desktop Sidebar (Visible on md and up) ── */}
        <CompanyProfileSidebar
          company={company}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          hideLogo={true}
          className="hidden md:flex md:w-56 md:h-[calc(100vh-64px)] md:sticky md:top-[64px] md:rounded-none md:border-y-0 md:border-l-0 md:border-r md:border-white/10 md:p-5 md:shadow-none"
        />

        {/* ── Main content column on the right ── */}
        <main className="flex-1 overflow-x-hidden bg-canvas relative flex flex-col justify-between">
          {/* Watermark wrapper to prevent vertical overflow scroll past the footer */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
            {/* Bottom-left blurred watermark */}
            <div className="absolute -bottom-24 -left-24 w-96 h-96 opacity-[0.04] blur-[1px]">
              <FwdLogo className="w-full h-full" />
            </div>
          </div>

          <div className="relative z-10 flex-1 px-4 sm:px-6 lg:px-8 py-8 w-full max-w-7xl mx-auto space-y-8">
            {/* Mobile Sidebar Card (Visible only below md) */}
            <div className="block md:hidden">
              <CompanyProfileSidebar
                company={company}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                hideLogo={true}
                className="w-full"
              />
            </div>

            <CompanyProfileBanner company={company} />

            {activeTab === 'profile' && (
              <CompanyProfileDetails
                profile={profile}
                projects={projects}
                setActiveTab={setActiveTab}
              />
            )}

            {activeTab === 'projects' && (
              <PublishedProjectsBoard projects={projects} />
            )}
          </div>

          <Footer />
        </main>
      </div>
    </div>
  )
}
