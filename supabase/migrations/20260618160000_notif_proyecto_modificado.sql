-- ============================================================
-- tipo_notificacion_enum: + 'proyecto_modificado'
-- ------------------------------------------------------------
-- Habilita notificar a los oferentes activos (participación en 'enviada' o
-- 'en_revision') cuando el empresario edita la descripción de un proyecto aún
-- 'abierto' (errolpendiente §4.1, refinamiento de RF-24). Es el primer flujo
-- real que escribe en `notificaciones`.
--
-- Idempotente: IF NOT EXISTS. No toca datos. La inserción que usa el valor corre
-- en runtime (otra transacción), así que no choca con la restricción de Postgres
-- de no usar un valor de enum recién agregado dentro de la misma transacción.
--
-- La escritura en `notificaciones` y en `auditoria` la hace el backend con
-- service_role (ninguna tiene policy de INSERT a propósito): esta migración NO
-- agrega policies de escritura.
-- ============================================================

alter type public.tipo_notificacion_enum
  add value if not exists 'proyecto_modificado';
