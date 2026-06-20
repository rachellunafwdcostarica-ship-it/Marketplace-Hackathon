import 'server-only'
import { headers } from 'next/headers'
import { logger } from '@/lib/logger'
import { createGmailTransport, getGmailFrom } from '@/lib/email/gmail'
import {
  adminInviteHtml,
  adminInviteSubject,
} from '@/lib/email/templates/admin-invite'
import type { createSupabaseAdminClient } from '@/lib/supabase/admin'

type AdminClient = ReturnType<typeof createSupabaseAdminClient>

export interface AdminInviteDelivery {
  /** Enlace de un solo uso para fijar contraseña; se muestra como respaldo. */
  inviteLink: string | null
  /** true si el correo se envió correctamente. */
  emailSent: boolean
}

async function resolveBaseUrl(): Promise<string> {
  const reqHeaders = await headers()
  const host =
    reqHeaders.get('x-forwarded-host') ??
    reqHeaders.get('host') ??
    'localhost:3000'
  const proto = reqHeaders.get('x-forwarded-proto') ?? 'https'
  return `${proto}://${host}`
}

/**
 * Genera un enlace de recuperación hacia /auth/confirm y envía el correo de
 * invitación de admin. Lo comparten el alta (`inviteAdmin`) y el reenvío
 * (`resendAdminInvite`): lo único que cambia entre ambos es lo que ocurre antes
 * (crear vs. validar la cuenta) y la traza de auditoría.
 *
 * El enlace apunta a /auth/confirm (verifyOtp con token_hash), no al action_link
 * de Supabase, que devuelve la sesión en el hash de la URL —ilegible para un
 * route handler del servidor.
 */
export async function generateAndSendAdminInvite(params: {
  adminClient: AdminClient
  correo: string
  nivelAdmin: 'superadmin' | 'admin'
}): Promise<AdminInviteDelivery> {
  const { adminClient, correo, nivelAdmin } = params
  const baseUrl = await resolveBaseUrl()

  let inviteLink: string | null = null
  const { data: linkData, error: linkError } =
    await adminClient.auth.admin.generateLink({
      type: 'recovery',
      email: correo,
    })
  if (linkError) {
    logger.error('admin-invite: fallo al generar el enlace', {
      error: linkError.message,
    })
  } else {
    const tokenHash = linkData.properties?.hashed_token
    const otpType = linkData.properties?.verification_type
    if (tokenHash && otpType) {
      const urlParams = new URLSearchParams({
        token_hash: tokenHash,
        type: otpType,
        next: '/reset-password',
      })
      inviteLink = `${baseUrl}/auth/confirm?${urlParams.toString()}`
    } else {
      logger.error('admin-invite: el enlace generado no incluye token_hash')
    }
  }

  let emailSent = false
  if (inviteLink) {
    try {
      const transport = createGmailTransport()
      await transport.sendMail({
        from: getGmailFrom(),
        to: correo,
        subject: adminInviteSubject(),
        html: adminInviteHtml({ inviteUrl: inviteLink, nivelAdmin }),
      })
      emailSent = true
    } catch (e) {
      logger.error('admin-invite: fallo al enviar el correo', {
        error: e instanceof Error ? e.message : String(e),
      })
    }
  }

  return { inviteLink, emailSent }
}
