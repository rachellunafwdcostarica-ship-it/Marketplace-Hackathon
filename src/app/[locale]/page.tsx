'use client'

import React from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { ArrowRight, CheckCircle2, Users, Award, Sparkles } from 'lucide-react'

export default function LandingPage() {
  const tLanding = useTranslations('Landing')

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden bg-radial from-secondary/15 via-transparent to-transparent py-20 lg:py-32 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 space-y-6 text-left">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                <Sparkles className="w-3.5 h-3.5" />
                {tLanding('badgeVersion')}
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-[1.1] font-heading">
                {tLanding('heroTitle')}
                <span className="text-accent">.</span>
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed max-w-xl">
                {tLanding('heroSubtitle')}
              </p>
              <div className="flex flex-wrap gap-4 pt-2">
                <Link
                  href="/login"
                  className="bg-primary hover:bg-primary/95 text-white shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all font-semibold px-6 py-3.5 rounded-lg text-sm inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {tLanding('ctaFindProjects')}
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/login"
                  className="border border-secondary text-secondary hover:bg-secondary/5 transition-all font-semibold px-6 py-3.5 rounded-lg text-sm inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {tLanding('ctaPublishProject')}
                </Link>
              </div>
            </div>

            <div className="lg:col-span-5 relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-accent via-secondary to-magenta rounded-3xl blur-2xl opacity-20 -z-10" />
              <div className="border border-border/80 rounded-2xl bg-card/75 p-6 shadow-xl backdrop-blur-sm relative overflow-hidden group hover:border-primary/20 transition-all duration-300">
                <div className="flex justify-between items-center pb-4 border-b border-border/60 mb-6">
                  <div className="flex gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-magenta" />
                    <span className="w-3 h-3 rounded-full bg-warning" />
                    <span className="w-3 h-3 rounded-full bg-accent" />
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">
                    fwd-marketplace.json
                  </span>
                </div>
                <div className="space-y-4">
                  <div className="h-6 bg-muted rounded-md w-1/3" />
                  <div className="h-10 bg-muted rounded-md w-full" />
                  <div className="h-20 bg-muted rounded-md w-full" />
                  <div className="flex gap-2 pt-2">
                    <div className="h-8 bg-muted rounded-full w-16" />
                    <div className="h-8 bg-muted rounded-full w-20" />
                    <div className="h-8 bg-muted rounded-full w-24" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="bg-secondary text-secondary-foreground py-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="p-4">
              <p className="text-3xl font-extrabold text-accent font-heading">
                {tLanding('statsProjects').split(' ')[0]}
              </p>
              <p className="text-sm text-secondary-foreground/70 mt-1">
                {tLanding('statsProjects').split(' ').slice(1).join(' ')}
              </p>
            </div>
            <div className="p-4 border-y md:border-y-0 md:border-x border-secondary-foreground/20">
              <p className="text-3xl font-extrabold text-highlight font-heading">
                {tLanding('statsTalent').split(' ')[0]}
              </p>
              <p className="text-sm text-secondary-foreground/70 mt-1">
                {tLanding('statsTalent').split(' ').slice(1).join(' ')}
              </p>
            </div>
            <div className="p-4">
              <p className="text-3xl font-extrabold text-magenta font-heading">
                {tLanding('statsCompanies').split(' ')[0]}
              </p>
              <p className="text-sm text-secondary-foreground/70 mt-1">
                {tLanding('statsCompanies').split(' ').slice(1).join(' ')}
              </p>
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="py-20 lg:py-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            <div className="space-y-8 bg-card/40 border border-border/80 p-8 rounded-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-[4px] bg-primary" />
              <div className="space-y-2">
                <div className="p-3 bg-primary/10 text-primary w-fit rounded-xl">
                  <Award className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold tracking-tight font-heading">
                  {tLanding('juniorTitle')}
                  <span className="text-primary">.</span>
                </h3>
                <p className="text-muted-foreground text-sm">
                  {tLanding('juniorDesc')}
                </p>
              </div>
              <ul className="space-y-4">
                {[
                  tLanding('juniorBenefit1'),
                  tLanding('juniorBenefit2'),
                  tLanding('juniorBenefit3'),
                ].map((benefit, i) => (
                  <li key={i} className="flex gap-3 items-start">
                    <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm text-foreground leading-relaxed">
                      {benefit}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-8 bg-card/40 border border-border/80 p-8 rounded-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-[4px] bg-secondary" />
              <div className="space-y-2">
                <div className="p-3 bg-secondary/10 text-secondary w-fit rounded-xl">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold tracking-tight font-heading">
                  {tLanding('companyTitle')}
                  <span className="text-secondary">.</span>
                </h3>
                <p className="text-muted-foreground text-sm">
                  {tLanding('companyDesc')}
                </p>
              </div>
              <ul className="space-y-4">
                {[
                  tLanding('companyBenefit1'),
                  tLanding('companyBenefit2'),
                  tLanding('companyBenefit3'),
                ].map((benefit, i) => (
                  <li key={i} className="flex gap-3 items-start">
                    <CheckCircle2 className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
                    <span className="text-sm text-foreground leading-relaxed">
                      {benefit}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
