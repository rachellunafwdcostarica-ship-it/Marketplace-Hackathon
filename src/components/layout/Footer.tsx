import { Link } from '@/i18n/routing'
import { useTranslations } from 'next-intl'

export function Footer() {
  const t = useTranslations('Footer')
  const year = new Date().getFullYear()

  return (
    <footer className="w-full bg-secondary text-secondary-foreground border-t border-secondary-foreground/20 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo & Description */}
          <div className="md:col-span-2 space-y-4">
            <Link href="/" className="flex items-center space-x-2.5 group">
              <svg
                className="w-8 h-8 shrink-0 group-hover:scale-105 transition-transform duration-[var(--duration-fast)] ease-[var(--ease-out)]"
                viewBox="0 0 100 100"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect
                  x="22"
                  y="22"
                  width="56"
                  height="56"
                  rx="8"
                  transform="rotate(0 50 50)"
                  stroke="#20BEC6"
                  strokeWidth="4.5"
                  fill="#FFCB05"
                />
                <rect
                  x="22"
                  y="22"
                  width="56"
                  height="56"
                  rx="8"
                  transform="rotate(45 50 50)"
                  stroke="#20BEC6"
                  strokeWidth="4.5"
                  fill="#662D91"
                />
                <rect
                  x="25"
                  y="25"
                  width="50"
                  height="50"
                  rx="6"
                  transform="rotate(22.5 50 50)"
                  stroke="#EC008C"
                  strokeWidth="3.5"
                  fill="#0A6CB9"
                />
                <path
                  d="M50 28 L54 42 L68 42 L57 50 L61 64 L50 56 L39 64 L43 50 L32 42 L46 42 Z"
                  fill="#EC008C"
                />
                <circle cx="50" cy="50" r="4.5" fill="#FFCB05" />
              </svg>
              <span className="font-heading text-xl font-bold tracking-tight text-secondary-foreground">
                Marketplace FWD<span className="text-highlight">.</span>
              </span>
            </Link>
            <p className="text-sm text-secondary-foreground/70 max-w-sm leading-relaxed">
              {t('tagline')}
            </p>
          </div>

          {/* Junior Sections */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold uppercase tracking-wider text-accent font-heading">
              {t('juniorTitle')}
            </h4>
            <ul className="space-y-2 text-sm text-secondary-foreground/70">
              <li>
                <Link
                  href="/junior/projects"
                  className="hover:text-secondary-foreground transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)]"
                >
                  {t('searchProjects')}
                </Link>
              </li>
              <li>
                <Link
                  href="/junior/applications"
                  className="hover:text-secondary-foreground transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)]"
                >
                  {t('myApplications')}
                </Link>
              </li>
              <li>
                <span className="text-secondary-foreground/50 cursor-not-allowed">
                  {t('careerGuides')}
                </span>
              </li>
            </ul>
          </div>

          {/* Company Sections */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold uppercase tracking-wider text-accent font-heading">
              {t('companyTitle')}
            </h4>
            <ul className="space-y-2 text-sm text-secondary-foreground/70">
              <li>
                <Link
                  href="/empresa/new-project"
                  className="hover:text-secondary-foreground transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)]"
                >
                  {t('publishProject')}
                </Link>
              </li>
              <li>
                <Link
                  href="/empresa"
                  className="hover:text-secondary-foreground transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)]"
                >
                  {t('searchGraduates')}
                </Link>
              </li>
              <li>
                <span className="text-secondary-foreground/50 cursor-not-allowed">
                  {t('pricing')}
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-secondary-foreground/20 mt-12 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-secondary-foreground/50">
          <p>{t('rights', { year })}</p>
          <div className="flex space-x-4">
            <span className="hover:text-secondary-foreground/70 cursor-pointer">
              {t('terms')}
            </span>
            <span className="hover:text-secondary-foreground/70 cursor-pointer">
              {t('privacy')}
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
