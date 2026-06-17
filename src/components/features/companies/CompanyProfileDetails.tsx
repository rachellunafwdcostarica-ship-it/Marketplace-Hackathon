'use client'

import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'
import type { CompanyProfileView } from '@/lib/company/schemas'

interface CompanyProfileDetailsProps {
  profile: CompanyProfileView
  projectsCount: number
}

const SCOPE_KEY = {
  nacional: 'scopeNacional',
  internacional: 'scopeInternacional',
  ambos: 'scopeAmbos',
} as const

const VERIF_KEY = {
  pendiente: 'verifPendiente',
  verificado: 'verifVerificado',
  rechazado: 'verifRechazado',
} as const

/**
 * Detalle del perfil del empresario (identidad). SOLO datos reales de la BD
 * (empresarios + usuarios). Los proyectos NO se listan acá: viven en el
 * dashboard; esta sección solo muestra el conteo con un link al panel.
 */
export function CompanyProfileDetails({
  profile,
  projectsCount,
}: CompanyProfileDetailsProps) {
  const t = useTranslations('EmpresaPerfil')
  const tE = useTranslations('Empresa')

  const fullName = [profile.firstName, profile.lastName1, profile.lastName2]
    .filter(Boolean)
    .join(' ')
  const ubicacion = [profile.city, profile.country].filter(Boolean).join(', ')

  return (
    <div className="flex flex-col gap-8">
      <section className="bg-surface border border-border rounded-2xl p-6 text-left space-y-4">
        <SectionTitle barClass="bg-primary" title={t('aboutCompany')} />
        <p className="text-sm text-muted-foreground leading-relaxed">
          {profile.description || t('noDescription')}
        </p>
      </section>

      <section className="bg-surface border border-border rounded-2xl p-6 text-left space-y-4">
        <SectionTitle barClass="bg-accent" title={t('activeOpportunities')} />
        {projectsCount === 0 ? (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-foreground">
              {t('noProjectsYet')}
            </p>
            <Link
              href="/empresario/new-project"
              className="inline-flex items-center justify-center rounded-lg text-sm font-semibold h-8 px-3 bg-primary text-primary-foreground hover:bg-primary/95"
            >
              {tE('publishProject')}
            </Link>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <p className="text-sm text-muted-foreground">
              {t('projectsPublished', { count: projectsCount })}
            </p>
            <Link
              href="/empresario"
              className="text-xs font-bold text-primary hover:underline transition-all"
            >
              {t('viewProjectsInDashboard')}
            </Link>
          </div>
        )}
      </section>

      <section className="bg-surface border border-border rounded-2xl p-6 text-left space-y-4">
        <SectionTitle barClass="bg-secondary" title={t('companyData')} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
          <DataItem label={tE('fieldSector')} value={profile.sector} />
          <DataItem
            label={tE('fieldType')}
            value={
              profile.companyType === 'formal'
                ? tE('typeFormal')
                : tE('typeEmprendedor')
            }
          />
          {profile.cedula ? (
            <DataItem
              label={
                profile.companyType === 'emprendedor'
                  ? tE('fieldCedulaIdentidad')
                  : tE('fieldCedulaJuridica')
              }
              value={profile.cedula}
            />
          ) : null}
          {ubicacion ? (
            <DataItem label={tE('fieldCountry')} value={ubicacion} />
          ) : null}
          {profile.operatingScope ? (
            <DataItem
              label={tE('fieldScope')}
              value={tE(SCOPE_KEY[profile.operatingScope])}
            />
          ) : null}
          <DataItem
            label={tE('verificationLabel')}
            value={
              profile.verificationStatus
                ? tE(VERIF_KEY[profile.verificationStatus])
                : tE('verifNone')
            }
          />
        </div>
      </section>

      <section className="bg-surface border border-border rounded-2xl p-6 text-left space-y-4">
        <SectionTitle barClass="bg-highlight" title={t('representative')} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
          <DataItem label={t('fullName')} value={fullName} />
          <DataItem label={tE('emailReadonly')} value={profile.contactEmail} />
          {profile.website ? (
            <DataItem label={t('website')} value={profile.website} />
          ) : null}
        </div>
      </section>
    </div>
  )
}

function SectionTitle({
  barClass,
  title,
}: {
  barClass: string
  title: string
}) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-1.5 h-6 rounded-full ${barClass}`} />
      <h2 className="text-lg font-extrabold text-foreground font-heading">
        {title}
      </h2>
    </div>
  )
}

function DataItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="block text-sm font-medium text-foreground break-words">
        {value}
      </span>
    </div>
  )
}
