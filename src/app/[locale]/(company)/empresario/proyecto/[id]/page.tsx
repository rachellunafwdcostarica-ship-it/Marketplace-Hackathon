import { notFound, redirect } from 'next/navigation'
import { getLocale } from 'next-intl/server'
import { getMyPublishedProjects } from '@/lib/projects/dashboard'
import { getProjectParticipations } from '@/lib/projects/project-detail'
import { getEntregablesDeProyecto } from '@/lib/deliverables/queries'
import { isCompanyProfileComplete } from '@/lib/company/actions'
import { ProjectDetailClient } from './ProjectDetailClient'

interface ProjectDetailPageProps {
  params: Promise<{ id: string }>
}

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

  const [participationsResult, entregablesResult] = await Promise.all([
    getProjectParticipations(id),
    getEntregablesDeProyecto(id),
  ])

  return (
    <ProjectDetailClient
      project={project}
      participationsResult={participationsResult}
      entregablesResult={entregablesResult}
    />
  )
}
