'use client'

import { useState } from 'react'
import { Bell, Check } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils/cn'

export interface NotificationItem {
  id: string
  title: string
  read: boolean
}

interface NotificationCenterProps {
  items: NotificationItem[]
  className?: string | undefined
}

export function NotificationCenter({
  items,
  className,
}: NotificationCenterProps) {
  const t = useTranslations('Notifications')
  const [notifications, setNotifications] = useState<NotificationItem[]>(items)
  const unreadCount = notifications.filter((n) => !n.read).length

  const markAllRead = () =>
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))

  return (
    <section
      aria-label={t('title')}
      className={cn(
        'w-full max-w-sm rounded-2xl border border-border bg-surface shadow-soft',
        className,
      )}
    >
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" aria-hidden="true" />
          <h2 className="text-sm font-bold text-foreground">{t('title')}</h2>
          {unreadCount > 0 && (
            <span className="rounded-full bg-magenta px-1.5 py-0.5 text-[10px] font-bold text-magenta-foreground">
              {unreadCount}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={markAllRead}
          disabled={unreadCount === 0}
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)] hover:text-secondary disabled:cursor-not-allowed disabled:text-ink-subtle"
        >
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
          {t('markAllRead')}
        </button>
      </header>

      {notifications.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-ink-muted">
          {t('empty')}
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {notifications.map((n) => (
            <li
              key={n.id}
              className={cn(
                'flex items-start gap-3 px-4 py-3 text-sm',
                n.read ? 'text-ink-muted' : 'bg-primary/5 text-foreground',
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                  n.read ? 'bg-border-strong' : 'bg-primary',
                )}
              />
              <span className="font-medium leading-snug">{n.title}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
