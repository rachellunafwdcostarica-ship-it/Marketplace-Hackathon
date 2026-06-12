'use client'

import React from 'react'
import { useTranslations } from 'next-intl'
import { Company } from '@/types'

interface CompanyProfileSidebarProps {
  company: Company | undefined
  activeTab: 'profile' | 'projects'
  setActiveTab: (tab: 'profile' | 'projects') => void
}

export function CompanyProfileSidebar({
  company,
  activeTab,
  setActiveTab,
}: CompanyProfileSidebarProps) {
  const t = useTranslations('EmpresaPerfil')

  return (
    <aside className="w-full lg:w-64 shrink-0 flex flex-col gap-6">
      {/* Header del Sidebar */}
      <div className="bg-surface border border-border p-5 rounded-2xl flex items-center gap-3">
        {/* Logo de FWD estilizado geométricamente con CSS */}
        <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center shrink-0 border border-primary overflow-hidden">
          {company?.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={company.logo}
              alt={company.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-secondary-foreground font-bold text-lg tracking-wider">
              {company?.name ? company.name.charAt(0).toUpperCase() : 'F'}
            </span>
          )}
        </div>
        <div className="text-left">
          <h3 className="font-bold text-foreground text-sm leading-tight">
            {company?.name || t('sidebarHeader')}
          </h3>
          <span className="inline-block text-[10px] text-accent font-bold uppercase tracking-wider">
            {t('verifiedCompany')}
          </span>
        </div>
      </div>

      {/* Menú de navegación principal (sin iconos) */}
      <nav className="bg-surface border border-border p-3 rounded-2xl flex flex-col gap-1">
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold flex items-center justify-between transition-all ${
            activeTab === 'profile'
              ? 'bg-accent/15 text-accent'
              : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
          }`}
        >
          <span>{t('tabProfile')}</span>
          {activeTab === 'profile' && (
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('projects')}
          className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold flex items-center justify-between transition-all ${
            activeTab === 'projects'
              ? 'bg-accent/15 text-accent'
              : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
          }`}
        >
          <span>{t('tabProjects')}</span>
          {activeTab === 'projects' && (
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
          )}
        </button>

        <button
          type="button"
          className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all"
        >
          {t('tabHistory')}
        </button>
        <button
          type="button"
          className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all"
        >
          {t('tabTeam')}
        </button>
        <button
          type="button"
          className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all"
        >
          {t('tabAnalytics')}
        </button>
      </nav>

      {/* Botones de acción del Sidebar */}
      <div className="bg-surface border border-border p-4 rounded-2xl flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <button
            type="button"
            className="w-full text-left px-2 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-all"
          >
            {t('support')}
          </button>
          <button
            type="button"
            className="w-full text-left px-2 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/5 rounded px-1.5 transition-all"
          >
            {t('logout')}
          </button>
        </div>
      </div>
    </aside>
  )
}
