-- ============================================================
-- MIGRACIÓN 0014 — Flujo B (cierre #13): máquina de estados en participaciones
-- Fecha: 2026-06-11
-- Autor: Samir (A1)
--
-- Cierra la pieza que quedaba de coordinacion-santiago-13.md. Las dos
-- dudas abiertas quedaron respondidas por Santiago:
--   1. NO existe `enviada -> no_seleccionada` directo: el empresario
--      siempre pasa por `en_revision` antes de rechazar.
--   2. El junior NO puede abandonar tras `contratada`: el retiro solo
--      existe desde `enviada`/`en_revision`. La duración/finalización
--      del contrato la gestiona la tabla `contrataciones` (otro flujo).
--
-- Transiciones válidas (todo lo demás se rechaza):
--   enviada      -> en_revision | retirada
--   en_revision  -> contratada | no_seleccionada | retirada
--   contratada   -> finalizada | cancelada
--   no_seleccionada / retirada / finalizada / cancelada: terminales.
--
-- Por qué un trigger además de RLS: `participaciones_update` limita
-- QUIÉN actualiza (junior dueño solo hacia `retirada`; empresario dueño
-- del proyecto hacia cualquier estado != `retirada`) pero no QUÉ
-- transición es legal — sin esto un empresario puede saltar
-- `enviada -> contratada` o revivir una `cancelada`. Igual que los
-- guards de 0006: solo valida a `authenticated`; service_role y
-- postgres pasan (correcciones administrativas).
--
-- El errcode es `check_violation` (23514), el mismo que ya emite
-- `validar_cupo_participaciones`, para que las server actions de
-- Santiago capturen ambos por el mismo código.
-- ============================================================

create or replace function public.validar_transicion_participacion()
returns trigger
language plpgsql
set search_path to ''
as $$
begin
  if current_user is distinct from 'authenticated' then
    return new;
  end if;

  if new.estado = old.estado then
    return new;
  end if;

  if (old.estado = 'enviada'     and new.estado in ('en_revision', 'retirada'))
  or (old.estado = 'en_revision' and new.estado in ('contratada', 'no_seleccionada', 'retirada'))
  or (old.estado = 'contratada'  and new.estado in ('finalizada', 'cancelada')) then
    return new;
  end if;

  raise exception 'Transicion de estado invalida: % -> %', old.estado, new.estado
    using errcode = 'check_violation';
end;
$$;

-- Mismo patrón que 0007: las funciones-trigger no se exponen como RPC.
revoke execute on function public.validar_transicion_participacion() from public, anon, authenticated;

drop trigger if exists trg_transicion_participaciones on public.participaciones;

create trigger trg_transicion_participaciones
  before update of estado on public.participaciones
  for each row execute function public.validar_transicion_participacion();
