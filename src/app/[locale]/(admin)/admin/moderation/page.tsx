import { getLocale, getTranslations } from 'next-intl/server'
import { AlertTriangle, ShieldAlert, ShieldX, ShieldCheck } from 'lucide-react'
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
  MAX_STRIKES_LIMIT,
} from '@/lib/admin/queries'

// ── Risk-level helpers ────────────────────────────────────────────────────────

type RiskLevel = 'salvable' | 'suspendido' | 'expulsion'

function getRiskLevel(strikes: number, estado: AdminAccountStatus): RiskLevel {
  if (estado === 'suspendida_severa') return 'expulsion'
  if (strikes >= MAX_STRIKES_LIMIT || estado === 'suspendida')
    return 'suspendido'
  return 'salvable'
}

const RISK_CONFIG: Record<
  RiskLevel,
  { label: string; icon: React.ElementType; className: string }
> = {
  salvable: {
    label: 'Se puede salvar',
    icon: ShieldCheck,
    className: 'bg-accent/10 text-accent border-accent/20',
  },
  suspendido: {
    label: 'Suspendido',
    icon: ShieldAlert,
    className: 'bg-warning/10 text-warning border-warning/20',
  },
  expulsion: {
    label: 'Expulsión',
    icon: ShieldX,
    className: 'bg-destructive/10 text-destructive border-destructive/20',
  },
}

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_BADGE_CLASS: Record<AdminAccountStatus, string> = {
  activa: 'bg-accent/10 text-accent border-accent/20',
  pendiente: 'bg-warning/10 text-warning border-warning/20',
  suspendida: 'bg-magenta/10 text-magenta border-magenta/20',
  suspendida_severa: 'bg-destructive/10 text-destructive border-destructive/20',
}

// ─────────────────────────────────────────────────────────────────────────────

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

      <div className="mt-6 space-y-6">
        <Tabs defaultValue="moderation" className="w-full">
          <TabsList label="Moderación" className="mb-4">
            <TabsTrigger value="moderation">
              Usuarios Penalizados
              {users.length > 0 && (
                <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-warning/20 px-1 text-[9px] font-bold text-warning">
                  {users.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="audit">Historial de Auditoría</TabsTrigger>
          </TabsList>

          {/* ── Tab: Usuarios Penalizados ── */}
          <TabsContent value="moderation" className="space-y-6">
            {users.length === 0 ? (
              <EmptyState
                title={t('noUsersWithStrikes')}
                description={t('noUsersWithStrikesDesc')}
                icon={AlertTriangle}
              />
            ) : (
              <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
                {/* Sub-header */}
                <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    {t('usersCount', { count: users.length })} con strikes
                    activos
                  </span>
                  <span className="flex items-center gap-3 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-accent" /> Se
                      puede salvar (1–{MAX_STRIKES_LIMIT - 1})
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-warning" />{' '}
                      Suspendido (≥{MAX_STRIKES_LIMIT})
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-destructive" />{' '}
                      Expulsión
                    </span>
                  </span>
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
                      <TableHead>Nivel de riesgo</TableHead>
                      <TableHead>{t('colRegistered')}</TableHead>
                      <TableHead>{t('colActions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => {
                      const riskLevel = getRiskLevel(
                        user.cantidad_strikes,
                        user.estado_cuenta,
                      )
                      const risk = RISK_CONFIG[riskLevel]
                      const RiskIcon = risk.icon

                      return (
                        <TableRow key={user.id_usuario}>
                          {/* Nombre */}
                          <TableCell className="font-semibold text-foreground">
                            {user.nombre} {user.apellido_1}
                            {user.apellido_2 ? ` ${user.apellido_2}` : ''}
                          </TableCell>

                          {/* Correo */}
                          <TableCell className="text-muted-foreground text-xs">
                            {user.correo}
                          </TableCell>

                          {/* Rol */}
                          <TableCell>{roleLabel(user.nombre_rol)}</TableCell>

                          {/* Estado de cuenta */}
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

                          {/* Cantidad strikes */}
                          <TableCell className="text-center">
                            <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-warning/10 text-sm font-bold tabular-nums text-warning">
                              {user.cantidad_strikes}
                            </span>
                          </TableCell>

                          {/* Nivel de riesgo */}
                          <TableCell>
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${risk.className}`}
                            >
                              <RiskIcon className="h-3.5 w-3.5 shrink-0" />
                              {risk.label}
                            </span>
                          </TableCell>

                          {/* Fecha registro */}
                          <TableCell className="text-muted-foreground text-xs">
                            {new Date(user.fecha_registro).toLocaleDateString(
                              locale,
                              {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              },
                            )}
                          </TableCell>

                          {/* Acciones */}
                          <TableCell>
                            <StrikeActions
                              userId={user.id_usuario}
                              userName={`${user.nombre} ${user.apellido_1}`}
                              cantidadStrikes={user.cantidad_strikes}
                              isSelf={user.id_usuario === currentUserId}
                            />
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* ── Tab: Historial de Auditoría ── */}
          <TabsContent value="audit">
            <StrikeAuditHistory />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
