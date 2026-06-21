'use client'

import { useTranslations } from 'next-intl'
import { Link, usePathname } from '@/i18n/routing'
import { MessageSquare } from 'lucide-react'

export function SidebarEgresado() {
  const t = useTranslations('Nav')
  const pathname = usePathname()
  const active = pathname.startsWith('/egresado/mensajes')

  return (
    <aside className="w-full lg:w-64 shrink-0">
      <nav className="flex flex-col gap-1 px-1">
        <Link
          href="/egresado/mensajes"
          aria-current={active ? 'page' : undefined}
          className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold flex items-center gap-3 transition-all duration-[var(--duration-fast)] ease-[var(--ease-out)] ${
            active
              ? 'bg-primary text-primary-foreground shadow-sm font-bold'
              : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
          }`}
        >
          <MessageSquare className="w-4 h-4 shrink-0" />
          <span>{t('messages')}</span>
        </Link>
      </nav>
    </aside>
  )
}
