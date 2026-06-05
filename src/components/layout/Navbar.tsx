'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, usePathname, useRouter } from '@/i18n/routing'
import { useLocale, useTranslations } from 'next-intl'
import type { UserRole } from '@/types'
import { useAppState } from '@/lib/stateContext'
import { Button } from '@/components/ui/button'
import {
  Laptop,
  Menu,
  X,
  Briefcase,
  Send,
  Heart,
  GraduationCap,
  LayoutDashboard,
  PlusCircle,
  Building2,
  Bell,
  ChevronDown,
  User,
  Users,
  ShieldCheck,
} from 'lucide-react'

interface NavLink {
  href: string
  label: string
  icon: string
  isMock?: boolean
}

export function Navbar() {
  const t = useTranslations('Nav')
  const locale = useLocale()
  const pathname = usePathname()
  const router = useRouter()
  const { userRole: role, setUserRole } = useAppState()

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false)
  const roleDropdownRef = useRef<HTMLDivElement>(null)

  // Configuracion de rol con tokens FWD (§5.1): junior=primary, empresa=secondary, admin=magenta.
  const roleConfig: Record<
    UserRole,
    { label: string; text: string; dot: string; chip: string; icon: ReactNode }
  > = {
    junior: {
      label: t('roleJunior'),
      text: 'text-primary',
      dot: 'bg-primary',
      chip: 'bg-primary text-primary-foreground',
      icon: <User className="w-3.5 h-3.5" />,
    },
    empresa: {
      label: t('roleEmpresa'),
      text: 'text-secondary',
      dot: 'bg-secondary',
      chip: 'bg-secondary text-secondary-foreground',
      icon: <Users className="w-3.5 h-3.5" />,
    },
    admin: {
      label: t('roleAdmin'),
      text: 'text-magenta',
      dot: 'bg-magenta',
      chip: 'bg-magenta text-magenta-foreground',
      icon: <ShieldCheck className="w-3.5 h-3.5" />,
    },
  }

  // Cierra el dropdown al hacer click fuera.
  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (
        roleDropdownRef.current &&
        !roleDropdownRef.current.contains(e.target as Node)
      ) {
        setRoleDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  const handleLocaleChange = (nextLocale: string) => {
    router.replace(pathname, { locale: nextLocale })
  }

  const handleRoleChange = (nextRole: UserRole) => {
    setUserRole(nextRole)
    setRoleDropdownOpen(false)
    setMobileMenuOpen(false)
    router.push(`/${nextRole}`)
  }

  const mockLinks: NavLink[] = [
    { href: '#favorites', label: t('favorites'), icon: 'heart', isMock: true },
    {
      href: '#resources',
      label: t('resources'),
      icon: 'resources',
      isMock: true,
    },
  ]

  const navLinksByRole: Record<UserRole, NavLink[]> = {
    junior: [
      { href: '/junior', label: t('dashboard'), icon: 'dashboard' },
      { href: '/junior/projects', label: t('jobs'), icon: 'briefcase' },
      { href: '/junior/applications', label: t('applications'), icon: 'send' },
      ...mockLinks,
    ],
    empresa: [
      { href: '/empresa', label: t('dashboard'), icon: 'dashboard' },
      {
        href: '/empresa/new-project',
        label: t('publishProject'),
        icon: 'plus',
      },
      ...mockLinks,
    ],
    admin: [
      { href: '/admin', label: t('dashboard'), icon: 'dashboard' },
      { href: '/admin/companies', label: t('companies'), icon: 'building' },
      { href: '/admin/projects', label: t('projects'), icon: 'briefcase' },
      ...mockLinks,
    ],
  }

  const navLinks = navLinksByRole[role]
  const activeRole = roleConfig[role]

  const renderIcon = (iconName: string, className = 'w-4 h-4') => {
    switch (iconName) {
      case 'dashboard':
        return <LayoutDashboard className={className} />
      case 'briefcase':
        return <Briefcase className={className} />
      case 'send':
        return <Send className={className} />
      case 'heart':
        return <Heart className={className} />
      case 'resources':
        return <GraduationCap className={className} />
      case 'plus':
        return <PlusCircle className={className} />
      case 'building':
        return <Building2 className={className} />
      default:
        return null
    }
  }

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/80 bg-background/85 backdrop-blur-md shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo */}
          <div className="flex items-center gap-6 xl:gap-8">
            <Link
              href="/"
              className="flex items-center space-x-2.5 shrink-0 group"
            >
              <svg
                className="w-8 h-8 shrink-0 group-hover:scale-105 transition-transform"
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
              <span className="font-heading text-xl font-bold tracking-tight text-foreground block">
                Marketplace FWD<span className="text-primary">.</span>
              </span>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center space-x-1 lg:space-x-2">
            {navLinks.map((link) => {
              const isActive = pathname === link.href
              if (link.isMock) {
                return (
                  <span
                    key={link.href}
                    aria-disabled="true"
                    className="px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5 text-muted-foreground/60 cursor-not-allowed select-none"
                  >
                    {renderIcon(link.icon, 'w-4 h-4')}
                    <span>{link.label}</span>
                  </span>
                )
              }
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-[var(--duration-base)] ease-[var(--ease-out)] flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  {renderIcon(link.icon, 'w-4 h-4')}
                  <span>{link.label}</span>
                </Link>
              )
            })}
          </div>

          {/* Desktop Right Side Controls */}
          <div className="hidden md:flex items-center space-x-3">
            {/* Role view switcher (preview navigation hasta que exista auth) */}
            <div className="flex items-center gap-2 border-r border-border/80 pr-3 mr-1">
              <div className="relative" ref={roleDropdownRef}>
                <button
                  type="button"
                  onClick={() => setRoleDropdownOpen((o) => !o)}
                  className="flex items-center gap-2 bg-muted/60 hover:bg-muted border border-border/80 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-foreground transition-all duration-[var(--duration-base)] ease-[var(--ease-out)] cursor-pointer select-none"
                >
                  <Laptop className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${activeRole.dot}`}
                  />
                  <span>{activeRole.label}</span>
                  <ChevronDown
                    className={`w-3 h-3 text-muted-foreground transition-transform duration-[var(--duration-base)] ease-[var(--ease-out)] ${roleDropdownOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {roleDropdownOpen && (
                  <div className="absolute top-full left-0 mt-2 w-44 bg-card/95 backdrop-blur-xl border border-border/80 rounded-xl shadow-xl overflow-hidden z-50">
                    <div className="p-1.5 space-y-0.5">
                      {(Object.keys(roleConfig) as UserRole[]).map((key) => {
                        const cfg = roleConfig[key]
                        const selected = role === key
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => handleRoleChange(key)}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-[var(--duration-fast)] ease-[var(--ease-out)] ${
                              selected
                                ? cfg.text
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                            }`}
                          >
                            <span
                              className={`p-1 rounded-md transition-colors ${selected ? cfg.chip : 'bg-muted text-muted-foreground'}`}
                            >
                              {cfg.icon}
                            </span>
                            {cfg.label}
                            {selected && (
                              <span
                                className={`ml-auto w-1.5 h-1.5 rounded-full ${cfg.dot}`}
                              />
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Notification Bell */}
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('notifications')}
              className="h-9 w-9 rounded-full text-muted-foreground hover:text-foreground relative shrink-0"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-magenta animate-pulse" />
            </Button>

            {/* Language Selector */}
            <div
              className="flex items-center border border-border/60 bg-muted/30 rounded-lg p-0.5 shrink-0"
              aria-label={t('language')}
            >
              <button
                type="button"
                onClick={() => handleLocaleChange('es')}
                className={`px-2.5 py-1 text-xs rounded-md transition-all ${
                  locale === 'es'
                    ? 'bg-primary/10 text-primary font-bold shadow-sm'
                    : 'text-muted-foreground hover:text-foreground font-semibold'
                }`}
              >
                ES
              </button>
              <button
                type="button"
                onClick={() => handleLocaleChange('en')}
                className={`px-2.5 py-1 text-xs rounded-md transition-all ${
                  locale === 'en'
                    ? 'bg-primary/10 text-primary font-bold shadow-sm'
                    : 'text-muted-foreground hover:text-foreground font-semibold'
                }`}
              >
                EN
              </button>
            </div>

            {/* User Profile Avatar (placeholder) */}
            <div
              className="flex items-center justify-center w-9 h-9 rounded-full bg-muted border border-border text-muted-foreground shadow-sm shrink-0"
              aria-label={t('profile')}
            >
              <User className="w-5 h-5" />
            </div>
          </div>

          {/* Mobile Controls */}
          <div className="flex items-center md:hidden gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-lg text-xs font-bold"
              onClick={() => handleLocaleChange(locale === 'es' ? 'en' : 'es')}
              aria-label={t('language')}
            >
              {locale === 'es' ? 'EN' : 'ES'}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-lg"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? t('closeMenu') : t('openMenu')}
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border/80 bg-background/95 backdrop-blur-md px-4 pt-2 pb-4 space-y-3">
          <div className="space-y-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href
              if (link.isMock) {
                return (
                  <span
                    key={link.href}
                    aria-disabled="true"
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-base font-semibold text-muted-foreground/60 cursor-not-allowed select-none"
                  >
                    {renderIcon(link.icon, 'w-5 h-5')}
                    <span>{link.label}</span>
                  </span>
                )
              }
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-base font-semibold ${
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {renderIcon(link.icon, 'w-5 h-5')}
                  <span>{link.label}</span>
                </Link>
              )
            })}
          </div>

          <div className="border-t border-border/80 pt-3 space-y-2 px-3">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Laptop className="w-3.5 h-3.5 text-primary" />
              {t('roleView')}
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              {(Object.keys(roleConfig) as UserRole[]).map((key) => {
                const cfg = roleConfig[key]
                const selected = role === key
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleRoleChange(key)}
                    className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl text-xs font-semibold border transition-all duration-[var(--duration-base)] ease-[var(--ease-out)] ${
                      selected
                        ? `${cfg.text} border-current bg-muted/40`
                        : 'text-muted-foreground border-border/60 hover:border-border hover:bg-muted'
                    }`}
                  >
                    <span
                      className={`p-1 rounded-md transition-colors ${selected ? cfg.chip : 'bg-muted text-muted-foreground'}`}
                    >
                      {cfg.icon}
                    </span>
                    {cfg.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
