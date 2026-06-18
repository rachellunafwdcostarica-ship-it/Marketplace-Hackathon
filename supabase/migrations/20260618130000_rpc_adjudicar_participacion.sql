-- ============================================================
-- RPC adjudicar_participacion — adjudicación atómica (RF-37 + RF-39)
-- ------------------------------------------------------------
-- Antes, la adjudicación vivía en la server action `adjudicarParticipacion`
-- como 3 UPDATE secuenciales NO atómicos: si fallaba a mitad, quedaba el ganador
-- `contratada` (con su contratación ya creada por trigger) pero el proyecto sin
-- `adjudicado` o el resto sin `no_seleccionada` -> estado parcial recuperable
-- solo por admin. Este RPC mete los 3 cambios en UNA transacción.
--
-- SECURITY INVOKER: respeta RLS (igual que publicar_proyecto). El empresario
-- autenticado puede actualizar participaciones de sus proyectos (rama empresario
-- de participaciones_update) y su proyecto (proyectos_update_own). La transición
-- en_revision->contratada / en_revision->no_seleccionada la valida el trigger
-- validar_transicion_participacion; el paso a 'contratada' dispara
-- crear_contratacion_al_adjudicar (crea la contratación dentro de la misma tx).
-- ============================================================

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

  -- 4. Resto de ofertas en revisión del proyecto -> no_seleccionada.
  update public.participaciones
  set estado = 'no_seleccionada'
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
  'Adjudica un proyecto a una participación de forma atómica (RF-37 + RF-39): ganador a contratada (crea contratación vía trigger), resto a no_seleccionada y proyecto a adjudicado, en una sola transacción. SECURITY INVOKER: respeta RLS.';

revoke execute on function public.adjudicar_participacion(uuid, uuid) from public, anon;
grant  execute on function public.adjudicar_participacion(uuid, uuid) to authenticated;
