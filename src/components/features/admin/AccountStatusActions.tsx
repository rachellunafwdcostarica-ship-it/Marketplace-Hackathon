'use client'

import { useRouter } from '@/i18n/routing'
import { useTranslations } from 'next-intl'
import { CheckCircle, Ban } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmButton } from '@/components/features/shared/ConfirmButton'
import { approveUser } from '@/lib/auth/actions'
import { deactivateUser } from '@/lib/admin/actions'
import type { AdminAccountStatus } from '@/lib/admin/queries'

interface AccountStatusActionsProps {
  userId: string
  estadoCuenta: AdminAccountStatus
  isActive: boolean
  isSelf: boolean
  userName: string
  /**
   * false cuando la fila es de un administrador que este caller no puede
   * gestionar (no es superadmin, o la regla de antigüedad lo impide). El
   * backend igual valida; esto solo evita ofrecer una acción que fallaría.
   */
  canManage?: boolean
}

/**
 * Acciones de cuenta por fila (RF-63): aprobar (estado_cuenta = 'activa',
 * is_active = true) y desactivar (is_active = false), cada una con confirmación.
 * En la propia fila del admin no se muestran (self-guard). Sobre un admin que
 * el caller no puede gestionar, tampoco (canManage = false).
 */
export function AccountStatusActions({
  userId,
  estadoCuenta,
  isActive,
  isSelf,
  userName,
  canManage = true,
}: AccountStatusActionsProps) {
  const t = useTranslations('Admin')
  const router = useRouter()

  if (isSelf) {
    return <span className="text-xs text-muted-foreground">{t('selfRow')}</span>
  }

  if (!canManage) {
    return (
      <span className="text-xs text-muted-foreground">{t('protectedRow')}</span>
    )
  }

  const canApprove = estadoCuenta !== 'activa' || !isActive
  const canDeactivate = isActive

  const adminMgmtErrorMessage = (error: string): string | null => {
    switch (error) {
      case 'requires_superadmin':
        return t('errorRequiresSuperadmin')
      case 'seniority':
        return t('errorSeniority')
      case 'last_superadmin':
        return t('errorLastSuperadmin')
      default:
        return null
    }
  }

  const handleApprove = async () => {
    const result = await approveUser(userId)
    if (result.ok) {
      toast.success(t('userApproved', { name: userName }))
      router.refresh()
    } else if (result.error === 'user_not_verified') {
      toast.error(t('userApproveNotVerified'))
    } else {
      toast.error(adminMgmtErrorMessage(result.error) ?? t('userApproveError'))
    }
  }

  const handleDeactivate = async () => {
    const result = await deactivateUser(userId)
    if (result.ok) {
      toast.success(t('userDeactivated', { name: userName }))
      router.refresh()
    } else if (result.error === 'cannot_modify_self') {
      toast.error(t('cannotModifySelf'))
    } else {
      toast.error(
        adminMgmtErrorMessage(result.error) ?? t('userDeactivateError'),
      )
    }
  }

  return (
    <div className="flex items-center gap-2">
      {canApprove && (
        <ConfirmButton
          onConfirm={handleApprove}
          title={t('confirmApproveTitle')}
          description={t('confirmApproveDesc', { name: userName })}
          confirmLabel={t('approveUser')}
          className="flex items-center gap-1.5 bg-accent font-semibold text-accent-foreground hover:bg-accent/90"
          confirmClassName="bg-accent text-accent-foreground hover:bg-accent/90"
        >
          <CheckCircle className="h-4 w-4" />
          {t('approveUser')}
        </ConfirmButton>
      )}
      {canDeactivate && (
        <ConfirmButton
          onConfirm={handleDeactivate}
          title={t('confirmDeactivateTitle')}
          description={t('confirmDeactivateDesc', { name: userName })}
          confirmLabel={t('deactivate')}
          variant="outline"
          className="flex items-center gap-1.5 border-magenta/20 font-semibold text-magenta hover:bg-magenta/10 hover:text-magenta"
          confirmClassName="bg-magenta text-magenta-foreground hover:bg-magenta/90"
        >
          <Ban className="h-4 w-4" />
          {t('deactivate')}
        </ConfirmButton>
      )}
    </div>
  )
}
