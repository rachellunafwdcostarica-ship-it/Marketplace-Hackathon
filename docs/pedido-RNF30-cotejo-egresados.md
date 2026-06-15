# Pedido para implementar RNF-30 — Cotejo de egresados

> **Para:** Errol (dueño de la BD)
> **Por qué este documento:** RNF-30 está bloqueado por falta de datos/fuente. Acá
> va exactamente qué se necesita, con justificación, para desbloquearlo.

## Qué es

- **RNF-30** (SRS, línea 413, §3.7): _"Integración con la base de datos de
  egresados de FWD Costa Rica para la validación de estudiantes."_ (Prioridad M)
- **RF-64** (SRS, línea 318, §2.11): el administrador valida egresados
  _"cotejando … contra la base de datos de egresados."_

**Objetivo:** que al verificar un egresado, el sistema **cotejé automáticamente**
contra el padrón real de egresados de FWD, en vez de la decisión manual actual.

## Por qué está bloqueado (estado de hoy)

No existe en el proyecto ningún dataset/tabla/endpoint con los egresados reales de
FWD. Revisé **todas** las migraciones: lo único sembrado es config y catálogos
(`configuracion_sistema`, `areas_negocio`, `categorias`, `tecnologias`).
`estudiantes.titulo_fwd` es solo un enum de especialidad
(`frontend`/`backend`/`fullstack`), no un padrón. **Sin fuente de referencia no
hay contra qué cotejar**, y no se puede inventar.

## Lo que necesito de Errol/FWD (con justificación)

### 1. La fuente de datos de egresados

Una de estas dos:

- **(A) Tabla en Supabase `egresados_fwd`** — _recomendado_. Requiere una
  **migración** (la escribo yo, pero por `CLAUDE.md` la aprueba y corre Errol).
  Esquema propuesto:

  ```sql
  create table public.egresados_fwd (
    id          uuid primary key default gen_random_uuid(),
    correo      varchar(150) not null unique,  -- llave del cotejo (ver punto 3)
    titulo_fwd  titulo_fwd_enum,               -- especialidad
    nombre      varchar(160),
    cohorte     varchar(40),                   -- opcional, trazabilidad
    is_active   boolean not null default true,
    created_at  timestamptz not null default now()
  );
  alter table public.egresados_fwd enable row level security;
  -- Sin policies: nadie lo lee desde el cliente; solo el admin via service_role.
  ```

  **Justificación:** `correo unique` = llave del cotejo. `titulo_fwd` para copiar
  la especialidad al verificar. `is_active` para dar de baja sin borrar. RLS sin
  policies protege datos personales (RNF-35): solo el `service_role` del servidor
  lo lee. Recomiendo (A) sobre (B) porque el esquema ya asume cotejo local y no
  depende de la disponibilidad/latencia de un sistema externo.

- **(B) API/endpoint externo de FWD** — si FWD expone su padrón por servicio.
  **Necesito:** URL, método de autenticación (token/clave) y formato de respuesta.
  **Justificación:** sin credenciales ni contrato de la API, la integración no se
  puede construir.

### 2. El padrón real de egresados

El export (CSV o similar) de los egresados de FWD para sembrar la tabla.
**Justificación:** sin los datos, la tabla existe pero el cotejo daría "no figura"
para todos. Estos datos los provee FWD; no los tengo ni los puedo generar.

### 3. Confirmar la llave del cotejo: ¿correo o título?

Hay un **conflicto entre las fuentes**:

- **RF-64 (SRS)** dice cotejar _"el título"_.
- **El esquema** (migración inicial, línea 32) dice _"cotejo FWD **por correo**"_.

**Recomiendo por correo:** es único e identifica a la persona; el título/especialidad
lo comparten muchos. **Necesito que confirmen la llave oficial**, porque define el
`unique` de la tabla y la lógica del cotejo.

### 4. Consentimiento (RNF-38) — ya está hecho, no requiere nada

El cotejo solo correrá para egresados que **consintieron** explícitamente (RNF-38).
Eso ya está implementado: checkbox en onboarding + registro en `consentimientos`
(`tipo='cotejo_fwd'`) + gate en `verificarEgresado`. No depende de Errol.

## 5. Parche de datos — egresado sin fila `estudiantes` (independiente de RNF-30)

**[Seguro] Inconsistencia detectada** (consulta read-only a la BD): hay **2 usuarios
con rol egresado** pero **solo 1 fila en `estudiantes`**. El egresado sin fila **no
aparece** en la validación (la cola se arma desde `estudiantes`) y tampoco podría
postular, porque el flujo depende de esa tabla.

**Causa probable:** se creó con el trigger viejo (antes de la migración 0005, cuando
el rol egresado se asignaba por defecto SIN crear `estudiantes`) o se sembró a mano.
Hoy la fila la crea `assign_my_role` en el onboarding.

**Parche idempotente — para que lo corra Errol:**

```sql
-- Crea la fila estudiantes faltante para todo usuario con rol egresado que no la tenga.
insert into public.estudiantes (id_usuario)
select u.id_usuario
from public.usuarios u
join public.roles r on r.id_rol = u.id_rol
where r.nombre_rol = 'egresado'
  and not exists (
    select 1 from public.estudiantes e where e.id_usuario = u.id_usuario
  )
on conflict (id_usuario) do nothing;
```

No es una migración de esquema (es un INSERT de datos), pero toca la BD remota → lo
corre Errol. Tras correrlo, ese egresado aparece en Validaciones (pendiente).

## Qué construyo yo una vez provisto lo anterior

- Lógica de cotejo en `verificarEgresado`: buscar el `correo` del egresado en
  `egresados_fwd`; si figura → permitir verificar (y copiar `titulo_fwd`); si no →
  bloquear con mensaje claro.
- Mostrar en la tarjeta de validación el resultado del cotejo (figura / no figura)
  para asistir al admin — el "agente validador" de RF-64.
- Tests de la lógica de cotejo.

## Resumen — qué necesitamos de Errol/FWD

Para **RNF-30**:

1. **Aprobar/crear** la tabla `egresados_fwd` (migración).
2. El **padrón real** de egresados para sembrarla.
3. **Confirmar la llave** del cotejo (correo vs título).

(Si en lugar de tabla se usa una API externa: URL + auth + formato de respuesta.)

Aparte (independiente, más urgente):

4. **Correr el parche de datos** del egresado sin fila `estudiantes` (§5).
