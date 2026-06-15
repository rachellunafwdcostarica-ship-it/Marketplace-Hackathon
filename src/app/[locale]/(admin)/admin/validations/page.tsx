import { getTranslations } from 'next-intl/server'
import { GraduationCap, Users, Building2 } from 'lucide-react'
import { Link } from '@/i18n/routing'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageTitle } from '@/components/features/brand/PageTitle'
import { EmptyState } from '@/components/features/shared/EmptyState'
import { VerifyGraduateButton } from '@/components/features/auth/VerifyGraduateButton'
import { CompanyVerificationActions } from '@/components/features/companies/CompanyVerificationActions'
import {
  getPendingGraduateVerifications,
  getPendingCompanies,
  type PendingGraduate,
  type PendingCompany,
} from '@/lib/admin/queries'
import { cn } from '@/lib/utils/cn'

const TABS = ['egresados', 'empresas'] as const
type ValidationTab = (typeof TABS)[number]

interface ValidationsPageProps {
  searchParams: Promise<{ tab?: string }>
}

export default async function ValidationsPage({
  searchParams,
}: ValidationsPageProps) {
  const t = await getTranslations('Admin')
  const params = await searchParams
  const tab: ValidationTab =
    TABS.find((value) => value === params.tab) ?? 'egresados'

  let graduates: PendingGraduate[] = []
  let companies: PendingCompany[] = []
  if (tab === 'empresas') {
    const result = await getPendingCompanies()
    companies = result.ok ? result.data : []
  } else {
    const result = await getPendingGraduateVerifications()
    graduates = result.ok ? result.data : []
  }

  const tabClass = (isActive: boolean) =>
    cn(
      '-mb-px border-b-2 px-4 py-2 text-sm font-semibold transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)]',
      isActive
        ? 'border-primary text-primary'
        : 'border-transparent text-muted-foreground hover:text-foreground',
    )

  const companyTypeLabel = (tipo: PendingCompany['tipo_empresario']): string =>
    tipo === 'empresa_formal'
      ? t('companyTypeFormal')
      : t('companyTypeEntrepreneur')

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <PageTitle
        title={t('validationsHub')}
        description={t('validationsHubDesc')}
        dotColor="text-magenta"
      />

      <div className="mt-6 flex gap-1 border-b border-border/60">
        <Link
          href="/admin/validations?tab=egresados"
          className={tabClass(tab === 'egresados')}
        >
          {t('tabGraduates')}
        </Link>
        <Link
          href="/admin/validations?tab=empresas"
          className={tabClass(tab === 'empresas')}
        >
          {t('tabCompanies')}
        </Link>
      </div>

      <div className="mt-8">
        {tab === 'empresas' ? (
          companies.length === 0 ? (
            <EmptyState
              title={t('noCompaniesToVerify')}
              description={t('noCompaniesToVerifyDesc')}
              icon={Building2}
            />
          ) : (
            <div className="space-y-3">
              {companies.map((company) => (
                <Card
                  key={company.id_empresario}
                  className="border border-border/80 bg-card/40 backdrop-blur-sm"
                >
                  <CardContent className="p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-sm text-foreground truncate">
                          {company.nombre_empresa || company.correo}
                        </p>
                        <Badge
                          variant="outline"
                          className="rounded-full border-secondary/20 bg-secondary/10 px-2 text-[10px] font-semibold text-secondary"
                        >
                          {companyTypeLabel(company.tipo_empresario)}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {company.sector ? `${company.sector} · ` : ''}
                        {t('companyCedula')}: {company.cedula || '—'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t('companyRepresentative')}: {company.nombre}{' '}
                        {company.apellido_1} · {company.correo}
                      </p>
                    </div>

                    <CompanyVerificationActions
                      idEmpresario={company.id_empresario}
                      companyName={company.nombre_empresa || company.correo}
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        ) : graduates.length === 0 ? (
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
