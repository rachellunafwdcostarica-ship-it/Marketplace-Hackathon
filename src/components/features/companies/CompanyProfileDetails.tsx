'use client'

import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'
import {
  StatusPill,
  formatBudget,
} from '@/components/features/projects/PublishedProjectsBoard'
import type { CompanyProfileView } from '@/lib/company/schemas'
import type { PublishedProject } from '@/lib/projects/dashboard'

interface CompanyProfileDetailsProps {
  profile: CompanyProfileView
  projects: PublishedProject[]
  setActiveTab: (tab: 'profile' | 'projects') => void
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

const PREVIEW_COUNT = 4
const PREVIEW_TAGS = 3

/**
 * Detalle del perfil del empresario (identidad). SOLO datos reales de la BD
 * (empresarios + usuarios + proyectos). La sección "Oportunidades activas" es
 * una vista previa de solo lectura de los proyectos reales; la gestión vive en
 * el dashboard. El showcase inventado anterior quedó en `_orphans`.
 */
export function CompanyProfileDetails({
  profile,
  projects,
  setActiveTab,
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

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <SectionTitle barClass="bg-accent" title={t('activeOpportunities')} />
          {projects.length > 0 ? (
            <button
              type="button"
              onClick={() => setActiveTab('projects')}
              className="shrink-0 text-xs font-bold text-primary hover:underline transition-all"
            >
              {t('viewAllProjects')}
            </button>
          ) : null}
        </div>

        {projects.length === 0 ? (
          <div className="p-8 border border-dashed border-border rounded-2xl text-center bg-card/20 space-y-3">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.slice(0, PREVIEW_COUNT).map((project) => (
              <ProjectPreviewCard key={project.id} project={project} />
            ))}
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
          {profile.companyType === 'formal' && profile.cedula ? (
            <DataItem label={tE('fieldCedula')} value={profile.cedula} />
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

function ProjectPreviewCard({ project }: { project: PublishedProject }) {
  const tBoard = useTranslations('ProjectsBoard')
  const tCommon = useTranslations('Common')

  const budget = formatBudget(
    project.moneda,
    project.presupuestoMin,
    project.presupuestoMax,
    tBoard('budgetNonNegotiable'),
  )
  const tags = [...project.categorias, ...project.tecnologias].slice(
    0,
    PREVIEW_TAGS,
  )

  return (
    <div className="bg-surface border border-border hover:border-primary/40 rounded-2xl p-5 text-left flex flex-col gap-3 transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)]">
      <div className="flex items-center justify-between gap-2">
        <StatusPill
          estado={project.estadoEfectivo}
          label={tBoard(`status_${project.estadoEfectivo}`)}
        />
        {budget ? (
          <span className="text-xs font-bold text-muted-foreground">
            {budget}
          </span>
        ) : null}
      </div>
      <h3 className="font-bold text-base text-foreground leading-tight">
        {project.titulo}
      </h3>
      <p className="text-xs text-muted-foreground">
        {tCommon(project.modalidad)}
      </p>
      {tags.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border/60">
          {tags.map((tag) => (
            <span
              key={tag}
              className="text-[10px] font-bold bg-muted/65 text-primary border border-border px-2 py-0.5 rounded"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}
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
