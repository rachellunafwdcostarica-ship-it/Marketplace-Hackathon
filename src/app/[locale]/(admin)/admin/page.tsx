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
} from 'lucide-react'
import { PageTitle } from '@/components/features/brand/PageTitle'
import {
  DashboardStats,
  type StatItem,
} from '@/components/features/DashboardStats'
import { getUserStats, type AdminUserStats } from '@/lib/admin/queries'

const EMPTY_STATS: AdminUserStats = {
  total: 0,
  pendientes: 0,
  activas: 0,
  desactivadas: 0,
  egresados: 0,
  empresarios: 0,
  administradores: 0,
}

export default async function AdminDashboardPage() {
  const t = await getTranslations('Admin')
  const result = await getUserStats()
  const stats = result.ok ? result.data : EMPTY_STATS

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

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <PageTitle
        title={t('dashboard')}
        description={t('dashboardOverviewDesc')}
        dotColor="text-magenta"
      />

      <DashboardStats stats={cards} className="xl:grid-cols-4" />

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
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
