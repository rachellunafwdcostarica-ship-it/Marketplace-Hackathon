'use client'

import React from 'react'
import { useTranslations } from 'next-intl'
import { Link, usePathname } from '@/i18n/routing'
import {
  LayoutDashboard,
  Search,
  Send,
  FolderOpen,
  MessageSquare,
} from 'lucide-react'

interface NavItem {
  id: string
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  isActive: (pathname: string) => boolean
}

export function SidebarEgresado() {
  const t = useTranslations('Nav')
  const pathname = usePathname()

  const navItems: NavItem[] = [
    {
      id: 'dashboard',
      href: '/egresado',
      label: t('dashboard'),
      icon: LayoutDashboard,
      isActive: (path) => path === '/egresado',
    },
    {
      id: 'projects',
      href: '/egresado/projects',
      label: t('searchProjects'),
      icon: Search,
      isActive: (path) => path.startsWith('/egresado/projects'),
    },
    {
      id: 'applications',
      href: '/egresado/applications',
      label: t('applications'),
      icon: Send,
      isActive: (path) => path.startsWith('/egresado/applications'),
    },
    {
      id: 'portfolio',
      href: '/egresado/portfolio',
      label: t('portfolio'),
      icon: FolderOpen,
      isActive: (path) => path.startsWith('/egresado/portfolio'),
    },
    {
      id: 'mensajes',
      href: '/egresado/mensajes',
      label: t('messages'),
      icon: MessageSquare,
      isActive: (path) => path.startsWith('/egresado/mensajes'),
    },
  ]

  return (
    <aside className="w-full lg:w-64 shrink-0">
      <nav className="flex flex-col gap-1 px-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = item.isActive(pathname)
          return (
            <Link
              key={item.id}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold flex items-center gap-3 transition-all duration-[var(--duration-fast)] ease-[var(--ease-out)] ${
                active
                  ? 'bg-primary text-primary-foreground shadow-sm font-bold'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
