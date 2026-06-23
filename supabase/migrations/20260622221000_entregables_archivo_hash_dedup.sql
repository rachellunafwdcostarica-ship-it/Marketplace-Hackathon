-- RF-40: dedup de entregables por CONTENIDO. No se permite subir dos veces el
-- mismo archivo dentro de una contratacion. El hash (sha-256 hex) lo calcula la
-- server action al subir.
--
-- Por que hash y no nombre: detecta el mismo archivo aunque lo renombren, y un
-- archivo realmente corregido (flujo con_cambios) tiene contenido distinto ->
-- hash distinto -> pasa sin bloquear la correccion.
--
-- Nullable: las filas legacy (subidas antes de esta migracion) quedan en null y
-- no participan del dedup.

alter table public.entregables
  add column if not exists archivo_hash text;

comment on column public.entregables.archivo_hash is
  'SHA-256 (hex) del contenido del archivo. Dedup por contratacion. Null en filas legacy.';

-- Un mismo contenido no puede repetirse dentro de una contratacion. Indice
-- PARCIAL para no chocar con filas legacy (archivo_hash null). La server action
-- igual chequea antes para devolver un error amable; este indice es la garantia
-- a nivel BD.
create unique index if not exists entregables_contratacion_hash_uniq
  on public.entregables (id_contratacion, archivo_hash)
  where archivo_hash is not null;
