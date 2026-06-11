-- ============================================================
-- MIGRACIÓN 0015 — Fix [0025]: listado amplio en buckets públicos
-- Fecha: 2026-06-11
-- Autor: Samir (A1)
--
-- Advisor public_bucket_allows_listing: las policies SELECT amplias
-- de 0012 permiten a cualquier autenticado listar TODOS los archivos
-- de fotos-perfil y logos (los paths exponen UUIDs de usuarios).
-- Los buckets públicos sirven la descarga vía URL pública sin pasar
-- por RLS, así que el SELECT amplio no aporta nada: se reduce a la
-- carpeta propia, que es lo único que el dueño necesita para
-- listar/reemplazar sus archivos desde la API.
-- ============================================================

drop policy if exists "fotos_perfil_select_auth" on storage.objects;
drop policy if exists "logos_select_auth" on storage.objects;

create policy "fotos_perfil_select_own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'fotos-perfil'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "logos_select_own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
