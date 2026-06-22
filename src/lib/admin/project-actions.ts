'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { ok, err, type Result } from '@/lib/result'
import { logger } from '@/lib/logger'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { requireRole } from '@/lib/auth/guards'

const ProjectIdSchema = z.string().uuid()
const MotivoSchema = z.string().trim().min(5, 'El motivo debe tener al menos 5 caracteres').max(500)

/**
 * Cancela un proyecto desde el panel de admin (por moderación). Solo cancela
 * proyectos que no estén ya cancelados o finalizados (son estados terminales).
 *
 * Solo un admin puede invocarla. Usa el cliente de servicio para bypassear RLS
 * (la policy `proyectos_select_auth` solo permite al dueño ver/editar los suyos).
 */
export async function cancelProjectAsAdmin(
  projectId: string,
  motivo: string,
): Promise<Result<void>> {
  const parsedId = ProjectIdSchema.safeParse(projectId)
  if (!parsedId.success) {
    return err('invalid_project_id')
  }

  const parsedMotivo = MotivoSchema.safeParse(motivo)
  if (!parsedMotivo.success) {
    return err('invalid_motivo')
  }

  const authResult = await requireRole('administrador')
  if (!authResult.ok) {
    return authResult
  }

  const adminClient = createSupabaseAdminClient()

  // Verificar que el proyecto existe y obtener su estado actual
  const { data: proyecto, error: readError } = await adminClient
    .from('proyectos')
    .select('id_proyecto, estado, titulo, id_empresario')
    .eq('id_proyecto', parsedId.data)
    .single()

  if (readError || !proyecto) {
    logger.error('cancelProjectAsAdmin: proyecto no encontrado', {
      projectId,
      error: readError?.message,
    })
    return err('project_not_found')
  }

  // Obtener correo del empresario dueño
  const { data: empresario } = await adminClient
    .from('usuarios')
    .select('correo, nombre, apellido_1')
    .eq('id_usuario', proyecto.id_empresario)
    .maybeSingle()

  // No cancelar estados terminales
  if (proyecto.estado === 'cancelado' || proyecto.estado === 'finalizado') {
    return err('already_terminal')
  }

  const { error } = await adminClient
    .from('proyectos')
    .update({ estado: 'cancelado' })
    .eq('id_proyecto', parsedId.data)

  if (error) {
    logger.error('cancelProjectAsAdmin: fallo al cancelar proyecto', {
      projectId,
      error: error.message,
      motivo: parsedMotivo.data,
    })
    return err(error.message)
  }

  logger.info('cancelProjectAsAdmin: proyecto cancelado por admin', {
    projectId,
    estadoAnterior: proyecto.estado,
    motivo: parsedMotivo.data,
  })

  // Enviar correo de notificación al empresario
  if (empresario?.correo) {
    try {
      const { createGmailTransport, getGmailFrom } = await import('@/lib/email/gmail')
      const { projectCancelledHtml, projectCancelledSubject } = await import('@/lib/email/templates/project-cancelled')
      
      const transport = createGmailTransport()
      await transport.sendMail({
        from: getGmailFrom(),
        to: empresario.correo,
        subject: projectCancelledSubject(proyecto.titulo),
        html: projectCancelledHtml({
          nombre: empresario.nombre ?? 'Empresario',
          tituloProyecto: proyecto.titulo,
          motivo: parsedMotivo.data,
        }),
      })
    } catch (e) {
      logger.error('cancelProjectAsAdmin: fallo al enviar correo al empresario', {
        error: e instanceof Error ? e.message : String(e),
        projectId,
      })
    }
  }

  revalidatePath('/admin/projects', 'page')
  return ok(undefined)
}
