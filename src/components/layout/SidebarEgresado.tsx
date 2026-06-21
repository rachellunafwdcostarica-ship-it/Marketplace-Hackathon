'use client'

import { useTranslations } from 'next-intl'
import { Link, usePathname } from '@/i18n/routing'
import { MessageSquare } from 'lucide-react'

export function SidebarEgresado() {
  const t = useTranslations('Nav')
  const pathname = usePathname()
  const active = pathname.startsWith('/egresado/mensajes')

  return (
    <aside className="w-full lg:w-56 shrink-0">
      <div className="rounded-2xl border border-border/60 bg-card/40 p-3 flex flex-col gap-1">
        <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
          {t('messages')}
        </p>
        <Link
          href="/egresado/mensajes"
          aria-current={active ? 'page' : undefined}
          className={`flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-semibold transition-all duration-[var(--duration-fast)] ease-[var(--ease-out)] ${
            active
              ? 'bg-primary text-primary-foreground shadow-md'
              : 'text-foreground hover:bg-primary/8 hover:text-primary'
          }`}
        >
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
              active ? 'bg-primary-foreground/20' : 'bg-primary/10'
            }`}
          >
            <MessageSquare className="h-4 w-4" />
          </span>
          <span>{t('messages')}</span>
        </Link>
      </div>
    </aside>
  )
}
