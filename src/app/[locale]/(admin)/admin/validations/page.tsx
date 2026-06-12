import { getTranslations } from 'next-intl/server'
import { UserCheck, Users } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { PageTitle } from '@/components/features/brand/PageTitle'
import { EmptyState } from '@/components/features/shared/EmptyState'
import { ApproveUserButton } from '@/components/features/auth/ApproveUserButton'
import { VerifyGraduateButton } from '@/components/features/auth/VerifyGraduateButton'
import { getPendingUsers } from '@/lib/admin/queries'

export default async function ValidationsPage() {
  const t = await getTranslations('Admin')
  const result = await getPendingUsers()
  const pendingUsers = result.ok ? result.data : []

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageTitle
          title={t('pendingUsers')}
          description={t('pendingUsersDesc')}
          dotColor="text-magenta"
        />

        <div className="mt-8">
          {pendingUsers.length === 0 ? (
            <EmptyState
              title={t('noPendingUsers')}
              description={t('noPendingUsersDesc')}
              icon={UserCheck}
            />
          ) : (
            <div className="space-y-3">
              {pendingUsers.map((user) => (
                <Card
                  key={user.id_usuario}
                  className="border border-border/80 bg-card/40 backdrop-blur-sm"
                >
                  <CardContent className="p-5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-lg bg-muted text-muted-foreground shrink-0">
                        <Users className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-foreground truncate">
                          {user.nombre} {user.apellido_1}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {user.correo}
                        </p>
                        <p className="text-[10px] font-semibold text-warning mt-0.5">
                          {t('statusPending')}
                          {user.id_rol === null && (
                            <span className="ml-2 text-muted-foreground/60">
                              — {t('noRoleYet')}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <ApproveUserButton
                        userId={user.id_usuario}
                        userName={`${user.nombre} ${user.apellido_1}`}
                      />
                      <VerifyGraduateButton
                        userId={user.id_usuario}
                        userName={`${user.nombre} ${user.apellido_1}`}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
