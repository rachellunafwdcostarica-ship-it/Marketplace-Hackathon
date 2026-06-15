-- ============================================================
-- RPC publicar_proyecto v3 — plazo como DURACIÓN en días (RF-21)
-- ------------------------------------------------------------
-- Reemplaza la v2 (20260614000003). Cambio de modelo: el empresario elige una
-- DURACIÓN en días (5..15), no una fecha de cierre. Antes la Pantalla 1 mandaba
-- `p_fecha_cierre` (timestamptz) y el plazo se medía contra HOY, lo que:
--   · dependía de la zona horaria (`toISOString()` daba la fecha en UTC), y
--   · "envejecía" si el borrador se retomaba días después.
--
-- Ahora el RPC recibe `p_plazo_dias` y calcula la fecha de cierre desde la
-- publicación real: `fecha_cierre = date_trunc('day', now()) + plazo_dias`.
-- Así la fecha siempre cae en rango por construcción y no hay desfases.
--
-- Modelo de datos: la tabla `proyectos` mantiene `fecha_cierre` (no se agrega
-- `plazo_dias`): la duración es derivable como `fecha_cierre - fecha_publicacion`
-- y el SRS marca su modelo como orientativo (§4).
--
-- SECURITY INVOKER: respeta RLS (igual que la v2).
-- ============================================================

-- La v2 tenía `p_fecha_cierre timestamptz` en la posición 11; al cambiar ese
-- tipo a integer la firma difiere, así que borramos la v2 para no dejar overload.
drop function if exists public.publicar_proyecto(
  uuid, varchar, text, uuid, modalidad_enum, varchar, varchar, moneda_enum,
  numeric, numeric, timestamptz, uuid[], uuid[], jsonb, boolean, boolean
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
  p_plazo_dias         integer,
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
  v_fecha_pub    timestamptz := date_trunc('day', now());
  v_fecha_cierre timestamptz;
begin
  -- 1. Resolver el empresario del usuario autenticado.
  select id_empresario into v_empresario
  from public.empresarios
  where id_usuario = auth.uid();

  if v_empresario is null then
    raise exception 'EMPRESARIO_NO_ENCONTRADO';
  end if;

  -- 2. Validación dura de plazo (RF-21): duración entre 5 y 15 días.
  if p_plazo_dias is null or p_plazo_dias < 5 or p_plazo_dias > 15 then
    raise exception 'PLAZO_INVALIDO';
  end if;

  -- Fecha de cierre = inicio de HOY + el plazo elegido. Cae en rango por
  -- construcción, así que el CHECK chk_proyectos_plazo (5..15) siempre pasa.
  v_fecha_cierre := v_fecha_pub + make_interval(days => p_plazo_dias);

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
    v_fecha_pub, v_fecha_cierre
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
  'Publica un proyecto de forma atómica desde la propuesta aprobada. El plazo se recibe como duración en días (5..15) y la fecha de cierre se calcula desde la publicación. SECURITY INVOKER: respeta RLS. Corte 4 (IA real, v3).';

-- Solo usuarios autenticados pueden ejecutarla; nunca anon.
revoke execute on function public.publicar_proyecto(
  uuid, varchar, text, uuid, modalidad_enum, varchar, varchar, moneda_enum,
  numeric, numeric, integer, uuid[], uuid[], jsonb, boolean, boolean
) from public, anon;

grant execute on function public.publicar_proyecto(
  uuid, varchar, text, uuid, modalidad_enum, varchar, varchar, moneda_enum,
  numeric, numeric, integer, uuid[], uuid[], jsonb, boolean, boolean
) to authenticated;
