-- ============================================================
-- MIGRACIÓN 0015 — Soporte: tickets de soporte / necesidades
-- Fecha: 2026-06-12
--
-- Crea la tabla public.soporte_tickets para que los empresarios
-- describan sus problemas o necesidades de negocio, visibles
-- para los administradores.
-- ============================================================

create table public.soporte_tickets (
  id_ticket   uuid primary key default gen_random_uuid(),
  id_usuario  uuid not null references public.usuarios(id_usuario) on delete cascade,
  descripcion text not null,
  created_at  timestamptz not null default now()
);

-- Habilitar RLS
alter table public.soporte_tickets enable row level security;

-- Políticas de RLS
create policy "soporte_tickets_insert_own"
  on public.soporte_tickets for insert
  to authenticated
  with check (id_usuario = (select auth.uid()));

create policy "soporte_tickets_select_own"
  on public.soporte_tickets for select
  to authenticated
  using (id_usuario = (select auth.uid()));

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
