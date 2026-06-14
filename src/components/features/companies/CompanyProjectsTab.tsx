'use client'

import React from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'

export interface Tecnologia {
  id: string
  nombre: string
}

interface CompanyProjectsTabProps {
  tecnologias: Tecnologia[]
}

export function CompanyProjectsTab({ tecnologias }: CompanyProjectsTabProps) {
  const t = useTranslations('EmpresaPerfil')
  const tCommon = useTranslations('Common')

  return (
    <div className="flex flex-col gap-6 text-left">
      {/* Encabezado de la pestaña */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/80">
        <div className="space-y-1">
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight font-heading">
            {t('activeProjectsTitle')}
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
            {t('activeProjectsSubtitle')}
          </p>
        </div>

        {/* Indicador de tendencia sin iconos ni emojis */}
        <div className="flex items-center gap-2 bg-accent/10 border border-accent/25 rounded-2xl py-2 px-4 shrink-0 shadow-sm">
          <div className="w-2.5 h-2.5 flex flex-col justify-between items-center">
            {/* Dibujo de flecha hacia arriba con CSS puro */}
            <div className="w-1.5 h-1.5 border-t-2 border-r-2 border-accent rotate-45 transform translate-y-0.5 translate-x-px" />
            <div className="w-0.5 h-2.5 bg-accent" />
          </div>
          <span className="text-xs font-black text-accent uppercase tracking-wider">
            {t('projectsInCourse', { count: 12 })}
          </span>
        </div>
      </div>

      {/* Fila de Filtros */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-muted/20 border border-border p-3 rounded-2xl">
        <div className="flex flex-wrap items-center gap-3">
          {/* Selector simulado: Estados */}
          <div className="relative">
            <select className="bg-surface border border-border text-xs font-semibold text-foreground rounded-xl py-2 pl-3 pr-8 shadow-sm cursor-pointer appearance-none focus:outline-none focus:border-primary">
              <option>{t('allStates')}</option>
              <option>{t('active')}</option>
              <option>{t('inReview')}</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-foreground/60" />
          </div>

          {/* Selector dinámico: Tecnología (F2) */}
          <div className="relative">
            <select className="bg-surface border border-border text-xs font-semibold text-foreground rounded-xl py-2 pl-3 pr-8 shadow-sm cursor-pointer appearance-none focus:outline-none focus:border-primary">
              <option>{t('allTech')}</option>
              {tecnologias.map((tecnologia) => (
                <option key={tecnologia.id} value={tecnologia.id}>
                  {tecnologia.nombre}
                </option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-foreground/60" />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="bg-surface border border-border hover:bg-muted text-xs font-bold px-4 py-2 rounded-xl shadow-sm transition-all"
          >
            {t('recents')}
          </button>
          <button
            type="button"
            className="bg-surface border border-border hover:bg-muted text-xs font-bold px-4 py-2 rounded-xl shadow-sm transition-all"
          >
            {t('budget')}
          </button>
        </div>
      </div>

      {/* Grid de 4 Proyectos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
        {/* CARD 1: Sistema de Arbitraje DeFi */}
        <div className="bg-surface border border-border rounded-2xl p-6 flex flex-col justify-between gap-5 shadow-sm hover:shadow-md transition-all relative group">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                {/* Indicador de logotipo de color estilizado */}
                <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/25 flex items-center justify-center font-black text-accent text-xs">
                  DF
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-foreground leading-tight">
                    {t('projectDeFiTitle')}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                    <span className="text-[10px] font-bold text-accent uppercase tracking-wider">
                      {t('active')}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      • {t('publishedOn', { date: '12 Oct 2023' })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Botón de opciones secundarias (tres puntos simulados en CSS) */}
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground text-lg font-bold leading-none p-1"
              >
                ...
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <span className="text-[10px] font-bold bg-muted/65 text-primary border border-border px-2 py-0.5 rounded">
                SOLIDITY
              </span>
              <span className="text-[10px] font-bold bg-muted/65 text-primary border border-border px-2 py-0.5 rounded">
                NODE.JS
              </span>
              <span className="text-[10px] font-bold bg-muted/65 text-primary border border-border px-2 py-0.5 rounded">
                AWS LAMBDA
              </span>
            </div>

            {/* Fila de Estadísticas */}
            <div className="grid grid-cols-3 gap-4 border-t border-b border-border/60 py-3 mt-2">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase">
                  {t('budget')}
                </p>
                <p className="text-xs font-black text-foreground mt-0.5">
                  $12,500 USD
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase">
                  {t('duration')}
                </p>
                <p className="text-xs font-black text-foreground mt-0.5">
                  3 {tCommon('months')}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase">
                  {t('applications')}
                </p>
                <p className="text-xs font-black text-foreground mt-0.5">
                  {t('appsReceived', { count: 24 })}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 pt-2">
            {/* Avatares simulados */}
            <div className="flex items-center -space-x-2.5">
              <div className="w-7 h-7 rounded-full border border-surface bg-secondary text-secondary-foreground font-bold text-[9px] flex items-center justify-center shadow-sm">
                U1
              </div>
              <div className="w-7 h-7 rounded-full border border-surface bg-primary text-primary-foreground font-bold text-[9px] flex items-center justify-center shadow-sm">
                U2
              </div>
              <div className="w-7 h-7 rounded-full border border-surface bg-magenta text-magenta-foreground font-bold text-[9px] flex items-center justify-center shadow-sm">
                U3
              </div>
              <div className="w-7 h-7 rounded-full border border-surface bg-muted text-foreground font-bold text-[9px] flex items-center justify-center shadow-sm">
                +21
              </div>
            </div>

            <Link
              href="/empresario"
              className="text-xs font-bold text-primary hover:text-primary-foreground/90 flex items-center gap-1 transition-all"
            >
              <span>{t('viewApps')}</span>
              <span>-&gt;</span>
            </Link>
          </div>
        </div>

        {/* CARD 2: Optimización de Infraestructura RAG */}
        <div className="bg-surface border border-border rounded-2xl p-6 flex flex-col justify-between gap-5 shadow-sm hover:shadow-md transition-all relative group">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-secondary/10 border border-secondary/25 flex items-center justify-center font-black text-secondary text-xs">
                  RG
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-foreground leading-tight">
                    {t('projectRAGTitle')}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-warning" />
                    <span className="text-[10px] font-bold text-warning uppercase tracking-wider">
                      {t('inReview')}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      • {t('publishedOn', { date: '15 Oct 2023' })}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="text-muted-foreground hover:text-foreground text-lg font-bold leading-none p-1"
              >
                ...
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <span className="text-[10px] font-bold bg-muted/65 text-primary border border-border px-2 py-0.5 rounded">
                PYTHON
              </span>
              <span className="text-[10px] font-bold bg-muted/65 text-primary border border-border px-2 py-0.5 rounded">
                PYTORCH
              </span>
              <span className="text-[10px] font-bold bg-muted/65 text-primary border border-border px-2 py-0.5 rounded">
                PINECONE
              </span>
            </div>

            {/* Fila de Estadísticas */}
            <div className="grid grid-cols-3 gap-4 border-t border-b border-border/60 py-3 mt-2">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase">
                  {t('budget')}
                </p>
                <p className="text-xs font-black text-foreground mt-0.5">
                  $8,200 USD
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase">
                  {t('duration')}
                </p>
                <p className="text-xs font-black text-foreground mt-0.5">
                  6 {tCommon('weeks')}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase">
                  {t('applications')}
                </p>
                <p className="text-xs font-black text-foreground mt-0.5">
                  {t('appsReceived', { count: 8 })}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 pt-2">
            <div className="flex items-center -space-x-2.5">
              <div className="w-7 h-7 rounded-full border border-surface bg-accent text-accent-foreground font-bold text-[9px] flex items-center justify-center shadow-sm">
                U4
              </div>
              <div className="w-7 h-7 rounded-full border border-surface bg-primary text-primary-foreground font-bold text-[9px] flex items-center justify-center shadow-sm">
                U5
              </div>
              <div className="w-7 h-7 rounded-full border border-surface bg-muted text-foreground font-bold text-[9px] flex items-center justify-center shadow-sm">
                +8
              </div>
            </div>

            <Link
              href="/empresario"
              className="text-xs font-bold text-primary hover:text-primary-foreground/90 flex items-center gap-1 transition-all"
            >
              <span>{t('viewApps')}</span>
              <span>-&gt;</span>
            </Link>
          </div>
        </div>

        {/* CARD 3: Core App Redesign - Fintech */}
        <div className="bg-surface border border-border rounded-2xl p-6 flex flex-col justify-between gap-5 shadow-sm hover:shadow-md transition-all relative group">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/25 flex items-center justify-center font-black text-primary text-xs">
                  FT
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-foreground leading-tight">
                    {t('projectFintechTitle')}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                    <span className="text-[10px] font-bold text-accent uppercase tracking-wider">
                      {t('active')}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      • {t('publishedOn', { date: '18 Oct 2023' })}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="text-muted-foreground hover:text-foreground text-lg font-bold leading-none p-1"
              >
                ...
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <span className="text-[10px] font-bold bg-muted/65 text-primary border border-border px-2 py-0.5 rounded">
                REACT NATIVE
              </span>
              <span className="text-[10px] font-bold bg-muted/65 text-primary border border-border px-2 py-0.5 rounded">
                FIGMA
              </span>
              <span className="text-[10px] font-bold bg-muted/65 text-primary border border-border px-2 py-0.5 rounded">
                TYPESCRIPT
              </span>
            </div>

            {/* Fila de Estadísticas */}
            <div className="grid grid-cols-3 gap-4 border-t border-b border-border/60 py-3 mt-2">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase">
                  {t('budget')}
                </p>
                <p className="text-xs font-black text-foreground mt-0.5">
                  $22,000 USD
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase">
                  {t('duration')}
                </p>
                <p className="text-xs font-black text-foreground mt-0.5">
                  5 {tCommon('months')}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase">
                  {t('applications')}
                </p>
                <p className="text-xs font-black text-foreground mt-0.5">
                  {t('appsReceived', { count: 42 })}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 pt-2">
            <div className="flex items-center -space-x-2.5">
              <div className="w-7 h-7 rounded-full border border-surface bg-secondary text-secondary-foreground font-bold text-[9px] flex items-center justify-center shadow-sm">
                U6
              </div>
              <div className="w-7 h-7 rounded-full border border-surface bg-magenta text-magenta-foreground font-bold text-[9px] flex items-center justify-center shadow-sm">
                U7
              </div>
              <div className="w-7 h-7 rounded-full border border-surface bg-primary text-primary-foreground font-bold text-[9px] flex items-center justify-center shadow-sm">
                U8
              </div>
              <div className="w-7 h-7 rounded-full border border-surface bg-muted text-foreground font-bold text-[9px] flex items-center justify-center shadow-sm">
                +39
              </div>
            </div>

            <Link
              href="/empresario"
              className="text-xs font-bold text-primary hover:text-primary-foreground/90 flex items-center gap-1 transition-all"
            >
              <span>{t('viewApps')}</span>
              <span>-&gt;</span>
            </Link>
          </div>
        </div>

        {/* CARD 4: Análisis de Sentimiento Escalable */}
        <div className="bg-surface border border-border rounded-2xl p-6 flex flex-col justify-between gap-5 shadow-sm hover:shadow-md transition-all relative group">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-foreground/10 border border-foreground/25 flex items-center justify-center font-black text-foreground text-xs">
                  AS
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-foreground leading-tight">
                    {t('projectFintechTitle')}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                    <span className="text-[10px] font-bold text-accent uppercase tracking-wider">
                      {t('active')}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      • {t('publishedOn', { date: '20 Oct 2023' })}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="text-muted-foreground hover:text-foreground text-lg font-bold leading-none p-1"
              >
                ...
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <span className="text-[10px] font-bold bg-muted/65 text-primary border border-border px-2 py-0.5 rounded">
                KUBERNETES
              </span>
              <span className="text-[10px] font-bold bg-muted/65 text-primary border border-border px-2 py-0.5 rounded">
                GO
              </span>
              <span className="text-[10px] font-bold bg-muted/65 text-primary border border-border px-2 py-0.5 rounded">
                KAFKA
              </span>
            </div>

            {/* Fila de Estadísticas */}
            <div className="grid grid-cols-3 gap-4 border-t border-b border-border/60 py-3 mt-2">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase">
                  {t('budget')}
                </p>
                <p className="text-xs font-black text-foreground mt-0.5">
                  $15,000 USD
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase">
                  {t('duration')}
                </p>
                <p className="text-xs font-black text-foreground mt-0.5">
                  4 {tCommon('months')}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase">
                  {t('applications')}
                </p>
                <p className="text-xs font-black text-foreground mt-0.5">
                  {t('appsReceived', { count: 15 })}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 pt-2">
            <div className="flex items-center -space-x-2.5">
              <div className="w-7 h-7 rounded-full border border-surface bg-accent text-accent-foreground font-bold text-[9px] flex items-center justify-center shadow-sm">
                U9
              </div>
              <div className="w-7 h-7 rounded-full border border-surface bg-secondary text-secondary-foreground font-bold text-[9px] flex items-center justify-center shadow-sm">
                U10
              </div>
              <div className="w-7 h-7 rounded-full border border-surface bg-muted text-foreground font-bold text-[9px] flex items-center justify-center shadow-sm">
                +13
              </div>
            </div>

            <Link
              href="/empresario"
              className="text-xs font-bold text-primary hover:text-primary-foreground/90 flex items-center gap-1 transition-all"
            >
              <span>{t('viewApps')}</span>
              <span>-&gt;</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
