import { notFound, redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getLocale, getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/routing'
import { CompanyShell } from '@/components/layout/CompanyShell'
import { SidebarEmpresaNuevo } from '@/components/layout/SidebarEmpresaNuevo'
import { PageTitle } from '@/components/features/brand/PageTitle'
import { EntregablesEmpresario } from '@/components/features/deliverables/EntregablesEmpresario'
import { getMyPublishedProjects } from '@/lib/projects/dashboard'
import { getEntregablesDeProyecto } from '@/lib/deliverables/queries'
import { getProjectParticipations } from '@/lib/projects/project-detail'
import { isCompanyProfileComplete } from '@/lib/company/actions'

interface ProjectEntregablesPageProps {
  params: Promise<{ id: string }>
}

/**
 * Vista enfocada de los entregables de una contratación (RF-43). Se llega desde
 * "Mis Contrataciones" y muestra SOLO los entregables del egresado contratado
 * para este proyecto, sin la consola de gestión (participaciones, avance de
 * estado) que vive en /empresario/proyecto/[id].
 */
export default async function ProjectEntregablesPage({
  params,
}: ProjectEntregablesPageProps) {
  const { id } = await params
  const locale = await getLocale()
  const t = await getTranslations('EmpresaPerfil')

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

  const [entregablesResult, participationsResult] = await Promise.all([
    getEntregablesDeProyecto(id),
    getProjectParticipations(id),
  ])

  // Identidad del egresado contratado para encabezar la página. El RPC ya
  // reimpone que el llamante sea el empresario dueño del proyecto.
  const contratado = participationsResult.ok
    ? participationsResult.data.find(
        (p) => p.estado === 'contratada' || p.estado === 'finalizada',
      )
    : undefined
  const egresadoNombre = contratado
    ? `${contratado.estudianteNombre} ${contratado.estudianteApellidos}`
    : null

  return (
    <CompanyShell>
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col lg:flex-row gap-8">
        <SidebarEmpresaNuevo />

        <main className="flex-1 space-y-8">
          <Link
            href="/empresario/contrataciones"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-primary transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)]"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('backToContrataciones')}
          </Link>

          <PageTitle
            title={project.titulo}
            description={
              egresadoNombre
                ? t('entregablesPageDescEgresado', { nombre: egresadoNombre })
                : t('entregablesPageDesc')
            }
            dotColor="text-accent"
          />

          <EntregablesEmpresario entregablesResult={entregablesResult} />
        </main>
      </div>
    </CompanyShell>
  )
}
