import { getLocale, getTranslations } from 'next-intl/server'
import { AlertTriangle } from 'lucide-react'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StrikeActions } from '@/components/features/admin/StrikeActions'
import { StrikeAuditHistory } from '@/components/features/admin/StrikeAuditHistory'
import { getCurrentUser } from '@/lib/auth/dal'
import {
  listUsersWithStrikes,
  type AdminAccountStatus,
} from '@/lib/admin/queries'

const STATUS_BADGE_CLASS: Record<AdminAccountStatus, string> = {
  activa: 'bg-accent/10 text-accent border-accent/20',
  pendiente: 'bg-warning/10 text-warning border-warning/20',
  suspendida: 'bg-magenta/10 text-magenta border-magenta/20',
  suspendida_severa: 'bg-destructive/10 text-destructive border-destructive/20',
}

export default async function AdminModerationPage() {
  const t = await getTranslations('Admin')
  const locale = await getLocale()

  const result = await listUsersWithStrikes(1)
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
        title={t('strikeManagement')}
        description={t('strikeManagementDesc')}
        dotColor="text-warning"
      />

      <div className="mt-8 space-y-6">
        <Tabs defaultValue="moderation" className="w-full">
          <TabsList label="Moderación" className="mb-4">
            <TabsTrigger value="moderation">Usuarios Penalizados</TabsTrigger>
            <TabsTrigger value="audit">Historial de Auditoría</TabsTrigger>
          </TabsList>

          <TabsContent value="moderation" className="space-y-6">
            {users.length === 0 ? (
              <EmptyState
                title={t('noUsersWithStrikes')}
                description={t('noUsersWithStrikesDesc')}
                icon={AlertTriangle}
              />
            ) : (
              <div className="rounded-xl border border-border/80 bg-card/40 backdrop-blur-sm">
                <div className="border-b border-border/60 px-4 py-3 text-sm font-semibold text-muted-foreground">
                  {t('usersCount', { count: users.length })}
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('colName')}</TableHead>
                      <TableHead>{t('colEmail')}</TableHead>
                      <TableHead>{t('colRole')}</TableHead>
                      <TableHead>{t('colStatus')}</TableHead>
                      <TableHead className="text-center">
                        {t('colStrikes')}
                      </TableHead>
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
                        <TableCell className="text-center tabular-nums font-semibold text-warning">
                          {user.cantidad_strikes}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(user.fecha_registro).toLocaleDateString(
                            locale,
                            { year: 'numeric', month: 'short', day: 'numeric' },
                          )}
                        </TableCell>
                        <TableCell>
                          <StrikeActions
                            userId={user.id_usuario}
                            userName={`${user.nombre} ${user.apellido_1}`}
                            cantidadStrikes={user.cantidad_strikes}
                            isSelf={user.id_usuario === currentUserId}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="audit">
            <StrikeAuditHistory />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
