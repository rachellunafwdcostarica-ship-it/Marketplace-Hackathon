import {
  getMiContratacion,
  getMisEntregables,
} from '@/lib/deliverables/queries'
import { getMarketplaceProjectById } from '@/lib/projects/marketplace'
import { getCompanyRatingForContract } from '@/lib/company/ratings'
import { EntregablesClient } from '@/components/features/deliverables/EntregablesClient'
import { notFound, redirect } from 'next/navigation'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EntregablesPage({ params }: PageProps) {
  const { id } = await params

  const [projectResult, contratacionResult] = await Promise.all([
    getMarketplaceProjectById(id),
    getMiContratacion(id),
  ])

  if (!projectResult.ok) notFound()

  if (!contratacionResult.ok || !contratacionResult.data) {
    redirect('/junior/applications')
  }

  const contratacion = contratacionResult.data

  const [entregablesResult, ratingResult] = await Promise.all([
    getMisEntregables(contratacion.id_contratacion),
    getCompanyRatingForContract(contratacion.id_contratacion),
  ])
  const entregables = entregablesResult.ok ? entregablesResult.data : []
  const existingRating = ratingResult.ok ? ratingResult.data : null

  return (
    <EntregablesClient
      projectId={id}
      projectTitle={projectResult.data.title}
      companyId={projectResult.data.companyId}
      contratacion={contratacion}
      entregablesIniciales={entregables}
      existingRating={existingRating}
    />
  )
}
