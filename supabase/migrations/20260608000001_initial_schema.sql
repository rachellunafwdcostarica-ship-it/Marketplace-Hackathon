-- [RECONCILIADO A XXI] cédula y contrasena_hash fuera; ENUM participacion 7 estados;
-- categorias_proyecto->categorias; estudiante_habilidades->habilidades_tecnicas;
-- +3 tablas de portafolio; tipo_evento ENUM; tipos_notificacion_silenciados.

-- ============================================================
-- MIGRACIÓN INICIAL — Marketplace FWD
-- Fecha: 2026-06-08
-- ============================================================
--
-- ÍNDICE DE VIOLACIONES Y AMBIGÜEDADES
-- Busca la etiqueta entre corchetes para ir directo al problema.
--
-- VIOLACIONES A reglas.md / brief
-- ─────────────────────────────────────────────────────────────
-- [V1] usuarios.contrasena_hash — RESUELTO (columna eliminada; Auth gestiona credenciales)
--      Supabase Auth gestiona contraseñas en auth.users — este campo
--      es redundante y representa un riesgo de seguridad real.
--      Acción: eliminar la columna cuando Auth esté operativo.
--
-- [V2] tabla mensajes (~línea 330)
--      Mensajería en tiempo real está FUERA del alcance del MVP (§3.4 brief).
--      Si es solo un log pasivo de contacto, renombrar y rediseñar.
--      Acción: definir si va en MVP o se pospone al 2.0.
--
-- [V3] RLS sin políticas reales (~línea 460 en adelante)
--      Todas las tablas tienen RLS habilitado pero las políticas son
--      placeholder de solo lectura pública. Esto no es producción.
--      Acción: definir políticas explícitas por rol antes de deploy.
--
-- AMBIGÜEDADES SIN RESOLVER
-- ─────────────────────────────────────────────────────────────
-- [A1] usuarios.cedula — RESUELTO (eliminada; cotejo FWD por correo, RF-64)
--      ¿Todos los usuarios (empresarios Y estudiantes) tienen cédula?
--      Si solo aplica a estudiantes, mover a tabla estudiantes.
--
-- [A2] mensajes sin id_destinatario (~línea 335)
--      ¿El mensaje es broadcast al proyecto o chat 1:1?
--      El modelo de mensajería no está definido.
--
-- [A3] estudiantes.titulo_fwd (~línea 130)
--      ¿Quién asigna frontend/backend/fullstack? No hay flujo visible.
--      ¿Es un admin FWD? ¿Se auto-asigna en onboarding?
--
-- [A4] updated_at faltante en varias tablas (~líneas 120, 165, 235, 265, 285)
--      estudiantes, empresarios, participaciones, contrataciones, entregables
--      no tienen updated_at. Se agregó en esta migración con trigger automático.
--
-- BUGS DEL DIAGRAMA CORREGIDOS EN ESTA MIGRACIÓN
-- ─────────────────────────────────────────────────────────────
-- proyecto_tecnologias.id_tecnologias: VARCHAR(80) → UUID
-- auditoria: PK renombrado id_mensaje → id_auditoria
-- auditoria.accion: removida marca FK incorrecta (es VARCHAR libre)
-- configuracion_sistema.valor: UUID → TEXT
-- strikes.motivo_revocacion: removida marca FK incorrecta (es TEXT)
-- entregables.tipo_entregable ENUM: "fina" → "final"
-- estudiantes.modalidad_preferida ENUM: "PRESENCIAL" → "presencial"
-- ============================================================


-- ============================================================
-- EXTENSIONES
-- ============================================================
create extension if not exists "uuid-ossp";


-- ============================================================
-- FUNCIÓN UTILITARIA: updated_at automático
-- Se asigna como trigger en las tablas que lo necesitan.
-- ============================================================
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;


-- ============================================================
-- ENUMS
-- ============================================================
create type estado_cuenta_enum    as enum ('pendiente', 'activa', 'suspendida', 'suspendida_severa');
create type titulo_fwd_enum       as enum ('frontend', 'backend', 'fullstack');
create type estado_verif_enum     as enum ('pendiente', 'verificado', 'rechazado');
create type modalidad_enum        as enum ('remoto', 'hibrido', 'presencial');
create type nivel_habilidad_enum  as enum ('basico', 'intermedio', 'avanzado');
create type tipo_empresario_enum  as enum ('empresa_formal', 'emprendedor');
create type alcance_enum          as enum ('nacional', 'internacional', 'ambos');
create type estado_proyecto_enum  as enum ('borrador', 'abierto', 'en_recepcion', 'adjudicado', 'en_desarrollo', 'finalizado', 'cancelado');
create type moneda_enum           as enum ('USD', 'CRC');
create type estado_participacion_enum as enum ('enviada', 'en_revision', 'contratada', 'no_seleccionada', 'retirada', 'finalizada', 'cancelada');
create type estado_periodo_enum   as enum ('vigente', 'pausado', 'finalizado', 'cancelado');
create type tipo_entregable_enum  as enum ('parcial', 'final'); -- [BUG CORREGIDO] "fina" → "final"
create type estado_entregable_enum as enum ('enviado', 'en_revision', 'aprobado', 'con_cambios');
create type tipo_comentario_enum  as enum ('revision_solicitada', 'aclaracion', 'aprobacion', 'rechazo');
create type motivo_strike_enum    as enum ('no_entrego', 'abandono_proyecto', 'conducta_inapropiada', 'calificacion_baja_repetida', 'fraude', 'ghosting', 'otro');
create type estado_conv_ia_enum   as enum ('en_curso', 'finalizada', 'abandonada');
create type nivel_tecnico_enum    as enum ('no_tecnico', 'basico', 'intermedio', 'avanzado');
create type tipo_reporte_enum     as enum ('conducta_abusiva', 'contenido_inapropiado', 'spam', 'fraude', 'otro');
create type estado_moderacion_enum as enum ('pendiente', 'en_revision', 'resuelto_a_favor', 'resuelto_en_contra', 'descartado');
create type tipo_dato_enum        as enum ('integer', 'decimal', 'boolean', 'string');
create type tipo_consentimiento_enum as enum ('ia', 'cotejo_fwd', 'terminos_servicio', 'politica_privacidad');
create type tipo_notificacion_enum   as enum ('mensaje_nuevo', 'postulacion_recibida', 'plazo_vence', 'participacion_no_seleccionada', 'participacion_contratada', 'entregable_aprobado', 'entregable_rechazado', 'evaluacion_recibida', 'cuenta_verificada', 'cuenta_suspendida', 'strike_recibido');
create type nivel_admin_enum         as enum ('superadmin', 'admin', 'moderador');
create type origen_portafolio_enum   as enum ('plataforma_no_contratada', 'plataforma_contratada', 'independiente');
create type estado_consent_portafolio_enum as enum ('pendiente', 'aprobado', 'revocado');


-- ============================================================
-- 1. CATÁLOGOS BASE (sin dependencias)
-- ============================================================

create table roles (
  id_rol      smallint    primary key generated always as identity,
  nombre_rol  varchar(30) not null unique,
  descripcion varchar(255)
);

create table areas_negocio (
  id_area     uuid        primary key default gen_random_uuid(),
  nombre      varchar(80) not null unique,
  descripcion varchar(255),
  is_active   boolean     not null default true
);

create table categorias (
  id_categoria uuid       primary key default gen_random_uuid(),
  nombre       varchar(80) not null unique,
  is_active    boolean    not null default true
);

create table tecnologias (
  id_tecnologia uuid       primary key default gen_random_uuid(),
  nombre        varchar(80) not null unique,
  is_active     boolean    not null default true
);


-- ============================================================
-- 2. USUARIOS
-- Extiende auth.users de Supabase. id_usuario = auth.users.id
-- ============================================================

create table usuarios (
  id_usuario          uuid         primary key references auth.users(id) on delete cascade,
  nombre              varchar(80)  not null,
  apellido_1          varchar(80)  not null,
  apellido_2          varchar(80),
  fecha_nacimiento    date,

  correo              varchar(150) not null unique,

  id_rol              smallint     not null references roles(id_rol),
  foto_perfil         varchar(150),
  estado_cuenta       estado_cuenta_enum not null default 'pendiente',
  is_active           boolean      not null default true,
  cantidad_strikes    integer      not null default 0,
  intentos_fallidos   integer      not null default 0,
  bloqueado_hasta     timestamptz,
  fecha_registro      timestamptz  not null default now(),
  ultimo_login_at     timestamptz,
  suspendido_at       timestamptz,
  nivel_admin         nivel_admin_enum,
  tipos_notificacion_silenciados tipo_notificacion_enum[] not null default '{}'
);


-- ============================================================
-- 3. PERFILES ESPECÍFICOS
-- ============================================================

-- [A4] AMBIGÜEDAD: estudiantes no tenía updated_at en el diagrama.
--      Se agrega aquí con trigger automático.
create table estudiantes (
  id_estudiante                  uuid       primary key default gen_random_uuid(),
  id_usuario                     uuid       not null unique references usuarios(id_usuario) on delete cascade,

  -- [A3] AMBIGÜEDAD: ¿Quién asigna titulo_fwd? No hay flujo visible en el esquema.
  --      ¿Lo asigna un admin FWD manualmente? ¿El estudiante lo elige en onboarding?
  titulo_fwd                     titulo_fwd_enum,

  estado_verificacion            estado_verif_enum not null default 'pendiente',
  verificado_at                  timestamptz,
  verificado_por                 uuid       references usuarios(id_usuario),
  reputacion                     decimal(3,2),
  proyectos_completados          integer    not null default 0,
  participaciones_activas        integer    not null default 0,
  descripcion                    text,

  -- [BUG CORREGIDO] "PRESENCIAL" → "presencial" para consistencia con el ENUM
  modalidad_preferida            modalidad_enum,
  url_portafolio                 varchar(150),
  portafolio_visible_publicamente boolean   not null default true,
  updated_at                     timestamptz not null default now() -- [A4] agregado
);

create trigger trg_estudiantes_updated_at
  before update on estudiantes
  for each row execute function set_updated_at();


create table habilidades_tecnicas (
  id_estudiante  uuid              not null references estudiantes(id_estudiante) on delete cascade,
  id_tecnologia  uuid              not null references tecnologias(id_tecnologia) on delete cascade,
  nivel          nivel_habilidad_enum not null,
  primary key (id_estudiante, id_tecnologia)
);


-- [A4] AMBIGÜEDAD: empresarios no tenía updated_at en el diagrama. Se agrega.
create table empresarios (
  id_empresario        uuid       primary key default gen_random_uuid(),
  id_usuario           uuid       not null unique references usuarios(id_usuario) on delete cascade,
  tipo_empresario      tipo_empresario_enum not null,
  nombre_empresa       varchar(150) not null,
  sector               varchar(80),
  descripcion          text,
  logo                 varchar(150),
  sitio_web            varchar(150),
  cedula_juridica      varchar(50),
  alcance_operativo    alcance_enum,
  pais_sede            varchar(80),
  ciudad_sede          varchar(80),
  estado_verificacion  estado_verif_enum not null default 'pendiente',
  verificado_at        timestamptz,
  verificado_por       uuid       references usuarios(id_usuario),
  updated_at           timestamptz not null default now() -- [A4] agregado
);

create trigger trg_empresarios_updated_at
  before update on empresarios
  for each row execute function set_updated_at();


-- ============================================================
-- 4. PROYECTOS
-- ============================================================

create table proyectos (
  id_proyecto                      uuid       primary key default gen_random_uuid(),
  id_empresario                    uuid       not null references empresarios(id_empresario),
  id_area_negocio                  uuid       references areas_negocio(id_area),
  titulo                           varchar(150) not null,
  descripcion                      text       not null,
  usa_ia                           boolean    not null default false,
  presupuesto_min                  decimal(12,2),
  presupuesto_max                  decimal(12,2),
  moneda                           moneda_enum not null default 'USD',
  modalidad                        modalidad_enum not null,
  pais_proyecto                    varchar(80),
  ciudad_proyecto                  varchar(80),
  estado                           estado_proyecto_enum not null default 'borrador',
  motivo_cancelacion               text,
  fecha_publicacion                timestamptz,
  fecha_cierre                     timestamptz,
  postulaciones_pendientes_revisar integer    not null default 0,
  is_active                        boolean    not null default true,
  created_at                       timestamptz not null default now(),
  updated_at                       timestamptz not null default now()
);

create trigger trg_proyectos_updated_at
  before update on proyectos
  for each row execute function set_updated_at();


-- [BUG CORREGIDO] id_tecnologias era VARCHAR(80) en el diagrama → UUID
create table proyecto_tecnologias (
  id_proyecto   uuid not null references proyectos(id_proyecto) on delete cascade,
  id_tecnologia uuid not null references tecnologias(id_tecnologia) on delete cascade,
  primary key (id_proyecto, id_tecnologia)
);


-- ============================================================
-- 5. PARTICIPACIONES, CONTRATACIONES Y ENTREGABLES
-- ============================================================

-- [A4] AMBIGÜEDAD: participaciones no tenía updated_at en el diagrama. Se agrega.
create table participaciones (
  id_participacion           uuid       primary key default gen_random_uuid(),
  id_proyecto                uuid       not null references proyectos(id_proyecto),
  id_estudiante              uuid       not null references estudiantes(id_estudiante),
  estado                     estado_participacion_enum not null default 'enviada',
  carta_postulacion          text,
  fecha_postulacion          timestamptz not null default now(),
  revision_iniciada_at       timestamptz,
  planteamiento_solucion     text,
  prototipo_enlaces          text[],
  documentacion_tecnica      varchar(150),
  fecha_entrega_prototipo    timestamptz,
  calificacion_prototipo     integer,
  comentario_prototipo       text,
  adjudicada_at              timestamptz,
  no_seleccionada_at         timestamptz,
  retirada_at                timestamptz,
  motivo_retiro              text,
  url_repositorio_proyecto   varchar(150),
  updated_at                 timestamptz not null default now() -- [A4] agregado
);

create trigger trg_participaciones_updated_at
  before update on participaciones
  for each row execute function set_updated_at();


-- [A4] AMBIGÜEDAD: contrataciones no tenía updated_at en el diagrama. Se agrega.
create table contrataciones (
  id_contratacion      uuid       primary key default gen_random_uuid(),
  id_participacion     uuid       not null unique references participaciones(id_participacion),
  fecha_inicio         date,
  fecha_fin_estimada   date,
  fecha_fin_real       date,
  monto_acordado       decimal(12,2),
  moneda               moneda_enum not null default 'USD',
  condiciones_especiales text,
  estado_periodo       estado_periodo_enum not null default 'vigente',
  motivo_cancelacion   text,
  updated_at           timestamptz not null default now() -- [A4] agregado
);

create trigger trg_contrataciones_updated_at
  before update on contrataciones
  for each row execute function set_updated_at();


-- [A4] AMBIGÜEDAD: entregables no tenía updated_at en el diagrama. Se agrega.
create table entregables (
  id_entregable    uuid       primary key default gen_random_uuid(),
  id_contratacion  uuid       not null references contrataciones(id_contratacion),
  tipo_entregable  tipo_entregable_enum not null, -- [BUG CORREGIDO] "fina" → "final"
  version          integer    not null default 1,
  archivo_url      varchar(150),
  estado           estado_entregable_enum not null default 'enviado',
  cargado_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now() -- [A4] agregado
);

create trigger trg_entregables_updated_at
  before update on entregables
  for each row execute function set_updated_at();


create table comentarios_entregables (
  id_comentario_entregable uuid       primary key default gen_random_uuid(),
  id_entregable            uuid       not null references entregables(id_entregable) on delete cascade,
  id_autor                 uuid       not null references usuarios(id_usuario),
  contenido                text       not null,
  tipo_comentario          tipo_comentario_enum not null,
  comentado_at             timestamptz not null default now()
);

-- ============================================================
-- 5b. PORTAFOLIO DEL ESTUDIANTE  [NUEVO en XXI]
-- ============================================================

create table proyectos_portafolio (
  id_portafolio         uuid       primary key default gen_random_uuid(),
  id_estudiante         uuid       not null references estudiantes(id_estudiante) on delete cascade,
  titulo                varchar(150) not null,
  descripcion           text,
  imagen_url            varchar(150),
  fecha                 date,
  origen                origen_portafolio_enum not null,
  id_participacion      uuid       references participaciones(id_participacion),
  url_repositorio       varchar(150),
  url_demo              varchar(150),
  estado_consentimiento estado_consent_portafolio_enum,
  consentimiento_at     timestamptz,
  is_active             boolean    not null default true
);

create table portafolio_tecnologias (
  id_portafolio uuid not null references proyectos_portafolio(id_portafolio) on delete cascade,
  id_tecnologia uuid not null references tecnologias(id_tecnologia) on delete cascade,
  primary key (id_portafolio, id_tecnologia)
);

create table proyecto_categorias (
  id_proyecto  uuid not null references proyectos(id_proyecto) on delete cascade,
  id_categoria uuid not null references categorias(id_categoria) on delete cascade,
  primary key (id_proyecto, id_categoria)
);


-- ============================================================
-- 6. EVALUACIONES Y STRIKES
-- ============================================================

create table evaluaciones (
  id_evaluacion    uuid       primary key default gen_random_uuid(),
  id_contratacion  uuid       not null references contrataciones(id_contratacion),
  id_empresario    uuid       not null references empresarios(id_empresario),
  id_estudiante    uuid       not null references estudiantes(id_estudiante),
  puntuacion       integer    not null check (puntuacion between 1 and 5),
  comentario       text,
  respuesta_evaluado text,
  evaluado_at      timestamptz not null default now()
);


create table strikes (
  id_strike         uuid       primary key default gen_random_uuid(),
  id_usuario        uuid       not null references usuarios(id_usuario),
  id_proyecto       uuid       references proyectos(id_proyecto),
  id_reporte        uuid,      -- FK a reportes_moderacion; se agrega constraint abajo
  motivo            motivo_strike_enum not null,
  descripcion       text,
  aplicado_por      uuid       not null references usuarios(id_usuario),
  aplicado_at       timestamptz not null default now(),
  revocado          boolean    not null default false,
  revocado_por      uuid       references usuarios(id_usuario),
  -- [BUG CORREGIDO] motivo_revocacion tenía FK marcada incorrectamente — es TEXT libre
  motivo_revocacion text,
  revocado_at       timestamptz
);


-- ============================================================
-- 7. MENSAJERÍA Y NOTIFICACIONES
-- ============================================================

-- [V2] VIOLACIÓN §3.4 brief: mensajería en tiempo real está FUERA del MVP.
--      Si esta tabla es para un log pasivo de contacto (no chat en tiempo real),
--      rediseñar con ese propósito explícito. Si es para chat, postergarlo al 2.0.
--
-- [A2] AMBIGÜEDAD: no hay id_destinatario.
--      ¿El mensaje es broadcast a todos en el proyecto o es 1:1?
--      Definir antes de construir el frontend de mensajería.
create table mensajes (
  id_mensaje   uuid       primary key default gen_random_uuid(),
  id_proyecto  uuid       not null references proyectos(id_proyecto),
  id_remitente uuid       not null references usuarios(id_usuario),
  contenido    text       not null,
  leido        boolean    not null default false,
  fecha_envio  timestamptz not null default now()
);


create table notificaciones (
  id_notificacion uuid        primary key default gen_random_uuid(),
  id_usuario      uuid        not null references usuarios(id_usuario) on delete cascade,
  tipo_evento     tipo_notificacion_enum not null,
  mensaje         varchar(255) not null,
  url_destino     varchar(255),
  leida           boolean     not null default false,
  generada_at     timestamptz not null default now()
);


create table conversaciones_ia (
  id_conversacion             uuid       primary key default gen_random_uuid(),
  id_empresario               uuid       not null references empresarios(id_empresario),
  id_proyecto                 uuid       references proyectos(id_proyecto),
  contexto_inicial            text,
  contexto_inicial_pdf_url    varchar(150),
  historial                   jsonb,
  nivel_tecnico_empresario    nivel_tecnico_enum,
  stack_sugerido              jsonb,
  propuesta_generada          jsonb,
  propuesta_aprobada          jsonb,
  estado                      estado_conv_ia_enum not null default 'en_curso',
  modelo_ia                   varchar(80),
  fecha_inicio                timestamptz not null default now(),
  fecha_fin                   timestamptz
);


-- ============================================================
-- 8. MODERACIÓN Y AUDITORÍA
-- ============================================================

create table reportes_moderacion (
  id_reporte          uuid       primary key default gen_random_uuid(),
  id_reportante       uuid       not null references usuarios(id_usuario),
  id_reportado        uuid                 references usuarios(id_usuario),
  id_proyecto         uuid       references proyectos(id_proyecto),
  id_mensaje          uuid       references mensajes(id_mensaje),
  id_entregable       uuid       references entregables(id_entregable),
  id_portafolio       uuid       references proyectos_portafolio(id_portafolio),
  tipo_reporte        tipo_reporte_enum not null,
  descripcion         text       not null,
  estado_moderacion   estado_moderacion_enum not null default 'pendiente',
  resolucion          text,
  resuelto_por        uuid       references usuarios(id_usuario),
  reportado_at        timestamptz not null default now(),
  resuelto_at         timestamptz,
  check (id_reportado is not null or id_proyecto is not null or id_mensaje is not null or id_entregable is not null or id_portafolio is not null)
);

-- FK diferida de strikes → reportes_moderacion (creación circular resuelta aquí)
alter table strikes
  add constraint fk_strikes_reporte
  foreign key (id_reporte) references reportes_moderacion(id_reporte);


-- [BUG CORREGIDO] PK renombrado id_mensaje → id_auditoria
-- [BUG CORREGIDO] accion ya no tiene FK (era VARCHAR libre, no referencia)
create table auditoria (
  id_auditoria    uuid        primary key default gen_random_uuid(),
  id_actor        uuid        references usuarios(id_usuario),
  accion          varchar(100) not null,
  entidad         varchar(80)  not null,
  id_entidad      uuid         not null,
  valores_antes   jsonb,
  valores_despues jsonb,
  ip_origen       varchar(80),
  ocurrida_at     timestamptz  not null default now()
);


-- ============================================================
-- 9. CONFIGURACIÓN Y CONSENTIMIENTOS
-- ============================================================

-- [BUG CORREGIDO] valor era UUID → ahora TEXT (el tipo lógico lo define tipo_dato)
create table configuracion_sistema (
  clave          varchar(100) primary key,
  valor          text         not null,
  tipo_dato      tipo_dato_enum not null,
  descripcion    text,
  modificado_por uuid         references usuarios(id_usuario),
  modificado_at  timestamptz  not null default now()
);


create table consentimientos (
  id_consentimiento  uuid       primary key default gen_random_uuid(),
  id_usuario         uuid       not null references usuarios(id_usuario) on delete cascade,
  tipo_consentimiento tipo_consentimiento_enum not null,
  otorgado           boolean    not null,
  version_documento  varchar(20),
  ip_origen          varchar(60),
  user_agent         varchar(255),
  consentimiento_at  timestamptz not null default now()
);


-- ============================================================
-- [V3] VIOLACIÓN: RLS obligatorio por §7.2 del brief.
-- Las políticas de abajo son PLACEHOLDER de solo lectura pública.
-- REEMPLAZAR con políticas reales por rol antes de ir a producción.
-- ============================================================

alter table roles                    enable row level security;
alter table usuarios                 enable row level security;
alter table estudiantes              enable row level security;
alter table habilidades_tecnicas     enable row level security;
alter table empresarios              enable row level security;
alter table areas_negocio            enable row level security;
alter table categorias                  enable row level security;
alter table tecnologias              enable row level security;
alter table proyectos                enable row level security;
alter table proyecto_tecnologias     enable row level security;
alter table participaciones          enable row level security;
alter table contrataciones           enable row level security;
alter table entregables              enable row level security;
alter table comentarios_entregables  enable row level security;
alter table evaluaciones             enable row level security;
alter table strikes                  enable row level security;
alter table mensajes                 enable row level security;
alter table notificaciones           enable row level security;
alter table conversaciones_ia        enable row level security;
alter table reportes_moderacion      enable row level security;
alter table auditoria                enable row level security;
alter table configuracion_sistema    enable row level security;
alter table consentimientos          enable row level security;
alter table proyectos_portafolio     enable row level security;
alter table portafolio_tecnologias   enable row level security;
alter table proyecto_categorias      enable row level security;

-- [V3] PLACEHOLDER — reemplazar con políticas reales por rol
create policy "lectura_publica_roles"          on roles                  for select using (true);
create policy "lectura_publica_areas"          on areas_negocio          for select using (true);
create policy "lectura_publica_categorias"     on categorias                for select using (true);
create policy "lectura_publica_tecnologias"    on tecnologias            for select using (true);
create policy "lectura_publica_proyectos"      on proyectos              for select using (is_active = true);

-- Usuarios solo ven su propio registro
create policy "usuario_lee_su_perfil"
  on usuarios for select
  using (auth.uid() = id_usuario);

-- Estudiantes ven su propio perfil; empresarios ven los que sean públicos
create policy "estudiante_lee_su_perfil"
  on estudiantes for select
  using (auth.uid() = id_usuario or portafolio_visible_publicamente = true);

-- Empresarios solo ven su propio registro
create policy "empresario_lee_su_perfil"
  on empresarios for select
  using (auth.uid() = id_usuario);

-- Participaciones solo visibles para el estudiante o el empresario del proyecto
create policy "participacion_visible_partes"
  on participaciones for select
  using (
    auth.uid() = (select id_usuario from estudiantes where id_estudiante = participaciones.id_estudiante)
    or
    auth.uid() = (select e.id_usuario from empresarios e join proyectos p on p.id_empresario = e.id_empresario where p.id_proyecto = participaciones.id_proyecto)
  );

-- Notificaciones solo para el propio usuario
create policy "notificacion_solo_dueno"
  on notificaciones for select
  using (auth.uid() = id_usuario);

-- Consentimientos solo para el propio usuario
create policy "consentimiento_solo_dueno"
  on consentimientos for select
  using (auth.uid() = id_usuario);
