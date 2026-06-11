-- ============================================================
-- MIGRACIÓN 0013 — Flujo B (parcial): UNIQUE + validación de INSERT
-- Fecha: 2026-06-11
-- Autor: Samir (A1)
--
-- Dos de las tres piezas pendientes del flujo B (coordinacion-santiago-13.md).
-- La tercera (trigger BEFORE UPDATE con la máquina de estados) queda
-- bloqueada en las 2 dudas abiertas con Santiago y va en otra migración.
--
-- [F1] UNIQUE(id_proyecto, id_estudiante): hoy un junior puede postularse
--      dos veces al mismo proyecto y consumir doble cupo (RF-27).
--      Trade-off asumido: tampoco puede re-postularse tras retirar su
--      oferta. Si el equipo necesita re-postulación, esto se cambia a
--      un índice UNIQUE parcial que excluya estados terminales.
--
-- [F2] La policy INSERT solo validaba estado='enviada' + ownership.
--      No validaba nada del proyecto: se podía postular a proyectos
--      vencidos, cancelados o en borrador (RF-27 los prohíbe) ni que
--      el estudiante estuviera verificado (SRS §1.3: "Solo los
--      estudiantes verificados como egresados de FWD Costa Rica
--      pueden participar"). Se recrea con:
--        · estudiante con estado_verificacion = 'verificado'
--        · proyecto en estado abierto/en_recepcion, activo y con
--          fecha_cierre vigente (NULL = sin fecha definida aún, se
--          permite; el cierre automático RF-35 es tarea #37)
--        · roles {public} → authenticated (mismo fix que 0011 [P1])
--      Nota para pruebas: el estudiante de prueba debe estar
--      verificado (RF-64) para poder postularse.
-- ============================================================


-- ============================================================
-- [F1] Una postulación por estudiante y proyecto
-- ============================================================
alter table public.participaciones
  add constraint participaciones_proyecto_estudiante_key
  unique (id_proyecto, id_estudiante);


-- ============================================================
-- [F2] INSERT: egresado verificado + proyecto postulable
-- ============================================================
drop policy if exists "participaciones_insert_egresado" on public.participaciones;

create policy "participaciones_insert_egresado"
  on public.participaciones for insert
  to authenticated
  with check (
    estado = 'enviada'
    and id_estudiante in (
      select id_estudiante from public.estudiantes
      where id_usuario = (select auth.uid())
        and estado_verificacion = 'verificado'
    )
    and id_proyecto in (
      select id_proyecto from public.proyectos
      where estado in ('abierto', 'en_recepcion')
        and is_active = true
        and (fecha_cierre is null or fecha_cierre > now())
    )
  );
