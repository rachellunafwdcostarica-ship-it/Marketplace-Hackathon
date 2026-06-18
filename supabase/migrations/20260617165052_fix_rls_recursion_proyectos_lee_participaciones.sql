-- ============================================================
-- Fix recursión RLS (parte 2): proyectos_select_auth leía participaciones
-- ------------------------------------------------------------
-- La migración 20260614000004 rompió la recursión mutua proyectos<->participaciones
-- SOLO del lado de `participaciones_select` (función `mis_proyectos_como_empresario`).
-- Pero `proyectos_select_auth` siguió leyendo `participaciones` con un subquery inline.
-- Resultado: cualquier operación donde `participaciones` es el frame externo de la
-- política y el cuerpo lee `proyectos` vuelve a recurrir:
--   INSERT participaciones -> WITH CHECK lee proyectos -> proyectos_select_auth lee
--   participaciones (ya en expansión) -> "infinite recursion detected ... participaciones".
-- Verificado el 2026-06-17 ejecutando el INSERT real bajo rol authenticated: 42P17.
-- Los SELECT sueltos no recurrían (por eso quedó latente); el INSERT/UPDATE sí.
--
-- Fix simétrico al del 14-jun, del lado que faltaba: encapsular la lectura de
-- `participaciones` dentro de `proyectos_select_auth` en una función SECURITY DEFINER
-- (`mis_proyectos_como_estudiante`). Al correr como dueño de la función, NO dispara la
-- RLS de participaciones -> se rompe el ciclo en ambas direcciones. Semántica idéntica:
-- el egresado sigue viendo los proyectos en los que participa.
--
-- Seguridad: la función filtra por auth.uid(), solo devuelve los proyectos del
-- estudiante actual; no expone datos ajenos pese a ser SECURITY DEFINER.
-- ============================================================

create or replace function public.mis_proyectos_como_estudiante()
returns setof uuid
language sql
security definer
stable
set search_path = public
as $$
  select pa.id_proyecto
  from public.participaciones pa
  join public.estudiantes e on e.id_estudiante = pa.id_estudiante
  where e.id_usuario = (select auth.uid())
$$;

comment on function public.mis_proyectos_como_estudiante is
  'IDs de proyectos donde el usuario autenticado participa como estudiante. SECURITY DEFINER para romper la recursión RLS proyectos<->participaciones en INSERT/UPDATE; filtra por auth.uid(), no expone datos ajenos.';

revoke execute on function public.mis_proyectos_como_estudiante() from public, anon;
grant execute on function public.mis_proyectos_como_estudiante() to authenticated;

-- Recrear la policy usando la función (rompe el ciclo, conserva la semántica).
drop policy if exists "proyectos_select_auth" on public.proyectos;
create policy "proyectos_select_auth"
  on public.proyectos for select
  to authenticated
  using (
    ((is_active = true) and (estado in ('abierto', 'en_recepcion')))
    or (id_empresario in (
        select id_empresario from public.empresarios
        where id_usuario = (select auth.uid())))
    or (id_proyecto in (select public.mis_proyectos_como_estudiante()))
  );
