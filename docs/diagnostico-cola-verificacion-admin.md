# Diagnóstico para Samir — Auditoría del sistema de auth y cola de verificación

> Para el dueño de la BD (Samir). Cubre dos partes:
> - **Parte A** — Bug confirmado: usuarios nuevos no aparecen en la cola del admin.
> - **Parte B** — Hallazgos secundarios de la auditoría completa (no bloquean el bug actual, pero tienen riesgo).
>
> **No se aplicó ninguna migración ni cambio de código en esta auditoría.** Todo lo que se describe es diagnóstico.
> Excepción: se eliminó la ruta debug temporal (`src/app/api/debug/generate-signup/`) que había dejado un agente anterior — tenía errores de TypeScript y violaciones de `reglas.md §8`.

---

## Parte A — Bug: usuario nuevo no aparece en la cola del admin

### Síntoma reportado

Un usuario nuevo se registra, confirma el correo y **llega a `/pending-approval`
("en revisión")**, pero **no aparece en la cola del admin** (`/admin/validations`)
para poder verificarlo (RF-64 / RF-17). Queda atrapado en "en revisión" para
siempre porque nadie lo puede verificar.

**No es un problema de login.** El registro y la confirmación de correo funcionan:
se probó el enlace `GET /auth/confirm?token_hash=...&type=signup` y confirma bien
(setea `email_confirmed_at`). El problema vive **después**, en la cola del admin.

### Mecanismo (verificado en código)

Los layouts del panel leen el perfil con el cliente de sesión y `maybeSingle()`:

- `src/app/[locale]/(app)/layout.tsx:46-54` (egresado)
- `src/app/[locale]/(company)/layout.tsx:46-54` (empresario)

```ts
const { data: estudiante } = await supabase.from('estudiantes')
  .select('estado_verificacion').eq('id_usuario', user.id).maybeSingle()
if (estudiante?.estado_verificacion !== 'verificado') redirect('/pending-approval')
```

`maybeSingle()` devuelve `null` si **la fila de perfil no existe o la query
falla**. Entonces `undefined !== 'verificado'` → redirige a `/pending-approval`
**igual**. Es decir, el usuario cae en "en revisión" tanto si su perfil está
`pendiente` como si **no tiene perfil / la query revienta**.

La cola del admin (`src/lib/admin/queries.ts:43-46` egresados, `:127-133`
empresas) solo lista perfiles que **existen** con `estado_verificacion='pendiente'`.

| Estado real del perfil | ¿Llega a `/pending-approval`? | ¿Aparece en la cola? |
|---|---|---|
| Existe, `pendiente` | Sí | Sí (funciona) |
| **No existe / query falla** | Sí | **No** ← el síntoma |

### Las dos causas probables

#### Causa 1 — Drift de columnas geo (rompe la cola de EMPRESAS en silencio)

`listCompanyVerifications` (`src/lib/admin/queries.ts:130`) hace
`select(... pais_iso_sede, region_sede ...)`. Esas columnas las renombra la
migración `supabase/migrations/20260621120000_geo_iso_pais_region.sql`
(`pais_sede → pais_iso_sede`, `ciudad_sede → region_sede`), cuyo encabezado dice
literal: **"NO aplicar sin aprobación del dueño de la BD (Samir)"** (línea 17).

Si esa migración **no está aplicada al remoto**, el `empresarios` remoto todavía
tiene `pais_sede` / `ciudad_sede`, el `select` falla con *"column does not exist"*,
y la página hace `companies = result.ok ? result.data : []`
(`src/app/[locale]/(admin)/admin/validations/page.tsx:43-44`) → **lista vacía,
sin ningún mensaje de error en pantalla** (el error solo se loguea en el servidor).

La cola de **egresados** NO sufre esto: su query solo lee
`id_usuario, titulo_fwd, estado_verificacion`, columnas estables desde el schema
inicial. Por eso este drift afectaría **solo a empresarios**.

#### Causa 2 — `completarOnboarding` no hace rollback (solo afecta al Camino B / Google)

`crearPerfilUsuario` (`src/lib/auth/profile.ts`) primero hace
`UPDATE usuarios SET id_rol` (línea 68) y **después** inserta el perfil (línea 81).

- Registro por contraseña (Camino A): si el perfil falla, se borra el usuario
  entero (`src/lib/auth/actions.ts:465`). No deja huérfanos.
- Onboarding OAuth (Camino B): si el insert del perfil falla, **solo retorna el
  error — NO revierte el `id_rol`** (`src/lib/auth/actions.ts:169-175`). Queda un
  usuario **con rol pero sin perfil** → el middleware lo deja pasar → el layout no
  encuentra perfil → `/pending-approval`, y nunca en la cola.

Si el perfil de un empresario por OAuth falla por el mismo drift geo de la Causa 1,
ambas causas se combinan.

### Lo que necesito de vos (contra el remoto)

#### Query 1 — ¿Existe el perfil del usuario de prueba y en qué estado?

```sql
select u.correo, u.id_rol, u.estado_cuenta,
       e.estado_verificacion  as egresado_ev,
       em.estado_verificacion as empresa_ev
from usuarios u
left join estudiantes e  on e.id_usuario  = u.id_usuario
left join empresarios em on em.id_usuario = u.id_usuario
where u.correo = '<correo de prueba>';
```

- `egresado_ev` / `empresa_ev` en **NULL** → el perfil no se creó (apunta a la
  Causa 2, o a un insert que falló).
- Perfil **existe con `pendiente`** pero igual no aparece → apunta a la Causa 1
  (la query del admin revienta antes de listarlo).

#### Query 2 — ¿Está aplicado el rename geo en el remoto?

```sql
select column_name from information_schema.columns
where table_name = 'empresarios'
  and column_name in ('pais_iso_sede','region_sede','pais_sede','ciudad_sede');
```

- Devuelve `pais_iso_sede` / `region_sede` → la migración está aplicada (descarta
  la Causa 1).
- Devuelve `pais_sede` / `ciudad_sede` (los viejos) → **la migración geo NO está
  aplicada** y esa es la Causa 1: la cola de empresas siempre sale vacía.

### Decisión que te toca (migraciones)

Si la Query 2 muestra que el rename geo no está aplicado:

1. Hay que aplicar `20260621120000_geo_iso_pais_region.sql` al remoto **con tu
   aprobación** y **una a una por Management API** — **NO con `supabase db push`
   global**, porque eso aplicaría también las migraciones pre-staged que aún no
   deben ir (ver `docs/migraciones-estado-y-tracking.md`, §CAVEAT y el flip
   `20260622210000`).
2. Esa migración **nulifica** los datos de ubicación legacy de `empresarios` y
   `proyectos` (decisión "solo lo nuevo", líneas 12-13 del archivo). Confirmá que
   estás de acuerdo con esa pérdida antes de aplicarla.
3. Tras aplicarla, regenerar/ajustar `src/types/database.ts` si hace falta y
   reprobar la cola de empresas.

### Arreglos de código propuestos (pendientes de tu visto bueno — no aplicados)

Independientes del estado del remoto, hacen el sistema más robusto y diagnosticable:

1. **No tragarse el error en la cola** — `validations/page.tsx:43-47` hace
   `result.ok ? data : []`, que oculta exactamente este problema. Debería mostrar
   el fallo en vez de una lista vacía silenciosa.
2. **Rollback en `completarOnboarding`** — revertir el `id_rol` (o reintentar) si
   el insert del perfil falla, para no dejar usuarios huérfanos con rol y sin
   perfil (`src/lib/auth/actions.ts:169-175`).

---

## Parte B — Hallazgos secundarios de la auditoría (no bloquean hoy, tienen riesgo)

### B1 — `verify-email` usa `type:'email'` pero el OTP es de `type:'signup'`

**Archivo:** `src/app/[locale]/(public)/verify-email/page.tsx:53`

```ts
await supabase.auth.verifyOtp({ email, token, type: 'email' })
```

El OTP fue generado con `admin.generateLink({ type: 'signup' })`. Supabase distingue
los tipos de OTP: `signup` y `email` no son intercambiables. Si el token no pasa la
validación de tipo, el código de 8 dígitos **falla silenciosamente** ("token inválido")
aunque el token sea correcto.

El camino del **enlace** (`/auth/confirm?token_hash=...&type=signup`) sí usa `signup`
y funciona correctamente (confirmado por prueba). El problema está **solo** en el
camino del código manual.

Pendiente: probar explícitamente `/verify-email` con el código de 8 dígitos para
confirmar si el tipo mismatch es real o si Supabase lo normaliza.

### B2 — `signInWithPassword` colapsa TODOS los errores a `invalid_credentials`

**Archivo:** `src/lib/auth/actions.ts:568`

```ts
return err('invalid_credentials')  // cubre también 'email_not_confirmed', 'user_not_found', etc.
```

Esto es una decisión de seguridad defensiva (no revelar si el correo existe), **pero**
oculta a un usuario con correo no confirmado que su problema es la confirmación, no la
contraseña. El SRS (RF-65) exige mensaje diferenciado para cuentas suspendidas.

También crea un gap de RF-65: `signInWithPassword` **crea la sesión** antes de que el
middleware pueda bloquear a un usuario suspendido. El middleware revisa el estado en el
siguiente request, no en el momento del login. Usuarios suspendidos `is_active=false`
pueden obtener una sesión válida por unos instantes.

### B3 — `mailer_otp_exp` = 86400 (1 día) también aplica a recovery links

El parámetro `T1` del refactor (`mailer_otp_exp=86400`) fue aplicado correctamente
el 2026-06-22. Pero ese parámetro global afecta **todos** los tipos de OTP, incluyendo
links de recuperación de contraseña (RF-04), que el SRS requiere que expiren en 1 hora.

No hay forma de diferenciar por tipo en `mailer_otp_exp`. Opciones:
- Aceptar el trade-off (links de recovery también duran 24h, conveniente para el usuario)
- Limitar vía código en el handler de recovery (redirigir si `created_at` > 1h)

### B4 — Storage bucket `entregables_insert_estudiante` sin `current_user_is_verified()`

Las policies de storage para `entregables` permiten subida a usuarios `authenticated`
sin verificar que `current_user_is_verified() = true`. Un egresado recién registrado
(sin pasar por el admin) podría subir entregables.

La función `current_user_is_verified()` está disponible desde la migración
`20260622130000` pero no se agregó a las policies de storage.

### B5 — `editProjectDescription` quema tokens de IA antes de bloquear al no verificado

**Archivo:** `src/lib/projects/actions.ts` (acción de edición con IA)

La acción llama al LLM antes de verificar `current_user_is_verified()`. Si RLS bloquea
después, los tokens ya se gastaron. El guard debe ir **antes** del llamado al LLM.

---

## Resumen de decisiones pendientes

| # | Qué | Quién decide | Urgencia |
|---|---|---|---|
| A-Q1 | Correr Query 1 contra remoto (perfil del usuario de prueba) | Samir | Alta — desbloquea diagnóstico |
| A-Q2 | Correr Query 2 contra remoto (columnas geo) | Samir | Alta — desbloquea diagnóstico |
| A-M | Aprobar migración `20260621120000` al remoto (si Q2 confirma Causa 1) | Samir | Alta |
| A-F1 | Fix: no tragar error en `validations/page.tsx` | Usuario/Samir | Alta |
| A-F2 | Fix: rollback en `completarOnboarding` si perfil falla | Usuario/Samir | Media |
| B1 | Verificar `type:'email'` vs `type:'signup'` en código manual | Dev | Media |
| B2 | Decidir comportamiento de suspended users en login | Equipo | Baja |
| B3 | Decidir trade-off `mailer_otp_exp` vs RF-04 | Equipo | Baja |
| B4 | Agregar `current_user_is_verified()` a policies de storage | Dev | Media |
| B5 | Mover guard de verificación antes del llamado al LLM | Dev | Baja |
