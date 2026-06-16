'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { ok, err, type Result } from '@/lib/result'
import { logger } from '@/lib/logger'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { requireRole } from '@/lib/auth/guards'

const ProjectIdSchema = z.string().uuid()
const MotivoSchema = z.string().trim().max(500).optional()

/**
 * Cancela un proyecto desde el panel de admin (por moderación). Solo cancela
 * proyectos que no estén ya cancelados o finalizados (son estados terminales).
 *
 * Solo un admin puede invocarla. Usa el cliente de servicio para bypassear RLS
 * (la policy `proyectos_select_auth` solo permite al dueño ver/editar los suyos).
 */
export async function cancelProjectAsAdmin(
  projectId: string,
  motivo?: string,
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
    .select('id_proyecto, estado')
    .eq('id_proyecto', parsedId.data)
    .single()

  if (readError || !proyecto) {
    logger.error('cancelProjectAsAdmin: proyecto no encontrado', {
      projectId,
      error: readError?.message,
    })
    return err('project_not_found')
  }

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
    motivo: parsedMotivo.data ?? 'sin motivo',
  })

  revalidatePath('/admin/projects', 'page')
  return ok(undefined)
}
