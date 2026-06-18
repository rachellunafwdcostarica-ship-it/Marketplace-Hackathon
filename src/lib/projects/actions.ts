'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { ok, err, type Result } from '@/lib/result'
import { logger } from '@/lib/logger'
import type { Json } from '@/types/database'
import type { HistorialEntry } from '@/lib/proposal-ai/types'
import {
  buildLogisticsSchema,
  toLogisticaDraft,
  type LogisticaDraft,
  type LogisticsFormValues,
  type PropuestaProyecto,
} from './schemas'
import { parseHistorial, parseLogistica, parseProposal } from './persistence'

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
  logistica: LogisticaDraft | null
  contextoInicial: string
  historial: HistorialEntry[]
  propuesta: PropuestaProyecto | null
}

/**
 * Catálogos del fondo (áreas, categorías, tecnologías). En el flujo nuevo NO
 * alimentan la Pantalla 1: se usan en la propuesta de la IA (Pantalla 2, Corte 4)
 * para que el empresario revise/ajuste lo que la IA propuso (RF-20, RF-22).
 */
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
      .select(
        'id_conversacion, contexto_inicial, logistica, historial, propuesta_generada',
      )
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
      return ok({
        conversationId: existing.id_conversacion,
        isVerified,
        logistica: parseLogistica(existing.logistica),
        contextoInicial: existing.contexto_inicial ?? '',
        historial: parseHistorial(existing.historial),
        propuesta: parseProposal(existing.propuesta_generada),
      })
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

    return ok({
      conversationId: created.id_conversacion,
      isVerified,
      logistica: null,
      contextoInicial: '',
      historial: [],
      propuesta: null,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unexpected_error'
    logger.error('initProjectPublishing: error inesperado', { error: msg })
    return err(msg)
  }
}

/**
 * Descarta el borrador en curso del empresario (errolpendiente §3): pasa su(s)
 * conversación(es) `en_curso` a `estado='abandonada'`. NO borra la fila (el doc
 * prohíbe el borrado: se conserva como rastro). Scopeado por `id_empresario` +
 * RLS, así que solo afecta lo del propio empresario. Tras esto, la próxima carga
 * de la pantalla arranca un borrador limpio (initProjectPublishing crea uno nuevo).
 */
export async function discardDraft(): Promise<Result<{ discarded: boolean }>> {
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
      .select('id_empresario')
      .eq('id_usuario', user.id)
      .maybeSingle()
    if (empError) {
      logger.error('discardDraft: fallo al leer empresario', {
        error: empError.message,
      })
      return err('unexpected')
    }
    if (!empresario) {
      return err('empresario_no_encontrado')
    }

    const { error: updError } = await supabase
      .from('conversaciones_ia')
      .update({ estado: 'abandonada', fecha_fin: new Date().toISOString() })
      .eq('id_empresario', empresario.id_empresario)
      .eq('estado', 'en_curso')
    if (updError) {
      logger.error('discardDraft: fallo al descartar borrador', {
        error: updError.message,
      })
      return err('save_failed')
    }

    return ok({ discarded: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unexpected_error'
    logger.error('discardDraft: error inesperado', { error: msg })
    return err('unexpected')
  }
}

/**
 * Guarda el borrador de la Pantalla 1 en `conversaciones_ia` (errolpendiente §1
 * paso 2, §2): la logística va a `logistica` (jsonb) y el cuadro de contexto a
 * `contexto_inicial`, para que la conversación se retome completa tras una
 * recarga. Todavía NO publica nada.
 *
 * Nota: la inmutabilidad de `contexto_inicial` (§2) se hará valer desde el Corte
 * 2, cuando el chat empiece a consumirlo; en la Pantalla 1 el empresario aún lo
 * está componiendo, así que se sobrescribe al re-confirmar.
 */
export async function saveLogisticsDraft(
  conversationId: string,
  values: LogisticsFormValues,
): Promise<Result<{ saved: boolean }>> {
  try {
    const parsed = buildLogisticsSchema().safeParse(values)
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
      .select('id_empresario')
      .eq('id_usuario', user.id)
      .maybeSingle()
    if (empError) {
      logger.error('saveLogisticsDraft: fallo al leer empresario', {
        error: empError.message,
      })
      return err('unexpected')
    }
    if (!empresario) {
      return err('empresario_no_encontrado')
    }

    const draft = toLogisticaDraft(parsed.data)

    const { data: updated, error: updateError } = await supabase
      .from('conversaciones_ia')
      .update({
        // El draft ya está validado por Zod; Supabase tipa el jsonb como `Json`
        // (sin index signature compatible con interfaces nombradas), de ahí el cast.
        logistica: draft as unknown as Json,
        contexto_inicial: parsed.data.contextoInicial,
      })
      .eq('id_conversacion', conversationId)
      .eq('id_empresario', empresario.id_empresario)
      .eq('estado', 'en_curso')
      .select('id_conversacion')
      .maybeSingle()
    if (updateError) {
      logger.error('saveLogisticsDraft: fallo al guardar logística', {
        error: updateError.message,
      })
      return err('save_failed')
    }
    if (!updated) {
      // RLS o filtros no afectaron filas: conversación ajena, inexistente o cerrada.
      logger.warn('saveLogisticsDraft: sin fila afectada al guardar', {
        conversationId,
      })
      return err('save_failed')
    }

    return ok({ saved: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unexpected_error'
    logger.error('saveLogisticsDraft: error inesperado', { error: msg })
    return err('unexpected')
  }
}
