'use client'

import { CompanyShell } from '@/components/layout/CompanyShell'
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
    <CompanyShell>
      <div className="space-y-8">
        <CompanyProfileBanner company={company} />
        <CompanyProfileDetails
          profile={profile}
          projectsCount={projectsCount}
        />
      </div>
    </CompanyShell>
  )
}
