import { getTranslations } from 'next-intl/server'
import { GraduationCap, Users } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { PageTitle } from '@/components/features/brand/PageTitle'
import { EmptyState } from '@/components/features/shared/EmptyState'
import { VerifyGraduateButton } from '@/components/features/auth/VerifyGraduateButton'
import { getPendingGraduateVerifications } from '@/lib/admin/queries'

export default async function ValidationsPage() {
  const t = await getTranslations('Admin')
  const result = await getPendingGraduateVerifications()
  const graduates = result.ok ? result.data : []

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <PageTitle
        title={t('graduateVerification')}
        description={t('graduateVerificationDesc')}
        dotColor="text-magenta"
      />

      <div className="mt-8">
        {graduates.length === 0 ? (
          <EmptyState
            title={t('noGraduatesToVerify')}
            description={t('noGraduatesToVerifyDesc')}
            icon={GraduationCap}
          />
        ) : (
          <div className="space-y-3">
            {graduates.map((graduate) => (
              <Card
                key={graduate.id_usuario}
                className="border border-border/80 bg-card/40 backdrop-blur-sm"
              >
                <CardContent className="p-5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-muted text-muted-foreground shrink-0">
                      <Users className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-foreground truncate">
                        {graduate.nombre} {graduate.apellido_1}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {graduate.correo}
                      </p>
                      <p className="text-[10px] font-semibold text-warning mt-0.5">
                        {t('graduatePendingLabel')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <VerifyGraduateButton
                      userId={graduate.id_usuario}
                      userName={`${graduate.nombre} ${graduate.apellido_1}`}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
