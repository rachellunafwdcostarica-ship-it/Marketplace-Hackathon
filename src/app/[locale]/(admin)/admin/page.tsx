import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/routing'
import {
  Users,
  UserCheck,
  ShieldCheck,
  Power,
  GraduationCap,
  Building2,
  ShieldAlert,
  ArrowRight,
  Briefcase,
  FolderOpen,
  PlayCircle,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'
import { PageTitle } from '@/components/features/brand/PageTitle'
import {
  DashboardStats,
  type StatItem,
} from '@/components/features/DashboardStats'
import {
  getUserStats,
  getProjectStats,
  type AdminUserStats,
  type AdminProjectStats,
} from '@/lib/admin/queries'

const EMPTY_STATS: AdminUserStats = {
  total: 0,
  pendientes: 0,
  activas: 0,
  desactivadas: 0,
  egresados: 0,
  empresarios: 0,
  administradores: 0,
}

const EMPTY_PROJECT_STATS: AdminProjectStats = {
  total: 0,
  borrador: 0,
  abierto: 0,
  en_recepcion: 0,
  adjudicado: 0,
  en_desarrollo: 0,
  finalizado: 0,
  cancelado: 0,
}

export default async function AdminDashboardPage() {
  const t = await getTranslations('Admin')
  
  const [userStatsResult, projectStatsResult] = await Promise.all([
    getUserStats(),
    getProjectStats(),
  ])

  const stats = userStatsResult.ok ? userStatsResult.data : EMPTY_STATS
  const projectStats = projectStatsResult.ok ? projectStatsResult.data : EMPTY_PROJECT_STATS

  const cards: StatItem[] = [
    {
      title: t('statTotalUsers'),
      value: stats.total,
      icon: Users,
      description: t('statTotalUsersDesc'),
      colorClass: 'text-primary bg-primary/10',
    },
    {
      title: t('statPendingUsers'),
      value: stats.pendientes,
      icon: UserCheck,
      description: t('statPendingUsersDesc'),
      colorClass: 'text-warning bg-warning/10',
    },
    {
      title: t('statActiveUsers'),
      value: stats.activas,
      icon: ShieldCheck,
      description: t('statActiveUsersDesc'),
      colorClass: 'text-accent bg-accent/10',
    },
    {
      title: t('statInactiveUsers'),
      value: stats.desactivadas,
      icon: Power,
      description: t('statInactiveUsersDesc'),
      colorClass: 'text-destructive bg-destructive/10',
    },
    {
      title: t('statGraduates'),
      value: stats.egresados,
      icon: GraduationCap,
      description: t('statGraduatesDesc'),
      colorClass: 'text-secondary bg-secondary/10',
    },
    {
      title: t('statCompanyUsers'),
      value: stats.empresarios,
      icon: Building2,
      description: t('statCompanyUsersDesc'),
      colorClass: 'text-magenta bg-magenta/10',
    },
    {
      title: t('statAdmins'),
      value: stats.administradores,
      icon: ShieldAlert,
      description: t('statAdminsDesc'),
      colorClass: 'text-highlight bg-highlight/10',
    },
  ]

  const projectCards: StatItem[] = [
    {
      title: t('statTotalProjects'),
      value: projectStats.total,
      icon: Briefcase,
      description: t('statTotalProjectsDesc'),
      colorClass: 'text-primary bg-primary/10',
    },
    {
      title: t('statOpenProjects'),
      value: projectStats.abierto,
      icon: FolderOpen,
      description: t('statOpenProjectsDesc'),
      colorClass: 'text-accent bg-accent/10',
    },
    {
      title: t('statActiveProjects'),
      value: projectStats.en_desarrollo,
      icon: PlayCircle,
      description: t('statActiveProjectsDesc'),
      colorClass: 'text-secondary bg-secondary/10',
    },
    {
      title: t('statFinishedProjects'),
      value: projectStats.finalizado,
      icon: CheckCircle2,
      description: t('statFinishedProjectsDesc'),
      colorClass: 'text-highlight bg-highlight/10',
    },
    {
      title: t('statCancelledProjects'),
      value: projectStats.cancelado,
      icon: AlertTriangle,
      description: t('statCancelledProjectsDesc'),
      colorClass: 'text-destructive bg-destructive/10',
    },
  ]

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-10">
      <div>
        <PageTitle
          title={t('dashboard')}
          description={t('dashboardOverviewDesc')}
          dotColor="text-magenta"
        />

        <DashboardStats stats={cards} className="xl:grid-cols-4 mt-6" />
      </div>

      <div className="border-t border-border/40 pt-8">
        <h2 className="text-xl font-bold font-heading text-foreground mb-4">
          {t('projectStatsTitle')}
        </h2>
        <DashboardStats stats={projectCards} className="xl:grid-cols-5" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link
          href="/admin/validations"
          className="group flex items-center justify-between rounded-xl border border-border/80 bg-card/40 p-5 backdrop-blur-sm transition-colors hover:border-warning/40"
        >
          <span className="flex items-center gap-3">
            <span className="rounded-lg bg-warning/10 p-2.5 text-warning">
              <UserCheck className="h-5 w-5" />
            </span>
            <span className="font-semibold text-foreground">
              {t('goToValidations')} ({stats.pendientes})
            </span>
          </span>
          <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </Link>

        <Link
          href="/admin/users"
          className="group flex items-center justify-between rounded-xl border border-border/80 bg-card/40 p-5 backdrop-blur-sm transition-colors hover:border-primary/40"
        >
          <span className="flex items-center gap-3">
            <span className="rounded-lg bg-primary/10 p-2.5 text-primary">
              <Users className="h-5 w-5" />
            </span>
            <span className="font-semibold text-foreground">
              {t('goToUsers')}
            </span>
          </span>
          <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  )
}
