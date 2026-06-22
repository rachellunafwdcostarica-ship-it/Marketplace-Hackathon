-- ============================================================
-- MIGRACIÓN 20260619130000 — Recrear soporte_tickets
-- Fecha: 2026-06-19
-- ============================================================
-- La tabla public.soporte_tickets fue eliminada manualmente de la base (fuera
-- del control de migraciones), quedando en drift respecto al historial. Como la
-- migración que la creó (20260612151500_create_soporte_tickets) ya figura como
-- aplicada, `supabase db push` NO la re-ejecuta; por eso se recrea aquí.
--
-- Estructura y políticas idénticas a 20260612151500. Idempotente: CREATE TABLE
-- IF NOT EXISTS + DROP POLICY IF EXISTS. Por eso:
--   - en la base con drift (tabla borrada a mano), la crea;
--   - en un Supabase nuevo / reconstruido desde cero con todas las migraciones
--     (donde 20260612151500 ya la creó), es no-op.
-- Así estas migraciones quedan reutilizables en cualquier entorno.
-- ============================================================

create table if not exists public.soporte_tickets (
  id_ticket   uuid primary key default gen_random_uuid(),
  id_usuario  uuid not null references public.usuarios(id_usuario) on delete cascade,
  descripcion text not null,
  created_at  timestamptz not null default now()
);

-- Habilitar RLS
alter table public.soporte_tickets enable row level security;

-- Políticas de RLS (idénticas a la migración original)
drop policy if exists "soporte_tickets_insert_own" on public.soporte_tickets;
create policy "soporte_tickets_insert_own"
  on public.soporte_tickets for insert
  to authenticated
  with check (id_usuario = (select auth.uid()));

drop policy if exists "soporte_tickets_select_own" on public.soporte_tickets;
create policy "soporte_tickets_select_own"
  on public.soporte_tickets for select
  to authenticated
  using (id_usuario = (select auth.uid()));

drop policy if exists "soporte_tickets_select_admin" on public.soporte_tickets;
create policy "soporte_tickets_select_admin"
  on public.soporte_tickets for select
  to authenticated
  using (
    exists (
      select 1 from public.usuarios u
      join public.roles r on u.id_rol = r.id_rol
      where u.id_usuario = (select auth.uid()) and r.nombre_rol = 'administrador'
    )
  );
