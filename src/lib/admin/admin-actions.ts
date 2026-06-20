'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { ok, err, type Result } from '@/lib/result'
import { logger } from '@/lib/logger'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { requireSuperadmin } from '@/lib/auth/guards'
import { createGmailTransport, getGmailFrom } from '@/lib/email/gmail'
import {
  adminInviteHtml,
  adminInviteSubject,
} from '@/lib/email/templates/admin-invite'
import { NIVELES_ADMIN_ASIGNABLES } from '@/lib/admin/admin-management'

const InviteAdminSchema = z.object({
  correo: z.string().trim().email().max(150),
  nivelAdmin: z.enum(NIVELES_ADMIN_ASIGNABLES),
})

export type InviteAdminInput = z.input<typeof InviteAdminSchema>

export interface InviteAdminResult {
  /** Enlace de un solo uso para fijar contraseña; se muestra como respaldo. */
  inviteLink: string | null
  /** true si el correo de invitación se envió correctamente. */
  emailSent: boolean
}

/**
 * Registra a una persona como administrador por invitación (RF-01 reinterpretado
 * de forma segura: el alta de admin la hace otro admin, no el auto-registro).
 *
 * Flujo (Opción 1 — la cuenta nace "pendiente" y se activa al fijar contraseña):
 *  1. Solo un superadmin puede invocarla (`requireSuperadmin`).
 *  2. Rechaza correos ya registrados (mensaje genérico, anti-enumeración).
 *  3. Crea el usuario en Auth SIN contraseña (`email_confirm: true`, pero
 *     `estado_cuenta` queda 'pendiente' a nivel de app hasta que fije su clave).
 *  4. Un ÚNICO UPDATE asigna `id_rol` + `nivel_admin` a la vez: el trigger
 *     `validar_nivel_admin` exige que un administrador tenga nivel no nulo.
 *  5. Genera un enlace de recuperación → /reset-password (donde la persona fija
 *     su contraseña y `updatePassword` la pasa a 'activa').
 *  6. Envía el correo; si falla, devuelve el enlace para entregarlo a mano.
 *  7. Deja traza en `auditoria` (RNF-05).
 *
 * Usa el cliente de servicio: createUser, el UPDATE de columnas congeladas por
 * los guards y el insert en `auditoria` solo pasan con service_role.
 */
export async function inviteAdmin(
  input: InviteAdminInput,
): Promise<Result<InviteAdminResult>> {
  const auth = await requireSuperadmin()
  if (!auth.ok) {
    return auth
  }

  const parsed = InviteAdminSchema.safeParse(input)
  if (!parsed.success) {
    return err('invalid_input')
  }
  const { correo, nivelAdmin } = parsed.data

  const adminClient = createSupabaseAdminClient()

  // (2) Anti-enumeración: no convertir ni pisar una cuenta existente.
  const { data: existente } = await adminClient
    .from('usuarios')
    .select('id_usuario')
    .eq('correo', correo)
    .maybeSingle()
  if (existente) {
    return err('email_already_exists')
  }

  // Resolver el id_rol de 'administrador'.
  const { data: rol, error: rolError } = await adminClient
    .from('roles')
    .select('id_rol')
    .eq('nombre_rol', 'administrador')
    .maybeSingle()
  if (rolError || !rol) {
    logger.error('inviteAdmin: fallo al resolver rol administrador', {
      error: rolError?.message,
    })
    return err('rol_lookup_failed')
  }

  // (3) Crear el usuario en Auth sin contraseña. El trigger handle_new_user
  // crea la fila en usuarios con id_rol NULL y estado_cuenta 'pendiente'.
  const { data: created, error: createError } =
    await adminClient.auth.admin.createUser({
      email: correo,
      email_confirm: true,
    })
  if (createError || !created.user) {
    const message = createError?.message?.toLowerCase() ?? ''
    if (message.includes('already') || message.includes('exist')) {
      return err('email_already_exists')
    }
    logger.error('inviteAdmin: fallo al crear el usuario en Auth', {
      error: createError?.message,
    })
    return err('create_failed')
  }
  const nuevoId = created.user.id

  // (4) Un solo UPDATE: id_rol + nivel_admin juntos (lo exige validar_nivel_admin).
  const { error: updateError } = await adminClient
    .from('usuarios')
    .update({ id_rol: rol.id_rol, nivel_admin: nivelAdmin })
    .eq('id_usuario', nuevoId)
  if (updateError) {
    logger.error('inviteAdmin: fallo al asignar rol/nivel; revirtiendo alta', {
      error: updateError.message,
      nuevoId,
    })
    // Evitar dejar un usuario huérfano sin rol: borrar la cuenta recién creada.
    const { error: rollbackError } =
      await adminClient.auth.admin.deleteUser(nuevoId)
    if (rollbackError) {
      logger.error('inviteAdmin: fallo el rollback del usuario huérfano', {
        error: rollbackError.message,
        nuevoId,
      })
    }
    return err('update_failed')
  }

  // (5) Enlace para fijar contraseña + (6) correo de invitación.
  const reqHeaders = await headers()
  const host =
    reqHeaders.get('x-forwarded-host') ??
    reqHeaders.get('host') ??
    'localhost:3000'
  const proto = reqHeaders.get('x-forwarded-proto') ?? 'https'
  const baseUrl = `${proto}://${host}`
  const redirectTo = `${baseUrl}/auth/callback?next=/reset-password`

  let inviteLink: string | null = null
  const { data: linkData, error: linkError } =
    await adminClient.auth.admin.generateLink({
      type: 'recovery',
      email: correo,
      options: { redirectTo },
    })
  if (linkError) {
    logger.error('inviteAdmin: fallo al generar el enlace de invitación', {
      error: linkError.message,
      nuevoId,
    })
  } else {
    inviteLink = linkData.properties?.action_link ?? null
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
      logger.error('inviteAdmin: fallo al enviar el correo de invitación', {
        error: e instanceof Error ? e.message : String(e),
        nuevoId,
      })
    }
  }

  // (7) Auditoría (RNF-05).
  const ipOrigen =
    reqHeaders.get('x-forwarded-for')?.split(',')[0]?.trim().slice(0, 80) ??
    null
  const { error: auditError } = await adminClient.from('auditoria').insert({
    id_actor: auth.data.userId,
    accion: 'crear_admin',
    entidad: 'usuarios',
    id_entidad: nuevoId,
    valores_despues: { correo, nivel_admin: nivelAdmin },
    ip_origen: ipOrigen,
  })
  if (auditError) {
    logger.error('inviteAdmin: fallo al registrar en auditoria', {
      error: auditError.message,
      nuevoId,
    })
  }

  revalidatePath('/admin/users', 'page')
  revalidatePath('/admin/registro-admin', 'page')
  return ok({ inviteLink, emailSent })
}
