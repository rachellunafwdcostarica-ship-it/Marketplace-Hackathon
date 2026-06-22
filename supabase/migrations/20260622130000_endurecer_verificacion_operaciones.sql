-- P1 - Endurecer contra revocación de verificación.
-- Problema: la RLS protegía la CREACIÓN (publicar proyecto / postularse exigen
-- estado_verificacion='verificado'), pero las operaciones POSTERIORES validaban
-- solo PROPIEDAD. Un usuario verificado que el admin revoca después seguía pudiendo
-- operar (adjudicar, editar, subir entregables, calificar, etc.) vía las server
-- actions o PostgREST directo.
--
-- Fix: helper `current_user_is_verified()` (centraliza el chequeo) + se agrega
-- `AND public.current_user_is_verified()` a las policies de operación. Así, un
-- usuario cuyo estado_verificacion ya no es 'verificado' queda bloqueado por la BD
-- en cualquier vía (no solo en el código). La mensajería (sin RLS, corre con
-- service_role) se endurece aparte en src/lib/mensajes/actions.ts.
--
-- No afecta el flujo legítimo: quien opera está verificado (el INSERT inicial ya lo
-- exigía) y sigue pasando; service_role (admin) bypasea RLS, no se ve afectado.
-- Idempotente.

-- Helper: ¿el usuario actual está verificado como egresado o empresario?
create or replace function public.current_user_is_verified()
returns boolean
language sql
stable
security definer
set search_path to ''
as $fn$
  select exists (
    select 1 from public.estudiantes e
    where e.id_usuario = (select auth.uid()) and e.estado_verificacion = 'verificado'
  ) or exists (
    select 1 from public.empresarios em
    where em.id_usuario = (select auth.uid()) and em.estado_verificacion = 'verificado'
  );
$fn$;

revoke all on function public.current_user_is_verified() from public;
grant execute on function public.current_user_is_verified() to authenticated;

-- ===================== proyectos (editar / cambiar estado) =====================
drop policy if exists proyectos_update_own on public.proyectos;
create policy proyectos_update_own on public.proyectos
  for update to public
  using (
    (id_empresario in ( select empresarios.id_empresario from public.empresarios where (empresarios.id_usuario = (select auth.uid()))))
    and public.current_user_is_verified()
  )
  with check (
    (id_empresario in ( select empresarios.id_empresario from public.empresarios where (empresarios.id_usuario = (select auth.uid()))))
    and public.current_user_is_verified()
  );

-- ===================== participaciones (adjudicar / estados) =====================
drop policy if exists participaciones_update on public.participaciones;
create policy participaciones_update on public.participaciones
  for update to authenticated
  using (
    (((id_estudiante in ( select estudiantes.id_estudiante from public.estudiantes where (estudiantes.id_usuario = (select auth.uid())))) and (estado = any (array['enviada'::estado_participacion_enum, 'en_revision'::estado_participacion_enum]))) or ((estado <> 'retirada'::estado_participacion_enum) and (id_proyecto in ( select p.id_proyecto from (public.proyectos p join public.empresarios e on ((e.id_empresario = p.id_empresario))) where (e.id_usuario = (select auth.uid()))))))
    and public.current_user_is_verified()
  )
  with check (
    (((estado = 'retirada'::estado_participacion_enum) and (id_estudiante in ( select estudiantes.id_estudiante from public.estudiantes where (estudiantes.id_usuario = (select auth.uid()))))) or ((estado <> 'retirada'::estado_participacion_enum) and (id_proyecto in ( select p.id_proyecto from (public.proyectos p join public.empresarios e on ((e.id_empresario = p.id_empresario))) where (e.id_usuario = (select auth.uid()))))))
    and public.current_user_is_verified()
  );

-- ===================== contrataciones =====================
drop policy if exists contrataciones_insert_empresario on public.contrataciones;
create policy contrataciones_insert_empresario on public.contrataciones
  for insert to public
  with check (
    (id_participacion in ( select pa.id_participacion from ((public.participaciones pa join public.proyectos p on ((p.id_proyecto = pa.id_proyecto))) join public.empresarios e on ((e.id_empresario = p.id_empresario))) where (e.id_usuario = (select auth.uid()))))
    and public.current_user_is_verified()
  );

drop policy if exists contrataciones_update_empresario on public.contrataciones;
create policy contrataciones_update_empresario on public.contrataciones
  for update to public
  using (
    (id_participacion in ( select pa.id_participacion from ((public.participaciones pa join public.proyectos p on ((p.id_proyecto = pa.id_proyecto))) join public.empresarios e on ((e.id_empresario = p.id_empresario))) where (e.id_usuario = (select auth.uid()))))
    and public.current_user_is_verified()
  );

-- ===================== entregables =====================
drop policy if exists entregables_insert_estudiante on public.entregables;
create policy entregables_insert_estudiante on public.entregables
  for insert to public
  with check (
    (id_contratacion in ( select c.id_contratacion from (public.contrataciones c join public.participaciones pa on ((pa.id_participacion = c.id_participacion))) where (pa.id_estudiante in ( select estudiantes.id_estudiante from public.estudiantes where (estudiantes.id_usuario = (select auth.uid()))))))
    and public.current_user_is_verified()
  );

drop policy if exists entregables_update on public.entregables;
create policy entregables_update on public.entregables
  for update to authenticated
  using (
    (((estado <> 'aprobado'::estado_entregable_enum) and (id_contratacion in ( select c.id_contratacion from (public.contrataciones c join public.participaciones pa on ((pa.id_participacion = c.id_participacion))) where (pa.id_estudiante in ( select estudiantes.id_estudiante from public.estudiantes where (estudiantes.id_usuario = (select auth.uid()))))))) or ((estado <> 'aprobado'::estado_entregable_enum) and (id_contratacion in ( select c.id_contratacion from (((public.contrataciones c join public.participaciones pa on ((pa.id_participacion = c.id_participacion))) join public.proyectos p on ((p.id_proyecto = pa.id_proyecto))) join public.empresarios e on ((e.id_empresario = p.id_empresario))) where (e.id_usuario = (select auth.uid()))))))
    and public.current_user_is_verified()
  )
  with check (
    (((estado <> 'aprobado'::estado_entregable_enum) and (id_contratacion in ( select c.id_contratacion from (public.contrataciones c join public.participaciones pa on ((pa.id_participacion = c.id_participacion))) where (pa.id_estudiante in ( select estudiantes.id_estudiante from public.estudiantes where (estudiantes.id_usuario = (select auth.uid()))))))) or ((estado = any (array['en_revision'::estado_entregable_enum, 'aprobado'::estado_entregable_enum, 'con_cambios'::estado_entregable_enum])) and (id_contratacion in ( select c.id_contratacion from (((public.contrataciones c join public.participaciones pa on ((pa.id_participacion = c.id_participacion))) join public.proyectos p on ((p.id_proyecto = pa.id_proyecto))) join public.empresarios e on ((e.id_empresario = p.id_empresario))) where (e.id_usuario = (select auth.uid()))))))
    and public.current_user_is_verified()
  );

drop policy if exists comentarios_entregables_insert on public.comentarios_entregables;
create policy comentarios_entregables_insert on public.comentarios_entregables
  for insert to public
  with check (
    ((id_autor = (select auth.uid())) and (id_entregable in ( select e.id_entregable from ((public.entregables e join public.contrataciones c on ((c.id_contratacion = e.id_contratacion))) join public.participaciones pa on ((pa.id_participacion = c.id_participacion))) where ((pa.id_estudiante in ( select estudiantes.id_estudiante from public.estudiantes where (estudiantes.id_usuario = (select auth.uid())))) or (pa.id_proyecto in ( select p.id_proyecto from (public.proyectos p join public.empresarios emp on ((emp.id_empresario = p.id_empresario))) where (emp.id_usuario = (select auth.uid()))))))))
    and public.current_user_is_verified()
  );

-- ===================== evaluaciones (empresa -> egresado) =====================
drop policy if exists evaluaciones_insert_empresario on public.evaluaciones;
create policy evaluaciones_insert_empresario on public.evaluaciones
  for insert to public
  with check (
    ((id_empresario in ( select empresarios.id_empresario from public.empresarios where (empresarios.id_usuario = (select auth.uid())))) and (exists ( select 1 from (((public.contrataciones c join public.participaciones pa on ((pa.id_participacion = c.id_participacion))) join public.proyectos p on ((p.id_proyecto = pa.id_proyecto))) join public.empresarios emp on ((emp.id_empresario = p.id_empresario))) where ((c.id_contratacion = evaluaciones.id_contratacion) and (pa.id_estudiante = evaluaciones.id_estudiante) and (emp.id_usuario = (select auth.uid())) and (c.estado_periodo = 'finalizado'::estado_periodo_enum)))))
    and public.current_user_is_verified()
  );

-- ===================== evaluaciones_empresarios (egresado -> empresa) =====================
drop policy if exists evaluaciones_empresarios_insert_estudiante on public.evaluaciones_empresarios;
create policy evaluaciones_empresarios_insert_estudiante on public.evaluaciones_empresarios
  for insert to authenticated
  with check (
    ((id_estudiante in ( select estudiantes.id_estudiante from public.estudiantes where (estudiantes.id_usuario = (select auth.uid())))) and (exists ( select 1 from (public.contrataciones c join public.participaciones pa on ((pa.id_participacion = c.id_participacion))) where ((c.id_contratacion = evaluaciones_empresarios.id_contratacion) and (pa.id_estudiante = evaluaciones_empresarios.id_estudiante) and (c.estado_periodo = 'finalizado'::estado_periodo_enum)))))
    and public.current_user_is_verified()
  );
