-- ============================================================
-- MIGRACIÓN — Postulación: obligatoriedad real + tipos y topes
-- Fecha: 2026-06-18
--
-- Alinea la tabla `participaciones` con el SRS para el flujo de
-- postulación (RF-28, RF-29, RF-30). Hasta ahora la BD era permisiva:
-- prototipo y planteamiento eran NULL-ables, así que una postulación
-- podía guardarse sin prototipo (incumple RF-28, Must). La regla vivía
-- solo en Zod; esta migración la respalda en la BD.
--
-- PRECONDICIÓN: la tabla `participaciones` debe estar vacía o con todas
-- las filas cumpliendo las restricciones. Si existe una fila con
-- prototipo_enlaces NULL/vacío o planteamiento_solucion NULL/<30, el
-- ALTER ... SET NOT NULL o el CHECK fallan. La tabla se vació antes de
-- aplicar esta migración.
--
-- Decisiones:
--  · documentacion_tecnica: varchar(150) → text. Era muy chico para una
--    URL; el tope ahora es por CHECK (<= 300), no por el tipo. Opcional
--    (RF-30 es Should): se queda NULL-able.
--  · prototipo_enlaces: NOT NULL + CHECK cardinality 1..4. OJO: NOT NULL
--    solo NO basta (un array vacío '{}' lo pasaría). Se usa cardinality()
--    y no array_length() porque array_length('{}',1) devuelve NULL y un
--    CHECK con NULL pasa; cardinality('{}') devuelve 0 y sí lo rechaza.
--  · planteamiento_solucion: NOT NULL + CHECK char_length >= 30 (espeja
--    el min del Zod del cliente y del server action).
--  · carta_postulacion: sigue OPCIONAL (NULL-able). Solo se le pone tope
--    por CHECK (<= 2800) cuando viene con valor.
--  · El formato URL de los enlaces se valida en Zod, no en la BD (un
--    CHECK con regex de URL sería frágil y difícil de mantener).
-- ============================================================


-- documentacion_tecnica: tipo a text (el tope pasa a ser por CHECK)
alter table public.participaciones
  alter column documentacion_tecnica type text;


-- Obligatorios reales (RF-28, RF-29)
alter table public.participaciones
  alter column planteamiento_solucion set not null,
  alter column prototipo_enlaces set not null;


-- Topes y obligatoriedad respaldados en la BD
alter table public.participaciones
  add constraint participaciones_planteamiento_min_chk
    check (char_length(planteamiento_solucion) >= 30),
  add constraint participaciones_prototipo_enlaces_card_chk
    check (cardinality(prototipo_enlaces) between 1 and 4),
  add constraint participaciones_carta_max_chk
    check (carta_postulacion is null or char_length(carta_postulacion) <= 2800),
  add constraint participaciones_documentacion_max_chk
    check (documentacion_tecnica is null or char_length(documentacion_tecnica) <= 300);
