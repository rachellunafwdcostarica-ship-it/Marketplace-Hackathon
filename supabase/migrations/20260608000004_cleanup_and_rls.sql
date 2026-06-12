-- ============================================================
-- MIGRACIÓN 0004 — Cleanup [V1] + RLS real por rol
-- Fecha: 2026-06-08
--
-- Qué hace:
--   1. Elimina usuarios.contrasena_hash [V1] — riesgo de seguridad.
--   2. Crea función helper get_my_role() con security definer.
--   3. Elimina todas las políticas placeholder de migración 0001.
--   4. Crea políticas RLS reales por tabla y por operación.
--
-- Nota sobre el admin:
--   createSupabaseAdminClient() usa SUPABASE_SERVICE_ROLE_KEY,
--   que bypasea RLS completamente. Por eso no hay políticas de
--   admin aquí — el admin nunca pasa por RLS.
--
-- Nota sobre mensajes:
--   La tabla mensajes queda con RLS habilitado pero sin políticas.
--   Sin políticas → acceso bloqueado por defecto desde el cliente.
--   Reservada para el 2.0 (chat en tiempo real). No agregar
--   policies aquí hasta que ese módulo se implemente.
-- ============================================================


-- ============================================================
-- 1. CLEANUP [V1] — ya resuelto en 0001 (la columna nunca se crea).
-- (sin acción aquí)


-- ============================================================
-- 2. HELPER FUNCTION — Rol del usuario en sesión
--    security definer: corre como el dueño de la función
--    (postgres), no como el caller. Evita recursión cuando
--    RLS en otras tablas llame a esta función, porque la
--    consulta a "usuarios" se hace sin pasar por RLS.
-- ============================================================
create or replace function public.get_my_role()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select r.nombre_rol
  from public.usuarios u
  join public.roles r on r.id_rol = u.id_rol
  where u.id_usuario = auth.uid()
$$;


-- ============================================================
-- 3. DROP — Políticas placeholder de migración 0001
-- ============================================================
drop policy if exists "lectura_publica_roles"        on public.roles;
drop policy if exists "lectura_publica_areas"        on public.areas_negocio;
drop policy if exists "lectura_publica_categorias"   on public.categorias;
drop policy if exists "lectura_publica_tecnologias"  on public.tecnologias;
drop policy if exists "lectura_publica_proyectos"    on public.proyectos;
drop policy if exists "usuario_lee_su_perfil"        on public.usuarios;
drop policy if exists "estudiante_lee_su_perfil"     on public.estudiantes;
drop policy if exists "empresario_lee_su_perfil"     on public.empresarios;
drop policy if exists "participacion_visible_partes" on public.participaciones;
drop policy if exists "notificacion_solo_dueno"      on public.notificaciones;
drop policy if exists "consentimiento_solo_dueno"    on public.consentimientos;


-- ============================================================
-- 4. RLS REAL — CATÁLOGOS
--    Lectura pública. Escritura solo via admin (service_role).
-- ============================================================

create policy "roles_select_public"
  on public.roles for select
  using (true);

create policy "areas_negocio_select_active"
  on public.areas_negocio for select
  using (is_active = true);

create policy "categorias_select_active"
  on public.categorias for select
  using (is_active = true);

create policy "tecnologias_select_active"
  on public.tecnologias for select
  using (is_active = true);

-- configuracion_sistema: lectura para usuarios autenticados (parámetros del sistema, no secretos).
-- Escritura: sin policy de write → solo service_role (backend/admin) puede modificar.
create policy "config_select_authenticated"
  on public.configuracion_sistema for select
  to authenticated
  using (true);


-- ============================================================
-- 5. RLS REAL — USUARIOS
-- ============================================================

-- Cada usuario ve únicamente su propio registro
create policy "usuarios_select_own"
  on public.usuarios for select
  using (auth.uid() = id_usuario);

-- Cada usuario edita únicamente su propio perfil
create policy "usuarios_update_own"
  on public.usuarios for update
  using (auth.uid() = id_usuario)
  with check (auth.uid() = id_usuario);

-- INSERT bloqueado desde el cliente: solo el trigger
-- handle_new_user() lo hace vía security definer.


-- ============================================================
-- 6. RLS REAL — ESTUDIANTES
-- ============================================================

-- Propio estudiante o portafolio marcado como público
create policy "estudiantes_select_own_or_public"
  on public.estudiantes for select
  using (
    id_usuario = auth.uid()
    or portafolio_visible_publicamente = true
  );

-- Solo puede insertar su propio perfil (onboarding)
create policy "estudiantes_insert_own"
  on public.estudiantes for insert
  with check (id_usuario = auth.uid());

-- Solo puede editar su propio perfil
create policy "estudiantes_update_own"
  on public.estudiantes for update
  using (id_usuario = auth.uid())
  with check (id_usuario = auth.uid());


-- ============================================================
-- 7. RLS REAL — ESTUDIANTE_HABILIDADES
-- ============================================================

create policy "est_hab_select"
  on public.habilidades_tecnicas for select
  using (
    id_estudiante in (
      select id_estudiante from public.estudiantes
      where id_usuario = auth.uid()
         or portafolio_visible_publicamente = true
    )
  );

create policy "est_hab_insert_own"
  on public.habilidades_tecnicas for insert
  with check (
    id_estudiante in (
      select id_estudiante from public.estudiantes
      where id_usuario = auth.uid()
    )
  );

create policy "est_hab_update_own"
  on public.habilidades_tecnicas for update
  using (
    id_estudiante in (
      select id_estudiante from public.estudiantes
      where id_usuario = auth.uid()
    )
  );

create policy "est_hab_delete_own"
  on public.habilidades_tecnicas for delete
  using (
    id_estudiante in (
      select id_estudiante from public.estudiantes
      where id_usuario = auth.uid()
    )
  );


-- ============================================================
-- 8. RLS REAL — EMPRESARIOS
-- ============================================================

create policy "empresarios_select_own"
  on public.empresarios for select
  using (id_usuario = auth.uid());

-- Onboarding: el usuario crea su propio perfil de empresario
create policy "empresarios_insert_own"
  on public.empresarios for insert
  with check (id_usuario = auth.uid());

create policy "empresarios_update_own"
  on public.empresarios for update
  using (id_usuario = auth.uid())
  with check (id_usuario = auth.uid());


-- ============================================================
-- 9. RLS REAL — PROYECTOS
-- ============================================================

-- Proyectos activos son públicos; el dueño ve también borradores
create policy "proyectos_select_public_or_own"
  on public.proyectos for select
  using (
    is_active = true
    or id_empresario in (
      select id_empresario from public.empresarios
      where id_usuario = auth.uid()
    )
  );

-- Solo empresarios con verificación aprobada pueden publicar
create policy "proyectos_insert_verified_empresario"
  on public.proyectos for insert
  with check (
    id_empresario in (
      select id_empresario from public.empresarios
      where id_usuario = auth.uid()
        and estado_verificacion = 'verificado'
    )
  );

-- Solo el empresario dueño puede editar su proyecto
create policy "proyectos_update_own"
  on public.proyectos for update
  using (
    id_empresario in (
      select id_empresario from public.empresarios
      where id_usuario = auth.uid()
    )
  )
  with check (
    id_empresario in (
      select id_empresario from public.empresarios
      where id_usuario = auth.uid()
    )
  );


-- ============================================================
-- 10. RLS REAL — PROYECTO_TECNOLOGIAS
-- ============================================================

create policy "proy_tec_select_public_or_own"
  on public.proyecto_tecnologias for select
  using (
    id_proyecto in (
      select id_proyecto from public.proyectos where is_active = true
      union
      select p.id_proyecto from public.proyectos p
      join public.empresarios e on e.id_empresario = p.id_empresario
      where e.id_usuario = auth.uid()
    )
  );

create policy "proy_tec_insert_own"
  on public.proyecto_tecnologias for insert
  with check (
    id_proyecto in (
      select p.id_proyecto from public.proyectos p
      join public.empresarios e on e.id_empresario = p.id_empresario
      where e.id_usuario = auth.uid()
    )
  );

create policy "proy_tec_delete_own"
  on public.proyecto_tecnologias for delete
  using (
    id_proyecto in (
      select p.id_proyecto from public.proyectos p
      join public.empresarios e on e.id_empresario = p.id_empresario
      where e.id_usuario = auth.uid()
    )
  );


-- ============================================================
-- 11. RLS REAL — PARTICIPACIONES
-- ============================================================

-- Egresado ve sus propias postulaciones;
-- empresario ve las postulaciones de sus proyectos
create policy "participaciones_select"
  on public.participaciones for select
  using (
    id_estudiante in (
      select id_estudiante from public.estudiantes
      where id_usuario = auth.uid()
    )
    or id_proyecto in (
      select p.id_proyecto from public.proyectos p
      join public.empresarios e on e.id_empresario = p.id_empresario
      where e.id_usuario = auth.uid()
    )
  );

-- Solo egresados pueden postularse
create policy "participaciones_insert_egresado"
  on public.participaciones for insert
  with check (
    id_estudiante in (
      select id_estudiante from public.estudiantes
      where id_usuario = auth.uid()
    )
  );

-- Solo el empresario del proyecto puede cambiar el estado
-- (aceptar, rechazar, avanzar etapas)
create policy "participaciones_update_empresario"
  on public.participaciones for update
  using (
    id_proyecto in (
      select p.id_proyecto from public.proyectos p
      join public.empresarios e on e.id_empresario = p.id_empresario
      where e.id_usuario = auth.uid()
    )
  );


-- ============================================================
-- 12. RLS REAL — CONTRATACIONES
-- ============================================================

create policy "contrataciones_select"
  on public.contrataciones for select
  using (
    id_participacion in (
      select id_participacion from public.participaciones
      where
        id_estudiante in (
          select id_estudiante from public.estudiantes
          where id_usuario = auth.uid()
        )
        or id_proyecto in (
          select p.id_proyecto from public.proyectos p
          join public.empresarios e on e.id_empresario = p.id_empresario
          where e.id_usuario = auth.uid()
        )
    )
  );

-- Solo el empresario puede crear y editar una contratación
create policy "contrataciones_insert_empresario"
  on public.contrataciones for insert
  with check (
    id_participacion in (
      select pa.id_participacion from public.participaciones pa
      join public.proyectos p on p.id_proyecto = pa.id_proyecto
      join public.empresarios e on e.id_empresario = p.id_empresario
      where e.id_usuario = auth.uid()
    )
  );

create policy "contrataciones_update_empresario"
  on public.contrataciones for update
  using (
    id_participacion in (
      select pa.id_participacion from public.participaciones pa
      join public.proyectos p on p.id_proyecto = pa.id_proyecto
      join public.empresarios e on e.id_empresario = p.id_empresario
      where e.id_usuario = auth.uid()
    )
  );


-- ============================================================
-- 13. RLS REAL — ENTREGABLES
-- ============================================================

create policy "entregables_select"
  on public.entregables for select
  using (
    id_contratacion in (
      select c.id_contratacion from public.contrataciones c
      join public.participaciones pa on pa.id_participacion = c.id_participacion
      where
        pa.id_estudiante in (
          select id_estudiante from public.estudiantes
          where id_usuario = auth.uid()
        )
        or pa.id_proyecto in (
          select p.id_proyecto from public.proyectos p
          join public.empresarios e on e.id_empresario = p.id_empresario
          where e.id_usuario = auth.uid()
        )
    )
  );

-- Solo el estudiante entrega (sube entregables)
create policy "entregables_insert_estudiante"
  on public.entregables for insert
  with check (
    id_contratacion in (
      select c.id_contratacion from public.contrataciones c
      join public.participaciones pa on pa.id_participacion = c.id_participacion
      where pa.id_estudiante in (
        select id_estudiante from public.estudiantes
        where id_usuario = auth.uid()
      )
    )
  );

create policy "entregables_update_estudiante"
  on public.entregables for update
  using (
    id_contratacion in (
      select c.id_contratacion from public.contrataciones c
      join public.participaciones pa on pa.id_participacion = c.id_participacion
      where pa.id_estudiante in (
        select id_estudiante from public.estudiantes
        where id_usuario = auth.uid()
      )
    )
  );


-- ============================================================
-- 14. RLS REAL — COMENTARIOS_ENTREGABLES
-- ============================================================

create policy "comentarios_entregables_select"
  on public.comentarios_entregables for select
  using (
    id_entregable in (
      select e.id_entregable from public.entregables e
      join public.contrataciones c on c.id_contratacion = e.id_contratacion
      join public.participaciones pa on pa.id_participacion = c.id_participacion
      where
        pa.id_estudiante in (
          select id_estudiante from public.estudiantes
          where id_usuario = auth.uid()
        )
        or pa.id_proyecto in (
          select p.id_proyecto from public.proyectos p
          join public.empresarios emp on emp.id_empresario = p.id_empresario
          where emp.id_usuario = auth.uid()
        )
    )
  );

-- Cualquier parte involucrada puede comentar (estudiante o empresa)
create policy "comentarios_entregables_insert"
  on public.comentarios_entregables for insert
  with check (id_autor = auth.uid());


-- ============================================================
-- 15. RLS REAL — EVALUACIONES
-- ============================================================

create policy "evaluaciones_select"
  on public.evaluaciones for select
  using (
    id_empresario in (
      select id_empresario from public.empresarios
      where id_usuario = auth.uid()
    )
    or id_estudiante in (
      select id_estudiante from public.estudiantes
      where id_usuario = auth.uid()
    )
  );

-- Solo el empresario puede evaluar al estudiante
create policy "evaluaciones_insert_empresario"
  on public.evaluaciones for insert
  with check (
    id_empresario in (
      select id_empresario from public.empresarios
      where id_usuario = auth.uid()
    )
  );


-- ============================================================
-- 16. RLS REAL — STRIKES
--    El usuario ve sus propios strikes.
--    Aplicar/revocar strikes es tarea del admin (service_role).
-- ============================================================

create policy "strikes_select_own"
  on public.strikes for select
  using (id_usuario = auth.uid());


-- ============================================================
-- 17. RLS REAL — NOTIFICACIONES
-- ============================================================

create policy "notificaciones_select_own"
  on public.notificaciones for select
  using (id_usuario = auth.uid());

-- Marcar notificación como leída
create policy "notificaciones_update_own"
  on public.notificaciones for update
  using (id_usuario = auth.uid())
  with check (id_usuario = auth.uid());


-- ============================================================
-- 18. RLS REAL — CONVERSACIONES_IA
-- ============================================================

create policy "conv_ia_select_own"
  on public.conversaciones_ia for select
  using (
    id_empresario in (
      select id_empresario from public.empresarios
      where id_usuario = auth.uid()
    )
  );

create policy "conv_ia_insert_own"
  on public.conversaciones_ia for insert
  with check (
    id_empresario in (
      select id_empresario from public.empresarios
      where id_usuario = auth.uid()
    )
  );

create policy "conv_ia_update_own"
  on public.conversaciones_ia for update
  using (
    id_empresario in (
      select id_empresario from public.empresarios
      where id_usuario = auth.uid()
    )
  );


-- ============================================================
-- 19. RLS REAL — REPORTES_MODERACION
-- ============================================================

-- El reportante ve sus propios reportes
create policy "reportes_select_own"
  on public.reportes_moderacion for select
  using (id_reportante = auth.uid());

-- Cualquier usuario autenticado puede reportar
create policy "reportes_insert_auth"
  on public.reportes_moderacion for insert
  with check (id_reportante = auth.uid());


-- ============================================================
-- 20. RLS REAL — CONSENTIMIENTOS
-- ============================================================

create policy "consentimientos_select_own"
  on public.consentimientos for select
  using (id_usuario = auth.uid());

create policy "consentimientos_insert_own"
  on public.consentimientos for insert
  with check (id_usuario = auth.uid());


-- ============================================================
-- 21. RLS REAL — PORTAFOLIO  [NUEVO en XXI]
-- ============================================================

-- proyectos_portafolio: el estudiante ve todas las suyas; público solo
-- entradas activas (y con consentimiento aprobado si origen='plataforma_contratada').
create policy "portafolio_select_own_or_public"
  on public.proyectos_portafolio for select
  using (
    id_estudiante in (
      select id_estudiante from public.estudiantes where id_usuario = auth.uid()
    )
    or (
      is_active = true
      and (origen <> 'plataforma_contratada' or estado_consentimiento = 'aprobado')
    )
  );

create policy "portafolio_insert_own"
  on public.proyectos_portafolio for insert
  with check (
    id_estudiante in (select id_estudiante from public.estudiantes where id_usuario = auth.uid())
  );

create policy "portafolio_update_own"
  on public.proyectos_portafolio for update
  using (
    id_estudiante in (select id_estudiante from public.estudiantes where id_usuario = auth.uid())
  );

create policy "portafolio_delete_own"
  on public.proyectos_portafolio for delete
  using (
    id_estudiante in (select id_estudiante from public.estudiantes where id_usuario = auth.uid())
  );

-- portafolio_tecnologias: sigue a la entrada de portafolio padre.
create policy "portafolio_tec_select"
  on public.portafolio_tecnologias for select
  using (
    id_portafolio in (
      select id_portafolio from public.proyectos_portafolio
      where id_estudiante in (select id_estudiante from public.estudiantes where id_usuario = auth.uid())
         or (is_active = true and (origen <> 'plataforma_contratada' or estado_consentimiento = 'aprobado'))
    )
  );

create policy "portafolio_tec_write_own"
  on public.portafolio_tecnologias for all
  using (
    id_portafolio in (
      select id_portafolio from public.proyectos_portafolio
      where id_estudiante in (select id_estudiante from public.estudiantes where id_usuario = auth.uid())
    )
  )
  with check (
    id_portafolio in (
      select id_portafolio from public.proyectos_portafolio
      where id_estudiante in (select id_estudiante from public.estudiantes where id_usuario = auth.uid())
    )
  );

-- proyecto_categorias: pública (sigue al proyecto); escribe el empresario dueño.
create policy "proy_cat_select_public"
  on public.proyecto_categorias for select
  using (true);

create policy "proy_cat_write_own"
  on public.proyecto_categorias for all
  using (
    id_proyecto in (
      select p.id_proyecto from public.proyectos p
      join public.empresarios e on e.id_empresario = p.id_empresario
      where e.id_usuario = auth.uid()
    )
  )
  with check (
    id_proyecto in (
      select p.id_proyecto from public.proyectos p
      join public.empresarios e on e.id_empresario = p.id_empresario
      where e.id_usuario = auth.uid()
    )
  );


-- ============================================================
-- TABLAS SIN POLICIES DE CLIENTE (acceso solo via service_role):
--
--   auditoria  → log de auditoría; se escribe del lado servidor.
--   mensajes   → PENDIENTE: se va a implementar en el MVP; faltan
--                policies. La regla depende del modelo de mensajería
--                (post-contratación vs durante la ventana). Definir
--                antes de habilitar el chat.
--
-- configuracion_sistema: AHORA tiene lectura para 'authenticated'
-- (la escritura sigue solo via service_role).
--
-- RLS está habilitado en estas tablas desde migración 0001.
-- Sin policies → acceso desde anon/user key bloqueado por defecto.
-- ============================================================
