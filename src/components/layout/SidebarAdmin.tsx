'use client'

import { Link, usePathname } from '@/i18n/routing'
import { useTranslations } from 'next-intl'
import {
  LayoutDashboard,
  Users,
  Building2,
  Briefcase,
  ShieldCheck,
  LogOut,
  type LucideIcon,
} from 'lucide-react'
import { FwdLogo } from '@/components/features/brand/FwdLogo'
import { cn } from '@/lib/utils/cn'

type AdminNavLabel =
  | 'dashboard'
  | 'users'
  | 'companies'
  | 'projects'
  | 'validations'

interface AdminNavItem {
  href: string
  labelKey: AdminNavLabel
  icon: LucideIcon
}

const ADMIN_NAV: AdminNavItem[] = [
  { href: '/admin', labelKey: 'dashboard', icon: LayoutDashboard },
  { href: '/admin/users', labelKey: 'users', icon: Users },
  { href: '/admin/companies', labelKey: 'companies', icon: Building2 },
  { href: '/admin/projects', labelKey: 'projects', icon: Briefcase },
  { href: '/admin/validations', labelKey: 'validations', icon: ShieldCheck },
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
        'flex w-60 shrink-0 flex-col gap-1 bg-surface-admin p-4 text-white',
        className,
      )}
    >
      <Link
        href="/admin"
        onClick={onNavigate}
        className="mb-4 flex items-center gap-2.5 px-2 py-1"
      >
        <FwdLogo className="h-7 w-7" />
        <span className="font-heading text-lg font-bold tracking-tight">
          Marketplace FWD<span className="text-primary">.</span>
        </span>
      </Link>

      {ADMIN_NAV.map(({ href, labelKey, icon: Icon }) => {
        const isActive = pathname === href
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              isActive
                ? 'bg-white/15 text-white'
                : 'text-white/70 hover:bg-white/10 hover:text-white',
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            <span>{t(labelKey)}</span>
          </Link>
        )
      })}

      {onLogout && (
        <button
          type="button"
          onClick={onLogout}
          className="mt-auto flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-white/70 transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)] hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          <span>{t('logout')}</span>
        </button>
      )}
    </nav>
  )
}
