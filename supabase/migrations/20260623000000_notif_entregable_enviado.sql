-- RF-46 — Notificación al empresario cuando el egresado sube un entregable.
-- Agrega el valor 'entregable_enviado' al enum tipo_notificacion_enum.
-- Idempotente: IF NOT EXISTS. No toca datos existentes.

alter type public.tipo_notificacion_enum
  add value if not exists 'entregable_enviado';
