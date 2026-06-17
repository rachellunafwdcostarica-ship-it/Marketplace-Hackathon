'use server'

import { z } from 'zod'
import { ok, err, type Result } from '@/lib/result'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/guards'
import { logger } from '@/lib/logger'
import { revalidatePath } from 'next/cache'

const SubirEntregableSchema = z.object({
  idContratacion: z.string().uuid(),
  archivoPath: z.string().min(1).max(150),
  idProyecto: z.string().uuid(),
})

type SubirInput = z.infer<typeof SubirEntregableSchema>

async function registrarEntregable(
  input: SubirInput,
  tipo: 'parcial' | 'final',
): Promise<Result<void>> {
  const roleResult = await requireRole('egresado')
  if (!roleResult.ok) return roleResult

  const supabase = await createSupabaseServerClient()

  const { data: maxVerData } = await supabase
    .from('entregables')
    .select('version')
    .eq('id_contratacion', input.idContratacion)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()

  const version = (maxVerData?.version ?? 0) + 1

  const { error: insertError } = await supabase.from('entregables').insert({
    id_contratacion: input.idContratacion,
    tipo_entregable: tipo,
    archivo_url: input.archivoPath,
    version,
    estado: 'enviado',
  })

  if (insertError) {
    logger.error(`registrarEntregable (${tipo}) failed`, {
      error: insertError.message,
    })
    return err('database_error')
  }

  revalidatePath(`/junior/projects/${input.idProyecto}/entregables`)
  return ok(undefined)
}

/**
 * Registra un hito parcial (RF-40). El upload al storage ya ocurrió
 * en el cliente; este action solo inserta la fila en `entregables`.
 */
export async function subirHito(input: SubirInput): Promise<Result<void>> {
  const parsed = SubirEntregableSchema.safeParse(input)
  if (!parsed.success) return err('invalid_input')
  return registrarEntregable(parsed.data, 'parcial')
}

/**
 * Registra el entregable final (RF-41). Mismo patrón que subirHito
 * pero con tipo_entregable='final'.
 */
export async function subirEntregableFinal(
  input: SubirInput,
): Promise<Result<void>> {
  const parsed = SubirEntregableSchema.safeParse(input)
  if (!parsed.success) return err('invalid_input')
  return registrarEntregable(parsed.data, 'final')
}
