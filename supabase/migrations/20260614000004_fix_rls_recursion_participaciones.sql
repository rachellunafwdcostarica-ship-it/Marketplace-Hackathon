-- ============================================================
-- Fix recursión RLS: proyectos <-> participaciones
-- ------------------------------------------------------------
-- Bug pre-existente (migraciones 20260610*): `proyectos_select_auth` consulta
-- `participaciones`, y `participaciones_select` consulta `proyectos`. Eso es una
-- recursión mutua: cualquier SELECT real sobre `proyectos` la dispara
-- ("infinite recursion detected in policy for relation proyectos"). Estaba
-- latente porque las páginas de listado eran mock; la destapó la primera query
-- real (el dashboard del empresario).
--
-- Fix estándar de Supabase: encapsular UNA de las consultas cruzadas en una
-- función SECURITY DEFINER. Al ejecutarse como dueño de la función, NO dispara
-- la RLS de la otra tabla -> se rompe el ciclo. Acá lo hacemos en el lado de
-- `participaciones_select` (la rama que mira `proyectos`).
--
-- Seguridad: la función filtra por `auth.uid()`, así que solo devuelve los
-- proyectos del empresario actual; no filtra datos pese a ser SECURITY DEFINER.
-- Semántica idéntica a la policy anterior (20260610212418): el egresado ve sus
-- postulaciones y el empresario las de sus proyectos.
-- ============================================================

create or replace function public.mis_proyectos_como_empresario()
returns setof uuid
language sql
security definer
stable
set search_path = public
as $$
  select p.id_proyecto
  from public.proyectos p
  join public.empresarios e on e.id_empresario = p.id_empresario
  where e.id_usuario = (select auth.uid())
$$;

comment on function public.mis_proyectos_como_empresario is
  'IDs de proyectos del empresario autenticado. SECURITY DEFINER para romper la recursión RLS proyectos<->participaciones; filtra por auth.uid(), no expone datos ajenos.';

revoke execute on function public.mis_proyectos_como_empresario()
  from public, anon;
grant execute on function public.mis_proyectos_como_empresario()
  to authenticated;

-- Recrear la policy usando la función (rompe el ciclo, conserva la semántica).
drop policy if exists "participaciones_select" on public.participaciones;
create policy "participaciones_select"
  on public.participaciones for select
  to authenticated
  using (
    id_estudiante in (
      select id_estudiante from public.estudiantes
      where id_usuario = (select auth.uid())
    )
    or id_proyecto in (select public.mis_proyectos_como_empresario())
  );
