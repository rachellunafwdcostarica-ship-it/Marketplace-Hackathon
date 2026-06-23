-- ============================================================
-- MIGRACIÓN — Storage: eliminar policies anchas del quickstart en 'prototipos'
-- Fecha: 2026-06-22
--
-- El bucket privado 'prototipos' tenía dos políticas creadas a mano en el
-- dashboard (no versionadas, las que genera el quickstart de Supabase):
--   - "Allow public reads": SELECT para el rol PUBLIC (incluye `anon`) con el
--     único filtro `bucket_id = 'prototipos'`. Permitía a cualquiera con la
--     anon key listar y descargar TODO el bucket sin sesión y sin pertenecer
--     al proyecto.
--   - "Allow authenticated uploads": INSERT para cualquier `authenticated` con
--     el único filtro `bucket_id = 'prototipos'`. Permitía subir sin ser el
--     estudiante de la participación ni estar verificado.
--
-- Como las políticas RLS se evalúan en OR, estas dos anulaban a las correctas
-- (`prototipos_insert_estudiante`, `prototipos_select_partes`), que sí filtran
-- por participación. Se eliminan; las scoped quedan como únicas vigentes.
-- ============================================================

drop policy if exists "Allow public reads" on storage.objects;
drop policy if exists "Allow authenticated uploads" on storage.objects;
