# Deuda Técnica — Tabla `mensajes` (RF-45 / RF-38)

**Fecha:** 2026-06-21
**Autora:** Fressia (módulo 2.6 — Revisión, Calificación y Adjudicación)
**Requiere acción de:** Samir (propietario de la BD)

---

## Estado actual

La tabla `mensajes` existe en la BD con exactamente **6 columnas**:

| Columna | Tipo | Notas |
|---|---|---|
| `id_mensaje` | uuid PK | generado automáticamente |
| `id_proyecto` | uuid FK | referencia al proyecto |
| `id_remitente` | uuid FK | quién envía el mensaje |
| `contenido` | text | cuerpo del mensaje |
| `leido` | boolean | default false |
| `fecha_envio` | timestamptz | default now() |

**No existe `id_destinatario`.** El destinatario se infiere por contexto del proyecto.

**RLS:** habilitado, pero **sin ninguna política definida**. Acceso bloqueado por defecto desde el cliente.

El propio autor del schema lo dejó documentado como pendiente:
> *"PENDIENTE: se va a implementar en el MVP; faltan policies. La regla depende del modelo de mensajería (post-contratación vs durante la ventana). Definir antes de habilitar el chat."*

---

## Solución temporal implementada (workaround)

Para cumplir con RF-38 (contacto empresa → egresado adjudicado) dentro del plazo de entrega, la mensajería se implementó usando el `admin client` (`SUPABASE_SERVICE_ROLE_KEY`) en las server actions. Esto saltea la RLS y hace las validaciones de autorización en TypeScript en lugar de en la BD.

**Las validaciones manuales que se aplican en código:**
- Solo el empresario dueño del proyecto puede enviar/leer mensajes de ese proyecto.
- Solo el egresado en estado `contratada` o `finalizada` en ese proyecto puede enviar/leer sus mensajes.
- Ningún otro usuario puede acceder.

---

## Problemas reales de este workaround

### 1. Autorización fuera de la BD
Si en el futuro alguien modifica el server action y olvida el check de autorización, los datos quedan expuestos. Con RLS activo, la BD bloquea el acceso aunque el código sea incorrecto. **La BD deja de ser la última línea de defensa.**

### 2. Sin soporte para Supabase Realtime
Supabase Realtime filtra eventos usando las políticas RLS del usuario. Sin políticas definidas, no es posible activar actualizaciones en tiempo real para mensajes. El chat actual requiere refresh manual.

### 3. Campo `leido` ambiguo para mensajería bidireccional
El campo `leido boolean` es un único valor por mensaje. No distingue quién lo leyó (empresa o egresado). Workaround actual: al abrir la conversación, se marcan como `leido = true` todos los mensajes donde `id_remitente != usuario_actual`. Funciona para MVP pero no escala.

### 4. Sin `id_destinatario`
No hay un campo explícito de destinatario. El destinatario se infiere por contexto (empresa dueña del proyecto + egresado `contratada` en ese proyecto). Esto funciona mientras solo haya un contratado por proyecto, pero es una suposición frágil.

---

## Qué se necesita para resolverlo correctamente

### Paso 1 — Agregar `id_destinatario` a `mensajes`

La tabla tiene `id_remitente` (quién envía) pero no tiene `id_destinatario` (a quién va dirigido). Son dos campos distintos y ambos son necesarios para mensajería 1:1 correcta.

La migración debe ser **nullable primero** porque ya pueden existir filas en producción. Agregar `NOT NULL` sin valor por defecto sobre una tabla con datos falla en Postgres:

```sql
-- Paso 1a: agregar la columna nullable
alter table mensajes
  add column id_destinatario uuid references usuarios(id_usuario);

-- Paso 1b: backfill de filas existentes si las hay (decidir valor con el equipo)
-- Ejemplo: si el destinatario siempre es el otro participante del proyecto,
-- se puede derivar de participaciones. Definir la lógica antes de correr esto.

-- Paso 1c: una vez que todas las filas tengan valor, agregar el constraint
alter table mensajes
  alter column id_destinatario set not null;
```

> **Aviso para Samir:** verificar si ya hay filas en `mensajes` antes de correr el paso 1c. Si hay filas sin backfill, el `set not null` falla.

---

### Paso 2 — Definir las políticas RLS

Una vez claro el modelo (post-contratación, 1:1 empresa ↔ egresado contratado):

```sql
-- SELECT: solo el remitente o el destinatario pueden leer el mensaje
create policy "mensajes_select" on mensajes
  for select using (
    auth.uid() = id_remitente or auth.uid() = id_destinatario
  );

-- INSERT: solo si sos el remitente y la contratación existe y está vigente
create policy "mensajes_insert" on mensajes
  for insert with check (
    auth.uid() = id_remitente
    and exists (
      select 1 from participaciones p
      join proyectos pr on pr.id_proyecto = p.id_proyecto
      where p.id_proyecto = mensajes.id_proyecto
      and p.estado in ('contratada', 'finalizada')
      and (
        -- el remitente es el empresario dueño
        pr.id_empresario = (
          select id_empresario from empresarios where id_usuario = auth.uid()
        )
        or
        -- o es el egresado contratado en ese proyecto
        p.id_estudiante = (
          select id_estudiante from estudiantes where id_usuario = auth.uid()
        )
      )
    )
  );

-- UPDATE: solo para marcar leido, y solo si sos el destinatario
create policy "mensajes_update_leido" on mensajes
  for update using (auth.uid() = id_destinatario)
  with check (auth.uid() = id_destinatario);
```

> **Nota:** Las políticas exactas dependen de la decisión final sobre el modelo de mensajería. Estas son una propuesta base.

---

### Paso 3 — Reemplazar el admin client por el cliente normal

Una vez activas las políticas RLS, los server actions de mensajes pueden migrar del `admin client` al cliente normal de Supabase, haciendo que la BD valide el acceso en lugar del código.

---

### Paso 4 — Activar Realtime (opcional, mejora UX)

Con RLS activo, se puede activar Supabase Realtime para la tabla `mensajes`:

```sql
alter publication supabase_realtime add table mensajes;
```

Esto permite que el chat se actualice sin refresh manual.

---

## Resumen de impacto por dejar esto pendiente

| Área | Impacto actual |
|---|---|
| Seguridad | Medio — autorización en código, no en BD |
| Funcionalidad | Funciona para MVP (lectura/escritura via admin client) |
| Realtime | No disponible |
| Escalabilidad | Frágil si un proyecto tiene múltiples contratados en el futuro |
| Deuda de código | Server actions de mensajes deben refactorizarse al resolver esto |

---

## Archivos a refactorizar cuando se resuelva

- `src/lib/mensajes/actions.ts` — reemplazar `createSupabaseAdminClient()` por `createSupabaseServerClient()`
- `src/app/[locale]/(company)/empresario/mensajes/` — activar Realtime si se habilita
- `supabase/migrations/` — nueva migración con `id_destinatario` + RLS policies

---

**Responsable de la migración:** Samir
**Prioridad sugerida:** Alta — resolver antes de salir a producción real
