-- ============================================================
-- Geo ISO — país (ISO 3166-1) + región (ISO 3166-2) como CÓDIGOS
-- ------------------------------------------------------------
-- Reemplaza la ubicación de texto libre por códigos canónicos en `proyectos` y
-- `empresarios`:
--   · pais_*   (nombre libre, varchar 80)  → pais_iso_*  (alpha-2,  varchar 2)
--   · ciudad_* (nombre libre, varchar 80)  → region_*    (3166-2,   varchar 6)
--
-- La región es OPCIONAL (hay países sin subdivisión utilizable). El país sigue
-- siendo obligatorio para proyectos NO remotos (CHECK redefinido abajo).
--
-- Datos legacy: el texto libre existente NO es código ISO, así que se NULIFICA
-- (decisión de producto: "solo lo nuevo"; el dueño recargará lo viejo a mano).
-- Orden obligatorio: nulificar ANTES de estrechar el tipo, o el cast de
-- "San José" a varchar(2) fallaría.
--
-- NO aplicar sin aprobación del dueño de la BD (Samir).
-- ============================================================

-- ------------------------------------------------------------
-- 1. PROYECTOS
-- ------------------------------------------------------------

-- chk_proyectos_ubicacion referencia las columnas y exige ciudad NOT NULL para
-- no-remoto. Se elimina antes de nulificar/renombrar y se recrea al final con la
-- regla nueva: solo el país es obligatorio, la región queda opcional.
alter table public.proyectos
  drop constraint if exists chk_proyectos_ubicacion;

-- Nulificar legacy (texto libre) antes de estrechar el tipo.
update public.proyectos
  set pais_proyecto = null,
      ciudad_proyecto = null;

alter table public.proyectos
  rename column pais_proyecto to pais_iso_proyecto;
alter table public.proyectos
  rename column ciudad_proyecto to region_proyecto;

alter table public.proyectos
  alter column pais_iso_proyecto type varchar(2);
alter table public.proyectos
  alter column region_proyecto type varchar(6);

-- Regla nueva: no-remoto exige país; la región es opcional. NOT VALID para no
-- chocar con los proyectos viejos recién nulificados (se mantienen vigentes; las
-- filas nuevas sí se validan).
alter table public.proyectos
  add constraint chk_proyectos_ubicacion
    check (
      modalidad = 'remoto'
      or pais_iso_proyecto is not null
    )
    not valid;

-- ------------------------------------------------------------
-- 2. EMPRESARIOS (sin CHECK de ubicación)
-- ------------------------------------------------------------
update public.empresarios
  set pais_sede = null,
      ciudad_sede = null;

alter table public.empresarios
  rename column pais_sede to pais_iso_sede;
alter table public.empresarios
  rename column ciudad_sede to region_sede;

alter table public.empresarios
  alter column pais_iso_sede type varchar(2);
alter table public.empresarios
  alter column region_sede type varchar(6);

-- ------------------------------------------------------------
-- 3. RPC publicar_proyecto — insertar en las columnas renombradas
-- ------------------------------------------------------------
-- Los parámetros p_pais→p_pais_iso y p_ciudad→p_region pasan a ser CÓDIGOS, no
-- nombres. `create or replace` no permite renombrar parámetros, así que se hace
-- drop + create. La firma de TIPOS no cambia (varchar sigue cubriendo el código).
drop function if exists public.publicar_proyecto(
  uuid, varchar, text, uuid, modalidad_enum, varchar, varchar, moneda_enum,
  numeric, numeric, integer, uuid[], uuid[], jsonb, boolean, boolean
);

create function public.publicar_proyecto(
  p_conversacion       uuid,
  p_titulo             varchar,
  p_descripcion        text,
  p_id_area            uuid,
  p_modalidad          modalidad_enum,
  p_pais_iso           varchar,
  p_region             varchar,
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

  v_fecha_cierre := v_fecha_pub + make_interval(days => p_plazo_dias);

  -- 3. Insertar el proyecto. RLS exige empresario verificado; los CHECK de
  --    plazo/ubicación/presupuesto validan los datos.
  insert into public.proyectos (
    id_empresario, id_area_negocio, titulo, descripcion,
    involucra_ia, generado_por_ia,
    modalidad, pais_iso_proyecto, region_proyecto, moneda,
    presupuesto_min, presupuesto_max, estado,
    fecha_publicacion, fecha_cierre
  ) values (
    v_empresario, p_id_area, p_titulo, p_descripcion,
    p_involucra_ia, p_generado_por_ia,
    p_modalidad, p_pais_iso, p_region, p_moneda,
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
  'Publica un proyecto de forma atómica desde la propuesta aprobada. Ubicación como códigos ISO (país 3166-1 en pais_iso_proyecto, región 3166-2 en region_proyecto). El plazo es duración en días (5..15). SECURITY INVOKER: respeta RLS.';

-- Solo usuarios autenticados pueden ejecutarla; nunca anon.
revoke execute on function public.publicar_proyecto(
  uuid, varchar, text, uuid, modalidad_enum, varchar, varchar, moneda_enum,
  numeric, numeric, integer, uuid[], uuid[], jsonb, boolean, boolean
) from public, anon;

grant execute on function public.publicar_proyecto(
  uuid, varchar, text, uuid, modalidad_enum, varchar, varchar, moneda_enum,
  numeric, numeric, integer, uuid[], uuid[], jsonb, boolean, boolean
) to authenticated;
