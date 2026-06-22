import { notFound } from 'next/navigation'
import {
  getMarketplaceProjectById,
  checkIfApplied,
} from '@/lib/projects/marketplace'
import { getMiContratacion } from '@/lib/deliverables/queries'
import { getCompanyRatingForStudent } from '@/lib/company/ratings'
import { ProjectDetailClient } from '@/components/features/marketplace/ProjectDetailClient'

interface PageProps {
  params: Promise<{ locale: string; id: string }>
}

export default async function ProjectDetailsPage({ params }: PageProps) {
  const { id } = await params

  const projectResult = await getMarketplaceProjectById(id)

  if (!projectResult.ok) {
    notFound()
  }

  const [appliedResult, contratacionResult] = await Promise.all([
    checkIfApplied(id),
    getMiContratacion(id),
  ])

  const alreadyApplied = appliedResult.ok ? appliedResult.data : false
  const contratacion = contratacionResult.ok ? contratacionResult.data : null

  const ratingResult = await getCompanyRatingForStudent(
    projectResult.data.companyId,
  )
  const existingRating = ratingResult.ok ? ratingResult.data : null

  return (
    <ProjectDetailClient
      project={projectResult.data}
      alreadyApplied={alreadyApplied}
      contratacion={contratacion}
      existingRating={existingRating}
    />
  )
}
