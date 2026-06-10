'use client'

import { Link, usePathname } from '@/i18n/routing'
import { useTranslations } from 'next-intl'
import {
  LayoutDashboard,
  Building2,
  Briefcase,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'

type AdminNavLabel = 'dashboard' | 'companies' | 'projects' | 'validations'

interface AdminNavItem {
  href: string
  labelKey: AdminNavLabel
  icon: LucideIcon
}

const ADMIN_NAV: AdminNavItem[] = [
  { href: '/admin', labelKey: 'dashboard', icon: LayoutDashboard },
  { href: '/admin/companies', labelKey: 'companies', icon: Building2 },
  { href: '/admin/projects', labelKey: 'projects', icon: Briefcase },
  { href: '/admin/validations', labelKey: 'validations', icon: ShieldCheck },
]

interface SidebarAdminProps {
  className?: string | undefined
}

export function SidebarAdmin({ className }: SidebarAdminProps) {
  const t = useTranslations('Nav')
  const pathname = usePathname()

  return (
    <nav
      aria-label={t('roleAdmin')}
      className={cn(
        'flex h-full w-60 shrink-0 flex-col gap-1 bg-ink-strong p-4 text-surface',
        className,
      )}
    >
      {ADMIN_NAV.map(({ href, labelKey, icon: Icon }) => {
        const isActive = pathname === href
        return (
          <Link
            key={href}
            href={href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              isActive
                ? 'bg-surface/15 text-surface'
                : 'text-surface/70 hover:bg-surface/10 hover:text-surface',
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            <span>{t(labelKey)}</span>
          </Link>
        )
      })}
    </nav>
  )
}
