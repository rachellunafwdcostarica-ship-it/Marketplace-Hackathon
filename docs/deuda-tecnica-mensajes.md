# Deuda Técnica — Tabla `mensajes` (RF-38 / RF-45)

**Fecha de creación:** 2026-06-20  
**Última actualización:** 2026-06-21  
**Autora:** Fressia (módulo 2.6 — Revisión, Calificación y Adjudicación)  
**Requiere acción de:** Samir (propietario de la BD)

---

## Contexto del SRS

Estos son los requerimientos que dependen directamente de esta tabla. Los dos primeros son **Must** del MVP:

| RF | Descripción | Prioridad | Estado actual |
|---|---|---|---|
| RF-38 | Habilitar contacto empresa ↔ egresado adjudicado | M | Implementado con workaround |
| RF-45 | Mensajería interna: hilo por proyecto, no editable tras enviar | M | Implementado con workaround |
| RF-46 | Notificación por correo ante evento `mensaje` | M | **No implementado** |
| RF-47 | Notificación in-app: centro de notificaciones leído/no leído | M | El enum `mensaje_nuevo` existe, pero no está conectado |

Además, **RNF-37** (Must) exige "Eliminación de datos personales bajo solicitud del usuario". La estructura actual de FKs entra en conflicto directo con este requisito — ver sección **Dependencias cruzadas**.

---

## Estado actual de la tabla

Columnas exactas en producción:

| Columna | Tipo | Notas |
|---|---|---|
| `id_mensaje` | uuid PK | generado automáticamente |
| `id_proyecto` | uuid FK → `proyectos` | NOT NULL, ON DELETE RESTRICT |
| `id_remitente` | uuid FK → `usuarios` | NOT NULL, ON DELETE RESTRICT |
| `contenido` | text | NOT NULL |
| `leido` | boolean | NOT NULL, default false |
| `fecha_envio` | timestamptz | NOT NULL, default now() |

**No existe `id_destinatario`.** El SRS tampoco lo incluye en su modelo sugerido (§4.1). Es un gap de diseño del spec original, no solo de la implementación.

**RLS:** habilitado desde la migración inicial, pero **sin ninguna política definida**. El propio comentario en `20260608000004_cleanup_and_rls.sql` lo documenta como pendiente:

> *"PENDIENTE: se va a implementar en el MVP; faltan policies. La regla depende del modelo de mensajería (post-contratación vs durante la ventana). Definir antes de habilitar el chat."*

**Índice existente:** `idx_mensajes_proyecto_fecha` en `(id_proyecto, fecha_envio DESC)`. Cubre las consultas de hilo. No hay índice en `id_remitente`.

---

## Solución temporal implementada (workaround)

Para cumplir RF-38 y RF-45 dentro del plazo, la mensajería se implementó usando el **admin client** (`SUPABASE_SERVICE_ROLE_KEY`) en todas las server actions. Esto saltea la RLS completamente y mueve la autorización a TypeScript.

**Validaciones manuales en código que reemplazan la RLS:**
- Solo el empresario dueño del proyecto puede leer/escribir mensajes de ese proyecto.
- Solo el egresado en estado `contratada` o `finalizada` en ese proyecto puede leer/escribir sus mensajes.
- Ningún otro usuario puede acceder.

**Archivos que usan el admin client para mensajes:**
- `src/lib/mensajes/actions.ts` — todas las actions: `enviarMensaje`, `getMensajesDeProyecto`, `marcarLeidos`

---

## Problemas del workaround

### 1. La BD deja de ser la última línea de defensa

Con RLS activo y políticas definidas, la BD rechaza lecturas/escrituras no autorizadas aunque el código tenga un bug. Con el admin client, si alguien modifica la server action y olvida el check, los datos quedan completamente expuestos. No hay red de seguridad a nivel de base de datos.

**Gravedad:** Media — el código actual tiene los checks correctos, pero es frágil ante refactorizaciones futuras.

### 2. Sin soporte para Supabase Realtime

Realtime filtra eventos usando las RLS policies del usuario autenticado. Sin políticas, no se puede activar Realtime para `mensajes`. El chat actual requiere refresh manual para ver mensajes nuevos — no es un chat real.

**Gravedad:** Media — afecta UX directamente. RF-45 dice "hilo de conversación" y una tabla con polling manual no es lo mismo.

### 3. Campo `leido` ambiguo para bidireccional

`leido boolean` es un único valor por mensaje. No distingue quién lo leyó. Workaround actual: al abrir la conversación, se marcan como `leido = true` todos los mensajes donde `id_remitente != usuario_actual`. Funciona para MVP pero no sirve para mostrar contadores de no leídos precisos por lado.

**Gravedad:** Baja para MVP. Alta si se requieren badges de "mensajes sin leer" por rol.

### 4. Sin `id_destinatario`

El destinatario se infiere por contexto (empresa dueña del proyecto + egresado `contratada`). Esto funciona mientras solo haya un contratado por proyecto y el proyecto esté en estado válido. Si en el futuro un proyecto tiene múltiples contratados o se necesita consultar "todos mis mensajes recibidos" sin pasar por `id_proyecto`, la inferencia falla.

**Gravedad:** Baja ahora. Se convierte en bloqueante si el modelo de negocio cambia.

### 5. RF-46 y RF-47 no conectados

El enum `tipo_notificacion_enum` ya tiene el valor `'mensaje_nuevo'` definido en la BD. La tabla `notificaciones` y el sistema de `crearNotificaciones` están listos. Sin embargo, `enviarMensaje` actualmente **no dispara ninguna notificación** cuando se envía un mensaje. RF-46 (correo) y RF-47 (in-app) son **Must** sin implementar.

**Gravedad:** Alta — son Must del SRS.

### 6. Sin índice en `id_remitente`

No existe `idx_mensajes_remitente`. Si en el futuro se requiere consultar "todos los mensajes enviados/recibidos por un usuario" sin filtrar por proyecto, la query hace full scan de la tabla.

**Gravedad:** Baja ahora. Crece con el volumen de datos.

---

## Dependencias cruzadas — lo que puede romperse

Esta sección es crítica. Las FKs de `mensajes` tienen **ON DELETE RESTRICT** implícito (Postgres default cuando no se declara `ON DELETE`). Eso significa:

### Conflicto con RNF-37 (Must)

RNF-37 exige: *"Eliminación de datos personales bajo solicitud del usuario."* Prioridad **Must**.

Si un usuario solicita borrar su cuenta y tiene mensajes enviados (`id_remitente`), la FK RESTRICT **bloquea el DELETE en `usuarios`**. La BD lanza un FK violation y la cuenta no se puede eliminar.

**Esto es un conflicto directo entre la estructura actual y un Must del SRS.** No es riesgo futuro — es un bug latente que explota la primera vez que alguien pida borrado de datos.

Opciones para Samir:
- `ON DELETE CASCADE` en `mensajes.id_remitente`: borra los mensajes del usuario cuando se borra la cuenta. Pierde el historial del otro lado de la conversación.
- `ON DELETE SET NULL`: deja el mensaje pero anonimiza al remitente. Requiere que `id_remitente` sea nullable. Preserva el hilo para el otro participante.
- Soft delete en `usuarios` (marcar como eliminado sin borrar la fila): evita el FK violation. Necesita que toda la app respete el flag.

**La opción recomendada es soft delete en `usuarios`.** Es la más segura y la que menos afecta el historial. Pero es una decisión de diseño de Samir, no de este módulo.

### Tabla `reportes_moderacion`

`reportes_moderacion.id_mensaje uuid references mensajes(id_mensaje)` — FK nullable, ON DELETE RESTRICT.

Si en el futuro se implementa borrado de mensajes (RF-69 — moderación de contenido), la FK bloquea el borrado de cualquier mensaje que tenga un reporte asociado. Habría que borrar el reporte primero o cambiar a `ON DELETE SET NULL` en esa FK.

---

## Plan para Samir — qué se necesita hacer (en orden)

### Paso 1 — Modelo de mensajería (decisión tomada)

**Mensajes nuevos:** solo mientras el proyecto está en `contratada`.  
**Historial:** visible en modo lectura también desde `finalizada`.

Esto significa:
- La RLS policy de INSERT valida `estado = 'contratada'` únicamente.
- La RLS policy de SELECT permite acceso en `contratada` y `finalizada`.
- El `ContactButton` en el frontend aparece para ambos estados (comportamiento actual correcto).
- La UI de mensajes debe mostrar el input de envío deshabilitado cuando el proyecto está en `finalizada`, con un aviso visible.

### Paso 2 — Definir la estrategia para RNF-37

Decidir antes de agregar `id_destinatario`. Si se va por soft delete en `usuarios`, no hace falta cambiar ninguna FK en `mensajes`. Si se va por borrado físico, hay que cambiar `ON DELETE` en `mensajes.id_remitente`.

### Paso 3 — Agregar `id_destinatario` (migración)

La tabla solo tiene `id_remitente`. Para RLS policies correctas y para queries de "mensajes para mí", se necesita `id_destinatario`.

```sql
-- Paso 3a: agregar nullable primero (no puede ser NOT NULL si ya hay filas)
alter table mensajes
  add column id_destinatario uuid references usuarios(id_usuario) on delete set null;

-- Paso 3b: backfill de filas existentes
-- La lógica: el destinatario de cada mensaje es el participante del proyecto
-- que NO es el remitente. Si el remitente es el empresario → destinatario es
-- el id_usuario del estudiante contratado. Si el remitente es el estudiante →
-- destinatario es el id_usuario del empresario dueño del proyecto.
-- Los mensajes solo se crean en 'contratada'; en 'finalizada' son de solo lectura,
-- por eso el backfill incluye ambos estados para cubrir el historial completo.
-- Ejecutar este UPDATE antes de agregar el NOT NULL:
update mensajes m
set id_destinatario = (
  select case
    when e.id_usuario = m.id_remitente then
      -- remitente es empresario → destinatario es el estudiante contratado
      u_est.id_usuario
    else
      -- remitente es estudiante → destinatario es el empresario
      e.id_usuario
  end
  from proyectos pr
  join empresarios e on e.id_empresario = pr.id_empresario
  join participaciones p on p.id_proyecto = pr.id_proyecto
    and p.estado in ('contratada', 'finalizada')
  join estudiantes est on est.id_estudiante = p.id_estudiante
  join usuarios u_est on u_est.id_usuario = est.id_usuario
  where pr.id_proyecto = m.id_proyecto
  limit 1
)
where id_destinatario is null;

-- Paso 3c: verificar que no quedaron NULLs antes de agregar el constraint
select count(*) from mensajes where id_destinatario is null;
-- Si retorna 0, continuar:

-- Paso 3d: agregar NOT NULL
alter table mensajes
  alter column id_destinatario set not null;
```

> **Aviso:** El backfill asume exactamente un contratado por proyecto. Si hay proyectos con múltiples participaciones en `contratada`/`finalizada`, el `limit 1` elige una arbitrariamente. Verificar antes de correr.

### Paso 4 — Crear las políticas RLS

Con `id_destinatario` definido, las políticas son limpias:

```sql
-- SELECT: solo el remitente o el destinatario
create policy "mensajes_select" on mensajes
  for select using (
    auth.uid() = id_remitente
    or auth.uid() = id_destinatario
  );

-- INSERT: solo si sos el remitente y la participación está en 'contratada'
-- (no se permiten mensajes nuevos una vez que el proyecto finaliza)
create policy "mensajes_insert" on mensajes
  for insert with check (
    auth.uid() = id_remitente
    and exists (
      select 1 from participaciones p
      join proyectos pr on pr.id_proyecto = p.id_proyecto
      where p.id_proyecto = mensajes.id_proyecto
      and p.estado = 'contratada'
      and (
        pr.id_empresario = (
          select id_empresario from empresarios where id_usuario = auth.uid()
        )
        or p.id_estudiante = (
          select id_estudiante from estudiantes where id_usuario = auth.uid()
        )
      )
    )
  );

-- UPDATE: solo para marcar leido, solo si sos el destinatario
create policy "mensajes_update_leido" on mensajes
  for update using (auth.uid() = id_destinatario)
  with check (auth.uid() = id_destinatario);
```

### Paso 5 — Agregar índice en `id_remitente` e `id_destinatario`

```sql
create index idx_mensajes_destinatario on mensajes(id_destinatario, fecha_envio desc);
create index idx_mensajes_remitente on mensajes(id_remitente, fecha_envio desc);
```

### Paso 6 — Activar Realtime (opcional, mejora UX)

```sql
alter publication supabase_realtime add table mensajes;
```

Esto permite chat en tiempo real sin polling. Requiere que las políticas RLS estén activas primero.

---

## Qué cambia en el código cuando esto esté resuelto

Una vez Samir complete los pasos anteriores, estos archivos necesitan refactorización:

| Archivo | Cambio requerido |
|---|---|
| `src/lib/mensajes/actions.ts` | Reemplazar `createSupabaseAdminClient()` por `createSupabaseServerClient()` en todas las funciones |
| `src/lib/mensajes/actions.ts` | En `enviarMensaje`: agregar llamada a `crearNotificaciones` con tipo `mensaje_nuevo` para RF-46 y RF-47 |
| `src/lib/mensajes/actions.ts` | En `marcarLeidos`: simplificar — con `id_destinatario` la query es directa sin inferencia |
| `src/app/[locale]/(company)/empresario/mensajes/` | Activar suscripción Realtime si se habilita en Paso 6; deshabilitar input de envío cuando el proyecto está en `finalizada` |
| `src/app/[locale]/(app)/egresado/mensajes/` | Ídem: Realtime + input deshabilitado en `finalizada` |

---

## Tabla de impacto resumida

| Área | Impacto hoy | Gravedad |
|---|---|---|
| Seguridad | Autorización en código, no en BD — frágil ante refactorizaciones | Media |
| RNF-37 (GDPR) | FK RESTRICT bloquea borrado de cuentas con mensajes | Alta — Must del SRS |
| RF-46 (correo) | No implementado — no se notifica por correo al recibir mensaje | Alta — Must del SRS |
| RF-47 (in-app) | El enum `mensaje_nuevo` existe pero no se usa | Alta — Must del SRS |
| Realtime | No disponible sin políticas RLS | Media — afecta UX |
| Escalabilidad | Sin índice en `id_remitente`/`id_destinatario` | Baja ahora, crece con datos |
| `reportes_moderacion` | FK RESTRICT bloquea borrado de mensajes reportados | Baja ahora — solo si se implementa RF-69 |

---

**Responsable de la migración:** Samir  
**Responsable del código posterior:** Fressia  
**Prioridad:** Alta — RNF-37 y RF-46/47 son Must del SRS sin resolver
