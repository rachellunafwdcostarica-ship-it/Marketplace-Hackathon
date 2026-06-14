-- ============================================================
-- proyectos: involucra_ia + generado_por_ia — §0 (Corte 4, publicar)
-- ------------------------------------------------------------
-- Separa dos conceptos que estaban colapsados en `usa_ia` (errolpendiente §0):
--   · involucra_ia    = el proyecto, como producto, usa IA (lo infiere la IA).
--   · generado_por_ia = el contenido lo elaboró la IA (computado al publicar).
--
-- Idempotente y guardado para correr sin saber el estado previo:
--   · el RENAME solo ocurre si `usa_ia` existe y `involucra_ia` todavía no.
--   · `generado_por_ia` se agrega con IF NOT EXISTS.
-- No destructivo: no toca datos. Ningún código lee `usa_ia` (solo el tipo en
-- database.ts, que se actualiza junto al RPC en el código del Corte 4).
-- ============================================================

do $$
begin
  if exists (
        select 1 from information_schema.columns
        where table_schema = 'public'
          and table_name   = 'proyectos'
          and column_name  = 'usa_ia'
      )
     and not exists (
        select 1 from information_schema.columns
        where table_schema = 'public'
          and table_name   = 'proyectos'
          and column_name  = 'involucra_ia'
      )
  then
    alter table public.proyectos rename column usa_ia to involucra_ia;
  end if;
end $$;

alter table public.proyectos
  add column if not exists generado_por_ia boolean not null default false;
