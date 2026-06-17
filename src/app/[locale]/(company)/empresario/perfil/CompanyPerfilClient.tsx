'use client'

import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { SidebarEmpresaNuevo } from '@/components/layout/SidebarEmpresaNuevo'
import { CompanyProfileBanner } from '@/components/features/companies/CompanyProfileBanner'
import { CompanyProfileDetails } from '@/components/features/companies/CompanyProfileDetails'
import type { Company } from '@/types'
import type { CompanyProfileView } from '@/lib/company/schemas'

interface CompanyPerfilClientProps {
  company: Company
  profile: CompanyProfileView
  projectsCount: number
}

/**
 * Cuerpo (client) del perfil del empresario: SOLO identidad (banner + datos de
 * empresa + representante). Los proyectos viven en el dashboard; acá hay un link
 * que lleva al panel. Usa el sidebar unificado del empresario (mismo en todas
 * las páginas del rol).
 */
export function CompanyPerfilClient({
  company,
  profile,
  projectsCount,
}: CompanyPerfilClientProps) {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />

      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col lg:flex-row gap-8">
        <SidebarEmpresaNuevo />

        <main className="flex-1 space-y-8">
          <CompanyProfileBanner company={company} />
          <CompanyProfileDetails
            profile={profile}
            projectsCount={projectsCount}
          />
        </main>
      </div>

      <Footer />
    </div>
  )
}
