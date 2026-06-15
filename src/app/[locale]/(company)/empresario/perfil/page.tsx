import { redirect } from 'next/navigation'
import { getLocale } from 'next-intl/server'
import {
  getCompanyProfileForEdit,
  isCompanyProfileComplete,
} from '@/lib/company/actions'
import { getMyPublishedProjects } from '@/lib/projects/dashboard'
import type { VerificationStatus } from '@/lib/company/schemas'
import type { Company, CompanyStatus } from '@/types'
import { CompanyPerfilClient } from './CompanyPerfilClient'

const VERIF_TO_STATUS: Record<VerificationStatus, CompanyStatus> = {
  pendiente: 'pending',
  verificado: 'approved',
  rechazado: 'rejected',
}

/**
 * Perfil del empresario. Server Component: el guard de "perfil completo" y la
 * lectura de datos viven en el server (sin `useEffect`). Si el perfil está
 * incompleto, redirige al formulario. Los datos REALES (empresarios + usuarios)
 * y los proyectos reales se pasan al cuerpo cliente.
 */
export default async function CompanyProfilePage() {
  const locale = await getLocale()

  const complete = await isCompanyProfileComplete()
  if (!complete.ok || !complete.data) {
    redirect(`/${locale}/empresario/formulario-empresa`)
  }

  const profileRes = await getCompanyProfileForEdit()
  if (!profileRes.ok) {
    redirect(`/${locale}/empresario/formulario-empresa`)
  }

  const projectsRes = await getMyPublishedProjects()
  const proyectos = projectsRes.ok ? projectsRes.data : []

  const p = profileRes.data
  const company: Company = {
    // El perfil no expone el id de empresario y ningún sub-componente lo usa.
    id: '',
    name: p.name,
    companyType: p.companyType,
    sector: p.sector,
    cedula: p.cedula ?? '',
    description: p.description,
    logo: p.logo,
    status: p.verificationStatus
      ? VERIF_TO_STATUS[p.verificationStatus]
      : 'pending',
    projectsCount: proyectos.length,
    contactEmail: p.contactEmail,
    website: p.website,
    createdAt: '',
    isProfileFilled: true,
  }

  return (
    <CompanyPerfilClient company={company} profile={p} projects={proyectos} />
  )
}
