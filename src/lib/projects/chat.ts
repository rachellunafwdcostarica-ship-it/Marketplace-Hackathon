'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { ok, err, type Result } from '@/lib/result'
import { logger } from '@/lib/logger'
import type { Json } from '@/types/database'
import { getAiProvider } from '@/lib/ai/provider'
import type { HistorialEntry } from '@/lib/ai/types'
import { parseHistorial, parseLogistica } from './persistence'

const MENSAJE_MAX = 2000

/**
 * Turno de chat con la IA (errolpendiente §1 paso 3, RF-54/55, llamada #1).
 * Agrega el mensaje del empresario al `historial`, llama a la IA con el contexto
 * + la logística + el historial, agrega la respuesta y persiste todo append-only.
 * La conversación debe ser del empresario y estar `en_curso` (RLS + filtros).
 */
export async function sendChatMessage(
  conversationId: string,
  text?: string,
): Promise<Result<{ historial: HistorialEntry[]; completo: boolean }>> {
  try {
    const texto = (text ?? '').trim()
    if (texto.length > MENSAJE_MAX) {
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
      logger.error('sendChatMessage: fallo al leer empresario', {
        error: empError.message,
      })
      return err('unexpected')
    }
    if (!empresario) {
      return err('empresario_no_encontrado')
    }
    // Gate de costo: la IA solo corre para empresas verificadas. Sin este
    // chequeo, un empresario no verificado podría quemar tokens antes de
    // siquiera poder publicar (la verificación la hace un admin).
    if (empresario.estado_verificacion !== 'verificado') {
      return err('not_verified')
    }

    const { data: conv, error: convError } = await supabase
      .from('conversaciones_ia')
      .select('contexto_inicial, logistica, historial')
      .eq('id_conversacion', conversationId)
      .eq('id_empresario', empresario.id_empresario)
      .eq('estado', 'en_curso')
      .maybeSingle()
    if (convError) {
      logger.error('sendChatMessage: fallo al leer conversación', {
        error: convError.message,
      })
      return err('unexpected')
    }
    if (!conv) {
      return err('save_failed')
    }

    const contextoInicial = (conv.contexto_inicial ?? '').trim()
    if (contextoInicial.length === 0) {
      // El contexto se setea en la Pantalla 1; sin él no hay de qué conversar.
      return err('no_context')
    }

    const historialPrevio = parseHistorial(conv.historial)
    // Kickoff (sin texto): la IA reacciona al contexto inicial. Solo válido como
    // primer turno; con historial ya existente, el mensaje del empresario es obligatorio.
    const esKickoff = texto.length === 0
    if (esKickoff && historialPrevio.length > 0) {
      return err('invalid_input')
    }

    const ahora = new Date().toISOString()
    const historialConUsuario: HistorialEntry[] = esKickoff
      ? historialPrevio
      : [
          ...historialPrevio,
          {
            rol: 'empresario',
            tipo: 'mensaje',
            contenido: texto,
            fecha: ahora,
          },
        ]

    const provider = getAiProvider()
    const respuesta = await provider.conversar({
      contextoInicial,
      logistica: parseLogistica(conv.logistica),
      historial: historialConUsuario,
    })

    const historialFinal: HistorialEntry[] = [
      ...historialConUsuario,
      {
        rol: 'ia',
        tipo: 'mensaje',
        contenido: respuesta.mensaje,
        fecha: new Date().toISOString(),
      },
    ]

    const { data: updated, error: updateError } = await supabase
      .from('conversaciones_ia')
      .update({
        // historial ya tipado por nosotros; Supabase espera `Json` (sin index
        // signature compatible con interfaces nombradas), de ahí el cast.
        historial: historialFinal as unknown as Json,
        modelo_ia: provider.modelId,
      })
      .eq('id_conversacion', conversationId)
      .eq('id_empresario', empresario.id_empresario)
      .eq('estado', 'en_curso')
      .select('id_conversacion')
      .maybeSingle()
    if (updateError || !updated) {
      logger.error('sendChatMessage: fallo al guardar historial', {
        error: updateError?.message ?? 'sin_fila',
      })
      return err('save_failed')
    }

    return ok({ historial: historialFinal, completo: respuesta.completo })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unexpected_error'
    if (msg === 'AI_NOT_CONFIGURED') {
      return err('ai_not_configured')
    }
    logger.error('sendChatMessage: error inesperado', { error: msg })
    return err('ai_failed')
  }
}
