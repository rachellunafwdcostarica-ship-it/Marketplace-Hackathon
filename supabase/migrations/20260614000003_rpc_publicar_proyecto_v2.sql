-- ============================================================
-- RPC publicar_proyecto v2 — Corte 4 (publicación real, flujo paso 7)
-- ------------------------------------------------------------
-- Reemplaza (create or replace) la versión de 20260613120000 para el flujo de
-- IA real. Publica ATÓMICAMENTE: proyectos + puentes N:M + cierre de la
-- conversación, tomando el fondo de la propuesta aprobada y la logística.
--
-- Cambios vs v1:
--   · setea involucra_ia y generado_por_ia (requiere §0 ya aplicado).
--   · fecha_publicacion = inicio de HOY (date_trunc), para que el plazo case con
--     la validación calendario de la Pantalla 1 (sin desfasajes por la hora).
--   · valida el plazo 5..15 días en el backend (RF-21), además del CHECK.
--   · setea propuesta_aprobada y deja modelo_ia como estaba (ya lo seteó la IA).
--
-- SECURITY INVOKER: respeta RLS (proyectos_insert_verified_empresario exige
-- empresario verificado; las puentes tienen sus policies de INSERT).
-- ============================================================

-- El v1 tenía firma distinta (17 params): la borramos para que no quede como
-- overload. Idempotente: no falla si no existe.
drop function if exists public.publicar_proyecto(
  uuid, varchar, text, uuid, modalidad_enum, varchar, varchar, moneda_enum,
  numeric, numeric, timestamptz, timestamptz, uuid[], uuid[], text, jsonb, varchar
);

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
  p_fecha_cierre       timestamptz,
  p_categorias         uuid[],
  p_tecnologias        uuid[],
  p_propuesta          jsonb,
  p_involucra_ia       boolean,
  p_generado_por_ia    boolean
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_empresario uuid;
  v_proyecto   uuid;
  v_fecha_pub  timestamptz := date_trunc('day', now());
begin
  -- 1. Resolver el empresario del usuario autenticado.
  select id_empresario into v_empresario
  from public.empresarios
  where id_usuario = auth.uid();

  if v_empresario is null then
    raise exception 'EMPRESARIO_NO_ENCONTRADO';
  end if;

  -- 2. Validación dura de plazo (RF-21): 5..15 días desde la publicación.
  if p_fecha_cierre is null
     or (p_fecha_cierre - v_fecha_pub) < interval '5 days'
     or (p_fecha_cierre - v_fecha_pub) > interval '15 days' then
    raise exception 'PLAZO_INVALIDO';
  end if;

  -- 3. Insertar el proyecto. RLS exige empresario verificado; los CHECK de
  --    ubicación/presupuesto validan los datos.
  insert into public.proyectos (
    id_empresario, id_area_negocio, titulo, descripcion,
    involucra_ia, generado_por_ia,
    modalidad, pais_proyecto, ciudad_proyecto, moneda,
    presupuesto_min, presupuesto_max, estado,
    fecha_publicacion, fecha_cierre
  ) values (
    v_empresario, p_id_area, p_titulo, p_descripcion,
    p_involucra_ia, p_generado_por_ia,
    p_modalidad, p_pais, p_ciudad, p_moneda,
    p_presupuesto_min, p_presupuesto_max, 'abierto',
    v_fecha_pub, p_fecha_cierre
  )
  returning id_proyecto into v_proyecto;

  -- 4. Puentes N:M (RF-19 categorías, RF-22 tecnologías).
  if p_categorias is not null and array_length(p_categorias, 1) is not null then
    insert into public.proyecto_categorias (id_proyecto, id_categoria)
    select v_proyecto, unnest(p_categorias);
  end if;

  if p_tecnologias is not null and array_length(p_tecnologias, 1) is not null then
    insert into public.proyecto_tecnologias (id_proyecto, id_tecnologia)
    select v_proyecto, unnest(p_tecnologias);
  end if;

  -- 5. Cerrar la conversación y enlazarla al proyecto (flujo paso 7).
  update public.conversaciones_ia
  set id_proyecto        = v_proyecto,
      propuesta_aprobada = p_propuesta,
      estado             = 'finalizada',
      fecha_fin          = now()
  where id_conversacion = p_conversacion
    and id_empresario   = v_empresario;

  return v_proyecto;
end;
$$;

comment on function public.publicar_proyecto is
  'Publica un proyecto de forma atómica (proyectos + puentes + cierre de conversación) desde la propuesta aprobada. SECURITY INVOKER: respeta RLS. Corte 4 (IA real).';

-- Solo usuarios autenticados pueden ejecutarla; nunca anon.
revoke execute on function public.publicar_proyecto(
  uuid, varchar, text, uuid, modalidad_enum, varchar, varchar, moneda_enum,
  numeric, numeric, timestamptz, uuid[], uuid[], jsonb, boolean, boolean
) from public, anon;

grant execute on function public.publicar_proyecto(
  uuid, varchar, text, uuid, modalidad_enum, varchar, varchar, moneda_enum,
  numeric, numeric, timestamptz, uuid[], uuid[], jsonb, boolean, boolean
) to authenticated;
