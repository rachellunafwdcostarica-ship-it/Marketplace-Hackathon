'use client'

import { useState, type ReactNode } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { usePathname, useRouter } from '@/i18n/routing'
import {
  Menu,
  X,
  ShieldCheck,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'
import { useAuth } from '@/lib/auth/AuthContext'
import { useSidebarHidden } from '@/hooks/use-sidebar-hidden'
import { SidebarAdmin } from './SidebarAdmin'
import { FwdLogo } from '@/components/features/brand/FwdLogo'
import { NotificationBell } from '@/components/features/notifications/NotificationBell'
import { cn } from '@/lib/utils/cn'

interface AdminShellProps {
  children: ReactNode
  isSuperadmin?: boolean
}

/**
 * Marco del panel admin — diseño con sidebar morado oscuro + header morado FWD
 * y contenido sobre fondo blanco limpio (§5.7).
 */
export function AdminShell({
  children,
  isSuperadmin = false,
}: AdminShellProps) {
  const t = useTranslations('Nav')
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const { resetAuth, currentUser } = useAuth()
  const { isHidden: isSidebarHidden, toggle: toggleSidebar } =
    useSidebarHidden()

  const [mobileOpen, setMobileOpen] = useState(false)

  const adminName =
    (typeof currentUser?.user_metadata?.['full_name'] === 'string'
      ? currentUser.user_metadata['full_name']
      : undefined) ??
    currentUser?.email?.split('@')[0] ??
    'Admin'
  const adminEmail = currentUser?.email ?? ''

  const initials = adminName
    .split(' ')
    .map((w: string) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

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
    <div className="flex min-h-screen" style={{ background: '#f5f6fa' }}>
      {/* ── Desktop Sidebar ── */}
      {!isSidebarHidden && (
        <SidebarAdmin
          id="admin-sidebar"
          className="hidden md:flex md:sticky md:top-0 md:h-screen md:self-start"
          onLogout={handleLogout}
          isSuperadmin={isSuperadmin}
        />
      )}

      {/* ── Mobile drawer overlay ── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label={t('closeMenu')}
            onClick={closeMobile}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />
          <div className="absolute inset-y-0 left-0 z-10">
            <SidebarAdmin
              className="h-full"
              onNavigate={closeMobile}
              onLogout={handleLogout}
              isSuperadmin={isSuperadmin}
            />
          </div>
        </div>
      )}

      {/* ── Main content column ── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* ── Top Header Bar (White / very light gray) ── */}
        <header
          className="sticky top-0 z-30 flex h-[52px] items-center gap-3 px-5 border-b border-gray-100 shadow-sm"
          style={{ background: 'var(--surface)' }}
        >
          {/* Mobile hamburger */}
          <button
            type="button"
            aria-label={mobileOpen ? t('closeMenu') : t('openMenu')}
            onClick={() => setMobileOpen((open) => !open)}
            className="rounded-lg p-1.5 text-gray-600 hover:bg-gray-100 md:hidden transition-colors"
          >
            {mobileOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>

          {/* Desktop sidebar toggle */}
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={isSidebarHidden ? t('showSidebar') : t('hideSidebar')}
            aria-expanded={!isSidebarHidden}
            aria-controls="admin-sidebar"
            className="hidden md:inline-flex rounded-lg p-1.5 text-gray-600 hover:bg-gray-100 transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)]"
          >
            {isSidebarHidden ? (
              <PanelLeftOpen className="h-5 w-5" />
            ) : (
              <PanelLeftClose className="h-5 w-5" />
            )}
          </button>

          {/* Foundation brand pill */}
          <span className="flex items-center gap-2 mr-2">
            <ShieldCheck className="h-4 w-4 text-purple-700 shrink-0" />
            <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-gray-700 hidden sm:inline">
              {t('adminEyebrow')}
            </span>
          </span>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Notification bell */}
          <NotificationBell className="shrink-0" />

          {/* Language switcher */}
          <div
            className="flex items-center rounded-full border border-gray-250 bg-gray-100 p-0.5"
            aria-label={t('language')}
          >
            <button
              type="button"
              onClick={() => handleLocaleChange('es')}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-bold transition-all duration-[var(--duration-fast)]',
                locale === 'es'
                  ? 'bg-white text-gray-800 shadow-sm'
                  : 'text-gray-500 hover:text-gray-800',
              )}
            >
              ES
            </button>
            <button
              type="button"
              onClick={() => handleLocaleChange('en')}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-bold transition-all duration-[var(--duration-fast)]',
                locale === 'en'
                  ? 'bg-white text-gray-800 shadow-sm'
                  : 'text-gray-500 hover:text-gray-800',
              )}
            >
              EN
            </button>
          </div>

          {/* Role badge */}
          <span className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-100/60 px-3 py-1 text-xs font-bold text-gray-700">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#ec008c]" />
            {t('roleAdmin')}
          </span>

          {/* User avatar + info */}
          <button
            type="button"
            title={adminEmail || undefined}
            className="flex items-center gap-2.5 rounded-full border border-gray-200 bg-gray-100/60 pl-1 pr-3 py-1 hover:bg-gray-100 transition-colors"
          >
            {/* Avatar circle */}
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#ec008c] text-[10px] font-bold text-white">
              {initials || '?'}
            </span>
            <span className="hidden sm:flex flex-col items-start leading-tight max-w-[10rem]">
              <span className="truncate text-xs font-bold text-gray-800 leading-none">
                {adminName}
              </span>
              <span className="truncate text-[10px] text-gray-500 leading-none mt-0.5">
                {adminEmail}
              </span>
            </span>
            <ChevronDown className="h-3 w-3 text-gray-500 hidden sm:block shrink-0" />
          </button>
        </header>

        {/* ── Rainbow brand stripe ── */}
        <div className="flex h-[3px] w-full shrink-0" aria-hidden="true">
          <div className="flex-1" style={{ background: '#0a6cb9' }} />
          <div className="flex-1" style={{ background: '#662d91' }} />
          <div className="flex-1" style={{ background: '#20bec6' }} />
          <div className="flex-1" style={{ background: '#ffcb05' }} />
          <div className="flex-1" style={{ background: '#f7901e' }} />
          <div className="flex-1" style={{ background: '#ec008c' }} />
        </div>

        {/* ── Page content with watermark background ── */}
        <main className="flex-1 overflow-x-hidden bg-[#f5f6fa] relative">
          {/* Bottom-left blurred watermark */}
          <div className="absolute -bottom-24 -left-24 z-0 w-96 h-96 opacity-[0.04] blur-[1px] pointer-events-none">
            <FwdLogo className="w-full h-full" />
          </div>

          {/* Real children wrapper */}
          <div className="relative z-10 min-h-full">{children}</div>
        </main>
      </div>
    </div>
  )
}
