'use client'

import React, { useState, useEffect } from 'react'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { Link, useRouter } from '@/i18n/routing'
import { useTranslations } from 'next-intl'
import { useAppState } from '@/lib/StateContext'
import { MOCK_COMPANY_ID } from '@/lib/constants/mockData'

type TabType = 'profile' | 'projects'

export default function EmpresaPerfilPage() {
  const t = useTranslations('EmpresaPerfil')
  const tCommon = useTranslations('Common')
  const [activeTab, setActiveTab] = useState<TabType>('profile')
  const router = useRouter()
  const { companies } = useAppState()
  const company = companies.find((c) => c.id === MOCK_COMPANY_ID)

  useEffect(() => {
    if (company && !company.isProfileFilled) {
      router.replace('/empresa/formulario-empresa')
    }
  }, [company, router])

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />

      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col lg:flex-row gap-8">
        {/* --- SIDEBAR IZQUIERDO --- */}
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

        {/* --- CONTENIDO PRINCIPAL --- */}
        <main className="flex-1">
          {/* TAB 1: PERFIL DE EMPRESA */}
          {activeTab === 'profile' && (
            <div className="flex flex-col gap-8">
              {/* BANNER SUPERIOR CON GRADIENTE DE FWD */}
              <div className="relative rounded-3xl overflow-hidden border border-border bg-gradient-to-r from-secondary via-primary to-accent p-6 md:p-8 pt-20 md:pt-28 flex flex-col md:flex-row md:items-end justify-between gap-6">
                {/* Superposición / Overlap de la Tarjeta de Identidad */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 z-10">
                  {/* Contenedor del logo corporativo */}
                  <div className="w-20 h-20 bg-surface border-4 border-surface shadow-lg rounded-2xl flex items-center justify-center shrink-0 overflow-hidden">
                    {company?.logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={company.logo}
                        alt={company.name}
                        className="w-full h-full object-cover rounded-xl"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
                        <span className="text-primary-foreground font-extrabold text-2xl tracking-tighter">
                          {company?.name
                            ? company.name.substring(0, 3).toUpperCase()
                            : 'FWD'}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="text-left space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-2xl font-extrabold text-primary-foreground tracking-tight drop-shadow-md">
                        {company?.name || t('companyName')}
                      </h1>
                      <span className="bg-accent/25 backdrop-blur-md border border-accent/40 text-accent font-bold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full">
                        {t('verifiedCompany')}
                      </span>
                      <Link
                        href="/empresa/formulario-empresa"
                        className="bg-white/10 hover:bg-white/20 border border-white/25 text-primary-foreground font-bold text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full transition-all"
                      >
                        {t('editProfile')}
                      </Link>
                    </div>
                    <p className="text-xs text-primary-foreground/95 max-w-md drop-shadow-sm leading-relaxed">
                      {company?.sector || t('tagline')}
                    </p>
                  </div>
                </div>

                {/* Cuadro de Estadísticas a la derecha */}
                <div className="bg-surface/90 backdrop-blur-md border border-border/60 p-4 rounded-2xl flex items-center gap-6 shadow-xl z-10">
                  <div className="text-center">
                    <p className="text-lg font-black text-secondary">1.2k+</p>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      {t('statProjects')}
                    </p>
                  </div>
                  <div className="h-8 w-px bg-border/80" />
                  <div className="text-center">
                    <p className="text-lg font-black text-primary">8.4k</p>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      {t('statTalent')}
                    </p>
                  </div>
                  <div className="h-8 w-px bg-border/80" />
                  <div className="text-center">
                    <p className="text-lg font-black text-magenta">4.9</p>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      {t('statRating')}
                    </p>
                  </div>
                </div>

                {/* Efecto de fondo geométrico */}
                <div className="absolute right-0 top-0 w-1/3 h-full bg-surface/5 skew-x-12 transform origin-top-right pointer-events-none" />
              </div>

              {/* CUADRICULA DE DOS COLUMNAS */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                {/* COLUMNA IZQUIERDA (ANCHE - 70%) */}
                <div className="xl:col-span-8 flex flex-col gap-8">
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
                </div>

                {/* COLUMNA DERECHA (ESTRECHA - 30%) */}
                <div className="xl:col-span-4 flex flex-col gap-6 w-full">
                  {/* Cultura FWD */}
                  <section className="bg-surface border border-border rounded-2xl p-6 text-left space-y-5">
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
                  <section className="bg-surface border border-border rounded-2xl p-6 text-left space-y-4">
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

                  {/* Conectar */}
                  <section className="bg-surface border border-border rounded-2xl p-6 text-left space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-6 bg-highlight rounded-full" />
                      <h2 className="text-base font-extrabold text-foreground font-heading">
                        {t('connect')}
                      </h2>
                    </div>

                    <div className="space-y-2.5">
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
                          {company?.contactEmail ||
                            'empresa@fwd-soluciones.tech'}
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
          )}

          {/* TAB 2: PROYECTOS ACTIVOS */}
          {activeTab === 'projects' && (
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

                  {/* Selector simulado: Tecnología */}
                  <div className="relative">
                    <select className="bg-surface border border-border text-xs font-semibold text-foreground rounded-xl py-2 pl-3 pr-8 shadow-sm cursor-pointer appearance-none focus:outline-none focus:border-primary">
                      <option>{t('allTech')}</option>
                      <option>Solidity</option>
                      <option>React Native</option>
                      <option>Python</option>
                      <option>Go</option>
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
                      href="/empresa"
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
                      href="/empresa"
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
                      href="/empresa"
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
                      href="/empresa"
                      className="text-xs font-bold text-primary hover:text-primary-foreground/90 flex items-center gap-1 transition-all"
                    >
                      <span>{t('viewApps')}</span>
                      <span>-&gt;</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      <Footer />
    </div>
  )
}
