'use client'

import { useState, type ReactNode } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { usePathname, useRouter } from '@/i18n/routing'
import { Menu, X, ShieldCheck, User } from 'lucide-react'
import { useAuth } from '@/lib/auth/AuthContext'
import { SidebarAdmin } from './SidebarAdmin'
import { cn } from '@/lib/utils/cn'

interface AdminShellProps {
  children: ReactNode
}

/**
 * Marco del panel admin (§5.7: sidebar oscuro + contenido claro).
 * Sidebar fijo en desktop, drawer en móvil, y una barra superior con el chip de
 * rol, el cambio de idioma y el cierre de sesión (controles que antes daba el
 * Navbar, ya no presente en las páginas admin).
 */
export function AdminShell({ children }: AdminShellProps) {
  const t = useTranslations('Nav')
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const { resetAuth, currentUser } = useAuth()

  const [mobileOpen, setMobileOpen] = useState(false)

  const adminName =
    (typeof currentUser?.user_metadata?.['full_name'] === 'string'
      ? currentUser.user_metadata['full_name']
      : undefined) ??
    currentUser?.email ??
    ''
  const adminEmail = currentUser?.email ?? ''

  const closeMobile = () => setMobileOpen(false)

  const handleLocaleChange = (nextLocale: string) => {
    router.replace(pathname, { locale: nextLocale })
  }

  const handleLogout = async () => {
    const { signOut } = await import('@/lib/auth/actions')
    await signOut()
    resetAuth()
    router.push('/login')
  }

  return (
    <div className="flex min-h-screen bg-canvas">
      <SidebarAdmin className="hidden md:flex" onLogout={handleLogout} />

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label={t('closeMenu')}
            onClick={closeMobile}
            className="absolute inset-0 bg-ink-strong/60"
          />
          <div className="absolute inset-y-0 left-0">
            <SidebarAdmin
              className="h-full"
              onNavigate={closeMobile}
              onLogout={handleLogout}
            />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 bg-secondary px-4 text-white">
          <button
            type="button"
            aria-label={mobileOpen ? t('closeMenu') : t('openMenu')}
            onClick={() => setMobileOpen((open) => !open)}
            className="rounded-lg p-2 text-white/90 hover:bg-white/10 md:hidden"
          >
            {mobileOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>

          <span className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-highlight" />
            <span className="hidden text-[10px] font-bold uppercase tracking-[0.18em] text-white/80 sm:inline">
              {t('adminEyebrow')}
            </span>
          </span>

          <div className="flex-1" />

          <div
            className="flex items-center rounded-full border border-white/25 bg-white/10 p-0.5"
            aria-label={t('language')}
          >
            <button
              type="button"
              onClick={() => handleLocaleChange('es')}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-bold transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)]',
                locale === 'es'
                  ? 'bg-white/20 text-white'
                  : 'text-white/70 hover:text-white',
              )}
            >
              ES
            </button>
            <button
              type="button"
              onClick={() => handleLocaleChange('en')}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-bold transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)]',
                locale === 'en'
                  ? 'bg-white/20 text-white'
                  : 'text-white/70 hover:text-white',
              )}
            >
              EN
            </button>
          </div>

          <span className="flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-bold text-white">
            <span className="h-2 w-2 shrink-0 rounded-full bg-magenta" />
            <span>{t('roleAdmin')}</span>
          </span>

          <span
            className="flex items-center gap-2"
            title={adminEmail || undefined}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 text-white">
              <User className="h-4 w-4" />
            </span>
            <span className="hidden max-w-[12rem] flex-col leading-tight sm:flex">
              <span className="truncate text-xs font-bold text-white">
                {adminName}
              </span>
              <span className="truncate text-[10px] text-white/70">
                {adminEmail}
              </span>
            </span>
          </span>
        </header>

        {/* Firma multicolor FWD (brand guide §6): azul · morado · turquesa ·
            amarillo · naranja · magenta */}
        <div className="flex h-1 w-full shrink-0" aria-hidden="true">
          <div className="flex-1 bg-primary" />
          <div className="flex-1 bg-secondary" />
          <div className="flex-1 bg-accent" />
          <div className="flex-1 bg-highlight" />
          <div className="flex-1 bg-warning" />
          <div className="flex-1 bg-magenta" />
        </div>

        <main className="flex-1 overflow-x-hidden">{children}</main>
      </div>
    </div>
  )
}
