-- ============================================================
-- MIGRACIÓN 0012 — Storage: buckets + policies (tarjeta #21)
-- Fecha: 2026-06-11
-- Autor: Samir (A1)
--
-- storage.buckets estaba vacío: ninguna feature de archivos
-- (foto de perfil RF-06, logo RF-16, prototipos RF-28/30,
-- entregables RF-40/41/43) tenía dónde escribir.
--
-- Convención de paths (primer segmento = carpeta dueña):
--   fotos-perfil/{id_usuario}/...      (público, escribe el dueño)
--   logos/{id_usuario}/...             (público, escribe el empresario dueño)
--   prototipos/{id_participacion}/...  (privado, estudiante dueño / lee también el empresario)
--   entregables/{id_contratacion}/...  (privado, sube el estudiante / lee también el empresario, RF-43)
--
-- Límites alineados con configuracion_sistema (0006):
--   foto_perfil_max_mb = 5  → 5242880 bytes (fotos-perfil, logos)
--   pdf_propuesta_max_mb = 10 → 10485760 bytes (prototipos)
--   entregables: 52428800 bytes (50 MB, decisión MVP ajustable)
--
-- Los buckets públicos sirven lectura vía URL pública (sin RLS);
-- las policies SELECT cubren list/download vía API autenticada.
-- La regla fina de negocio (cuándo se puede subir un prototipo
-- según el estado del flujo B) vive en server actions/triggers,
-- no aquí: estas policies solo garantizan ownership.
-- ============================================================


-- ============================================================
-- 1. Buckets
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('fotos-perfil', 'fotos-perfil', true,  5242880,  array['image/jpeg', 'image/png']),
  ('logos',        'logos',        true,  5242880,  array['image/jpeg', 'image/png', 'image/webp']),
  ('prototipos',   'prototipos',   false, 10485760, array['application/pdf', 'application/zip', 'application/x-zip-compressed', 'image/jpeg', 'image/png', 'image/webp']),
  ('entregables',  'entregables',  false, 52428800, null)
on conflict (id) do nothing;


-- ============================================================
-- 2. fotos-perfil: cada usuario administra solo su carpeta (RF-06)
-- ============================================================
create policy "fotos_perfil_select_auth"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'fotos-perfil');

create policy "fotos_perfil_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'fotos-perfil'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "fotos_perfil_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'fotos-perfil'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'fotos-perfil'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "fotos_perfil_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'fotos-perfil'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );


-- ============================================================
-- 3. logos: solo el empresario dueño escribe en su carpeta (RF-16)
-- ============================================================
create policy "logos_select_auth"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'logos');

create policy "logos_insert_own_empresario"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1 from public.empresarios e
      where e.id_usuario = (select auth.uid())
    )
  );

create policy "logos_update_own_empresario"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "logos_delete_own_empresario"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );


-- ============================================================
-- 4. prototipos: escribe el estudiante dueño de la participación;
--    lee también el empresario dueño del proyecto (RF-28/30, RF-34)
-- ============================================================
create policy "prototipos_select_partes"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'prototipos'
    and (
      (storage.foldername(name))[1] in (
        select pa.id_participacion::text
        from public.participaciones pa
        join public.estudiantes e on e.id_estudiante = pa.id_estudiante
        where e.id_usuario = (select auth.uid())
      )
      or
      (storage.foldername(name))[1] in (
        select pa.id_participacion::text
        from public.participaciones pa
        join public.proyectos    p on p.id_proyecto   = pa.id_proyecto
        join public.empresarios  e on e.id_empresario = p.id_empresario
        where e.id_usuario = (select auth.uid())
      )
    )
  );

create policy "prototipos_insert_estudiante"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'prototipos'
    and (storage.foldername(name))[1] in (
      select pa.id_participacion::text
      from public.participaciones pa
      join public.estudiantes e on e.id_estudiante = pa.id_estudiante
      where e.id_usuario = (select auth.uid())
    )
  );

create policy "prototipos_update_estudiante"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'prototipos'
    and (storage.foldername(name))[1] in (
      select pa.id_participacion::text
      from public.participaciones pa
      join public.estudiantes e on e.id_estudiante = pa.id_estudiante
      where e.id_usuario = (select auth.uid())
    )
  )
  with check (
    bucket_id = 'prototipos'
    and (storage.foldername(name))[1] in (
      select pa.id_participacion::text
      from public.participaciones pa
      join public.estudiantes e on e.id_estudiante = pa.id_estudiante
      where e.id_usuario = (select auth.uid())
    )
  );

create policy "prototipos_delete_estudiante"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'prototipos'
    and (storage.foldername(name))[1] in (
      select pa.id_participacion::text
      from public.participaciones pa
      join public.estudiantes e on e.id_estudiante = pa.id_estudiante
      where e.id_usuario = (select auth.uid())
    )
  );


-- ============================================================
-- 5. entregables: sube el estudiante de la contratación; leen
--    estudiante y empresario propietario (RF-43). Sin UPDATE ni
--    DELETE: el versionado (RF-42) conserva las versiones previas,
--    cada versión es un archivo nuevo.
-- ============================================================
create policy "entregables_select_partes"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'entregables'
    and (
      (storage.foldername(name))[1] in (
        select c.id_contratacion::text
        from public.contrataciones  c
        join public.participaciones pa on pa.id_participacion = c.id_participacion
        join public.estudiantes     e  on e.id_estudiante     = pa.id_estudiante
        where e.id_usuario = (select auth.uid())
      )
      or
      (storage.foldername(name))[1] in (
        select c.id_contratacion::text
        from public.contrataciones  c
        join public.participaciones pa on pa.id_participacion = c.id_participacion
        join public.proyectos       p  on p.id_proyecto       = pa.id_proyecto
        join public.empresarios     e  on e.id_empresario     = p.id_empresario
        where e.id_usuario = (select auth.uid())
      )
    )
  );

create policy "entregables_insert_estudiante"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'entregables'
    and (storage.foldername(name))[1] in (
      select c.id_contratacion::text
      from public.contrataciones  c
      join public.participaciones pa on pa.id_participacion = c.id_participacion
      join public.estudiantes     e  on e.id_estudiante     = pa.id_estudiante
      where e.id_usuario = (select auth.uid())
    )
  );
