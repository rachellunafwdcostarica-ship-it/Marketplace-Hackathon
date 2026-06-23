import { getLocale, getTranslations } from 'next-intl/server'
import {
  Users,
  UserCheck,
  ShieldCheck,
  Power,
  GraduationCap,
  Building2,
  ShieldAlert,
} from 'lucide-react'
import { PageTitle } from '@/components/features/brand/PageTitle'
import {
  DashboardStats,
  type StatItem,
} from '@/components/features/DashboardStats'
import { AdminReportsInterface } from '@/components/features/admin/AdminReportsInterface'
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
  listUsers,
  MAX_USERS_PER_QUERY,
  type AdminAccountStatus,
  type AdminUserStats,
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

export default async function AdminReportsPage() {
  const t = await getTranslations('Admin')
  const locale = await getLocale()

  const [statsResult, usersResult] = await Promise.all([
    getUserStats(),
    listUsers(),
  ])
  const stats = statsResult.ok ? statsResult.data : EMPTY_USER_STATS
  const users = usersResult.ok ? usersResult.data : []

  const userCards: StatItem[] = [
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
                    {new Date(user.fecha_registro).toLocaleDateString(locale, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
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

      {/* ── Exportación CSV (todas las entidades) ── */}
      <section className="space-y-6 border-t border-border/40 pt-8">
        <AdminReportsInterface />
      </section>
    </div>
  )
}
