-- ============================================================
-- RPC get_participaciones_de_proyecto — Panel de revisión del empresario (RF-34)
-- Fecha: 2026-06-16
-- ------------------------------------------------------------
-- Devuelve las participaciones (ofertas) de un proyecto JUNTO con la identidad
-- del estudiante (nombre, apellidos, foto), su reputación y su título FWD, para
-- que el empresario dueño pueda revisarlas y compararlas en la página de
-- detalle del proyecto.
--
-- Por qué SECURITY DEFINER: la RLS de `usuarios` (usuarios_select_own) y la de
-- `estudiantes` (estudiantes_select_own_or_public) NO dejan al empresario leer
-- el nombre del postulante. Esta función eleva privilegios SOLO para esta
-- lectura acotada y REIMPONE la autorización adentro: el `exists (...)` exige
-- que auth.uid() sea el empresario dueño del proyecto. Si no lo es, devuelve
-- cero filas (no lanza error, para no filtrar la existencia del proyecto).
--
-- Mismo hardening que las funciones de 0007/0011:
--   set search_path = '' · revoke public/anon · grant authenticated.
-- ============================================================

create or replace function public.get_participaciones_de_proyecto(
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
  comentario_prototipo     text
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
    pa.carta_postulacion,
    pa.planteamiento_solucion,
    pa.prototipo_enlaces,
    pa.documentacion_tecnica,
    pa.url_repositorio_proyecto,
    pa.fecha_postulacion,
    pa.fecha_entrega_prototipo,
    pa.calificacion_prototipo,
    pa.comentario_prototipo
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
  'Participaciones de un proyecto con identidad del estudiante (RF-34). SECURITY DEFINER: reimpone que auth.uid() sea el empresario dueño; si no, devuelve 0 filas.';

-- Solo usuarios autenticados pueden ejecutarla; nunca anon ni el grant heredado de public.
revoke execute on function public.get_participaciones_de_proyecto(uuid) from public, anon;
grant  execute on function public.get_participaciones_de_proyecto(uuid) to authenticated;
