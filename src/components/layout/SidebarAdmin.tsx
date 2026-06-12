'use client'

import React, { useState } from 'react'
import { Link, usePathname, useRouter } from '@/i18n/routing'
import { useTranslations } from 'next-intl'
import { useAppState } from '@/lib/StateContext'
import { signOut } from '@/lib/auth/actions'
import {
  LayoutDashboard,
  Building2,
  Briefcase,
  ShieldCheck,
  Loader2,
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
  const router = useRouter()
  const { resetAll } = useAppState()
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = async () => {
    try {
      setLoggingOut(true)
      await signOut()
      resetAll()
      router.push('/login')
    } catch {
      // Ignorar
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <aside
      aria-label={t('roleAdmin')}
      className={cn('w-full lg:w-64 shrink-0 flex flex-col gap-6', className)}
    >
      {/* Tarjeta 1: Perfil del Administrador (Oscura) */}
      <div className="bg-ink-strong border border-border/40 p-5 rounded-2xl flex items-center gap-3">
        <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center shrink-0 border border-primary overflow-hidden">
          <span className="text-secondary-foreground font-bold text-lg tracking-wider">
            A
          </span>
        </div>
        <div className="text-left">
          <h3 className="font-bold text-surface text-sm leading-tight">
            Administrador
          </h3>
          <span className="inline-block text-[10px] text-accent font-bold uppercase tracking-wider">
            {t('roleAdmin')}
          </span>
        </div>
      </div>

      {/* Tarjeta 2: Navegación Principal (Oscura) */}
      <nav className="bg-ink-strong border border-border/40 p-3 rounded-2xl flex flex-col gap-1">
        {ADMIN_NAV.map(({ href, labelKey, icon: Icon }) => {
          const isActive = pathname === href
          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold flex items-center justify-between transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                isActive
                  ? 'bg-accent/15 text-accent'
                  : 'text-surface/70 hover:bg-surface/10 hover:text-surface',
              )}
            >
              <span className="flex items-center gap-3">
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span>{t(labelKey)}</span>
              </span>
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-accent" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Tarjeta 3: Acciones / Cerrar Sesión (Oscura) */}
      <div className="bg-ink-strong border border-border/40 p-4 rounded-2xl flex flex-col gap-4">
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full text-left px-2 py-1.5 text-xs font-bold text-magenta hover:bg-magenta/5 rounded px-1.5 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {loggingOut && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {t('logout')}
        </button>
      </div>
    </aside>
  )
}
