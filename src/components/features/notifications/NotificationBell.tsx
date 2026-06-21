'use client'

import { useState, useEffect, useRef, useCallback, useTransition } from 'react'
import { Bell, CheckCheck, ExternalLink, Loader2, X } from 'lucide-react'
import { useTranslations, useFormatter } from 'next-intl'
import { useRouter } from '@/i18n/routing'
import { cn } from '@/lib/utils/cn'
import {
  getMisNotificaciones,
  getMisNotificacionesNoLeidasCount,
  marcarNotificacionLeida,
  marcarTodasMisNotificacionesLeidas,
  type NotificacionItem,
} from '@/lib/notifications/actions'
import {
  getNotificationTone,
  getNotificationTypeKey,
  resolveNotificationContent,
  type NotificationTone,
} from '@/lib/notifications/format'

const POLL_INTERVAL_MS = 60_000
const UNREAD_BADGE_CAP = 99

const TONE_CLASSES: Record<NotificationTone, string> = {
  primary: 'bg-primary/10 text-primary',
  accent: 'bg-accent/10 text-accent',
  warning: 'bg-warning/10 text-warning',
  magenta: 'bg-magenta/10 text-magenta',
}

interface NotificationBellProps {
  isHero?: boolean
  className?: string | undefined
}

export function NotificationBell({
  isHero = false,
  className,
}: NotificationBellProps) {
  const t = useTranslations('Notifications')
  const format = useFormatter()
  const router = useRouter()

  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificacionItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isPending, startTransition] = useTransition()
  const panelRef = useRef<HTMLDivElement>(null)
  const bellRef = useRef<HTMLButtonElement>(null)

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true)
    try {
      const [listResult, countResult] = await Promise.all([
        getMisNotificaciones(),
        getMisNotificacionesNoLeidasCount(),
      ])
      if (listResult.ok) setNotifications(listResult.data)
      if (countResult.ok) setUnreadCount(countResult.data)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchNotifications()
    const timer = setInterval(() => void fetchNotifications(), POLL_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [fetchNotifications])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node) &&
        bellRef.current &&
        !bellRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const handleMarkOne = (id: string) => {
    startTransition(async () => {
      const result = await marcarNotificacionLeida(id)
      if (!result.ok) return
      setNotifications((prev) =>
        prev.map((n) => (n.id_notificacion === id ? { ...n, leida: true } : n)),
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    })
  }

  const handleMarkAll = () => {
    startTransition(async () => {
      const result = await marcarTodasMisNotificacionesLeidas()
      if (!result.ok) return
      setNotifications((prev) => prev.map((n) => ({ ...n, leida: true })))
      setUnreadCount(0)
    })
  }

  const handleGoToAction = (notification: NotificacionItem) => {
    if (!notification.leida) handleMarkOne(notification.id_notificacion)
    if (notification.url_destino) {
      router.push(notification.url_destino as Parameters<typeof router.push>[0])
      setIsOpen(false)
    }
  }

  const toggleOpen = () => {
    const next = !isOpen
    setIsOpen(next)
    if (next) void fetchNotifications()
  }

  const badgeText =
    unreadCount > UNREAD_BADGE_CAP ? `${UNREAD_BADGE_CAP}+` : unreadCount

  return (
    <div className={cn('relative', className)}>
      <button
        ref={bellRef}
        type="button"
        aria-label={t('title')}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        onClick={toggleOpen}
        className={cn(
          'relative flex h-9 w-9 items-center justify-center rounded-full transition-all duration-[var(--duration-fast)] ease-[var(--ease-out)] hover:scale-105 active:scale-95',
          isHero
            ? 'text-white/90 hover:bg-white/10 hover:text-white'
            : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground',
          isOpen && !isHero && 'bg-muted/40 text-foreground',
        )}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span
            aria-live="polite"
            aria-label={t('unreadCount', { count: unreadCount })}
            className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-magenta px-1 text-[10px] font-bold text-magenta-foreground"
          >
            {badgeText}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label={t('title')}
          className="absolute right-0 top-full z-50 mt-2 flex max-h-[480px] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-soft"
        >
          <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" aria-hidden="true" />
              <h2 className="text-sm font-bold text-foreground">
                {t('title')}
              </h2>
              {unreadCount > 0 && (
                <span className="rounded-full bg-magenta px-1.5 py-0.5 text-[10px] font-bold text-magenta-foreground">
                  {badgeText}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAll}
                  disabled={isPending}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-primary transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)] hover:text-secondary disabled:cursor-not-allowed disabled:text-ink-subtle"
                >
                  <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  {t('markAllRead')}
                </button>
              )}
              <button
                type="button"
                aria-label={t('close')}
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1 text-ink-muted transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)] hover:bg-muted/40 hover:text-foreground"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </header>

          <div className="flex-1 divide-y divide-border overflow-y-auto">
            {isLoading && notifications.length === 0 ? (
              <div className="flex items-center justify-center py-10">
                <Loader2
                  className="h-5 w-5 animate-spin text-primary"
                  aria-label={t('loading')}
                />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-1 px-6 py-12 text-center">
                <Bell
                  className="mb-2 h-9 w-9 text-border-strong"
                  aria-hidden="true"
                />
                <p className="text-sm font-medium text-ink-muted">
                  {t('empty')}
                </p>
                <p className="text-xs text-ink-subtle">{t('emptyHint')}</p>
              </div>
            ) : (
              notifications.map((n) => {
                const tone = getNotificationTone(n.tipo_evento)
                const content = resolveNotificationContent({
                  tipo: n.tipo_evento,
                  mensaje: n.mensaje,
                  params: n.params,
                })
                const body =
                  content.kind === 'i18n'
                    ? t(content.key, content.values)
                    : content.text
                return (
                  <div
                    key={n.id_notificacion}
                    className={cn(
                      'flex items-start gap-3 px-4 py-3',
                      n.leida ? 'bg-surface' : 'bg-primary/5',
                    )}
                  >
                    <span
                      className={cn(
                        'mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold',
                        TONE_CLASSES[tone],
                      )}
                    >
                      {t(getNotificationTypeKey(n.tipo_evento))}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          'text-xs leading-snug',
                          n.leida
                            ? 'font-medium text-ink-muted'
                            : 'font-semibold text-foreground',
                        )}
                      >
                        {body}
                      </p>
                      <p className="mt-1 text-[10px] text-ink-subtle">
                        {format.relativeTime(new Date(n.generada_at), {
                          now: new Date(),
                        })}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-center gap-1">
                      {n.url_destino && (
                        <button
                          type="button"
                          aria-label={t('goToAction')}
                          onClick={() => handleGoToAction(n)}
                          className="rounded-lg p-1 text-ink-subtle transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)] hover:bg-primary/10 hover:text-primary"
                        >
                          <ExternalLink
                            className="h-3.5 w-3.5"
                            aria-hidden="true"
                          />
                        </button>
                      )}
                      {!n.leida && (
                        <button
                          type="button"
                          aria-label={t('markOne')}
                          disabled={isPending}
                          onClick={() => handleMarkOne(n.id_notificacion)}
                          className="rounded-lg p-1 text-ink-subtle transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)] hover:bg-primary/10 hover:text-primary disabled:opacity-40"
                        >
                          <CheckCheck
                            className="h-3.5 w-3.5"
                            aria-hidden="true"
                          />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
