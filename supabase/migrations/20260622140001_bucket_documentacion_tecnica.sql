-- ============================================================
-- MIGRACIÓN — Storage: bucket documentacion_tecnica
-- Fecha: 2026-06-21
--
-- Se crea el bucket para la documentación técnica de postulaciones.
-- Limites: 10MB, PDF o ZIP.
-- Estructura esperada de carpetas: {id_proyecto}/{id_usuario}/...
-- ============================================================

-- 1. Crear el bucket si no existe
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('documentacion_tecnica', 'documentacion_tecnica', false, 5242880, array['application/pdf', 'application/zip', 'application/x-zip-compressed'])
on conflict (id) do nothing;

-- 2. Políticas RLS
-- ============================================================
-- INSERT: Solo el estudiante verificado dueño de la ruta puede subir.
-- ============================================================
create policy "documentacion_tecnica_insert_estudiante"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'documentacion_tecnica'
    and (storage.foldername(name))[2] = (select auth.uid())::text
    and exists (
      select 1 from public.estudiantes e
      where e.id_usuario = (select auth.uid())
      and e.estado_verificacion = 'verificado'
    )
  );

-- ============================================================
-- SELECT (Estudiante): Puede leer sus propios archivos.
-- ============================================================
create policy "documentacion_tecnica_select_estudiante"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'documentacion_tecnica'
    and (storage.foldername(name))[2] = (select auth.uid())::text
  );

-- ============================================================
-- SELECT (Empresario): Puede leer archivos de los proyectos
-- de los que es dueño, SOLO SI la participación ha sido oficializada.
-- ============================================================
create policy "documentacion_tecnica_select_empresario"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'documentacion_tecnica'
    and (storage.foldername(name))[1] in (
      select p.id_proyecto::text
      from public.proyectos p
      join public.empresarios emp on emp.id_empresario = p.id_empresario
      where emp.id_usuario = (select auth.uid())
    )
    and exists (
      select 1 from public.participaciones pa
      join public.estudiantes est on est.id_estudiante = pa.id_estudiante
      where pa.id_proyecto::text = (storage.foldername(name))[1]
      and est.id_usuario::text = (storage.foldername(name))[2]
    )
  );

-- ============================================================
-- UPDATE y DELETE: El estudiante puede alterar o borrar su archivo
-- SOLO SI todavía no ha oficializado su participación para este proyecto.
-- ============================================================
create policy "documentacion_tecnica_update_estudiante"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'documentacion_tecnica'
    and (storage.foldername(name))[2] = (select auth.uid())::text
    and not exists (
      select 1 from public.participaciones pa
      join public.estudiantes est on est.id_estudiante = pa.id_estudiante
      where pa.id_proyecto::text = (storage.foldername(name))[1]
      and est.id_usuario::text = (storage.foldername(name))[2]
    )
  )
  with check (
    bucket_id = 'documentacion_tecnica'
    and (storage.foldername(name))[2] = (select auth.uid())::text
  );

create policy "documentacion_tecnica_delete_estudiante"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'documentacion_tecnica'
    and (storage.foldername(name))[2] = (select auth.uid())::text
    and not exists (
      select 1 from public.participaciones pa
      join public.estudiantes est on est.id_estudiante = pa.id_estudiante
      where pa.id_proyecto::text = (storage.foldername(name))[1]
      and est.id_usuario::text = (storage.foldername(name))[2]
    )
  );
