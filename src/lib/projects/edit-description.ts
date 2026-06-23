'use server'

import { z } from 'zod'
import { headers } from 'next/headers'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { ok, err, type Result } from '@/lib/result'
import { logger } from '@/lib/logger'
import { crearNotificaciones } from '@/lib/notifications/create'
import { toJsonb } from '@/lib/supabase/json'
import { createGmailTransport, getGmailFrom } from '@/lib/email/gmail'
import {
  proyectoModificadoHtml,
  proyectoModificadoSubject,
} from '@/lib/email/templates/proyecto-modificado'
import { getAiProvider } from '@/lib/proposal-ai/provider'
import { DEFAULT_LOCALE } from '@/i18n/config'
import {
  computeEstadoEfectivoProyecto,
  type EstadoParticipacion,
  type EstadoProyecto,
} from './project-detail-logic'
import {
  DESCRIPCION_MAX_LEN,
  ESTADOS_OFERENTE_ACTIVO,
  buildNotificacionMensaje,
  buildPropuestaParaValidar,
  canEditProjectDescription,
} from './edit-description-logic'

/**
 * Edición de la DESCRIPCIÓN de un proyecto publicado (errolpendiente §4.1,
 * refinamiento de RF-24): editable solo mientras `abierto`, el cambio pasa por
 * la validación #3 de la IA (aislada) ANTES de guardar y, si se acepta, se
 * notifica a los oferentes activos (in-app + email). Si la IA rechaza, no se
 * guarda nada y se devuelven las razones/ajustes.
 */
export type EditDescriptionOutcome =
  | { estado: 'guardada'; descripcion: string; notificados: number }
  | { estado: 'sin_cambios' }
  | { estado: 'rechazada'; razones: string[]; ajustes: string[] }

const EditDescriptionSchema = z.object({
  idProyecto: z.string().uuid(),
  descripcion: z.string().trim().min(1).max(DESCRIPCION_MAX_LEN),
})

interface ProyectoEditRaw {
  titulo: string
  descripcion: string
  estado: EstadoProyecto
  fecha_cierre: string | null
  involucra_ia: boolean
  areas_negocio: { nombre: string } | null
  proyecto_categorias: { categorias: { nombre: string } | null }[]
  proyecto_tecnologias: { tecnologias: { nombre: string } | null }[]
}

const PROYECTO_EDIT_SELECT =
  'titulo, descripcion, estado, fecha_cierre, involucra_ia, areas_negocio(nombre), proyecto_categorias(categorias(nombre)), proyecto_tecnologias(tecnologias(nombre))'

export async function editProjectDescription(
  input: z.infer<typeof EditDescriptionSchema>,
  localeParam?: string,
): Promise<Result<EditDescriptionOutcome>> {
  try {
    const parsed = EditDescriptionSchema.safeParse(input)
    if (!parsed.success) return err('invalid_input')
    const { idProyecto, descripcion } = parsed.data

    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) return err('unauthorized')

    const { data: empresario, error: empError } = await supabase
      .from('empresarios')
      .select('id_empresario')
      .eq('id_usuario', user.id)
      .maybeSingle()
    if (empError) {
      logger.error('editProjectDescription: fallo al leer empresario', {
        error: empError.message,
      })
      return err('unexpected')
    }
    if (!empresario) return err('empresario_no_encontrado')

    const { data: proyectoRaw, error: readError } = await supabase
      .from('proyectos')
      .select(PROYECTO_EDIT_SELECT)
      .eq('id_proyecto', idProyecto)
      .eq('id_empresario', empresario.id_empresario)
      .maybeSingle()
    if (readError) {
      logger.error('editProjectDescription: fallo al leer proyecto', {
        error: readError.message,
      })
      return err('unexpected')
    }
    if (!proyectoRaw) return err('proyecto_no_encontrado')

    // Cast: el typado de selects anidados de Supabase es poco confiable (mismo
    // patrón que dashboard.ts); mapeamos a mano.
    const proyecto = proyectoRaw as unknown as ProyectoEditRaw

    const estadoEfectivo = computeEstadoEfectivoProyecto(
      proyecto.estado,
      proyecto.fecha_cierre,
    )
    if (!canEditProjectDescription(estadoEfectivo)) return err('no_editable')

    if (descripcion === proyecto.descripcion.trim()) {
      return ok<EditDescriptionOutcome>({ estado: 'sin_cambios' })
    }

    const categorias = proyecto.proyecto_categorias
      .map((pc) => pc.categorias?.nombre)
      .filter((nombre): nombre is string => Boolean(nombre))
    const tecnologias = proyecto.proyecto_tecnologias
      .map((pt) => pt.tecnologias?.nombre)
      .filter((nombre): nombre is string => Boolean(nombre))

    const locale = localeParam === 'en' ? 'en' : 'es'
    const propuesta = buildPropuestaParaValidar(
      {
        titulo: proyecto.titulo,
        areaNombre: proyecto.areas_negocio?.nombre ?? null,
        categorias,
        tecnologias,
        involucraIa: proyecto.involucra_ia,
      },
      descripcion,
    )

    // Validación #3 (aislada). Un fallo TÉCNICO (timeout, JSON inválido) sale como
    // 'ai_failed' ("probá de nuevo"); un rechazo de CONTENIDO devuelve razones.
    let validacion
    try {
      const provider = getAiProvider()
      validacion = await provider.validarPropuesta(
        propuesta,
        proyecto.titulo,
        locale,
      )
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'error_desconocido'
      if (msg === 'AI_NOT_CONFIGURED') return err('ai_not_configured')
      logger.error('editProjectDescription: fallo técnico de la IA', {
        error: msg,
      })
      return err('ai_failed')
    }

    if (!validacion.valido) {
      return ok<EditDescriptionOutcome>({
        estado: 'rechazada',
        razones: validacion.razones,
        ajustes: validacion.ajustes,
      })
    }

    // Guardar. El `estado='abierto'` en el WHERE es un candado de fila: si el
    // proyecto cambió de estado entre la lectura y ahora, no se pisa el cambio.
    const { data: updated, error: updateError } = await supabase
      .from('proyectos')
      .update({ descripcion })
      .eq('id_proyecto', idProyecto)
      .eq('id_empresario', empresario.id_empresario)
      .eq('estado', 'abierto')
      .select('id_proyecto')
      .maybeSingle()
    if (updateError) {
      logger.error('editProjectDescription: fallo al guardar descripción', {
        error: updateError.message,
      })
      return err('update_failed')
    }
    if (!updated) return err('no_editable')

    // Auditoría + notificaciones (service_role). Best-effort: si algo de esto
    // falla, la edición YA está guardada; se loguea y se sigue.
    const baseUrl = await resolveBaseUrl()
    const notificados = await registrarEdicionYNotificar({
      idProyecto,
      tituloProyecto: proyecto.titulo,
      idActor: user.id,
      descripcionAntes: proyecto.descripcion,
      descripcionDespues: descripcion,
      baseUrl,
    })

    return ok<EditDescriptionOutcome>({
      estado: 'guardada',
      descripcion,
      notificados,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unexpected_error'
    logger.error('editProjectDescription: error inesperado', { error: msg })
    return err('unexpected')
  }
}

/** baseUrl del request (mismo criterio que `auth/actions.ts`) para el link del email. */
async function resolveBaseUrl(): Promise<string> {
  const reqHeaders = await headers()
  const host =
    reqHeaders.get('x-forwarded-host') ??
    reqHeaders.get('host') ??
    'localhost:3000'
  const proto = reqHeaders.get('x-forwarded-proto') ?? 'https'
  return `${proto}://${host}`
}

interface OferenteRaw {
  estado: EstadoParticipacion
  estudiantes: {
    usuarios: { id_usuario: string; correo: string; nombre: string } | null
  } | null
}

interface Oferente {
  idUsuario: string
  correo: string
  nombre: string
}

/**
 * Registra la edición en `auditoria` y notifica a los oferentes activos
 * (in-app + email). Usa service_role: ni `auditoria` ni `notificaciones` tienen
 * policy de INSERT (solo el dueño lee/actualiza la suya), y los correos/nombres
 * de los estudiantes están ocultos al empresario por RLS. Devuelve cuántos
 * oferentes se notificaron. NO lanza: cualquier fallo se loguea y se sigue.
 */
async function registrarEdicionYNotificar(params: {
  idProyecto: string
  tituloProyecto: string
  idActor: string
  descripcionAntes: string
  descripcionDespues: string
  baseUrl: string
}): Promise<number> {
  const {
    idProyecto,
    tituloProyecto,
    idActor,
    descripcionAntes,
    descripcionDespues,
    baseUrl,
  } = params
  const admin = createSupabaseAdminClient()

  const { error: auditError } = await admin.from('auditoria').insert({
    accion: 'editar_descripcion_proyecto',
    entidad: 'proyectos',
    id_entidad: idProyecto,
    id_actor: idActor,
    valores_antes: toJsonb({ descripcion: descripcionAntes }),
    valores_despues: toJsonb({ descripcion: descripcionDespues }),
  })
  if (auditError) {
    logger.error('editProjectDescription: fallo al auditar', {
      error: auditError.message,
      idProyecto,
    })
  }

  const { data: filas, error: ofError } = await admin
    .from('participaciones')
    .select('estado, estudiantes(usuarios(id_usuario, correo, nombre))')
    .eq('id_proyecto', idProyecto)
    .in('estado', [...ESTADOS_OFERENTE_ACTIVO])
  if (ofError) {
    logger.error('editProjectDescription: fallo al leer oferentes', {
      error: ofError.message,
      idProyecto,
    })
    return 0
  }

  // Dedupe por usuario (defensa; un estudiante no debería tener dos vivas).
  const porUsuario = new Map<string, Oferente>()
  for (const fila of (filas ?? []) as unknown as OferenteRaw[]) {
    const u = fila.estudiantes?.usuarios
    if (u?.id_usuario && u.correo) {
      porUsuario.set(u.id_usuario, {
        idUsuario: u.id_usuario,
        correo: u.correo,
        nombre: u.nombre,
      })
    }
  }
  const oferentes = [...porUsuario.values()]
  if (oferentes.length === 0) return 0

  const path = `/${DEFAULT_LOCALE}/egresado/projects/${idProyecto}`
  const mensaje = buildNotificacionMensaje(tituloProyecto)

  const notifResult = await crearNotificaciones(
    oferentes.map((o) => ({
      idUsuario: o.idUsuario,
      tipoEvento: 'proyecto_modificado' as const,
      mensaje,
      urlDestino: path,
      params: { titulo: tituloProyecto },
    })),
  )
  if (!notifResult.ok) {
    logger.error('editProjectDescription: fallo al insertar notificaciones', {
      error: notifResult.error,
      idProyecto,
    })
  }

  await enviarEmailsOferentes(oferentes, tituloProyecto, `${baseUrl}${path}`)

  return oferentes.length
}

/** Envía el correo a cada oferente. Best-effort: cada fallo se loguea sin abortar. */
async function enviarEmailsOferentes(
  oferentes: Oferente[],
  tituloProyecto: string,
  urlProyecto: string,
): Promise<void> {
  let transport: ReturnType<typeof createGmailTransport>
  try {
    transport = createGmailTransport()
  } catch (e) {
    logger.error('editProjectDescription: Gmail no configurado', {
      error: e instanceof Error ? e.message : String(e),
    })
    return
  }
  const from = getGmailFrom()
  const subject = proyectoModificadoSubject(tituloProyecto)

  await Promise.all(
    oferentes.map(async (o) => {
      try {
        await transport.sendMail({
          from,
          to: o.correo,
          subject,
          html: proyectoModificadoHtml({
            nombre: o.nombre,
            tituloProyecto,
            urlProyecto,
          }),
        })
      } catch (e) {
        logger.error(
          'editProjectDescription: fallo al enviar email a oferente',
          {
            error: e instanceof Error ? e.message : String(e),
          },
        )
      }
    }),
  )
}
