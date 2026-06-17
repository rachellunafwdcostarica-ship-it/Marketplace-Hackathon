import { getLocale, getTranslations } from 'next-intl/server'
import { Users, AlertTriangle } from 'lucide-react'
import { PageTitle } from '@/components/features/brand/PageTitle'
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
import { AdminUserFilters } from '@/components/features/admin/AdminUserFilters'
import { AccountStatusActions } from '@/components/features/admin/AccountStatusActions'
import { getCurrentUser } from '@/lib/auth/dal'
import {
  listUsers,
  ADMIN_USER_ROLES,
  ADMIN_ACCOUNT_STATUSES,
  type AdminAccountStatus,
  type ListUsersFilters,
} from '@/lib/admin/queries'

const STATUS_BADGE_CLASS: Record<AdminAccountStatus, string> = {
  activa: 'bg-accent/10 text-accent border-accent/20',
  pendiente: 'bg-warning/10 text-warning border-warning/20',
  suspendida: 'bg-magenta/10 text-magenta border-magenta/20',
  suspendida_severa: 'bg-destructive/10 text-destructive border-destructive/20',
}

interface AdminUsersPageProps {
  searchParams: Promise<{ q?: string; role?: string; status?: string }>
}

export default async function AdminUsersPage({
  searchParams,
}: AdminUsersPageProps) {
  const t = await getTranslations('Admin')
  const locale = await getLocale()
  const params = await searchParams

  const search = params.q?.trim() || undefined
  const role = ADMIN_USER_ROLES.find((value) => value === params.role)
  const status = ADMIN_ACCOUNT_STATUSES.find((value) => value === params.status)

  const filters: ListUsersFilters = {}
  if (search) filters.search = search
  if (role) filters.role = role
  if (status) filters.status = status

  const result = await listUsers(filters)
  const users = result.ok ? result.data : []

  const currentUser = await getCurrentUser()
  const currentUserId = currentUser?.id ?? null

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
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <PageTitle
        title={t('usersManagement')}
        description={t('usersManagementDesc')}
        dotColor="text-magenta"
      />

      <div className="mt-8 space-y-6">
        <AdminUserFilters
          initialSearch={search ?? ''}
          initialRole={role ?? ''}
          initialStatus={status ?? ''}
        />

        {users.length === 0 ? (
          <EmptyState
            title={t('noUsersFound')}
            description={t('noUsersFoundDesc')}
            icon={Users}
          />
        ) : (
          <div className="space-y-4">
            {users.length >= 100 && (
              <div className="flex items-center gap-3 rounded-lg border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-warning-foreground">
                <AlertTriangle className="h-5 w-5 shrink-0 text-warning" />
                <div>
                  <p className="font-semibold">{t('usersLimitWarning')}</p>
                </div>
              </div>
            )}
            <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-gray-100 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                {t('usersCount', { count: users.length })}
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('colName')}</TableHead>
                    <TableHead>{t('colEmail')}</TableHead>
                    <TableHead>{t('colRole')}</TableHead>
                    <TableHead>{t('colStatus')}</TableHead>
                    <TableHead>{t('colRegistered')}</TableHead>
                    <TableHead>{t('colActions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id_usuario}>
                      <TableCell className="font-semibold text-foreground">
                        {user.nombre} {user.apellido_1}
                        {user.apellido_2 ? ` ${user.apellido_2}` : ''}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {user.correo}
                      </TableCell>
                      <TableCell>{roleLabel(user.nombre_rol)}</TableCell>
                      <TableCell>
                        {user.is_active ? (
                          <Badge
                            variant="outline"
                            className={`rounded-full border px-2 text-[10px] font-semibold ${STATUS_BADGE_CLASS[user.estado_cuenta]}`}
                          >
                            {statusLabel(user.estado_cuenta)}
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="rounded-full border border-magenta/20 bg-magenta/10 px-2 text-[10px] font-semibold text-magenta"
                          >
                            {t('accountInactive')}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(user.fecha_registro).toLocaleDateString(
                          locale,
                          { year: 'numeric', month: 'short', day: 'numeric' },
                        )}
                      </TableCell>
                      <TableCell>
                        <AccountStatusActions
                          userId={user.id_usuario}
                          estadoCuenta={user.estado_cuenta}
                          isActive={user.is_active}
                          isSelf={user.id_usuario === currentUserId}
                          userName={`${user.nombre} ${user.apellido_1}`}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
