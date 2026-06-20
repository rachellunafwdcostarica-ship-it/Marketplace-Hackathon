-- ============================================================
-- notificaciones: + columna `params jsonb`
-- ------------------------------------------------------------
-- Habilita el almacenamiento i18n-first de notificaciones (RF-47): en lugar de
-- guardar el texto ya renderizado en un solo idioma en `mensaje`, el backend
-- guarda los parámetros del evento (p. ej. { "titulo": "..." }) y el cliente
-- arma el texto con next-intl segun el idioma activo, usando la clave
-- `content.<tipo_evento>`.
--
-- `mensaje` se mantiene como fallback: las notificaciones previas a esta
-- migracion (sin `params`) se siguen mostrando con su texto guardado, y el
-- backend lo sigue poblando para correo/compatibilidad.
--
-- Idempotente: IF NOT EXISTS. Nullable, sin default: una fila sin `params`
-- representa "usar el fallback `mensaje`". No toca datos existentes.
--
-- RLS: la tabla ya tiene `notificaciones_select_own` y
-- `notificaciones_update_own`; la nueva columna queda cubierta por ellas. Esta
-- migracion NO agrega ni cambia policies.
-- ============================================================

alter table public.notificaciones
  add column if not exists params jsonb;
