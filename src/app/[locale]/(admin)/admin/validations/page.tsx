import { getLocale, getTranslations } from 'next-intl/server'
import { GraduationCap, Users, Building2 } from 'lucide-react'
import { Link } from '@/i18n/routing'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageTitle } from '@/components/features/brand/PageTitle'
import { EmptyState } from '@/components/features/shared/EmptyState'
import { GraduateVerificationActions } from '@/components/features/auth/GraduateVerificationActions'
import { CompanyVerificationActions } from '@/components/features/companies/CompanyVerificationActions'
import {
  listGraduateVerifications,
  listCompanyVerifications,
  ADMIN_VERIFICATION_STATES,
  type AdminVerificationState,
  type GraduateVerificationItem,
  type CompanyVerificationItem,
} from '@/lib/admin/queries'
import { cn } from '@/lib/utils/cn'

const TABS = ['egresados', 'empresas'] as const
type ValidationTab = (typeof TABS)[number]

interface ValidationsPageProps {
  searchParams: Promise<{ tab?: string; estado?: string }>
}

export default async function ValidationsPage({
  searchParams,
}: ValidationsPageProps) {
  const t = await getTranslations('Admin')
  const locale = await getLocale()
  const params = await searchParams

  const tab: ValidationTab =
    TABS.find((value) => value === params.tab) ?? 'egresados'
  const estado: AdminVerificationState =
    ADMIN_VERIFICATION_STATES.find((value) => value === params.estado) ??
    'pendiente'

  let graduates: GraduateVerificationItem[] = []
  let companies: CompanyVerificationItem[] = []
  if (tab === 'empresas') {
    const result = await listCompanyVerifications(estado)
    companies = result.ok ? result.data : []
  } else {
    const result = await listGraduateVerifications(estado)
    graduates = result.ok ? result.data : []
  }

  const hrefFor = (
    nextTab: ValidationTab,
    nextEstado: AdminVerificationState,
  ) => `/admin/validations?tab=${nextTab}&estado=${nextEstado}`

  const tabClass = (isActive: boolean) =>
    cn(
      '-mb-px border-b-2 px-4 py-2 text-sm font-semibold transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)]',
      isActive
        ? 'border-primary text-primary'
        : 'border-transparent text-muted-foreground hover:text-foreground',
    )

  const estadoPill = (isActive: boolean) =>
    cn(
      'rounded-full px-3 py-1 text-xs font-semibold transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)]',
      isActive
        ? 'bg-primary/10 text-primary'
        : 'text-muted-foreground hover:text-foreground',
    )

  const estadoLabel = (value: AdminVerificationState): string =>
    value === 'pendiente'
      ? t('filterStatePendiente')
      : value === 'verificado'
        ? t('filterStateVerificado')
        : t('filterStateRechazado')

  const companyTypeLabel = (
    tipo: CompanyVerificationItem['tipo_empresario'],
  ): string =>
    tipo === 'empresa_formal'
      ? t('companyTypeFormal')
      : t('companyTypeEntrepreneur')

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })

  // Badge de estado para el historial (verificado/rechazado). Pendiente muestra
  // acciones en lugar de badge.
  const stateBadge = (value: AdminVerificationState) => {
    if (value === 'verificado') {
      return (
        <Badge
          variant="outline"
          className="rounded-full border-accent/20 bg-accent/10 px-2 text-[10px] font-semibold text-accent"
        >
          {t('stateVerificado')}
        </Badge>
      )
    }
    if (value === 'rechazado') {
      return (
        <Badge
          variant="outline"
          className="rounded-full border-magenta/20 bg-magenta/10 px-2 text-[10px] font-semibold text-magenta"
        >
          {t('stateRechazado')}
        </Badge>
      )
    }
    return null
  }

  const isEmpty =
    tab === 'empresas' ? companies.length === 0 : graduates.length === 0

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <PageTitle
        title={t('validationsHub')}
        description={t('validationsHubDesc')}
        dotColor="text-magenta"
      />

      <div className="mt-6 flex gap-1 border-b border-border/60">
        <Link
          href={hrefFor('egresados', estado)}
          className={tabClass(tab === 'egresados')}
        >
          {t('tabGraduates')}
        </Link>
        <Link
          href={hrefFor('empresas', estado)}
          className={tabClass(tab === 'empresas')}
        >
          {t('tabCompanies')}
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap gap-1">
        {ADMIN_VERIFICATION_STATES.map((value) => (
          <Link
            key={value}
            href={hrefFor(tab, value)}
            className={estadoPill(estado === value)}
          >
            {estadoLabel(value)}
          </Link>
        ))}
      </div>

      <div className="mt-8">
        {isEmpty ? (
          <EmptyState
            title={t('noVerificationResults')}
            description={t('noVerificationResultsDesc')}
            icon={tab === 'empresas' ? Building2 : GraduationCap}
          />
        ) : tab === 'empresas' ? (
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
                        {company.nombre_empresa ||
                          `${company.nombre} ${company.apellido_1}`}
                      </p>
                      <Badge
                        variant="outline"
                        className="rounded-full border-secondary/20 bg-secondary/10 px-2 text-[10px] font-semibold text-secondary"
                      >
                        {companyTypeLabel(company.tipo_empresario)}
                      </Badge>
                    </div>

                    {company.tipo_empresario === 'empresa_formal' ? (
                      <>
                        <p className="text-xs text-muted-foreground">
                          {company.sector ? `${company.sector} · ` : ''}
                          {t('companyCedula')}: {company.cedula || '—'}
                        </p>
                        {company.sitio_web && (
                          <p className="text-xs text-muted-foreground">
                            {t('companyWebsite')}:{' '}
                            <a
                              href={company.sitio_web}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              {company.sitio_web}
                            </a>
                          </p>
                        )}
                        <p className="text-[11px] text-muted-foreground/80">
                          {t('companyRepresentative')}: {company.nombre}{' '}
                          {company.apellido_1} · {company.correo}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-xs text-muted-foreground">
                          {t('companyRepresentative')}: {company.nombre}{' '}
                          {company.apellido_1} · {company.correo}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t('companyCedula')}: {company.cedula || '—'}
                          {company.fecha_nacimiento
                            ? ` · ${t('companyBirthdate')}: ${formatDate(company.fecha_nacimiento)}`
                            : ''}
                        </p>
                      </>
                    )}
                  </div>

                  {estado === 'pendiente' ? (
                    <CompanyVerificationActions
                      idEmpresario={company.id_empresario}
                      companyName={company.nombre_empresa || company.correo}
                      tipoEmpresario={company.tipo_empresario}
                    />
                  ) : (
                    stateBadge(estado)
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {graduates.map((graduate) => (
              <Card
                key={graduate.id_usuario}
                className="border border-border/80 bg-card/40 backdrop-blur-sm"
              >
                <CardContent className="p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-muted text-muted-foreground shrink-0">
                      <Users className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-sm text-foreground truncate">
                          {graduate.nombre} {graduate.apellido_1}
                          {graduate.apellido_2 ? ` ${graduate.apellido_2}` : ''}
                        </p>
                        {graduate.titulo_fwd && (
                          <Badge
                            variant="outline"
                            className="rounded-full border-primary/20 bg-primary/10 px-2 text-[10px] font-semibold capitalize text-primary"
                          >
                            {graduate.titulo_fwd}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {graduate.correo}
                      </p>
                      {graduate.fecha_nacimiento && (
                        <p className="text-xs text-muted-foreground">
                          {t('companyBirthdate')}:{' '}
                          {formatDate(graduate.fecha_nacimiento)}
                        </p>
                      )}
                    </div>
                  </div>

                  {estado === 'pendiente' ? (
                    <GraduateVerificationActions
                      userId={graduate.id_usuario}
                      userName={`${graduate.nombre} ${graduate.apellido_1}`}
                    />
                  ) : (
                    stateBadge(estado)
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
