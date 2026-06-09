'use client'

import { AlertTriangle } from 'lucide-react'
import { useTranslations } from 'next-intl'

/**
 * Banner de cuenta pendiente.
 * Se renderiza en los layouts de (app) y (company) cuando
 * el layout detecta que estado_cuenta !== 'activa'.
 * No usa useAccountStatus() para evitar dependencia circular
 * con el layout que lo monta.
 */
export function PendingAccountBanner() {
  const t = useTranslations('Account')

  return (
    <div className="w-full bg-warning/10 border-b border-warning/30 text-warning px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex items-center gap-2 text-sm font-semibold">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <span>{t('pendingBanner')}</span>
      </div>
    </div>
  )
}
