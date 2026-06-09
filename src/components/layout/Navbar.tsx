'use client'

import { useState, useEffect, type ReactNode } from 'react'
import { Link, usePathname, useRouter } from '@/i18n/routing'
import { useLocale, useTranslations } from 'next-intl'
import type { UserRole } from '@/types'
import { useAppState } from '@/lib/stateContext'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'framer-motion'
import {
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
  const { userRole: role, resetAll } = useAppState()

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

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

  const handleLocaleChange = (nextLocale: string) => {
    router.replace(pathname, { locale: nextLocale })
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
    <motion.nav
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        scrolled
          ? 'border-b border-border/80 bg-background/80 backdrop-blur-xl shadow-md py-2'
          : 'border-b border-border/20 bg-background/40 backdrop-blur-md py-3.5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo */}
          <div className="flex items-center gap-6 xl:gap-8">
            <Link
              href="/"
              className="flex items-center space-x-2.5 shrink-0 group"
            >
              <svg
                className="w-8 h-8 shrink-0 group-hover:scale-105 transition-transform duration-300"
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
                    className="px-3.5 py-2 rounded-full text-sm font-semibold flex items-center gap-1.5 text-muted-foreground/40 cursor-not-allowed select-none"
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
                  className={`relative px-3.5 py-2 rounded-full text-sm font-semibold transition-colors duration-300 flex items-center gap-1.5 ${
                    isActive
                      ? 'text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activePill"
                      className="absolute inset-0 bg-primary/10 rounded-full"
                      transition={{
                        type: 'spring',
                        stiffness: 380,
                        damping: 30,
                      }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-1.5">
                    {renderIcon(link.icon, 'w-4 h-4')}
                    <span>{link.label}</span>
                  </span>
                </Link>
              )
            })}
          </div>

          <div className="hidden md:flex items-center space-x-3">
            {/* Rol activo mostrado estáticamente sin opción a cambio */}
            <div className="flex items-center gap-2 border-r border-border/80 pr-3 mr-1">
              <div className="flex items-center gap-2 bg-muted/30 border border-border/50 rounded-full px-3 py-1.5 text-xs font-bold text-foreground select-none">
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${activeRole.dot}`}
                />
                <span>{activeRole.label}</span>
              </div>
            </div>

            {/* Notification Bell */}
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('notifications')}
              className="h-9 w-9 rounded-full text-muted-foreground hover:text-foreground relative shrink-0 transition-transform hover:scale-105 active:scale-95"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-magenta animate-pulse" />
            </Button>

            {/* Language Selector */}
            <div
              className="relative flex items-center border border-border/60 bg-muted/30 rounded-full p-0.5 shrink-0"
              aria-label={t('language')}
            >
              <button
                type="button"
                onClick={() => handleLocaleChange('es')}
                className={`relative z-10 px-3 py-1 text-xs rounded-full transition-colors font-bold ${
                  locale === 'es'
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {locale === 'es' && (
                  <motion.div
                    layoutId="activeLang"
                    className="absolute inset-0 bg-primary/10 rounded-full -z-10"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                ES
              </button>
              <button
                type="button"
                onClick={() => handleLocaleChange('en')}
                className={`relative z-10 px-3 py-1 text-xs rounded-full transition-colors font-bold ${
                  locale === 'en'
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {locale === 'en' && (
                  <motion.div
                    layoutId="activeLang"
                    className="absolute inset-0 bg-primary/10 rounded-full -z-10"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                EN
              </button>
            </div>

            {/* User Profile Avatar / Logout Dropdown */}
            <div className="relative group shrink-0">
              <button
                type="button"
                className="flex items-center justify-center w-9 h-9 rounded-full bg-muted hover:bg-muted-foreground/10 border border-border text-muted-foreground shadow-sm transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
                aria-label={t('profile')}
              >
                <User className="w-5 h-5" />
              </button>
              <div className="absolute right-0 top-full mt-2 w-36 bg-card border border-border rounded-xl shadow-xl py-1.5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <button
                  type="button"
                  onClick={async () => {
                    const { createSupabaseBrowserClient } =
                      await import('@/lib/supabase/client')
                    const supabase = createSupabaseBrowserClient()
                    await supabase.auth.signOut()
                    resetAll()
                    router.push('/login')
                  }}
                  className="w-full text-left px-3 py-1.5 text-sm font-semibold text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                >
                  Cerrar sesión
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Controls */}
          <div className="flex items-center md:hidden gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-lg text-xs font-bold transition-transform hover:scale-105 active:scale-95"
              onClick={() => handleLocaleChange(locale === 'es' ? 'en' : 'es')}
              aria-label={t('language')}
            >
              {locale === 'es' ? 'EN' : 'ES'}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-lg transition-transform hover:scale-105 active:scale-95"
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
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="md:hidden overflow-hidden border-t border-border/80 bg-background/95 backdrop-blur-xl px-4 pb-4 space-y-3"
          >
            <div className="space-y-1 pt-2">
              {navLinks.map((link) => {
                const isActive = pathname === link.href
                if (link.isMock) {
                  return (
                    <span
                      key={link.href}
                      aria-disabled="true"
                      className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-base font-semibold text-muted-foreground/40 cursor-not-allowed select-none"
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
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-base font-semibold transition-all ${
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-muted/50'
                    }`}
                  >
                    {renderIcon(link.icon, 'w-5 h-5')}
                    <span>{link.label}</span>
                  </Link>
                )
              })}
            </div>

            <div className="border-t border-border/80 pt-3 space-y-1.5 px-3">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                Rol Activo
              </span>
              <div className="flex items-center gap-2 bg-muted/40 border border-border/50 rounded-xl px-3 py-2 text-sm font-bold text-foreground w-max select-none">
                <span
                  className={`w-2.5 h-2.5 rounded-full shrink-0 ${activeRole.dot}`}
                />
                <span>{activeRole.label}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  )
}
