'use server'

import { getLocale, getTranslations } from 'next-intl/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { ok, err, type Result } from '@/lib/result'
import { logger } from '@/lib/logger'
import type { Json } from '@/types/database'
import { getAiProvider } from '@/lib/ai/provider'
import type { HistorialEntry } from '@/lib/ai/types'
import { getProjectCatalogs } from './actions'
import { parseHistorial, parseLogistica } from './persistence'
import { resolveCatalog } from './proposal-mapping'
import type { PropuestaProyecto } from './schemas'

const MAX_INTENTOS = 3

export type ProposalOutcome =
  | { estado: 'ok'; propuesta: PropuestaProyecto; historial: HistorialEntry[] }
  | { estado: 'rechazada'; historial: HistorialEntry[] }

/**
 * Genera la propuesta (errolpendiente §1 paso 6, llamadas #2 y #3): arma la
 * propuesta, resuelve nombres contra el catálogo y la valida ANTES de mostrarla.
 * Si falla la validación, reintenta con los ajustes hasta MAX_INTENTOS; tras eso
 * la rechaza con las razones (el flujo le sugiere contactar a un admin).
 */
export async function generateProposal(
  conversationId: string,
): Promise<Result<ProposalOutcome>> {
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
      logger.error('generateProposal: fallo al leer empresario', {
        error: empError.message,
      })
      return err('unexpected')
    }
    if (!empresario) {
      return err('empresario_no_encontrado')
    }
    // Gate de costo: la propuesta dispara hasta MAX_INTENTOS llamadas a la IA
    // (las más caras del flujo). Solo para empresas verificadas.
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
      logger.error('generateProposal: fallo al leer conversación', {
        error: convError.message,
      })
      return err('unexpected')
    }
    if (!conv) {
      return err('save_failed')
    }

    const contextoInicial = (conv.contexto_inicial ?? '').trim()
    if (contextoInicial.length === 0) {
      return err('no_context')
    }

    const catalogsRes = await getProjectCatalogs()
    if (!catalogsRes.ok) {
      return err('unexpected')
    }
    const catalogs = catalogsRes.data
    const logistica = parseLogistica(conv.logistica)
    const historial = parseHistorial(conv.historial)
    const provider = getAiProvider()
    const locale = await getLocale()

    let ajustes: string[] = []
    let ultimasRazones: string[] = []

    for (let intento = 0; intento < MAX_INTENTOS; intento++) {
      const raw = await provider.generarPropuesta({
        contextoInicial,
        logistica,
        historial,
        catalogos: {
          areas: catalogs.areas.map((area) => area.nombre),
          categorias: catalogs.categorias.map((categoria) => categoria.nombre),
          tecnologias: catalogs.tecnologias.map(
            (tecnologia) => tecnologia.nombre,
          ),
        },
        ajustes,
        locale,
      })

      const categorias = resolveCatalog(raw.categorias, catalogs.categorias)
      const tecnologias = resolveCatalog(raw.tecnologias, catalogs.tecnologias)
      const area = resolveCatalog([raw.area], catalogs.areas)[0] ?? null

      // Red de seguridad: si la IA no eligió del catálogo, no es publicable.
      if (categorias.length === 0 || tecnologias.length === 0) {
        ajustes = [
          'Elegí al menos una categoría y una tecnología del catálogo provisto.',
        ]
        ultimasRazones = ajustes
        continue
      }

      const validacion = await provider.validarPropuesta(raw, locale)
      if (!validacion.valido) {
        ajustes = validacion.ajustes
        ultimasRazones = validacion.razones
        continue
      }

      const propuesta: PropuestaProyecto = {
        titulo: raw.titulo.trim(),
        descripcion: raw.descripcion.trim(),
        idArea: area?.id ?? null,
        areaNombre: area?.nombre ?? null,
        categorias,
        tecnologias,
        stackSugerido: raw.stackSugerido,
        involucraIa: raw.involucraIa,
      }

      const historialFinal: HistorialEntry[] = [
        ...historial,
        {
          rol: 'ia',
          tipo: 'propuesta',
          contenido: JSON.stringify(propuesta),
          fecha: new Date().toISOString(),
        },
      ]

      const { data: updated, error: updateError } = await supabase
        .from('conversaciones_ia')
        .update({
          // Cast a Json: ya tipamos estos objetos; Supabase espera `Json`.
          propuesta_generada: propuesta as unknown as Json,
          stack_sugerido: raw.stackSugerido as unknown as Json,
          nivel_tecnico_empresario: raw.nivelTecnico,
          historial: historialFinal as unknown as Json,
          modelo_ia: provider.modelId,
        })
        .eq('id_conversacion', conversationId)
        .eq('id_empresario', empresario.id_empresario)
        .eq('estado', 'en_curso')
        .select('id_conversacion')
        .maybeSingle()
      if (updateError || !updated) {
        logger.error('generateProposal: fallo al guardar propuesta', {
          error: updateError?.message ?? 'sin_fila',
        })
        return err('save_failed')
      }

      return ok<ProposalOutcome>({
        estado: 'ok',
        propuesta,
        historial: historialFinal,
      })
    }

    // Rechazada tras los reintentos: la IA le explica al empresario qué falta,
    // en el chat (errolpendiente §5.1: tope de reintentos → explicar).
    const detalles = ajustes.length > 0 ? ajustes : ultimasRazones
    // Mensaje de chat visible al empresario → i18n (en su idioma, no hardcoded).
    const t = await getTranslations('ProjectPublish')
    const mensajeRechazo =
      detalles.length > 0
        ? t('agentRejection.withDetails', { detalles: detalles.join('\n- ') })
        : t('agentRejection.noDetails')
    const historialRechazo: HistorialEntry[] = [
      ...historial,
      {
        rol: 'ia',
        tipo: 'mensaje',
        contenido: mensajeRechazo,
        fecha: new Date().toISOString(),
      },
    ]
    const { data: updatedRechazo, error: updateRechazoError } = await supabase
      .from('conversaciones_ia')
      .update({
        historial: historialRechazo as unknown as Json,
        modelo_ia: provider.modelId,
      })
      .eq('id_conversacion', conversationId)
      .eq('id_empresario', empresario.id_empresario)
      .eq('estado', 'en_curso')
      .select('id_conversacion')
      .maybeSingle()
    if (updateRechazoError || !updatedRechazo) {
      logger.error('generateProposal: fallo al guardar feedback de rechazo', {
        error: updateRechazoError?.message ?? 'sin_fila',
      })
      return err('save_failed')
    }

    logger.warn('generateProposal: propuesta rechazada tras reintentos', {
      razones: ultimasRazones,
    })
    return ok<ProposalOutcome>({
      estado: 'rechazada',
      historial: historialRechazo,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unexpected_error'
    if (msg === 'AI_NOT_CONFIGURED') {
      return err('ai_not_configured')
    }
    logger.error('generateProposal: error inesperado', { error: msg })
    return err('ai_failed')
  }
}
