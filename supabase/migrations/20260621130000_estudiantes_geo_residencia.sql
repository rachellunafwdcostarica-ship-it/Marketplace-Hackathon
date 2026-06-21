-- ============================================================
-- Geo ISO en estudiantes — país/región de residencia (reserva de espacios)
-- ------------------------------------------------------------
-- Prepara las columnas de ubicación del estudiante con la MISMA convención que
-- empresarios/proyectos (códigos ISO):
--   · pais_iso_residencia  → ISO 3166-1 alpha-2 (ej. CR), varchar(2)
--   · region_residencia    → ISO 3166-2          (ej. CR-SJ), varchar(6)
--
-- Ambas NULLABLES. Esta migración SOLO reserva los espacios: no se escribe ni se
-- lee desde la app acá (la lógica de UI/persistencia la implementa otra persona).
-- Por eso tampoco se regenera `src/types/database.ts` en este cambio.
--
-- Las columnas quedan bajo las políticas RLS ya existentes de `estudiantes`
-- (row-level): no requieren políticas nuevas.
--
-- NO aplicar sin aprobación del dueño de la BD (Samir).
-- ============================================================

alter table public.estudiantes
  add column pais_iso_residencia varchar(2),
  add column region_residencia   varchar(6);

comment on column public.estudiantes.pais_iso_residencia is
  'País de residencia del estudiante (ISO 3166-1 alpha-2, ej. CR). Nullable.';
comment on column public.estudiantes.region_residencia is
  'Región/subdivisión de residencia (ISO 3166-2, ej. CR-SJ). Opcional/nullable.';
