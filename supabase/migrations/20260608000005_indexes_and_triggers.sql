-- ============================================================
-- MIGRACIÓN 0005 — Índices y triggers de negocio
-- Modelo FWD Talent (XXI). Aditiva sobre 0001–0004.
-- ============================================================

-- ============================================================
-- 1. ÍNDICES (queries frecuentes bajo carga - RNF-10)
-- ============================================================

-- Login / autenticación / gestión de usuarios
create index idx_usuarios_correo       on usuarios(correo);
create index idx_usuarios_rol          on usuarios(id_rol);
create index idx_usuarios_estado       on usuarios(estado_cuenta);
create index idx_usuarios_nivel_admin  on usuarios(nivel_admin) where nivel_admin is not null;

-- Participaciones (cupo del estudiante + dashboard de empresa)
create index idx_participaciones_estudiante_estado on participaciones(id_estudiante, estado);
create index idx_participaciones_proyecto_estado   on participaciones(id_proyecto, estado);

-- Listado de proyectos abiertos + filtro por área
create index idx_proyectos_estado_fecha on proyectos(estado, fecha_publicacion desc) where is_active = true;
create index idx_proyectos_area         on proyectos(id_area_negocio);

-- Mensajes (hilo por proyecto)
create index idx_mensajes_proyecto_fecha on mensajes(id_proyecto, fecha_envio desc);

-- Notificaciones por usuario
create index idx_notificaciones_usuario_leida on notificaciones(id_usuario, leida, generada_at desc);

-- Reputación
create index idx_evaluaciones_estudiante on evaluaciones(id_estudiante);

-- Strikes activos (cálculo de suspensión)
create index idx_strikes_usuario_activos on strikes(id_usuario) where revocado = false;

-- Auditoría
create index idx_auditoria_entidad on auditoria(entidad, id_entidad, ocurrida_at desc);
create index idx_auditoria_actor   on auditoria(id_actor, ocurrida_at desc);

-- Matching por tecnología
create index idx_hab_tec_tecnologia              on habilidades_tecnicas(id_tecnologia);
create index idx_proyecto_tecnologias_tecnologia on proyecto_tecnologias(id_tecnologia);

-- Comentarios de entregables (hilo de revisión)
create index idx_comentarios_entregable_fecha on comentarios_entregables(id_entregable, comentado_at desc);

-- Reportes pendientes de moderación
create index idx_reportes_estado on reportes_moderacion(estado_moderacion, reportado_at desc)
  where estado_moderacion in ('pendiente', 'en_revision');

-- Consentimientos (estado actual por usuario y tipo)
create index idx_consentimientos_usuario_tipo on consentimientos(id_usuario, tipo_consentimiento, consentimiento_at desc);

-- Conversaciones IA por empresario
create index idx_conversaciones_ia_empresario on conversaciones_ia(id_empresario, fecha_inicio desc);

-- Portafolio y relaciones N:M
create index idx_portafolio_estudiante     on proyectos_portafolio(id_estudiante) where is_active = true;
create index idx_proyecto_categorias_cat   on proyecto_categorias(id_categoria);
create index idx_portafolio_tecnologias_tec on portafolio_tecnologias(id_tecnologia);


-- ============================================================
-- 2. TRIGGERS DE INTEGRIDAD CRÍTICA (categoría A)
-- ============================================================

-- A.1 Validar cupo de participaciones activas antes de insertar
create or replace function validar_cupo_participaciones()
returns trigger as $$
declare activas integer; cupo_max integer;
begin
  select valor::integer into cupo_max from configuracion_sistema where clave = 'cupo_max_participaciones';
  if cupo_max is null then cupo_max := 3; end if;
  select count(*) into activas from participaciones
  where id_estudiante = new.id_estudiante and estado in ('enviada','en_revision','contratada');
  if activas >= cupo_max then
    raise exception 'Cupo de % participaciones activas alcanzado', cupo_max using errcode='check_violation';
  end if;
  return new;
end; $$ language plpgsql;
create trigger trg_cupo_participaciones
  before insert on participaciones for each row execute function validar_cupo_participaciones();

-- A.2 Validar estado del proyecto antes de aceptar un entregable
create or replace function validar_estado_proyecto_para_entregable()
returns trigger as $$
declare estado_actual estado_proyecto_enum;
begin
  select p.estado into estado_actual
  from proyectos p
  join participaciones pa on pa.id_proyecto = p.id_proyecto
  join contrataciones  c  on c.id_participacion = pa.id_participacion
  where c.id_contratacion = new.id_contratacion;
  if estado_actual not in ('adjudicado','en_desarrollo') then
    raise exception 'No se puede subir entregable: proyecto en estado %', estado_actual using errcode='check_violation';
  end if;
  return new;
end; $$ language plpgsql;
create trigger trg_validar_estado_entregable
  before insert or update on entregables for each row execute function validar_estado_proyecto_para_entregable();

-- A.3 Actualizar cantidad_strikes y suspender al alcanzar umbral
create or replace function actualizar_strikes()
returns trigger as $$
declare total_activos integer; umbral integer;
begin
  select count(*) into total_activos from strikes where id_usuario = new.id_usuario and revocado = false;
  update usuarios set cantidad_strikes = total_activos where id_usuario = new.id_usuario;
  select valor::integer into umbral from configuracion_sistema where clave = 'strikes_para_suspension';
  if umbral is null then umbral := 3; end if;
  if total_activos >= umbral then
    update usuarios set estado_cuenta = 'suspendida', suspendido_at = now()
    where id_usuario = new.id_usuario and estado_cuenta not in ('suspendida','suspendida_severa');
  end if;
  return new;
end; $$ language plpgsql;
create trigger trg_strikes_actualizar
  after insert or update of revocado on strikes for each row execute function actualizar_strikes();

-- A.4 Validar nivel_admin solo en administradores
create or replace function validar_nivel_admin()
returns trigger as $$
declare nombre_rol_actual varchar(30);
begin
  select nombre_rol into nombre_rol_actual from roles where id_rol = new.id_rol;
  if nombre_rol_actual = 'administrador' and new.nivel_admin is null then
    raise exception 'Los administradores requieren nivel_admin no nulo' using errcode='check_violation';
  end if;
  if nombre_rol_actual <> 'administrador' and new.nivel_admin is not null then
    raise exception 'nivel_admin solo aplica para rol administrador' using errcode='check_violation';
  end if;
  return new;
end; $$ language plpgsql;
create trigger trg_validar_nivel_admin
  before insert or update of id_rol, nivel_admin on usuarios
  for each row execute function validar_nivel_admin();


-- ============================================================
-- 3. TRIGGERS DE MANTENIMIENTO DE DENORMALIZADOS (categoría B)
-- ============================================================

-- B.1 Recalcular estudiantes.reputacion
create or replace function recalcular_reputacion()
returns trigger as $$
begin
  update estudiantes set reputacion = coalesce(
    (select round(avg(puntuacion)::numeric, 2) from evaluaciones where id_estudiante = new.id_estudiante), 0.00)
  where id_estudiante = new.id_estudiante;
  return new;
end; $$ language plpgsql;
create trigger trg_reputacion
  after insert or update of puntuacion on evaluaciones for each row execute function recalcular_reputacion();

-- B.2 Mantener participaciones_activas y proyectos_completados
create or replace function sync_contadores_estudiante()
returns trigger as $$
declare id_est uuid;
begin
  id_est := coalesce(new.id_estudiante, old.id_estudiante);
  update estudiantes set
    participaciones_activas = (select count(*) from participaciones
      where id_estudiante = id_est and estado in ('enviada','en_revision','contratada')),
    proyectos_completados = (select count(*) from participaciones
      where id_estudiante = id_est and estado = 'finalizada')
  where id_estudiante = id_est;
  return coalesce(new, old);
end; $$ language plpgsql;
create trigger trg_contadores_estudiante
  after insert or update or delete on participaciones for each row execute function sync_contadores_estudiante();

-- B.3 Mantener proyectos.postulaciones_pendientes_revisar
create or replace function sync_postulaciones_pendientes()
returns trigger as $$
declare id_proy uuid;
begin
  id_proy := coalesce(new.id_proyecto, old.id_proyecto);
  update proyectos set postulaciones_pendientes_revisar = (
    select count(*) from participaciones where id_proyecto = id_proy and estado = 'enviada')
  where id_proyecto = id_proy;
  return coalesce(new, old);
end; $$ language plpgsql;
create trigger trg_postulaciones_pendientes
  after insert or update or delete on participaciones for each row execute function sync_postulaciones_pendientes();

-- B.4 Crear contratacion cuando la participacion pasa a 'contratada'
create or replace function crear_contratacion_al_adjudicar()
returns trigger as $$
begin
  if new.estado = 'contratada' and (old.estado is null or old.estado <> 'contratada') then
    insert into contrataciones (id_participacion, fecha_inicio, estado_periodo)
    values (new.id_participacion, current_date, 'vigente')
    on conflict (id_participacion) do nothing;
  end if;
  return new;
end; $$ language plpgsql;
create trigger trg_crear_contratacion
  after update of estado on participaciones for each row execute function crear_contratacion_al_adjudicar();
