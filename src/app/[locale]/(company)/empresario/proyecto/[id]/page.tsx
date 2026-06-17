import { notFound, redirect } from 'next/navigation'
import { getLocale } from 'next-intl/server'
import { getMyPublishedProjects } from '@/lib/projects/dashboard'
import { getProjectParticipations } from '@/lib/projects/project-detail'
import { isCompanyProfileComplete } from '@/lib/company/actions'
import { ProjectDetailClient } from './ProjectDetailClient'

interface ProjectDetailPageProps {
  params: Promise<{ id: string }>
}

/**
 * Detalle de un proyecto del empresario. Server component: reusa el guard de
 * "perfil completo" del dashboard y trae el proyecto (datos reales) más sus
 * participaciones (vía RPC). Si el proyecto no es del empresario o no existe,
 * `getMyPublishedProjects` (RLS) no lo devuelve y respondemos 404.
 */
export default async function ProjectDetailPage({
  params,
}: ProjectDetailPageProps) {
  const { id } = await params
  const locale = await getLocale()

  const complete = await isCompanyProfileComplete()
  if (!complete.ok || !complete.data) {
    redirect(`/${locale}/empresario/formulario-empresa`)
  }

  const projectsResult = await getMyPublishedProjects()
  const project = projectsResult.ok
    ? projectsResult.data.find((proyecto) => proyecto.id === id)
    : undefined
  if (!project) {
    notFound()
  }

  const participationsResult = await getProjectParticipations(id)

  return (
    <ProjectDetailClient
      project={project}
      participationsResult={participationsResult}
    />
  )
}
