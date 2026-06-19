'use server'

import { unstable_rethrow } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { toJsonb } from '@/lib/supabase/json'
import { ok, err, type Result } from '@/lib/result'
import { logger } from '@/lib/logger'
import { PLAZO_MIN_DIAS, PLAZO_MAX_DIAS } from './schemas'
import { parseLogistica, parseProposal } from './persistence'

/** Traduce un error del RPC/constraint a un código amigable de la UI. */
function mapRpcError(message: string | undefined): string {
  if (!message) return 'unexpected'
  if (
    message.includes('PLAZO_INVALIDO') ||
    message.includes('chk_proyectos_plazo')
  ) {
    return 'plazo'
  }
  if (message.includes('chk_proyectos_ubicacion')) return 'ubicacion'
  if (message.includes('chk_proyectos_presupuesto')) return 'presupuesto'
  if (message.includes('EMPRESARIO_NO_ENCONTRADO')) {
    return 'empresario_no_encontrado'
  }
  if (message.toLowerCase().includes('row-level security')) {
    return 'not_verified'
  }
  return 'unexpected'
}

/**
 * Publica el proyecto (errolpendiente §1 paso 7): toma el fondo de la propuesta
 * generada y la logística, hace la validación dura de NOT NULL y delega la
 * escritura atómica al RPC `publicar_proyecto` (que valida plazo y respeta RLS).
 * Requiere empresa verificada (chequeo explícito + RLS).
 */
export async function publishProject(
  conversationId: string,
): Promise<Result<{ projectId: string }>> {
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
      logger.error('publishProject: fallo al leer empresario', {
        error: empError.message,
      })
      return err('unexpected')
    }
    if (!empresario) {
      return err('empresario_no_encontrado')
    }
    if (empresario.estado_verificacion !== 'verificado') {
      return err('not_verified')
    }

    const { data: conv, error: convError } = await supabase
      .from('conversaciones_ia')
      .select('logistica, propuesta_generada')
      .eq('id_conversacion', conversationId)
      .eq('id_empresario', empresario.id_empresario)
      .eq('estado', 'en_curso')
      .maybeSingle()
    if (convError) {
      logger.error('publishProject: fallo al leer conversación', {
        error: convError.message,
      })
      return err('unexpected')
    }
    if (!conv) {
      return err('save_failed')
    }

    const propuesta = parseProposal(conv.propuesta_generada)
    const logistica = parseLogistica(conv.logistica)
    if (!propuesta || !logistica) {
      return err('no_proposal')
    }

    const tituloForm = logistica.titulo?.trim() ?? ''
    const titulo = (
      tituloForm.length > 0 ? tituloForm : propuesta.titulo
    ).trim()
    const descripcion = propuesta.descripcion.trim()
    // Red de seguridad de los NOT NULL antes del INSERT (errolpendiente §1 paso 7).
    if (
      titulo.length === 0 ||
      descripcion.length === 0 ||
      !logistica.modalidad
    ) {
      return err('invalid_input')
    }
    // Presupuesto obligatorio y > 0 (defensa por borradores viejos sin presupuesto).
    if (
      logistica.presupuestoMin == null ||
      logistica.presupuestoMax == null ||
      logistica.presupuestoMin <= 0 ||
      logistica.presupuestoMax <= 0 ||
      logistica.presupuestoMin > logistica.presupuestoMax
    ) {
      return err('invalid_input')
    }
    // Colones solo enteros (céntimos en desuso); USD admite decimales. Mitad
    // backend de la regla; el form y el schema de logística validan lo mismo.
    if (
      logistica.moneda === 'CRC' &&
      (!Number.isInteger(logistica.presupuestoMin) ||
        !Number.isInteger(logistica.presupuestoMax))
    ) {
      return err('presupuestoEntero')
    }
    // Plazo en días y en rango (defensa por borradores viejos que guardaban
    // `fechaCierre` en vez de `plazoDias`). El RPC lo re-valida y calcula la fecha.
    if (
      !Number.isInteger(logistica.plazoDias) ||
      logistica.plazoDias < PLAZO_MIN_DIAS ||
      logistica.plazoDias > PLAZO_MAX_DIAS
    ) {
      return err('plazo')
    }

    const { data: projectId, error: rpcError } = await supabase.rpc(
      'publicar_proyecto',
      {
        p_conversacion: conversationId,
        p_titulo: titulo,
        p_descripcion: descripcion,
        p_id_area: propuesta.idArea,
        p_modalidad: logistica.modalidad,
        p_pais: logistica.paisProyecto,
        p_ciudad: logistica.ciudadProyecto,
        p_moneda: logistica.moneda,
        p_presupuesto_min: logistica.presupuestoMin,
        p_presupuesto_max: logistica.presupuestoMax,
        p_plazo_dias: logistica.plazoDias,
        p_categorias: propuesta.categorias.map((categoria) => categoria.id),
        p_tecnologias: propuesta.tecnologias.map((tecnologia) => tecnologia.id),
        p_propuesta: toJsonb(propuesta),
        p_involucra_ia: propuesta.involucraIa,
        p_generado_por_ia: true,
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
    unstable_rethrow(e)
    const msg = e instanceof Error ? e.message : 'unexpected_error'
    logger.error('publishProject: error inesperado', { error: msg })
    return err('unexpected')
  }
}
