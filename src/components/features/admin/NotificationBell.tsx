'use client'

import { useState, useEffect, useRef, useCallback, useTransition } from 'react'
import { Bell, CheckCheck, ExternalLink, Loader2, X } from 'lucide-react'
import { useRouter } from '@/i18n/routing'
import { cn } from '@/lib/utils/cn'
import {
  getAdminNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  type NotificacionItem,
} from '@/lib/admin/notification-actions'

const TIPO_CONFIG: Record<
  string,
  { color: string; bg: string; label: string }
> = {
  strike_recibido: {
    color: '#ec008c',
    bg: '#fce7f3',
    label: '🔴 Strike',
  },
  cuenta_suspendida: {
    color: '#ec008c',
    bg: '#fce7f3',
    label: '🚫 Suspensión',
  },
  postulacion_recibida: {
    color: '#662d91',
    bg: '#f3e8ff',
    label: '📬 Postulación',
  },
  SISTEMA: {
    color: '#f7901e',
    bg: '#ffedd5',
    label: '⚙️ Sistema',
  },
}

function relativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'ahora'
  if (mins < 60) return `hace ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `hace ${hours} h`
  const days = Math.floor(hours / 24)
  return `hace ${days} día${days !== 1 ? 's' : ''}`
}

export function NotificationBell() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificacionItem[]>([])
  const [loading, setLoading] = useState(false)
  const [isPending, startTransition] = useTransition()
  const panelRef = useRef<HTMLDivElement>(null)
  const bellRef = useRef<HTMLButtonElement>(null)

  const unreadCount = notifications.filter((n) => !n?.leida).length

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getAdminNotifications()
      if (result.ok && Array.isArray(result.data)) {
        setNotifications(result.data)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch on mount and every 60s
  useEffect(() => {
    fetchNotifications()
    const timer = setInterval(fetchNotifications, 60_000)
    return () => clearInterval(timer)
  }, [fetchNotifications])

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        bellRef.current &&
        !bellRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isOpen])

  const handleMarkOne = (id: string) => {
    startTransition(async () => {
      await markNotificationAsRead(id)
      setNotifications((prev) =>
        prev.map((n) => (n.id_notificacion === id ? { ...n, leida: true } : n)),
      )
    })
  }

  const handleMarkAll = () => {
    startTransition(async () => {
      await markAllNotificationsAsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, leida: true })))
    })
  }

  const handleGoToAction = (notification: NotificacionItem) => {
    handleMarkOne(notification.id_notificacion)
    if (notification.url_destino) {
      router.push(notification.url_destino as Parameters<typeof router.push>[0])
      setIsOpen(false)
    }
  }

  return (
    <div className="relative" style={{ zIndex: 40 }}>
      {/* Bell button */}
      <button
        ref={bellRef}
        type="button"
        aria-label="Notificaciones del panel"
        aria-expanded={isOpen}
        onClick={() => {
          setIsOpen((o) => !o)
          if (!isOpen) fetchNotifications()
        }}
        className={cn(
          'relative flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200',
          isOpen
            ? 'bg-purple-100 text-purple-700'
            : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800',
        )}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span
            aria-live="polite"
            aria-label={`${unreadCount} notificaciones sin leer`}
            className="absolute -right-0.5 -top-0.5 flex h-[17px] min-w-[17px] items-center justify-center rounded-full px-0.5 text-[9px] font-bold text-white"
            style={{ background: '#ec008c' }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover panel */}
      {isOpen && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Panel de notificaciones"
          className="absolute right-0 top-full mt-2 w-[360px] max-h-[480px] flex flex-col rounded-2xl border border-gray-100 bg-white shadow-2xl overflow-hidden"
          style={{
            boxShadow: '0 8px 40px rgba(102,45,145,0.15)',
          }}
        >
          {/* Header stripe */}
          <div className="flex h-[3px] w-full shrink-0" aria-hidden="true">
            {[
              '#0a6cb9',
              '#662d91',
              '#20bec6',
              '#ffcb05',
              '#f7901e',
              '#ec008c',
            ].map((c) => (
              <div key={c} className="flex-1" style={{ background: c }} />
            ))}
          </div>

          {/* Panel header */}
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <span className="text-sm font-bold text-gray-800">
              Notificaciones
              {unreadCount > 0 && (
                <span
                  className="ml-2 rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                  style={{ background: '#662d91' }}
                >
                  {unreadCount} nueva{unreadCount !== 1 ? 's' : ''}
                </span>
              )}
            </span>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  title="Marcar todas como leídas"
                  disabled={isPending}
                  onClick={handleMarkAll}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-purple-700 hover:bg-purple-50 transition-colors disabled:opacity-50"
                >
                  <CheckCheck className="h-3 w-3" />
                  Todas leídas
                </button>
              )}
              <button
                type="button"
                aria-label="Cerrar notificaciones"
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Notification list */}
          <div className="overflow-y-auto flex-1 divide-y divide-gray-50">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2
                  className="h-5 w-5 animate-spin"
                  style={{ color: '#662d91' }}
                />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                <Bell className="h-10 w-10 text-gray-200 mb-3" />
                <p className="text-sm font-medium text-gray-400">
                  Sin notificaciones
                </p>
                <p className="text-xs text-gray-300 mt-1">
                  Cuando haya actividad, aparecerá aquí.
                </p>
              </div>
            ) : (
              notifications.map((n) => {
                const tipoConf =
                  TIPO_CONFIG[n.tipo_evento] ?? TIPO_CONFIG['SISTEMA']
                return (
                  <div
                    key={n.id_notificacion}
                    className={cn(
                      'group flex items-start gap-3 px-4 py-3 transition-colors',
                      n.leida
                        ? 'bg-white hover:bg-gray-50'
                        : 'bg-purple-50/40 hover:bg-purple-50/60',
                    )}
                  >
                    {/* Tipo badge */}
                    <span
                      className="mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold whitespace-nowrap"
                      style={{
                        color: tipoConf?.color || '#333',
                        background: tipoConf?.bg || '#eee',
                      }}
                    >
                      {tipoConf?.label || '⚙️ Notificación'}
                    </span>

                    {/* Body */}
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          'text-xs leading-tight',
                          n.leida
                            ? 'font-medium text-gray-600'
                            : 'font-bold text-gray-800',
                        )}
                      >
                        {n.mensaje}
                      </p>
                      <p className="mt-1 text-[10px] text-gray-400">
                        {relativeTime(n.generada_at)}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex shrink-0 flex-col items-center gap-1">
                      {n.url_destino && (
                        <button
                          type="button"
                          title="Ir a la acción"
                          onClick={() => handleGoToAction(n)}
                          className="rounded-lg p-1 text-gray-300 hover:text-purple-700 hover:bg-purple-50 transition-colors"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {!n.leida && (
                        <button
                          type="button"
                          title="Marcar como leída"
                          disabled={isPending}
                          onClick={() => handleMarkOne(n.id_notificacion)}
                          className="rounded-lg p-1 text-gray-300 hover:text-purple-700 hover:bg-purple-50 transition-colors disabled:opacity-40"
                        >
                          <CheckCheck className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-gray-100 px-4 py-2">
              <p className="text-center text-[10px] text-gray-400">
                Mostrando {notifications.length} notificación
                {notifications.length !== 1 ? 'es' : ''}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
