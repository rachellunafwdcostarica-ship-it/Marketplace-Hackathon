import { getLocale, getTranslations } from 'next-intl/server'
import { Briefcase } from 'lucide-react'
import { PageTitle } from '@/components/features/brand/PageTitle'
import { ProjectCard } from '@/components/features/marketplace/ProjectCard'
import { EmptyState } from '@/components/features/shared/EmptyState'
import { Badge } from '@/components/ui/badge'
import {
  listAllProjectsForAdmin,
  type AdminProjectListItem,
} from '@/lib/admin/queries'
import type { Database } from '@/types/database'
import type { Project, ProjectStatus } from '@/types'

type EstadoProyecto = Database['public']['Enums']['estado_proyecto_enum']

const DAY_MS = 86_400_000

const ESTADO_BADGE_CLASS: Record<EstadoProyecto, string> = {
  borrador: 'bg-muted text-muted-foreground border-border',
  abierto: 'bg-accent/10 text-accent border-accent/20',
  en_recepcion: 'bg-warning/10 text-warning border-warning/20',
  adjudicado: 'bg-primary/10 text-primary border-primary/20',
  en_desarrollo: 'bg-secondary/10 text-secondary border-secondary/20',
  finalizado: 'bg-highlight/10 text-highlight-foreground border-highlight/30',
  cancelado: 'bg-destructive/10 text-destructive border-destructive/20',
}

function estadoToStatus(estado: EstadoProyecto): ProjectStatus {
  switch (estado) {
    case 'borrador':
      return 'draft'
    case 'finalizado':
    case 'cancelado':
      return 'closed'
    default:
      return 'active'
  }
}

export default async function AdminProjectsPage() {
  const t = await getTranslations('Admin')
  const tBoard = await getTranslations('ProjectsBoard')
  const locale = await getLocale()

  const result = await listAllProjectsForAdmin()
  const projects = result.ok ? result.data : []

  const formatCurrency = (amount: number, moneda: string): string =>
    new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: moneda,
      maximumFractionDigits: 0,
    }).format(amount)

  const budgetLabelOf = (
    min: number | null,
    max: number | null,
    moneda: string,
  ): string => {
    if (min !== null && max !== null) {
      return `${formatCurrency(min, moneda)} – ${formatCurrency(max, moneda)}`
    }
    if (min !== null) {
      return t('budgetFrom', { amount: formatCurrency(min, moneda) })
    }
    if (max !== null) {
      return t('budgetTo', { amount: formatCurrency(max, moneda) })
    }
    return t('budgetNone')
  }

  const durationOf = (pub: string | null, cierre: string | null): string => {
    if (pub === null || cierre === null) {
      return t('notSet')
    }
    const days = Math.max(
      0,
      Math.round(
        (new Date(cierre).getTime() - new Date(pub).getTime()) / DAY_MS,
      ),
    )
    return t('openWindowDays', { days })
  }

  const startDateOf = (pub: string | null): string =>
    pub === null
      ? t('notPublished')
      : new Date(pub).toLocaleDateString(locale, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })

  const toProject = (p: AdminProjectListItem): Project => ({
    id: p.id_proyecto,
    title: p.titulo,
    companyId: p.id_empresario,
    companyName: p.nombre_empresa ?? t('companyUnknown'),
    description: p.descripcion,
    stack: p.tecnologias,
    duration: durationOf(p.fecha_publicacion, p.fecha_cierre),
    budget: p.presupuesto_max ?? p.presupuesto_min ?? 0,
    mode: p.modalidad,
    startDate: startDateOf(p.fecha_publicacion),
    status: estadoToStatus(p.estado),
    createdAt: p.fecha_publicacion ?? '',
  })

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <PageTitle
        title={t('allProjects')}
        description={t('allProjectsDesc')}
        dotColor="text-magenta"
      />

      {projects.length === 0 ? (
        <EmptyState
          title={t('noProjects')}
          description={t('noProjectsDesc')}
          icon={Briefcase}
        />
      ) : (
        <div className="space-y-6">
          <p className="text-sm font-semibold text-muted-foreground">
            {t('projectsCount', { count: projects.length })}
          </p>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard
                key={project.id_proyecto}
                project={toProject(project)}
                budgetLabel={budgetLabelOf(
                  project.presupuesto_min,
                  project.presupuesto_max,
                  project.moneda,
                )}
                actionButton={
                  <Badge
                    variant="outline"
                    className={`w-full justify-center rounded-full border px-2 py-1.5 text-xs font-semibold ${ESTADO_BADGE_CLASS[project.estado]}`}
                  >
                    {tBoard(`status_${project.estado}`)}
                  </Badge>
                }
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
