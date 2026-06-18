-- ============================================================
-- RPC finalizar_proyecto_por_entregable — cierre del ciclo (RF-41)
-- ------------------------------------------------------------
-- Hueco que cierra: nada llevaba proyecto/contratación/participación a estado
-- finalizado, así que las calificaciones mutuas (que exigen contratación
-- 'finalizado': evaluaciones_insert_empresario y
-- evaluaciones_empresarios_insert_estudiante) eran inalcanzables.
--
-- Decisión: el cierre ocurre cuando el empresario APRUEBA el entregable FINAL
-- (RF-44). Este RPC, en UNA transacción:
--   2) aprueba el entregable final (comentario opcional),
--   3) proyecto      -> finalizado,
--   4) contratación  -> finalizado,
--   5) participación -> finalizada.
--
-- ORDEN CRÍTICO: se aprueba el entregable ANTES de cambiar el proyecto. El
-- trigger validar_estado_proyecto_para_entregable exige que el proyecto esté en
-- ('adjudicado','en_desarrollo') para tocar entregables; si finalizáramos el
-- proyecto primero, ese UPDATE del entregable sería rechazado.
--
-- SECURITY INVOKER: respeta RLS. El empresario dueño puede setear el entregable
-- a 'aprobado' (entregables_update), el proyecto (proyectos_update_own), la
-- contratación (contrataciones_update_empresario) y la participación a
-- 'finalizada' (rama empresario de participaciones_update + trigger de transición
-- contratada->finalizada).
-- ============================================================

create or replace function public.finalizar_proyecto_por_entregable(
  p_id_entregable uuid,
  p_comentario    text
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_empresario       uuid;
  v_id_contratacion  uuid;
  v_id_participacion uuid;
  v_id_proyecto      uuid;
  v_tipo             tipo_entregable_enum;
  v_estado_ent       estado_entregable_enum;
begin
  -- 1. Empresario del usuario autenticado.
  select id_empresario into v_empresario
  from public.empresarios
  where id_usuario = auth.uid();

  if v_empresario is null then
    raise exception 'EMPRESARIO_NO_ENCONTRADO';
  end if;

  -- 2. Resolver la cadena entregable -> contratación -> participación -> proyecto
  --    y comprobar que el proyecto es del empresario.
  select e.tipo_entregable, e.estado, e.id_contratacion,
         c.id_participacion, pa.id_proyecto
    into v_tipo, v_estado_ent, v_id_contratacion, v_id_participacion, v_id_proyecto
  from public.entregables e
  join public.contrataciones  c  on c.id_contratacion  = e.id_contratacion
  join public.participaciones pa on pa.id_participacion = c.id_participacion
  join public.proyectos       p  on p.id_proyecto       = pa.id_proyecto
  where e.id_entregable = p_id_entregable
    and p.id_empresario = v_empresario;

  if v_id_proyecto is null then
    raise exception 'ENTREGABLE_NO_ENCONTRADO';
  end if;

  if v_tipo <> 'final' then
    raise exception 'ENTREGABLE_NO_FINAL';
  end if;

  if v_estado_ent <> 'enviado' then
    raise exception 'ESTADO_INVALIDO';
  end if;

  -- 3. Aprobar el entregable final (con el proyecto aún en adjudicado/en_desarrollo).
  update public.entregables
  set estado = 'aprobado',
      comentario_empresario = p_comentario
  where id_entregable = p_id_entregable;

  -- 4. Cierre del ciclo: proyecto, contratación y participación.
  update public.proyectos
  set estado = 'finalizado'
  where id_proyecto = v_id_proyecto;

  update public.contrataciones
  set estado_periodo = 'finalizado'
  where id_contratacion = v_id_contratacion;

  update public.participaciones
  set estado = 'finalizada'
  where id_participacion = v_id_participacion;
end;
$$;

comment on function public.finalizar_proyecto_por_entregable is
  'Cierra el ciclo (RF-41) al aprobar el entregable final: aprueba el entregable y pasa proyecto/contratación/participación a finalizado, en una transacción. Habilita las calificaciones mutuas. SECURITY INVOKER: respeta RLS.';

revoke execute on function public.finalizar_proyecto_por_entregable(uuid, text) from public, anon;
grant  execute on function public.finalizar_proyecto_por_entregable(uuid, text) to authenticated;
