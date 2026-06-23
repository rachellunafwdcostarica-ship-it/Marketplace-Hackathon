-- ============================================================
-- MIGRACIÓN — Storage: el INSERT de 'entregables' exige verificación
-- Fecha: 2026-06-22
--
-- La policy `entregables_insert_estudiante` (storage.objects) sólo validaba que
-- el estudiante fuera dueño de la contratación, NO que estuviera verificado. Un
-- egresado contratado pero no verificado podía subir el archivo por la Storage
-- API directa (la fila en `entregables` la frena la RLS de la tabla, pero el
-- objeto quedaba huérfano en el bucket). Se recrea la policy agregando el check
-- de verificación, igual que `documentacion_tecnica`/`prototipos_postulacion`.
--
-- El check en código (requireVerifiedEgresado en registrarEntregable) cubre el
-- flujo de la app; esta policy cierra el camino por API directa. Defensa en
-- profundidad en las dos capas.
-- ============================================================

drop policy if exists "entregables_insert_estudiante" on storage.objects;

create policy "entregables_insert_estudiante"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'entregables'
    and (storage.foldername(name))[1] in (
      select c.id_contratacion::text
      from contrataciones c
      join participaciones pa on pa.id_participacion = c.id_participacion
      join estudiantes e on e.id_estudiante = pa.id_estudiante
      where e.id_usuario = (select auth.uid())
        and e.estado_verificacion = 'verificado'
    )
  );
