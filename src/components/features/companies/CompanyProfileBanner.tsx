'use client'

import React from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'
import { Company } from '@/types'

interface CompanyProfileBannerProps {
  company: Company | undefined
}

export function CompanyProfileBanner({ company }: CompanyProfileBannerProps) {
  const t = useTranslations('EmpresaPerfil')

  return (
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
  )
}
