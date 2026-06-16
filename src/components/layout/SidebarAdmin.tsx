'use client'

import { Link, usePathname } from '@/i18n/routing'
import { useTranslations } from 'next-intl'
import {
  LayoutDashboard,
  Users,
  Briefcase,
  ShieldCheck,
  Settings,
  LogOut,
  AlertTriangle,
  type LucideIcon,
} from 'lucide-react'
import { FwdLogo } from '@/components/features/brand/FwdLogo'
import { ConfirmButton } from '@/components/features/shared/ConfirmButton'
import { cn } from '@/lib/utils/cn'

type AdminNavLabel =
  | 'dashboard'
  | 'users'
  | 'projects'
  | 'validations'
  | 'settings'
  | 'moderation'

interface AdminNavItem {
  href: string
  labelKey: AdminNavLabel
  icon: LucideIcon
}

const ADMIN_NAV: AdminNavItem[] = [
  { href: '/admin', labelKey: 'dashboard', icon: LayoutDashboard },
  { href: '/admin/users', labelKey: 'users', icon: Users },
  { href: '/admin/projects', labelKey: 'projects', icon: Briefcase },
  { href: '/admin/validations', labelKey: 'validations', icon: ShieldCheck },
  { href: '/admin/moderation', labelKey: 'moderation', icon: AlertTriangle },
  { href: '/admin/settings', labelKey: 'settings', icon: Settings },
]

interface SidebarAdminProps {
  className?: string | undefined
  onNavigate?: (() => void) | undefined
  onLogout?: (() => void) | undefined
}

export function SidebarAdmin({
  className,
  onNavigate,
  onLogout,
}: SidebarAdminProps) {
  const t = useTranslations('Nav')
  const pathname = usePathname()

  return (
    <nav
      aria-label={t('roleAdmin')}
      className={cn(
        'flex w-56 shrink-0 flex-col bg-[#3d1a6e] text-white',
        className,
      )}
    >
      {/* Logo + Brand */}
      <Link
        href="/admin"
        onClick={onNavigate}
        className="flex items-center gap-3 px-5 py-5 hover:opacity-90 transition-opacity"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10">
          <FwdLogo className="h-6 w-6" />
        </div>
        <span className="font-heading text-base font-bold tracking-tight leading-tight text-white">
          Marketplace<span className="text-[#ec008c]"> FWD</span>
        </span>
      </Link>

      {/* Divider */}
      <div className="mx-4 mb-3 h-px bg-white/10" />

      {/* Nav Items */}
      <div className="flex flex-col gap-0.5 px-3 flex-1">
        {ADMIN_NAV.map(({ href, labelKey, icon: Icon }) => {
          const isActive =
            href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-[var(--duration-fast)] ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40',
                isActive
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-white/65 hover:bg-white/8 hover:text-white/90',
              )}
            >
              <Icon
                className={cn(
                  'h-4 w-4 shrink-0 transition-colors',
                  isActive ? 'text-white' : 'text-white/55',
                )}
                aria-hidden="true"
              />
              <span>{t(labelKey)}</span>
              {isActive && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#ec008c]" />
              )}
            </Link>
          )
        })}
      </div>

      {/* Logout */}
      {onLogout && (
        <div className="p-3 pt-0">
          <div className="h-px bg-white/10 mb-3" />
          <ConfirmButton
            onConfirm={onLogout}
            title={t('confirmLogoutTitle')}
            description={t('confirmLogoutDesc')}
            confirmLabel={t('logout')}
            variant="ghost"
            size="default"
            className="w-full flex items-center justify-start gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/65 hover:bg-white/8 hover:text-white/90 transition-all"
          >
            <LogOut
              className="h-4 w-4 shrink-0 text-white/55"
              aria-hidden="true"
            />
            {t('logout')}
          </ConfirmButton>
        </div>
      )}
    </nav>
  )
}
