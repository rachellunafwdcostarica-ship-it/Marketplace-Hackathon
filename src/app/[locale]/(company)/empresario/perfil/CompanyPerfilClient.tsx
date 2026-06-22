'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { CompanyShell } from '@/components/layout/CompanyShell'
import { SidebarEmpresaNuevo } from '@/components/layout/SidebarEmpresaNuevo'
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

const PROFILE_TABS = [
  { id: 'profile', labelKey: 'tabProfile' },
  { id: 'projects', labelKey: 'tabProjects' },
] as const

/**
 * Cuerpo (client) del perfil del empresario. Comparte el sidebar unificado de
 * empresario (CompanyShell + grid) con el resto de sus rutas; las pestañas
 * Perfil/Proyectos viven en el cuerpo y la identidad de empresa, en el banner.
 */
export function CompanyPerfilClient({
  company,
  profile,
  projects,
}: CompanyPerfilClientProps) {
  const t = useTranslations('EmpresaPerfil')
  const [activeTab, setActiveTab] = useState<'profile' | 'projects'>('profile')

  return (
    <CompanyShell>
      <div className="relative flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col lg:flex-row gap-8">
        {/* Watermark de marca (decorativo, sin datos) */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute -bottom-24 -left-24 w-96 h-96 opacity-[0.04] blur-[1px]">
            <FwdLogo className="w-full h-full" />
          </div>
        </div>

        <SidebarEmpresaNuevo />

        <main className="relative z-10 flex-1 space-y-8">
          <CompanyProfileBanner company={company} />

          <div
            role="tablist"
            aria-label={t('tabsAria')}
            className="flex flex-wrap gap-2"
          >
            {PROFILE_TABS.map((tab) => {
              const selected = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-[var(--duration-fast)] ease-[var(--ease-out)] ${
                    selected
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  {t(tab.labelKey)}
                </button>
              )
            })}
          </div>

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
        </main>
      </div>
    </CompanyShell>
  )
}
