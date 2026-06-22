'use client'

import { useRouter } from '@/i18n/routing'
import { useTranslations } from 'next-intl'
import { CheckCircle, Ban, Send } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmButton } from '@/components/features/shared/ConfirmButton'
import { reactivarUsuario } from '@/lib/auth/actions'
import { deactivateUser } from '@/lib/admin/actions'
import { resendAdminInvite } from '@/lib/admin/admin-actions'
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
  /**
   * true solo cuando la fila es un administrador `pendiente` y el caller es
   * superadmin: habilita reenviar la invitación. Es independiente de la regla
   * de antigüedad (reenviar un enlace de activación es inofensivo).
   */
  canResend?: boolean
}

/**
 * Acciones de cuenta por fila (RF-63): reactivar (estado_cuenta = 'activa',
 * is_active = true — solo cuentas suspendidas/desactivadas, RF-65) y desactivar
 * (is_active = false), cada una con confirmación. Las cuentas 'pendiente' NO se
 * reactivan desde aquí: se activan solas al confirmar el correo. En la propia
 * fila del admin no se muestran (self-guard); sobre un admin que el caller no
 * puede gestionar, tampoco (canManage = false).
 */
export function AccountStatusActions({
  userId,
  estadoCuenta,
  isActive,
  isSelf,
  userName,
  canManage = true,
  canResend = false,
}: AccountStatusActionsProps) {
  const t = useTranslations('Admin')
  const router = useRouter()

  if (isSelf) {
    return <span className="text-xs text-muted-foreground">{t('selfRow')}</span>
  }

  // Si el caller no puede gestionar la fila y tampoco reenviar, no hay acciones.
  if (!canManage && !canResend) {
    return (
      <span className="text-xs text-muted-foreground">{t('protectedRow')}</span>
    )
  }

  // Reactivar (RF-65): solo cuentas suspendidas o desactivadas. Las 'pendiente'
  // (correo sin confirmar) NO se tocan desde aquí — se activan al confirmar.
  const canReactivate =
    canManage &&
    estadoCuenta !== 'pendiente' &&
    (estadoCuenta !== 'activa' || !isActive)
  const canDeactivate = canManage && isActive

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

  const handleReactivate = async () => {
    const result = await reactivarUsuario(userId)
    if (result.ok) {
      toast.success(t('userReactivated', { name: userName }))
      router.refresh()
    } else {
      toast.error(
        adminMgmtErrorMessage(result.error) ?? t('userReactivateError'),
      )
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

  const handleResend = async () => {
    const result = await resendAdminInvite({ idUsuario: userId })
    if (!result.ok) {
      toast.error(
        result.error === 'forbidden'
          ? t('errorRequiresSuperadmin')
          : t('inviteResendError'),
      )
      return
    }
    if (result.data.emailSent) {
      toast.success(t('inviteResent', { name: userName }))
    } else if (result.data.inviteLink) {
      await navigator.clipboard
        .writeText(result.data.inviteLink)
        .catch(() => {})
      toast.warning(t('inviteResentNoEmail'))
    } else {
      toast.error(t('inviteResendError'))
    }
    router.refresh()
  }

  return (
    <div className="flex items-center gap-2">
      {canResend && (
        <ConfirmButton
          onConfirm={handleResend}
          title={t('confirmResendTitle')}
          description={t('confirmResendDesc', { name: userName })}
          confirmLabel={t('resendInvite')}
          variant="outline"
          className="flex items-center gap-1.5 border-primary/20 font-semibold text-primary hover:bg-primary/10 hover:text-primary"
          confirmClassName="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Send className="h-4 w-4" />
          {t('resendInvite')}
        </ConfirmButton>
      )}
      {canReactivate && (
        <ConfirmButton
          onConfirm={handleReactivate}
          title={t('confirmReactivateTitle')}
          description={t('confirmReactivateDesc', { name: userName })}
          confirmLabel={t('reactivateUser')}
          className="flex items-center gap-1.5 bg-accent font-semibold text-accent-foreground hover:bg-accent/90"
          confirmClassName="bg-accent text-accent-foreground hover:bg-accent/90"
        >
          <CheckCircle className="h-4 w-4" />
          {t('reactivateUser')}
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
