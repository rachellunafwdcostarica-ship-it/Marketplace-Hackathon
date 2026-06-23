'use server'

import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { requireRole } from '@/lib/auth/guards'
import { ok, err, type Result } from '@/lib/result'
import { logger } from '@/lib/logger'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'

const CatalogNameSchema = z
  .string()
  .trim()
  .min(2, 'El nombre debe tener al menos 2 caracteres')
  .max(100)

type CatalogType = 'tecnologias' | 'categorias'

export async function createCatalogItem(
  type: CatalogType,
  name: string,
): Promise<Result<void>> {
  const parsedName = CatalogNameSchema.safeParse(name)
  if (!parsedName.success) {
    return err('invalid_name')
  }

  const authResult = await requireRole('administrador')
  if (!authResult.ok) return authResult

  const adminClient = createSupabaseAdminClient()

  const { error } =
    type === 'tecnologias'
      ? await adminClient
          .from('tecnologias')
          .insert({ nombre: parsedName.data, is_active: true })
      : await adminClient
          .from('categorias')
          .insert({ nombre: parsedName.data, is_active: true })

  if (error) {
    logger.error('createCatalogItem failed', {
      error: error.message,
      type,
      name,
    })
    return err(error.message)
  }

  revalidatePath('/admin/catalogs', 'page')
  return ok(undefined)
}

export async function toggleCatalogItemStatus(
  type: CatalogType,
  id: string,
  newStatus: boolean,
): Promise<Result<void>> {
  const parsedId = z.string().uuid().safeParse(id)
  if (!parsedId.success) return err('invalid_id')

  const authResult = await requireRole('administrador')
  if (!authResult.ok) return authResult

  const adminClient = createSupabaseAdminClient()

  const { error } =
    type === 'tecnologias'
      ? await adminClient
          .from('tecnologias')
          .update({ is_active: newStatus })
          .eq('id_tecnologia', parsedId.data)
      : await adminClient
          .from('categorias')
          .update({ is_active: newStatus })
          .eq('id_categoria', parsedId.data)

  if (error) {
    logger.error('toggleCatalogItemStatus failed', {
      error: error.message,
      type,
      id,
      newStatus,
    })
    return err(error.message)
  }

  revalidatePath('/admin/catalogs', 'page')
  return ok(undefined)
}

export async function getCatalogs() {
  const authResult = await requireRole('administrador')
  if (!authResult.ok) return err(authResult.error)

  const adminClient = createSupabaseAdminClient()

  const [techRes, catRes] = await Promise.all([
    adminClient.from('tecnologias').select('*').order('nombre'),
    adminClient.from('categorias').select('*').order('nombre'),
  ])

  if (techRes.error || catRes.error) {
    logger.error('getCatalogs failed', {
      techError: techRes.error?.message,
      catError: catRes.error?.message,
    })
    return err('db_error')
  }

  return ok({
    tecnologias: techRes.data,
    categorias: catRes.data,
  })
}
