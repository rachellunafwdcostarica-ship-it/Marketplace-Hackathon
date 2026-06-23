import { getLocale, getTranslations } from 'next-intl/server'
import {
  Users,
  UserCheck,
  ShieldCheck,
  Power,
  GraduationCap,
  Building2,
  ShieldAlert,
  Briefcase,
  FolderOpen,
  PlayCircle,
  CheckCircle2,
  AlertTriangle,
  Activity,
} from 'lucide-react'
import { PageTitle } from '@/components/features/brand/PageTitle'
import {
  DashboardStats,
  type StatItem,
} from '@/components/features/DashboardStats'
import { AdminReportsInterface } from '@/components/features/admin/AdminReportsInterface'
import { EmptyState } from '@/components/features/shared/EmptyState'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  getUserStats,
  getProjectStats,
  listUsers,
  listAllProjectsForAdmin,
  listAuditoria,
  MAX_USERS_PER_QUERY,
  MAX_AUDIT_ROWS,
  type AdminAccountStatus,
  type AdminUserStats,
  type AdminProjectStats,
} from '@/lib/admin/queries'

const EMPTY_USER_STATS: AdminUserStats = {
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

export default async function AdminReportsPage() {
  const t = await getTranslations('Admin')
  const tBoard = await getTranslations('ProjectsBoard')
  const locale = await getLocale()

  const [
    userStatsResult,
    usersResult,
    projectStatsResult,
    projectsResult,
    auditResult,
  ] = await Promise.all([
    getUserStats(),
    listUsers(),
    getProjectStats(),
    listAllProjectsForAdmin(),
    listAuditoria(),
  ])

  const userStats = userStatsResult.ok ? userStatsResult.data : EMPTY_USER_STATS
  const users = usersResult.ok ? usersResult.data : []
  const projectStats = projectStatsResult.ok
    ? projectStatsResult.data
    : EMPTY_PROJECT_STATS
  const projects = projectsResult.ok ? projectsResult.data : []
  const auditEvents = auditResult.ok ? auditResult.data : []

  const userCards: StatItem[] = [
    {
      title: t('statTotalUsers'),
      value: userStats.total,
      icon: Users,
      description: t('statTotalUsersDesc'),
      colorClass: 'text-primary bg-primary/10',
    },
    {
      title: t('statPendingUsers'),
      value: userStats.pendientes,
      icon: UserCheck,
      description: t('statPendingUsersDesc'),
      colorClass: 'text-warning bg-warning/10',
    },
    {
      title: t('statActiveUsers'),
      value: userStats.activas,
      icon: ShieldCheck,
      description: t('statActiveUsersDesc'),
      colorClass: 'text-accent bg-accent/10',
    },
    {
      title: t('statInactiveUsers'),
      value: userStats.desactivadas,
      icon: Power,
      description: t('statInactiveUsersDesc'),
      colorClass: 'text-destructive bg-destructive/10',
    },
    {
      title: t('statGraduates'),
      value: userStats.egresados,
      icon: GraduationCap,
      description: t('statGraduatesDesc'),
      colorClass: 'text-secondary bg-secondary/10',
    },
    {
      title: t('statCompanyUsers'),
      value: userStats.empresarios,
      icon: Building2,
      description: t('statCompanyUsersDesc'),
      colorClass: 'text-magenta bg-magenta/10',
    },
    {
      title: t('statAdmins'),
      value: userStats.administradores,
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

  const statusLabel = (value: AdminAccountStatus): string => {
    switch (value) {
      case 'pendiente':
        return t('accountStatusPendiente')
      case 'activa':
        return t('accountStatusActiva')
      case 'suspendida':
        return t('accountStatusSuspendida')
      case 'suspendida_severa':
        return t('accountStatusSuspendidaSevera')
    }
  }

  const roleLabel = (nombreRol: string | null): string => {
    switch (nombreRol) {
      case 'administrador':
        return t('roleAdministrador')
      case 'egresado':
        return t('roleEgresado')
      case 'empresario':
        return t('roleEmpresario')
      default:
        return t('roleNone')
    }
  }

  const formatDate = (value: string): string =>
    new Date(value).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })

  return (
    <div className="mx-auto w-full max-w-7xl space-y-10 px-4 py-8 sm:px-6 lg:px-8">
      <PageTitle
        title={t('reportsTitle')}
        description={t('reportsDesc')}
        dotColor="text-primary"
      />

      {/* ── Usuarios: métricas + tabla en pantalla ── */}
      <section className="space-y-6">
        <h2 className="font-heading text-xl font-bold text-foreground">
          {t('reportUsersTitle')}
        </h2>

        <DashboardStats stats={userCards} className="xl:grid-cols-4" />

        <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('colName')}</TableHead>
                <TableHead>{t('colEmail')}</TableHead>
                <TableHead>{t('colRole')}</TableHead>
                <TableHead>{t('colStatus')}</TableHead>
                <TableHead>{t('colRegistered')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id_usuario}>
                  <TableCell className="font-semibold text-ink-strong">
                    {user.nombre} {user.apellido_1}
                    {user.apellido_2 ? ` ${user.apellido_2}` : ''}
                  </TableCell>
                  <TableCell className="text-xs text-ink-muted">
                    {user.correo}
                  </TableCell>
                  <TableCell>{roleLabel(user.nombre_rol)}</TableCell>
                  <TableCell>
                    {user.is_active ? (
                      <Badge
                        variant="outline"
                        className="rounded-full px-2 text-[10px] font-semibold"
                      >
                        {statusLabel(user.estado_cuenta)}
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="rounded-full border-magenta/20 bg-magenta/10 px-2 text-[10px] font-semibold text-magenta"
                      >
                        {t('accountInactive')}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-ink-muted">
                    {formatDate(user.fecha_registro)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {users.length >= MAX_USERS_PER_QUERY && (
          <p className="text-xs text-ink-muted">{t('usersLimitWarning')}</p>
        )}
      </section>

      {/* ── Proyectos: métricas + tabla en pantalla ── */}
      <section className="space-y-6 border-t border-border/40 pt-8">
        <h2 className="font-heading text-xl font-bold text-foreground">
          {t('reportProjectsTitle')}
        </h2>

        <DashboardStats stats={projectCards} className="xl:grid-cols-5" />

        {projects.length === 0 ? (
          <EmptyState
            title={t('noProjects')}
            description={t('noProjectsDesc')}
            icon={Briefcase}
          />
        ) : (
          <>
            <p className="text-xs text-ink-muted">
              {t('projectsCount', { count: projects.length })}
            </p>
            <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('reportColTitle')}</TableHead>
                    <TableHead>{t('reportColCompany')}</TableHead>
                    <TableHead>{t('colStatus')}</TableHead>
                    <TableHead>{t('reportColPublished')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.map((project) => (
                    <TableRow key={project.id_proyecto}>
                      <TableCell className="font-semibold text-ink-strong">
                        {project.titulo}
                      </TableCell>
                      <TableCell className="text-ink-muted">
                        {project.nombre_empresa ?? t('companyUnknown')}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="rounded-full px-2 text-[10px] font-semibold"
                        >
                          {tBoard(`status_${project.estado}`)}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-ink-muted">
                        {project.fecha_publicacion
                          ? formatDate(project.fecha_publicacion)
                          : t('notPublished')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </section>

      {/* ── Actividad: tabla de auditoría reciente ── */}
      <section className="space-y-6 border-t border-border/40 pt-8">
        <h2 className="font-heading text-xl font-bold text-foreground">
          {t('reportActivityTitle')}
        </h2>

        {auditEvents.length === 0 ? (
          <EmptyState
            title={t('reportNoActivity')}
            description={t('reportNoActivityDesc')}
            icon={Activity}
          />
        ) : (
          <>
            <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('reportColDate')}</TableHead>
                    <TableHead>{t('reportColActor')}</TableHead>
                    <TableHead>{t('reportColAction')}</TableHead>
                    <TableHead>{t('reportColEntity')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditEvents.map((event) => (
                    <TableRow key={event.id_auditoria}>
                      <TableCell className="whitespace-nowrap text-xs text-ink-muted">
                        {formatDate(event.ocurrida_at)}
                      </TableCell>
                      <TableCell className="text-ink-strong">
                        {event.actor_nombre ?? t('reportAuditSystem')}
                      </TableCell>
                      <TableCell className="text-xs text-ink">
                        {event.accion}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="rounded-full px-2 text-[10px] font-semibold"
                        >
                          {event.entidad}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {auditEvents.length >= MAX_AUDIT_ROWS && (
              <p className="text-xs text-ink-muted">
                {t('reportActivityLimit', { limit: MAX_AUDIT_ROWS })}
              </p>
            )}
          </>
        )}
      </section>

      {/* ── Exportación CSV (todas las entidades) ── */}
      <section className="space-y-6 border-t border-border/40 pt-8">
        <AdminReportsInterface />
      </section>
    </div>
  )
}
