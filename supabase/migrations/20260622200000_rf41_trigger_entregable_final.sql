-- ============================================================
-- RF-41 — Trigger entregable final → en_revision + RPC actualizado
-- ------------------------------------------------------------
-- Problema: registrarEntregable() insertaba todos los entregables con
-- estado='enviado', sin distinción entre parciales y finales. El valor
-- 'en_revision' de estado_entregable_enum existía desde la migración
-- inicial (20260608000001) pero nunca se usaba.
--
-- A) BEFORE INSERT trigger: si tipo_entregable='final', cambia
--    automáticamente estado → 'en_revision' antes de persistir la fila.
--    Esto cumple RF-41 ("egresado marca el entregable final como listo
--    para revisión del empresario") de forma centralizada en la BD,
--    sin depender de que el código de la app recuerde pasar el estado.
--
-- B) CREATE OR REPLACE FUNCTION del RPC finalizar_proyecto_por_entregable:
--    amplía el check de estado de 'enviado' exacto a
--    NOT IN ('enviado', 'en_revision'), retro-compatible con filas
--    existentes que tengan estado='enviado'.
--
-- Compatibilidad con triggers existentes:
--   trg_auto_estado_entregable_final  (nuevo, BEFORE INSERT)
--   trg_validar_estado_entregable     (preexistente, BEFORE INSERT OR UPDATE)
--   PostgreSQL ejecuta BEFORE ROW triggers en orden alfabético por nombre;
--   trg_auto... corre primero (cambia estado), trg_validar... corre segundo
--   (valida estado del proyecto — solo le importa el proyecto, no el estado
--   del entregable mismo, por lo que no hay conflicto).
-- ============================================================


-- ── A) Trigger: estado automático para entregable final ──────────────────────

create or replace function public.auto_set_estado_entregable_final()
returns trigger
language plpgsql
as $$
begin
  if new.tipo_entregable = 'final' then
    new.estado := 'en_revision';
  end if;
  return new;
end;
$$;

create trigger trg_auto_estado_entregable_final
  before insert on public.entregables
  for each row execute function public.auto_set_estado_entregable_final();


-- ── B) RPC actualizado: acepta 'en_revision' además de 'enviado' ─────────────

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

  -- Acepta 'enviado' (filas previas al deploy de este trigger) y 'en_revision'
  -- (estado que el trigger trg_auto_estado_entregable_final asigna desde ahora).
  if v_estado_ent not in ('enviado', 'en_revision') then
    raise exception 'ESTADO_INVALIDO';
  end if;

  -- 3. Aprobar el entregable final (con el proyecto aún en adjudicado/en_desarrollo).
  -- ORDEN CRÍTICO: se aprueba el entregable ANTES de cambiar el proyecto. El
  -- trigger trg_validar_estado_entregable exige que el proyecto esté en
  -- ('adjudicado','en_desarrollo') para tocar entregables; si finalizáramos
  -- el proyecto primero, ese UPDATE del entregable sería rechazado.
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
  'Cierra el ciclo (RF-41) al aprobar el entregable final: aprueba el entregable y pasa proyecto/contratación/participación a finalizado, en una transacción. Acepta entregables en estado enviado (filas previas) o en_revision (estado por defecto desde RF-41). Habilita las calificaciones mutuas. SECURITY INVOKER: respeta RLS.';

revoke execute on function public.finalizar_proyecto_por_entregable(uuid, text) from public, anon;
grant  execute on function public.finalizar_proyecto_por_entregable(uuid, text) to authenticated;
