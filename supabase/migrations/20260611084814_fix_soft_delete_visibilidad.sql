-- ============================================================
-- MIGRACIÓN 0014 — Fix: visibilidad de proyectos desactivados (RF-66)
-- Fecha: 2026-06-11
-- Autor: Samir (A1)
--
-- Regresión introducida en 0010 [G6]: al consolidar las policies
-- SELECT de proyectos se perdió el filtro is_active = true que
-- existía desde 0004/0008. Resultado: un proyecto "eliminado" por
-- el admin (is_active = false, RF-66) seguía visible para todos
-- los autenticados en el marketplace. Igual en proyecto_tecnologias
-- y proyecto_categorias.
--
-- Semántica restaurada:
--   · Rama pública (marketplace): exige is_active = true.
--   · Rama dueño: el empresario SIGUE viendo sus proyectos
--     desactivados (RF-66 le notifica el motivo; ocultárselos
--     generaría confusión).
--   · Rama participante: el estudiante conserva visibilidad para
--     su historial (RF-14) y sus postulaciones existentes.
-- ============================================================


-- ============================================================
-- [S1] proyectos
-- ============================================================
drop policy if exists "proyectos_select_auth" on public.proyectos;

create policy "proyectos_select_auth"
  on public.proyectos for select
  to authenticated
  using (
    -- Marketplace: solo proyectos activos en ventana de ofertas
    (
      is_active = true
      and estado in ('abierto', 'en_recepcion')
    )
    or
    -- Dueño: ve todos los suyos, incluidos desactivados
    id_empresario in (
      select id_empresario from public.empresarios
      where id_usuario = (select auth.uid())
    )
    or
    -- Participante: conserva acceso a proyectos donde postuló
    id_proyecto in (
      select pa.id_proyecto
      from public.participaciones pa
      join public.estudiantes e on e.id_estudiante = pa.id_estudiante
      where e.id_usuario = (select auth.uid())
    )
  );


-- ============================================================
-- [S2] proyecto_tecnologias
-- ============================================================
drop policy if exists "proy_tec_select_auth" on public.proyecto_tecnologias;

create policy "proy_tec_select_auth"
  on public.proyecto_tecnologias for select
  to authenticated
  using (
    id_proyecto in (
      select id_proyecto from public.proyectos
      where is_active = true
        and estado in ('abierto', 'en_recepcion')
    )
    or id_proyecto in (
      select p.id_proyecto
      from public.proyectos   p
      join public.empresarios e on e.id_empresario = p.id_empresario
      where e.id_usuario = (select auth.uid())
    )
    or id_proyecto in (
      select pa.id_proyecto
      from public.participaciones pa
      join public.estudiantes e on e.id_estudiante = pa.id_estudiante
      where e.id_usuario = (select auth.uid())
    )
  );


-- ============================================================
-- [S3] proyecto_categorias
-- ============================================================
drop policy if exists "proy_cat_select_auth" on public.proyecto_categorias;

create policy "proy_cat_select_auth"
  on public.proyecto_categorias for select
  to authenticated
  using (
    id_proyecto in (
      select id_proyecto from public.proyectos
      where is_active = true
        and estado in ('abierto', 'en_recepcion')
    )
    or id_proyecto in (
      select p.id_proyecto
      from public.proyectos   p
      join public.empresarios e on e.id_empresario = p.id_empresario
      where e.id_usuario = (select auth.uid())
    )
    or id_proyecto in (
      select pa.id_proyecto
      from public.participaciones pa
      join public.estudiantes e on e.id_estudiante = pa.id_estudiante
      where e.id_usuario = (select auth.uid())
    )
  );
