-- ============================================================
-- MIGRACIÓN — Storage: retirar políticas del bucket legacy 'prototipos'
-- Fecha: 2026-06-22
--
-- 'prototipos' (creado en 20260611084638, esquema {id_participacion}/) quedó
-- superado por 'prototipos_postulacion' (20260622140002, esquema
-- {id_proyecto}/{id_usuario}/, INSERT que exige estado_verificacion =
-- 'verificado'). El flujo de postulación guarda el prototipo como ENLACES
-- (participaciones.prototipo_enlaces), así que 'prototipos' no se usa en el
-- código (0 referencias) ni tiene objetos. Se retiran sus cuatro políticas para
-- dejarlo inerte (deny-all).
--
-- IMPORTANTE: el bucket en sí NO se puede borrar por SQL — Supabase lo impide
-- con el trigger storage.protect_delete() para evitar pérdida de datos. El
-- bucket vacío se elimina desde el dashboard (Storage > prototipos > Delete) o
-- con la Storage API usando la service_role. Esta migración solo limpia las
-- políticas; el borrado del bucket se hace fuera de la migración.
-- ============================================================

drop policy if exists "prototipos_select_partes" on storage.objects;
drop policy if exists "prototipos_insert_estudiante" on storage.objects;
drop policy if exists "prototipos_update_estudiante" on storage.objects;
drop policy if exists "prototipos_delete_estudiante" on storage.objects;
