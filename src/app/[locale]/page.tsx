import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/routing'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { ArrowRight, CheckCircle2, Users, Award, Sparkles } from 'lucide-react'
import { HeroBgCarousel } from '@/components/ui/HeroBgCarousel'

const CAROUSEL_SLIDES = [
  { src: '/images/carousel/carousel-1.jpg', alt: 'Equipo FWD trabajando' },
  { src: '/images/carousel/carousel-2.jpg', alt: 'Espacio de trabajo FWD' },
  { src: '/images/carousel/carousel-3.png', alt: 'Comunidad FWD' },
  { src: '/images/carousel/carousel-4.png', alt: 'Talento FWD' },
]

export default async function LandingPage() {
  const tLanding = await getTranslations('Landing')

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1">
        {/* Hero — carrusel de fondo */}
        <section
          style={{
            position: 'relative',
            overflow: 'hidden',
            minHeight: '620px',
            display: 'flex',
            alignItems: 'center',
          }}
          className="py-20 lg:py-32 px-4 sm:px-6 lg:px-8"
        >
          {/* ── Imágenes de fondo en carrusel ── */}
          <HeroBgCarousel slides={CAROUSEL_SLIDES} interval={5000} />

          {/* ── Overlay degradado para legibilidad ── */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(135deg, rgba(10,30,60,0.72) 0%, rgba(102,45,145,0.50) 60%, rgba(0,0,0,0.35) 100%)',
              zIndex: 1,
            }}
          />

          {/* ── Contenido encima del fondo ── */}
          <div style={{ position: 'relative', zIndex: 2, width: '100%' }}>
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              <div className="lg:col-span-8 space-y-6 text-left">
                <div
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border"
                  style={{
                    background: 'rgba(255,255,255,0.15)',
                    borderColor: 'rgba(255,255,255,0.3)',
                    color: '#ffffff',
                    backdropFilter: 'blur(6px)',
                  }}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {tLanding('badgeVersion')}
                </div>

                <h1
                  className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] font-heading"
                  style={{
                    color: '#ffffff',
                    textShadow: '0 2px 16px rgba(0,0,0,0.4)',
                  }}
                >
                  {tLanding('heroTitle')}
                  <span style={{ color: '#20bec6' }}>.</span>
                </h1>

                <p
                  className="text-lg leading-relaxed max-w-xl"
                  style={{ color: 'rgba(255,255,255,0.85)' }}
                >
                  {tLanding('heroSubtitle')}
                </p>

                <div className="flex flex-wrap gap-4 pt-2">
                  <Link
                    href="/login"
                    className="shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all font-semibold px-6 py-3.5 rounded-lg text-sm inline-flex items-center justify-center gap-1.5 cursor-pointer"
                    style={{
                      background: '#0a6cb9',
                      color: '#ffffff',
                    }}
                  >
                    {tLanding('ctaFindProjects')}
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    href="/login"
                    className="transition-all font-semibold px-6 py-3.5 rounded-lg text-sm inline-flex items-center justify-center gap-1.5 cursor-pointer"
                    style={{
                      border: '1.5px solid rgba(255,255,255,0.6)',
                      color: '#ffffff',
                      background: 'rgba(255,255,255,0.08)',
                      backdropFilter: 'blur(6px)',
                    }}
                  >
                    {tLanding('ctaPublishProject')}
                  </Link>
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
                {tLanding('statsProjectsNumber')}
              </p>
              <p className="text-sm text-secondary-foreground/70 mt-1">
                {tLanding('statsProjectsLabel')}
              </p>
            </div>
            <div className="p-4 border-y md:border-y-0 md:border-x border-secondary-foreground/20">
              <p className="text-3xl font-extrabold text-highlight font-heading">
                {tLanding('statsTalentNumber')}
              </p>
              <p className="text-sm text-secondary-foreground/70 mt-1">
                {tLanding('statsTalentLabel')}
              </p>
            </div>
            <div className="p-4">
              <p className="text-3xl font-extrabold text-magenta font-heading">
                {tLanding('statsCompaniesNumber')}
              </p>
              <p className="text-sm text-secondary-foreground/70 mt-1">
                {tLanding('statsCompaniesLabel')}
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
