'use client'

import { useState } from 'react'
import { Link, usePathname } from '@/i18n/routing'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils/cn'
import {
  LayoutDashboard,
  Search,
  Send,
  FolderOpen,
  MessageSquare,
  FileCheck2,
  Settings,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

// Dummy user info for the mockup (should ideally come from context or props)
const MOCK_USER = {
  name: 'Jiro',
  role: 'Estudiante FWD',
  initials: 'J',
}

export function SidebarEgresado() {
  const t = useTranslations('Nav')
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)

  const toggleSidebar = () => setIsCollapsed((prev) => !prev)

  const navLinks = [
    { href: '/egresado', label: t('dashboard'), icon: LayoutDashboard },
    { href: '/egresado/projects', label: t('searchProjects'), icon: Search },
    { href: '/egresado/applications', label: t('applications'), icon: Send },
    { href: '/egresado/portfolio', label: t('portfolio'), icon: FolderOpen },
    { href: '/egresado/mensajes', label: t('messages'), icon: MessageSquare },
    {
      href: '/egresado/contrataciones',
      label: t('myContracts'),
      icon: FileCheck2,
    },
  ]

  const accountLinks = [
    { href: '/egresado/configuracion', label: 'Configuración', icon: Settings },
    { href: '/egresado/ayuda', label: 'Ayuda', icon: HelpCircle },
  ]

  return (
    <aside
      id="sidebar"
      className={cn(
        'relative hidden md:flex flex-col bg-secondary text-white overflow-hidden h-[calc(100vh-var(--navbar-height,4rem))] transition-all duration-[var(--duration-base)] ease-[var(--ease-out)]',
        isCollapsed ? 'w-20' : 'w-64',
      )}
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Cpath d='M0 0 L30 30 L0 60 Z M60 0 L30 30 L60 60 Z' fill='%23ffffff' fill-opacity='0.03'/%3E%3C/svg%3E")`,
      }}
    >
      {/* Botón Toggle */}
      <button
        type="button"
        className="sidebar-toggle absolute -right-3 top-6 flex h-6 w-6 items-center justify-center rounded-full border border-white/20 bg-secondary shadow-sm hover:bg-white/10 text-white focus:outline-none focus:ring-2 focus:ring-white/40 z-25 transition-transform"
        onClick={toggleSidebar}
        role="button"
        aria-expanded={!isCollapsed}
        aria-controls="sidebar"
        aria-label="Alternar barra lateral"
      >
        {isCollapsed ? (
          <ChevronRight className="h-3.5 w-3.5 text-white" />
        ) : (
          <ChevronLeft className="h-3.5 w-3.5 text-white" />
        )}
      </button>

      {/* Perfil del Usuario */}
      <div className={cn('p-6 z-10', isCollapsed ? 'items-center px-4' : '')}>
        <div
          className={cn(
            'flex items-center gap-3',
            isCollapsed ? 'justify-center' : '',
          )}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white font-heading font-bold">
            {MOCK_USER.initials}
          </div>
          {!isCollapsed && (
            <div className="flex flex-col overflow-hidden">
              <span className="truncate font-heading text-sm font-bold text-white">
                {MOCK_USER.name}
              </span>
              <span className="truncate font-body text-xs text-white/60 font-medium">
                {MOCK_USER.role}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden pb-4 z-10">
        {/* Sección Menú */}
        <div className="mb-6">
          {!isCollapsed && (
            <div className="px-6 mb-2">
              <span className="text-[10px] font-heading font-bold uppercase tracking-wider text-white/50">
                Menú
              </span>
            </div>
          )}
          <nav className="space-y-1">
            {navLinks.map((link) => {
              const isActive =
                pathname === link.href || pathname.startsWith(`${link.href}/`)
              // Exact match for dashboard to prevent matching everything
              const exactMatch =
                link.href === '/egresado' ? pathname === '/egresado' : isActive

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  title={isCollapsed ? link.label : undefined}
                  className={cn(
                    'group flex items-center gap-3 px-6 py-2.5 font-semibold transition-all duration-[var(--duration-fast)] ease-[var(--ease-out)]',
                    exactMatch
                      ? 'bg-gradient-to-r from-primary to-magenta text-white shadow-md'
                      : 'text-white/75 hover:bg-white/10 hover:text-white/90',
                    !isCollapsed && exactMatch ? 'rounded-full mr-4 ml-2' : '',
                    isCollapsed && exactMatch ? 'rounded-full mx-2' : '',
                    isCollapsed ? 'justify-center px-0' : '',
                  )}
                >
                  <link.icon
                    className={cn(
                      'h-5 w-5 shrink-0 transition-colors',
                      exactMatch
                        ? 'text-white'
                        : 'text-white/60 group-hover:text-white/90',
                    )}
                  />
                  {!isCollapsed && (
                    <span className="truncate text-sm">{link.label}</span>
                  )}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Sección Cuenta */}
        <div>
          {!isCollapsed && (
            <div className="px-6 mb-2">
              <span className="text-[10px] font-heading font-bold uppercase tracking-wider text-white/50">
                Cuenta
              </span>
            </div>
          )}
          <nav className="space-y-1">
            {accountLinks.map((link) => {
              const isActive = pathname === link.href
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  title={isCollapsed ? link.label : undefined}
                  className={cn(
                    'group flex items-center gap-3 px-6 py-2.5 font-semibold transition-all duration-[var(--duration-fast)] ease-[var(--ease-out)]',
                    isActive
                      ? 'bg-gradient-to-r from-primary to-magenta text-white shadow-md'
                      : 'text-white/75 hover:bg-white/10 hover:text-white/90',
                    !isCollapsed && isActive ? 'rounded-full mr-4 ml-2' : '',
                    isCollapsed && isActive ? 'rounded-full mx-2' : '',
                    isCollapsed ? 'justify-center px-0' : '',
                  )}
                >
                  <link.icon
                    className={cn(
                      'h-5 w-5 shrink-0 transition-colors',
                      isActive
                        ? 'text-white'
                        : 'text-white/60 group-hover:text-white/90',
                    )}
                  />
                  {!isCollapsed && (
                    <span className="truncate text-sm">{link.label}</span>
                  )}
                </Link>
              )
            })}
          </nav>
        </div>
      </div>
    </aside>
  )
}
