-- ============================================================
-- MIGRACIÓN 20260621000000 — Adjudicación: barrer los "sobres cerrados"
-- Fecha: 2026-06-21
-- ------------------------------------------------------------
-- PARA SAMIR (revisar antes de aplicar):
--   Toca el RPC compartido `adjudicar_participacion` y hace UN backfill de datos.
--   NO modifica el trigger `validar_transicion_participacion` (la regla de
--   Santiago "no hay enviada -> no_seleccionada directo" se RESPETA).
--
-- PROBLEMA QUE RESUELVE
--   Al adjudicar, el RPC anterior solo pasaba a `no_seleccionada` las ofertas que
--   el empresario ya había puesto `en_revision`. Las que seguían `enviada` (nunca
--   abiertas, "sobre cerrado") quedaban en `enviada` para siempre: la UI las pinta
--   como "no seleccionada" (derivación cosmética en `computeEstadoParticipacionEfectivo`)
--   pero en la BD seguían vivas, así que (a) nunca recibían notificación y (b)
--   inflaban el cupo del estudiante (`validar_cupo` cuenta enviada+en_revision+contratada).
--
-- CÓMO LO RESUELVE — SIN romper la máquina de estados
--   El RPC corre `security invoker` (como el empresario = rol authenticated), así
--   que el trigger valida cada salto. En vez del salto ilegal enviada->no_seleccionada,
--   se CAMINA el camino legal en dos pasos dentro de la misma transacción atómica:
--     enviada -> en_revision  (legal)  -> no_seleccionada (legal)
--   El paso por `en_revision` es transitorio e invisible fuera de la transacción;
--   no se escribe calificacion/comentario, así que no se inventa una "revisión".
--
-- BACKFILL (una sola pasada)
--   Alinea la BD con lo que la UI ya muestra hoy. Corre como dueño de la migración
--   (no como `authenticated`), y el trigger deja pasar a ese rol sin validar
--   (`if current_user is distinct from 'authenticated' then return new`), por eso
--   aquí el salto puede ser directo:
--     · proyectos adjudicado/en_desarrollo/finalizado: enviada/en_revision -> no_seleccionada
--     · proyectos cancelado:                            enviada/en_revision -> cancelada
--   Esto además recalcula contadores (triggers AFTER UPDATE) y libera el cupo.
--   Es limpieza SILENCIOSA: no dispara notificaciones (las notifs viven en la capa
--   de aplicación, no en SQL).
--   NOTA DE VETO: si el equipo prefiere NO tocar los proyectos `cancelado`, borrar
--   el segundo UPDATE del backfill antes de aplicar. El resto es independiente.
--
-- Idempotente: CREATE OR REPLACE FUNCTION. El backfill es naturalmente idempotente
-- (tras correr, ya no quedan filas enviada/en_revision en proyectos terminales).
-- ============================================================

-- ------------------------------------------------------------
-- 1. RPC: adjudicar y barrer también los sobres cerrados
-- ------------------------------------------------------------
create or replace function public.adjudicar_participacion(
  p_id_participacion uuid,
  p_id_proyecto      uuid
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_empresario uuid;
  v_estado     estado_participacion_enum;
begin
  -- 1. Empresario del usuario autenticado.
  select id_empresario into v_empresario
  from public.empresarios
  where id_usuario = auth.uid();

  if v_empresario is null then
    raise exception 'EMPRESARIO_NO_ENCONTRADO';
  end if;

  -- 2. La participación debe existir, pertenecer al proyecto indicado y ese
  --    proyecto ser del empresario. Leemos su estado de paso.
  select pa.estado into v_estado
  from public.participaciones pa
  join public.proyectos p on p.id_proyecto = pa.id_proyecto
  where pa.id_participacion = p_id_participacion
    and pa.id_proyecto      = p_id_proyecto
    and p.id_empresario     = v_empresario;

  if v_estado is null then
    raise exception 'PARTICIPACION_NO_ENCONTRADA';
  end if;

  if v_estado <> 'en_revision' then
    raise exception 'TRANSICION_INVALIDA';
  end if;

  -- 3. Ganador -> contratada (dispara crear_contratacion_al_adjudicar).
  update public.participaciones
  set estado = 'contratada'
  where id_participacion = p_id_participacion;

  -- 4a. Sobres cerrados (enviada) -> en_revision. Paso legal y transitorio para
  --     no violar la máquina de estados (no existe enviada -> no_seleccionada
  --     directo); el estado intermedio es invisible fuera de esta transacción.
  update public.participaciones
  set estado = 'en_revision'
  where id_proyecto      = p_id_proyecto
    and estado           = 'enviada'
    and id_participacion <> p_id_participacion;

  -- 4b. Resto de ofertas en revisión (las ya revisadas + las recién barridas)
  --     -> no_seleccionada.
  update public.participaciones
  set estado = 'no_seleccionada',
      no_seleccionada_at = now()
  where id_proyecto      = p_id_proyecto
    and estado           = 'en_revision'
    and id_participacion <> p_id_participacion;

  -- 5. Proyecto -> adjudicado.
  update public.proyectos
  set estado = 'adjudicado'
  where id_proyecto = p_id_proyecto;
end;
$$;

comment on function public.adjudicar_participacion is
  'Adjudica un proyecto a una participación de forma atómica (RF-37 + RF-39): ganador a contratada (crea contratación vía trigger), el resto de ofertas vivas (revisadas Y sobres cerrados, estos vía enviada->en_revision->no_seleccionada) a no_seleccionada, y proyecto a adjudicado, en una sola transacción. SECURITY INVOKER: respeta RLS y la máquina de estados.';

revoke execute on function public.adjudicar_participacion(uuid, uuid) from public, anon;
grant  execute on function public.adjudicar_participacion(uuid, uuid) to authenticated;

-- ------------------------------------------------------------
-- 2. Backfill (una sola pasada) — alinear la BD con la UI derivada
-- ------------------------------------------------------------
-- Proyectos ya decididos: ofertas vivas -> no_seleccionada.
update public.participaciones pa
set estado = 'no_seleccionada',
    no_seleccionada_at = coalesce(pa.no_seleccionada_at, now())
from public.proyectos p
where p.id_proyecto = pa.id_proyecto
  and p.estado in ('adjudicado', 'en_desarrollo', 'finalizado')
  and pa.estado in ('enviada', 'en_revision');

-- Proyectos cancelados: ofertas vivas -> cancelada.
-- (Si el equipo no quiere tocar cancelados, borrar este bloque — ver NOTA DE VETO.)
update public.participaciones pa
set estado = 'cancelada'
from public.proyectos p
where p.id_proyecto = pa.id_proyecto
  and p.estado = 'cancelado'
  and pa.estado in ('enviada', 'en_revision');
