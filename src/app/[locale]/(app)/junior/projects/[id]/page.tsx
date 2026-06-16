import { notFound } from 'next/navigation'
import {
  getMarketplaceProjectById,
  checkIfApplied,
} from '@/lib/projects/marketplace'
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

  const appliedResult = await checkIfApplied(id)
  const alreadyApplied = appliedResult.ok ? appliedResult.data : false

  return (
    <ProjectDetailClient
      project={projectResult.data}
      alreadyApplied={alreadyApplied}
    />
  )
}
