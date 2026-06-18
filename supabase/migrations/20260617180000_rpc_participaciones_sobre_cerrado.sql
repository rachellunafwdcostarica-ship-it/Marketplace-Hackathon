-- ============================================================
-- RPC get_participaciones_de_proyecto v2 — Sobre cerrado (RF-34)
-- Fecha: 2026-06-17
-- ------------------------------------------------------------
-- Las ofertas le llegan al empresario SELLADAS: mientras una participación está
-- `enviada`, el RPC NO devuelve su contenido (carta, planteamiento y los enlaces
-- reales del prototipo / repositorio / documentación). La tapa del sobre solo
-- muestra identidad, reputación, título FWD, fechas y TRES BOOLEANOS de existencia
-- (`tiene_prototipo`, `tiene_repositorio`, `tiene_documentacion`) para que el
-- empresario pueda triar y comparar (RF-34) sin leer todavía el trabajo.
--
-- Al abrir el sobre la participación pasa a `en_revision` (acción `revisar`) y, en
-- la siguiente lectura, este mismo RPC ya devuelve el contenido completo. Así
-- `en_revision` significa, de verdad, "el empresario abrió y está revisando".
-- El sello es REAL, no cosmético: el contenido de una `enviada` nunca sale del
-- servidor, ni siquiera al cliente del empresario.
--
-- Se hace DROP + CREATE (no CREATE OR REPLACE) porque cambia el tipo de retorno:
-- se agregan las tres columnas booleanas. Se reaplican los grants porque el DROP
-- los elimina. Mismo hardening que la v1 (migración rpc_participaciones_de_proyecto):
-- SECURITY DEFINER + search_path = '' + reimposición de autorización con el
-- `exists (...)` que exige que auth.uid() sea el empresario dueño del proyecto.
-- ============================================================

drop function if exists public.get_participaciones_de_proyecto(uuid);

create function public.get_participaciones_de_proyecto(
  p_id_proyecto uuid
)
returns table (
  id_participacion         uuid,
  estado                   public.estado_participacion_enum,
  estudiante_nombre        varchar,
  estudiante_apellido_1    varchar,
  estudiante_apellido_2    varchar,
  foto_perfil              varchar,
  reputacion               numeric,
  titulo_fwd               public.titulo_fwd_enum,
  carta_postulacion        text,
  planteamiento_solucion   text,
  prototipo_enlaces        text[],
  documentacion_tecnica    varchar,
  url_repositorio_proyecto varchar,
  fecha_postulacion        timestamptz,
  fecha_entrega_prototipo  timestamptz,
  calificacion_prototipo   integer,
  comentario_prototipo     text,
  tiene_prototipo          boolean,
  tiene_repositorio        boolean,
  tiene_documentacion      boolean
)
language sql
security definer
set search_path = ''
as $$
  select
    pa.id_participacion,
    pa.estado,
    u.nombre,
    u.apellido_1,
    u.apellido_2,
    u.foto_perfil,
    e.reputacion,
    e.titulo_fwd,
    -- Contenido SELLADO mientras la oferta no se abrió (`enviada`).
    case when pa.estado = 'enviada' then null else pa.carta_postulacion end,
    case when pa.estado = 'enviada' then null else pa.planteamiento_solucion end,
    case when pa.estado = 'enviada' then null::text[] else pa.prototipo_enlaces end,
    case when pa.estado = 'enviada' then null else pa.documentacion_tecnica end,
    case when pa.estado = 'enviada' then null else pa.url_repositorio_proyecto end,
    pa.fecha_postulacion,
    pa.fecha_entrega_prototipo,
    pa.calificacion_prototipo,
    pa.comentario_prototipo,
    -- Booleanos de la tapa: existencia, NO contenido. Se calculan siempre.
    coalesce(cardinality(pa.prototipo_enlaces), 0) > 0,
    pa.url_repositorio_proyecto is not null,
    pa.documentacion_tecnica is not null
  from public.participaciones pa
  join public.estudiantes e on e.id_estudiante = pa.id_estudiante
  join public.usuarios    u on u.id_usuario    = e.id_usuario
  where pa.id_proyecto = p_id_proyecto
    and exists (
      select 1
      from public.proyectos   p
      join public.empresarios emp on emp.id_empresario = p.id_empresario
      where p.id_proyecto = p_id_proyecto
        and emp.id_usuario = auth.uid()
    )
  order by pa.fecha_postulacion desc;
$$;

comment on function public.get_participaciones_de_proyecto(uuid) is
  'Participaciones de un proyecto con identidad del estudiante (RF-34). Sobre cerrado: oculta el contenido de las `enviada` y expone solo booleanos de existencia. SECURITY DEFINER: reimpone que auth.uid() sea el empresario dueño; si no, devuelve 0 filas.';

-- Solo usuarios autenticados pueden ejecutarla; nunca anon ni el grant heredado de public.
revoke execute on function public.get_participaciones_de_proyecto(uuid) from public, anon;

grant  execute on function public.get_participaciones_de_proyecto(uuid) to authenticated;
