'use client'

import React from 'react'
import { useTranslations } from 'next-intl'
import { Company } from '@/types'

interface CompanyProfileDetailsProps {
  company: Company | undefined
  setActiveTab: (tab: 'profile' | 'projects') => void
}

export function CompanyProfileDetails({
  company,
  setActiveTab,
}: CompanyProfileDetailsProps) {
  const t = useTranslations('EmpresaPerfil')

  return (
    <div className="flex flex-col gap-8">
      {/* Tarjeta 1: Nuestra Misión */}
      <section className="bg-surface border border-border rounded-2xl p-6 text-left space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-6 bg-primary rounded-full" />
          <h2 className="text-lg font-extrabold text-foreground font-heading">
            {t('ourMission')}
          </h2>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed font-medium">
          {company?.description || t('missionText')}
        </p>
      </section>

      {/* Tarjeta 2: Oportunidades Activas */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-6 bg-accent rounded-full" />
            <h2 className="text-lg font-extrabold text-foreground font-heading">
              {t('activeOpportunities')}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('projects')}
            className="text-xs font-bold text-primary hover:underline transition-all"
          >
            {t('viewAllProjects')}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Proyecto 1 */}
          <div className="bg-surface border border-border hover:border-primary/40 rounded-2xl p-5 text-left flex flex-col justify-between gap-4 transition-all">
            <div className="space-y-3">
              <div className="flex justify-between items-center gap-2">
                <span className="bg-magenta/10 text-magenta font-extrabold text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-magenta/25">
                  {t('priority')}
                </span>
                <span className="text-xs font-bold text-muted-foreground">
                  $12k - $15k / mes
                </span>
              </div>
              <h3 className="font-extrabold text-base text-foreground leading-tight">
                {t('projectDeFiTitle')}
              </h3>
              <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                {t('projectDeFiDesc')}
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border/60">
              <span className="text-[10px] font-bold bg-muted/65 text-primary border border-border px-2 py-0.5 rounded">
                QISKIT
              </span>
              <span className="text-[10px] font-bold bg-muted/65 text-primary border border-border px-2 py-0.5 rounded">
                PYTHON
              </span>
              <span className="text-[10px] font-bold bg-muted/65 text-primary border border-border px-2 py-0.5 rounded">
                CUDA
              </span>
            </div>
          </div>

          {/* Proyecto 2 */}
          <div className="bg-surface border border-border hover:border-primary/40 rounded-2xl p-5 text-left flex flex-col justify-between gap-4 transition-all">
            <div className="space-y-3">
              <div className="flex justify-between items-center gap-2">
                <span className="bg-accent/10 text-accent font-extrabold text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-accent/25">
                  {t('active')}
                </span>
                <span className="text-xs font-bold text-muted-foreground">
                  $8k - $10k / mes
                </span>
              </div>
              <h3 className="font-extrabold text-base text-foreground leading-tight">
                {t('projectRAGTitle')}
              </h3>
              <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                {t('projectRAGDesc')}
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border/60">
              <span className="text-[10px] font-bold bg-muted/65 text-primary border border-border px-2 py-0.5 rounded">
                RUST
              </span>
              <span className="text-[10px] font-bold bg-muted/65 text-primary border border-border px-2 py-0.5 rounded">
                ZERO TRUST
              </span>
              <span className="text-[10px] font-bold bg-muted/65 text-primary border border-border px-2 py-0.5 rounded">
                WASM
              </span>
            </div>
          </div>

          {/* Proyecto 3 */}
          <div className="bg-surface border border-border hover:border-primary/40 rounded-2xl p-5 text-left flex flex-col justify-between gap-4 transition-all">
            <div className="space-y-3">
              <div className="flex justify-between items-center gap-2">
                <span className="bg-warning/10 text-warning font-extrabold text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full border border-warning/25">
                  {t('interviews')}
                </span>
                <span className="text-xs font-bold text-muted-foreground">
                  $150 / hora
                </span>
              </div>
              <h3 className="font-extrabold text-base text-foreground leading-tight">
                {t('projectFintechTitle')}
              </h3>
              <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                {t('projectFintechDesc')}
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border/60">
              <span className="text-[10px] font-bold bg-muted/65 text-primary border border-border px-2 py-0.5 rounded">
                UNITY 3D
              </span>
              <span className="text-[10px] font-bold bg-muted/65 text-primary border border-border px-2 py-0.5 rounded">
                HAPTICS
              </span>
              <span className="text-[10px] font-bold bg-muted/65 text-primary border border-border px-2 py-0.5 rounded">
                C#
              </span>
            </div>
          </div>

          {/* Tarjeta 4: Proyectos Futuros */}
          <div className="bg-primary text-primary-foreground rounded-2xl p-5 text-left flex flex-col justify-between gap-4 relative overflow-hidden shadow-lg">
            <div className="space-y-2 z-10">
              <span className="text-[9px] font-black uppercase tracking-widest text-accent">
                {t('projectFutureTitle')}
              </span>
              <h3 className="font-black text-lg leading-tight">
                {t('projectFutureDesc')}
              </h3>
            </div>

            <button
              type="button"
              className="bg-surface text-primary font-bold text-xs py-2 px-4 rounded-xl hover:bg-muted transition-all w-max z-10"
            >
              {t('joinWaitlist')}
            </button>

            <div className="absolute right-[-20px] bottom-[-20px] w-24 h-24 rounded-full border-[10px] border-white/10 flex items-center justify-center pointer-events-none">
              <span className="text-primary-foreground/20 text-4xl font-extrabold">
                +
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* CUADRICULA DE DOS COLUMNAS INTERNAS PARA SIDE-CONTENT */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* Cultura FWD */}
        <section className="xl:col-span-6 bg-surface border border-border rounded-2xl p-6 text-left space-y-5">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-6 bg-secondary rounded-full" />
            <h2 className="text-base font-extrabold text-foreground font-heading">
              {t('fwdCulture')}
            </h2>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <h4 className="font-bold text-sm text-foreground">
                {t('cultureAsyncTitle')}
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t('cultureAsyncDesc')}
              </p>
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-sm text-foreground">
                {t('cultureSettlementTitle')}
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t('cultureSettlementDesc')}
              </p>
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-sm text-foreground">
                {t('cultureElevationTitle')}
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t('cultureElevationDesc')}
              </p>
            </div>
          </div>
        </section>

        {/* Historial de Contratación */}
        <section className="xl:col-span-6 bg-surface border border-border rounded-2xl p-6 text-left space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-6 bg-magenta rounded-full" />
            <h2 className="text-base font-extrabold text-foreground font-heading">
              {t('hiringHistory')}
            </h2>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 py-1">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-secondary/15 flex items-center justify-center font-bold text-secondary text-xs">
                  AD
                </div>
                <div>
                  <p className="font-bold text-xs">Aether Dynamics</p>
                  <p className="text-[10px] text-muted-foreground">
                    {t('freelancersHired', { count: 32 })}
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-accent uppercase">
                {t('active')}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 py-1">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center font-bold text-primary text-xs">
                  BP
                </div>
                <div>
                  <p className="font-bold text-xs">BioPulse Labs</p>
                  <p className="text-[10px] text-muted-foreground">
                    {t('freelancersHired', { count: 16 })}
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-accent uppercase">
                {t('active')}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 py-1">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-magenta/15 flex items-center justify-center font-bold text-magenta text-xs">
                  FF
                </div>
                <div>
                  <p className="font-bold text-xs">Flux Finance</p>
                  <p className="text-[10px] text-muted-foreground">
                    {t('freelancersHired', { count: 58 })}
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-accent uppercase">
                {t('active')}
              </span>
            </div>
          </div>

          <button
            type="button"
            className="w-full text-center text-xs font-bold text-primary hover:text-primary/80 pt-2 transition-all block border-t border-border/60"
          >
            {t('viewMore')}
          </button>
        </section>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* Conectar */}
        <section className="xl:col-span-12 bg-surface border border-border rounded-2xl p-6 text-left space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-6 bg-highlight rounded-full" />
            <h2 className="text-base font-extrabold text-foreground font-heading">
              {t('connect')}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-xs">
              <span className="font-bold text-muted-foreground block text-[10px] uppercase">
                {t('website')}
              </span>
              <span className="font-medium text-foreground">
                {company?.website || 'fwd-soluciones.tech'}
              </span>
            </div>
            <div className="text-xs">
              <span className="font-bold text-muted-foreground block text-[10px] uppercase">
                {t('supportEmail')}
              </span>
              <span className="font-medium text-foreground">
                {company?.contactEmail || 'empresa@fwd-soluciones.tech'}
              </span>
            </div>
            <div className="text-xs">
              <span className="font-bold text-muted-foreground block text-[10px] uppercase">
                Cédula / Tipo
              </span>
              <span className="font-medium text-foreground block">
                {company?.cedula
                  ? `${company.cedula} (${company.companyType === 'formal' ? 'Formal' : 'Individual'})`
                  : '3-101-234567 (Formal)'}
              </span>
            </div>
          </div>

          {/* Botones de Redes Sociales sin iconos ni emojis */}
          <div className="flex items-center gap-2 pt-3 border-t border-border/60">
            <span className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-black text-foreground cursor-pointer hover:bg-border transition-all">
              TW
            </span>
            <span className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-black text-foreground cursor-pointer hover:bg-border transition-all">
              GH
            </span>
            <span className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-black text-foreground cursor-pointer hover:bg-border transition-all">
              LN
            </span>
          </div>
        </section>
      </div>

      {/* CALLOUT FINAL */}
      <section className="bg-muted/30 border border-border rounded-2xl p-6 md:p-8 text-center space-y-6">
        <div className="space-y-2">
          <h2 className="text-xl md:text-2xl font-black text-foreground leading-tight">
            {t('readyToCollab')}
          </h2>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
            {t('collabDesc')}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          <button
            type="button"
            className="bg-primary text-primary-foreground font-bold text-sm px-6 py-3 rounded-xl hover:bg-primary/95 transition-all shadow-md cursor-pointer"
          >
            {t('btnApply')}
          </button>
          <button
            type="button"
            className="bg-surface border border-border text-foreground font-bold text-sm px-6 py-3 rounded-xl hover:bg-muted transition-all cursor-pointer"
          >
            {t('btnCareerHub')}
          </button>
        </div>
      </section>
    </div>
  )
}
