-- ============================================================
-- RPC publicar_proyecto — Fase 1 (publicación de proyectos, RF-19..22)
-- ------------------------------------------------------------
-- Publica un proyecto de forma ATÓMICA en una sola transacción:
--   1. proyectos                (fila principal)
--   2. proyecto_categorias      (puente N:M, RF-19)
--   3. proyecto_tecnologias     (puente N:M, RF-22)
--   4. conversaciones_ia        (cierre + enlace al proyecto, flujo paso 7)
--
-- SECURITY INVOKER: la función NO eleva privilegios. Las políticas RLS
-- siguen aplicando al empresario autenticado, incluida la exigencia de
-- estado_verificacion = 'verificado' para insertar en proyectos.
--
-- Los CHECK de proyectos (chk_proyectos_plazo 5..15 días, chk_proyectos_ubicacion,
-- chk_proyectos_presupuesto) actúan como red dura: si la entrada los viola,
-- el INSERT lanza excepción y toda la transacción se revierte.
--
-- NOTA: NO toca usa_ia / involucra_ia / generado_por_ia. El rename de §0 de
-- errolpendiente.md queda diferido a la fase de IA real (deuda registrada).
-- ============================================================

create or replace function public.publicar_proyecto(
  p_conversacion       uuid,
  p_titulo             varchar,
  p_descripcion        text,
  p_id_area            uuid,
  p_modalidad          modalidad_enum,
  p_pais               varchar,
  p_ciudad             varchar,
  p_moneda             moneda_enum,
  p_presupuesto_min    numeric,
  p_presupuesto_max    numeric,
  p_fecha_publicacion  timestamptz,
  p_fecha_cierre       timestamptz,
  p_categorias         uuid[],
  p_tecnologias        uuid[],
  p_contexto_inicial   text,
  p_propuesta          jsonb,
  p_modelo_ia          varchar
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_empresario uuid;
  v_proyecto   uuid;
begin
  -- 1. Resolver el empresario del usuario autenticado.
  select id_empresario into v_empresario
  from public.empresarios
  where id_usuario = auth.uid();

  if v_empresario is null then
    raise exception 'EMPRESARIO_NO_ENCONTRADO';
  end if;

  -- 2. Insertar el proyecto. La RLS (WITH CHECK) exige empresario verificado;
  --    los CHECK de plazo/ubicación/presupuesto validan los datos.
  insert into public.proyectos (
    id_empresario, id_area_negocio, titulo, descripcion,
    modalidad, pais_proyecto, ciudad_proyecto, moneda,
    presupuesto_min, presupuesto_max, estado,
    fecha_publicacion, fecha_cierre
  ) values (
    v_empresario, p_id_area, p_titulo, p_descripcion,
    p_modalidad, p_pais, p_ciudad, p_moneda,
    p_presupuesto_min, p_presupuesto_max, 'abierto',
    p_fecha_publicacion, p_fecha_cierre
  )
  returning id_proyecto into v_proyecto;

  -- 3. Puentes N:M (RF-19 categorías, RF-22 tecnologías).
  if p_categorias is not null and array_length(p_categorias, 1) is not null then
    insert into public.proyecto_categorias (id_proyecto, id_categoria)
    select v_proyecto, unnest(p_categorias);
  end if;

  if p_tecnologias is not null and array_length(p_tecnologias, 1) is not null then
    insert into public.proyecto_tecnologias (id_proyecto, id_tecnologia)
    select v_proyecto, unnest(p_tecnologias);
  end if;

  -- 4. Cerrar la conversación y enlazarla al proyecto (flujo paso 7).
  update public.conversaciones_ia
  set id_proyecto        = v_proyecto,
      contexto_inicial   = coalesce(contexto_inicial, p_contexto_inicial),
      propuesta_aprobada = p_propuesta,
      estado             = 'finalizada',
      modelo_ia          = p_modelo_ia,
      fecha_fin          = now()
  where id_conversacion = p_conversacion
    and id_empresario   = v_empresario;

  return v_proyecto;
end;
$$;

comment on function public.publicar_proyecto is
  'Publica un proyecto de forma atómica (proyectos + puentes + cierre de conversación). SECURITY INVOKER: respeta RLS. Fase 1.';

-- Solo usuarios autenticados pueden ejecutarla; nunca anon.
revoke execute on function public.publicar_proyecto(
  uuid, varchar, text, uuid, modalidad_enum, varchar, varchar, moneda_enum,
  numeric, numeric, timestamptz, timestamptz, uuid[], uuid[], text, jsonb, varchar
) from public, anon;

grant execute on function public.publicar_proyecto(
  uuid, varchar, text, uuid, modalidad_enum, varchar, varchar, moneda_enum,
  numeric, numeric, timestamptz, timestamptz, uuid[], uuid[], text, jsonb, varchar
) to authenticated;
