-- ============================================================
-- plazo_vence (RF-33): aviso de proximidad del cierre de ofertas
-- ------------------------------------------------------------
-- NO aplicar sin Samir: crea función SECURITY DEFINER y requiere
-- que pg_cron esté habilitado en la instancia de Supabase.
--
-- QUÉ HACE
--   1. Agrega columna marcadora de idempotencia a participaciones.
--   2. Inserta la clave de configuración plazo_aviso_horas (24 h por
--      defecto, editable desde el panel admin sin redeploy).
--   3. Crea la función que el job de pg_cron llama cada hora:
--      busca proyectos cuya fecha_cierre cae dentro del umbral
--      configurable y crea una notificación plazo_vence por cada
--      participación viva (enviada o en_revision) aún no avisada.
--
-- IDEMPOTENCIA
--   ADD COLUMN IF NOT EXISTS, INSERT ... ON CONFLICT DO NOTHING,
--   CREATE OR REPLACE FUNCTION. Seguro de re-ejecutar.
--
-- PASO EXTRA (Samir, fuera de esta migración)
--   Habilitar la extensión: Dashboard → Database → Extensions → pg_cron
--   Agendar el job (una sola vez):
--     select cron.schedule(
--       'plazo-vence-aviso-horario',
--       '0 * * * *',
--       $$ select public.emitir_avisos_plazo_vence(); $$
--     );
--   Verificar: select * from cron.job;
-- ============================================================

-- 1. Columna marcadora de idempotencia.
alter table public.participaciones
  add column if not exists plazo_aviso_enviado_at timestamptz;

-- 2. Parámetro configurable (horas de anticipación). Editable en el panel admin.
insert into public.configuracion_sistema (clave, valor, tipo_dato, descripcion)
values (
  'plazo_aviso_horas',
  '24',
  'integer',
  'Horas de anticipacion para avisar a los postulantes del cierre de ofertas (RF-33).'
)
on conflict (clave) do nothing;

-- 3. Productor: emite los avisos pendientes.
--    SECURITY DEFINER porque notificaciones no tiene policy de INSERT
--    (solo service_role/owner puede insertar — decisión P1.1 del equipo).
create or replace function public.emitir_avisos_plazo_vence()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_horas    integer;
  v_emitidas integer;
begin
  -- Umbral configurable; default 24 si la fila no existe o está vacía.
  select coalesce(nullif(valor, '')::integer, 24) into v_horas
  from public.configuracion_sistema
  where clave = 'plazo_aviso_horas';
  if v_horas is null then v_horas := 24; end if;

  with objetivo as (
    select pa.id_participacion, pa.id_estudiante, p.id_proyecto, p.titulo
    from public.participaciones pa
    join public.proyectos p on p.id_proyecto = pa.id_proyecto
    where p.estado in ('abierto', 'en_recepcion')
      and p.is_active = true
      and p.fecha_cierre is not null
      and p.fecha_cierre >  now()
      and p.fecha_cierre <= now() + make_interval(hours => v_horas)
      and pa.estado in ('enviada', 'en_revision')
      and pa.plazo_aviso_enviado_at is null
  ),
  marcadas as (
    update public.participaciones pa
    set plazo_aviso_enviado_at = now()
    from objetivo o
    where pa.id_participacion = o.id_participacion
    returning o.id_estudiante, o.id_proyecto, o.titulo
  )
  insert into public.notificaciones (id_usuario, tipo_evento, mensaje, url_destino, params, leida)
  select
    est.id_usuario,
    'plazo_vence',
    left('La ventana de ofertas de "' || m.titulo || '" esta por cerrar.', 255),
    '/es/egresado/projects/' || m.id_proyecto,
    jsonb_build_object('titulo', m.titulo),
    false
  from marcadas m
  join public.estudiantes est on est.id_estudiante = m.id_estudiante;

  get diagnostics v_emitidas = row_count;
  return v_emitidas;
end;
$$;

-- Solo el job (owner) la ejecuta; nunca los clientes.
revoke execute on function public.emitir_avisos_plazo_vence() from public, anon, authenticated;
