'use client'

import { useState } from 'react'
import { useRouter } from '@/i18n/routing'
import { useTranslations } from 'next-intl'
import { CheckCircle, Ban } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { approveUser } from '@/lib/auth/actions'
import { deactivateUser } from '@/lib/admin/actions'
import type { AdminAccountStatus } from '@/lib/admin/queries'

interface AccountStatusActionsProps {
  userId: string
  estadoCuenta: AdminAccountStatus
  isActive: boolean
  isSelf: boolean
  userName: string
}

/**
 * Acciones de cuenta por fila en la gestión de usuarios (RF-63):
 * - Aprobar: activa la cuenta (estado_cuenta = 'activa', is_active = true).
 * - Desactivar: bloquea la cuenta (is_active = false); el gate del middleware la
 *   expulsa de la plataforma.
 *
 * En la propia fila del admin no se muestran acciones (self-guard, reforzado en
 * las server actions).
 */
export function AccountStatusActions({
  userId,
  estadoCuenta,
  isActive,
  isSelf,
  userName,
}: AccountStatusActionsProps) {
  const t = useTranslations('Admin')
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  if (isSelf) {
    return <span className="text-xs text-muted-foreground">{t('selfRow')}</span>
  }

  const canApprove = estadoCuenta !== 'activa' || !isActive
  const canDeactivate = isActive

  const handleApprove = async () => {
    setLoading(true)
    const result = await approveUser(userId)
    setLoading(false)

    if (result.ok) {
      toast.success(t('userApproved', { name: userName }))
      router.refresh()
    } else {
      toast.error(t('userApproveError'))
    }
  }

  const handleDeactivate = async () => {
    setLoading(true)
    const result = await deactivateUser(userId)
    setLoading(false)

    if (result.ok) {
      toast.success(t('userDeactivated', { name: userName }))
      router.refresh()
    } else if (result.error === 'cannot_modify_self') {
      toast.error(t('cannotModifySelf'))
    } else {
      toast.error(t('userDeactivateError'))
    }
  }

  return (
    <div className="flex items-center gap-2">
      {canApprove && (
        <Button
          onClick={handleApprove}
          disabled={loading}
          size="sm"
          className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold flex items-center gap-1.5"
        >
          <CheckCircle className="w-4 h-4" />
          {loading ? t('approving') : t('approveUser')}
        </Button>
      )}
      {canDeactivate && (
        <Button
          onClick={handleDeactivate}
          disabled={loading}
          size="sm"
          variant="outline"
          className="border-destructive/20 text-destructive hover:bg-destructive/10 hover:text-destructive font-semibold flex items-center gap-1.5"
        >
          <Ban className="w-4 h-4" />
          {loading ? t('deactivating') : t('deactivate')}
        </Button>
      )}
    </div>
  )
}
