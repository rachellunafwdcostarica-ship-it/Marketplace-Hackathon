'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { ok, err, type Result } from '@/lib/result'
import { logger } from '@/lib/logger'
import { getAiProvider } from '@/lib/ai/provider'
import {
  projectFormSchema,
  toPublishPayload,
  type ProjectFormValues,
} from './schemas'

export interface CatalogItem {
  id: string
  nombre: string
}

export interface ProjectCatalogs {
  areas: CatalogItem[]
  categorias: CatalogItem[]
  tecnologias: CatalogItem[]
}

export interface ProjectFlowInit {
  conversationId: string
  isVerified: boolean
}

/** Catálogos para los selects del formulario (RF-19, RF-20, RF-22). */
export async function getProjectCatalogs(): Promise<Result<ProjectCatalogs>> {
  try {
    const supabase = await createSupabaseServerClient()

    const [areasRes, categoriasRes, tecnologiasRes] = await Promise.all([
      supabase
        .from('areas_negocio')
        .select('id_area, nombre')
        .eq('is_active', true)
        .order('nombre'),
      supabase
        .from('categorias')
        .select('id_categoria, nombre')
        .eq('is_active', true)
        .order('nombre'),
      supabase
        .from('tecnologias')
        .select('id_tecnologia, nombre')
        .eq('is_active', true)
        .order('nombre'),
    ])

    const firstError =
      areasRes.error ?? categoriasRes.error ?? tecnologiasRes.error
    if (firstError) {
      logger.error('getProjectCatalogs: fallo al leer catálogos', {
        error: firstError.message,
      })
      return err(firstError.message)
    }

    return ok({
      areas: (areasRes.data ?? []).map((area) => ({
        id: area.id_area,
        nombre: area.nombre,
      })),
      categorias: (categoriasRes.data ?? []).map((categoria) => ({
        id: categoria.id_categoria,
        nombre: categoria.nombre,
      })),
      tecnologias: (tecnologiasRes.data ?? []).map((tecnologia) => ({
        id: tecnologia.id_tecnologia,
        nombre: tecnologia.nombre,
      })),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unexpected_error'
    logger.error('getProjectCatalogs: error inesperado', { error: msg })
    return err(msg)
  }
}

/**
 * Inicializa el flujo de publicación: resuelve el empresario, su estado de
 * verificación y reutiliza/crea la conversación de IA (errolpendiente flujo
 * paso 1: la conversación nace con el formulario).
 */
export async function initProjectPublishing(): Promise<
  Result<ProjectFlowInit>
> {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return err('unauthorized')
    }

    const { data: empresario, error: empError } = await supabase
      .from('empresarios')
      .select('id_empresario, estado_verificacion')
      .eq('id_usuario', user.id)
      .maybeSingle()
    if (empError) {
      logger.error('initProjectPublishing: fallo al leer empresario', {
        error: empError.message,
      })
      return err(empError.message)
    }
    if (!empresario) {
      return err('empresario_no_encontrado')
    }

    const isVerified = empresario.estado_verificacion === 'verificado'

    const { data: existing, error: convReadError } = await supabase
      .from('conversaciones_ia')
      .select('id_conversacion')
      .eq('id_empresario', empresario.id_empresario)
      .eq('estado', 'en_curso')
      .order('fecha_inicio', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (convReadError) {
      logger.error('initProjectPublishing: fallo al leer conversación', {
        error: convReadError.message,
      })
      return err(convReadError.message)
    }
    if (existing) {
      return ok({ conversationId: existing.id_conversacion, isVerified })
    }

    const { data: created, error: convInsertError } = await supabase
      .from('conversaciones_ia')
      .insert({ id_empresario: empresario.id_empresario })
      .select('id_conversacion')
      .single()
    if (convInsertError || !created) {
      logger.error('initProjectPublishing: fallo al crear conversación', {
        error: convInsertError?.message ?? 'sin_dato',
      })
      return err(convInsertError?.message ?? 'conversation_insert_failed')
    }

    return ok({ conversationId: created.id_conversacion, isVerified })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unexpected_error'
    logger.error('initProjectPublishing: error inesperado', { error: msg })
    return err(msg)
  }
}

/** Traduce un error del RPC/constraint a un código amigable de la UI. */
function mapRpcError(message: string | undefined): string {
  if (!message) return 'unexpected'
  if (message.includes('chk_proyectos_plazo')) return 'plazo'
  if (message.includes('chk_proyectos_ubicacion')) return 'ubicacion'
  if (message.includes('chk_proyectos_presupuesto')) return 'presupuesto'
  if (message.includes('EMPRESARIO_NO_ENCONTRADO')) {
    return 'empresario_no_encontrado'
  }
  if (message.toLowerCase().includes('row-level security'))
    return 'not_verified'
  return 'unexpected'
}

/**
 * Publica el proyecto: valida (Zod), corre el guardrail de IA (#3) y delega la
 * escritura atómica al RPC `publicar_proyecto`. Nada se publica sin pasar la
 * validación de la IA ni sin empresario verificado (RLS + chequeo explícito).
 */
export async function publishProject(
  conversationId: string,
  values: ProjectFormValues,
): Promise<Result<{ projectId: string }>> {
  try {
    const parsed = projectFormSchema.safeParse(values)
    if (!parsed.success) {
      return err('invalid_input')
    }

    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return err('unauthorized')
    }

    const { data: empresario, error: empError } = await supabase
      .from('empresarios')
      .select('id_empresario, estado_verificacion')
      .eq('id_usuario', user.id)
      .maybeSingle()
    if (empError) {
      logger.error('publishProject: fallo al leer empresario', {
        error: empError.message,
      })
      return err(empError.message)
    }
    if (!empresario) {
      return err('empresario_no_encontrado')
    }
    if (empresario.estado_verificacion !== 'verificado') {
      return err('not_verified')
    }

    const payload = toPublishPayload(parsed.data)

    const ai = getAiProvider()
    const validation = await ai.validateProposal({
      titulo: payload.titulo,
      descripcion: payload.descripcion,
      categorias: payload.categorias,
      tecnologias: payload.tecnologias,
      modalidad: payload.modalidad,
      contextoInicial: payload.contextoInicial,
    })
    if (!validation.valido) {
      logger.warn('publishProject: propuesta rechazada por la IA', {
        razones: validation.razones,
      })
      return err('ai_rejected')
    }

    const propuesta = { ...payload, validadaPor: ai.modelId }

    const client = supabase as unknown as {
      rpc: (
        fn: 'publicar_proyecto',
        args: Record<string, unknown>,
      ) => Promise<{ data: string | null; error: { message: string } | null }>
    }
    const { data: projectId, error: rpcError } = await client.rpc(
      'publicar_proyecto',
      {
        p_conversacion: conversationId,
        p_titulo: payload.titulo,
        p_descripcion: payload.descripcion,
        p_id_area: payload.idAreaNegocio,
        p_modalidad: payload.modalidad,
        p_pais: payload.paisProyecto,
        p_ciudad: payload.ciudadProyecto,
        p_moneda: payload.moneda,
        p_presupuesto_min: payload.presupuestoMin,
        p_presupuesto_max: payload.presupuestoMax,
        p_fecha_publicacion: payload.fechaPublicacionIso,
        p_fecha_cierre: payload.fechaCierreIso,
        p_categorias: payload.categorias,
        p_tecnologias: payload.tecnologias,
        p_contexto_inicial: payload.contextoInicial,
        p_propuesta: propuesta,
        p_modelo_ia: ai.modelId,
      },
    )

    if (rpcError || !projectId) {
      const mapped = mapRpcError(rpcError?.message)
      logger.error('publishProject: fallo al publicar proyecto', {
        error: rpcError?.message ?? 'sin_dato',
        mapped,
      })
      return err(mapped)
    }

    return ok({ projectId })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unexpected_error'
    logger.error('publishProject: error inesperado', { error: msg })
    return err('unexpected')
  }
}
