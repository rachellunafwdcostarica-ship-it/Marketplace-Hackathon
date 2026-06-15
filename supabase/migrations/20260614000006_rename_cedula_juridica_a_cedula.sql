-- ============================================================
-- Rename empresarios.cedula_juridica → empresarios.cedula
-- ------------------------------------------------------------
-- El campo deja de ser exclusivo de "empresa formal" (cédula jurídica) y pasa a
-- ser genérico para los dos tipos de empresario (RF-16/RF-17): empresa formal
-- carga su cédula jurídica/ID fiscal; el emprendedor individual carga su cédula
-- de identidad. La UI muestra el label según el tipo; la columna es una sola.
--
-- Solo cambia el NOMBRE de la columna: preserva los datos y el tipo (varchar 50).
-- No hay policies, constraints, triggers ni índices que la referencien por
-- nombre, así que el rename es autocontenido.
-- ============================================================

alter table public.empresarios
  rename column cedula_juridica to cedula;
