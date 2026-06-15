# Pedido para Errol — desbloquear el cotejo de egresados (RNF-30)

> **Para:** Errol (dueño de la BD).
> Lista de lo que **necesitamos que hagas** para que el cotejo de egresados
> (RNF-30) funcione. Cada punto con su justificación. Lo de nuestro lado ya está
> hecho; acá solo va lo tuyo.

## Por qué (contexto breve)

- **RNF-30** (SRS, línea 413): _"Integración con la base de datos de egresados de
  FWD Costa Rica para la validación de estudiantes."_
- **RF-64** (SRS, línea 318): el admin valida egresados cotejando contra esa base.

Hoy ese padrón **no existe** en el proyecto (revisé todas las migraciones: solo
hay config y catálogos sembrados). Sin la fuente y los datos, el cotejo no se
puede construir.

## Lo que necesitamos que hagas

### 1. Crear la tabla `egresados_fwd` (migración)

```sql
create table public.egresados_fwd (
  id          uuid primary key default gen_random_uuid(),
  correo      varchar(150) not null unique,  -- llave de identidad
  titulo_fwd  titulo_fwd_enum  not null,     -- especialidad / condición de egresado
  nombre      varchar(160),
  cohorte     varchar(40),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);
alter table public.egresados_fwd enable row level security;
-- Sin policies: nadie lo lee desde el cliente; solo el admin via service_role.
```

**Justificación:** el cotejo usa **ambos** campos (ver punto 2). RLS sin policies
protege los datos personales (RNF-35): solo el `service_role` del servidor lo lee.
Si en lugar de una tabla local FWD expone una **API**, pasanos URL + método de
autenticación + formato de respuesta.

### 2. El padrón real de egresados — con correo **y** título

El export (CSV o similar) de los egresados de FWD, incluyendo **correo y título**
de cada uno, para sembrar la tabla.

**Justificación:** el cotejo valida por los **dos**: el **correo** identifica a la
persona y el **título** confirma su especialidad/condición de egresado. Por eso
ambos campos son obligatorios en la tabla. Sin los datos, el cotejo daría "no
figura" para todos. Estos datos los tiene FWD; nosotros no los podemos generar.

### 3. Correr el parche de datos del egresado huérfano

[Seguro] Detectamos (consulta a la BD): hay **2 usuarios con rol egresado** pero
**1 sola fila en `estudiantes`**. El egresado sin fila **no aparece** en validación
y no podría postular.

```sql
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

**Justificación:** la cola de validación se arma desde `estudiantes`; sin la fila,
ese egresado es invisible. Es un INSERT de datos (no toca el esquema), pero corre
sobre la BD remota → lo hacés vos.

## Resumen — 3 cosas

1. **Crear** la tabla `egresados_fwd` (migración).
2. **Pasarnos** el padrón real de egresados (correo + título).
3. **Correr** el parche del egresado huérfano (SQL de §3).
