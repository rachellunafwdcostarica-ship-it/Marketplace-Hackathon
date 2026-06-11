# Pendientes — Samir (A1: Infra, Data, Auth, Seguridad)

**Fecha de auditoría:** 2026-06-10
**Alcance:** solo tarjetas y carpetas de A1 (`supabase/migrations`, `supabase/seeds`, `lib/supabase`, `lib/auth`, `src/types`, `(public)`, `middleware.ts`). No incluye trabajo de otros miembros del equipo.
**Método:** lectura del código en la rama `samir` + verificación SQL contra la BD remota real (`mgowuyflhiavquztxpqh`) + advisors de Supabase. Cada ítem tiene evidencia; nada es suposición salvo donde se indica.

---

## 1. Riesgos activos — atender primero

### 1.1 Drift de versiones de migraciones local vs remoto · `[M]`

Las últimas 4 migraciones están aplicadas en el remoto con **versión distinta** a la del archivo local (mismo nombre, distinto timestamp):

| Archivo local | Versión en remoto |
|---|---|
| `20260610000008_perf_initplan_and_overlap_rls.sql` | `20260610212418` |
| `20260610000009_security_anon_revoke.sql` | `20260610212431` |
| `20260610000010_schema_fixes_and_policy_gaps.sql` | `20260610212717` |
| `20260610000011_merge_update_policies_and_fix_anon_functions.sql` | `20260611035145` |

**Riesgo:** un `supabase db push` futuro las verá como no aplicadas e intentará re-ejecutarlas.
**Acción:** renombrar los archivos locales a las versiones remotas, o `supabase migration repair`. Es infra pura de A1, no toca a nadie más.

### 1.2 Tarjeta #83 — una cuenta suspendida SÍ puede iniciar sesión (RF-65) · `[M]`

`src/middleware.ts` solo consulta `get_my_role`; nunca consulta `estado_cuenta`. Los layouts `(app)` y `(company)` leen `get_my_account_status` pero solo muestran `PendingAccountBanner` — no bloquean ni cierran sesión. Un usuario `suspendida`/`suspendida_severa` navega con un banner. El SRS exige "la cuenta suspendida no puede iniciar sesión".
**Acción:** gate por `estado_cuenta` en middleware y/o `auth/callback`, con cierre de sesión y mensaje claro.

### 1.3 RF-03 — sin bloqueo por intentos fallidos, y el login no acepta contraseña · `[M]`

Doble problema verificado:
- La infra pasiva existe (`usuarios.intentos_fallidos`, `bloqueado_hasta`, config `intentos_login_max=5` / `tiempo_bloqueo_minutos=30`), pero **ninguna lógica la usa**.
- `login/page.tsx` solo ofrece magic link OTP (`signInWithOtp`) y OAuth. **No hay login con contraseña**, pese a que `register` crea contraseña vía `signUpWithPassword`. La contraseña del registro queda huérfana y RF-03 es inaplicable al login actual.

**Acción (decidir):** agregar `signInWithPassword` + contador de intentos, o eliminar la contraseña del registro y declarar OTP/OAuth como método único. Cualquiera de las dos cierra la incoherencia.

**RESPUESTA A LA DECISION** Conversando con mi equipo, llegamos a la conclusion de que lo mejor, y lo que queremos es que estén las 2 opcines vigentes, tanto el login con contraseña como el login con magic link OTP, ademas queremos que el registro tenga contraseña y que el usuario pueda elegir si quiere iniciar sesion con contraseña o con magic link OTP. Ahora, con respecto al bloqueo por intentos fallidos, creemos que es una buena medida de seguridad y que deberia estar implementada.

### 1.4 RF-01 parcial — el rol elegido en /register nunca se aplica

`register` guarda el rol en `options.data.role` (user metadata), pero `handle_new_user` lo ignora y deja `id_rol = NULL`; el usuario debe re-elegir rol en `/onboarding`. Paso duplicado para quien ya eligió.
**Acción (decidir):** leer el metadata en onboarding como preselección, aplicarlo directo en el trigger, o quitar el `RoleSelector` del registro.

**RESPUESTA A LA DECISION** No veo el sentido de quitar el RoleSelector del registro, ya que es una funcionalidad que deberia estar implementada desde el registro, ademas de que ahorraria tiempo al usuario al no tener que elegir el rol en el onboarding. por lo que recomiendo que se deje el RoleSelector en el registro y que se lea el metadata en onboarding como preselección, de esta manera el usuario podra elegir el rol en el registro y no tendra que elegir el rol en el onboarding. 

---

## 2. Migración del flujo B — bloqueada en Santiago (tarjeta #13 de coordinación)

Verificado directamente en la BD remota: **siguen faltando** (solo existe la PK; ningún trigger valida transiciones):

1. `UNIQUE(id_proyecto, id_estudiante)` en `participaciones` — hoy un egresado puede postularse dos veces al mismo proyecto.
2. Trigger `BEFORE UPDATE` que valide la máquina de estados (`enviada → en_revision → contratada | no_seleccionada`, etc.).

**Bloqueado por 2 respuestas de Santiago** (ver `coordinacion-santiago-13.md`): rechazo directo `enviada → no_seleccionada`, y retiro post-`contratada`. Santiago solo debe esas dos respuestas; **la migración la escribe Samir** (sus tareas son las server actions y queries de `lib/applications/`).
**Ojo con la numeración:** "migración 0008" en el doc de coordinación es una etiqueta vieja de la v1 — ese número ya lo ocupó `perf_initplan` y **no se renombra ni se edita nada existente** (las migraciones aplicadas son inmutables). La nueva migración simplemente toma la siguiente versión libre: única y mayor que la última aplicada en remoto (hoy `20260611035145`). Si antes se repara el drift de 1.1, lo más limpio es generar el timestamp con `supabase migration new`.

---

## 3. Tarjetas A1 con trabajo restante

| Tarjeta | Estado | Detalle verificado |
|---|---|---|
| #21 Edición perfil + Storage `[M]` | parcial | No existe **ningún bucket** (`storage.buckets` = vacío en remoto). Sin lógica de edición en `lib/auth`. Las policies `*_update_own` y los guard triggers ya están. |
| #16 Auditoría + rate limiting `[S]` | parcial | La tabla `auditoria` existe con índices y acceso solo service_role, pero **nadie escribe en ella** desde `lib/`. Cero rate limiting en server actions. |
| #19 Integración base egresados FWD `[M]` | pendiente | Nada implementado; solo el enum `cotejo_fwd` en consentimientos. Es prerrequisito de RF-64 (Errol #52) — bloquea a un compañero. |
| RNF-37 Eliminación de datos a solicitud `[M]` | pendiente | Nada. Existe `ON DELETE CASCADE` usuarios→auth.users como sustrato. Falta flujo de borrado/anonimización + registro en `auditoria`. |
| #17 Respaldos/retención `[S]` | pendiente | Nada documentado. Supabase Pro incluye respaldos diarios, pero el plan del proyecto no es verificable desde el repo — **confirmar en dashboard y documentar** (esto es aproximado, verificalo). |
| #97 2FA opcional `[C]` | pendiente | Nada. Prioridad Could — al final. |
| Q4 Queries de perfil | bloqueado | `getUserProfile`/`getStudentProfile`/`getEmployerProfile` no existen en `queries.ts`. Bloqueado: los dueños de dashboard junior/empresa deben especificar campos antes de construirlas. |
| Gate de verificación de empresario | decidir | `assign_my_role` no crea la fila en `empresarios`, así que el gate `estado_verificacion='pendiente'` no se materializa hasta que exista la fila. Definir cuándo se crea (cruce con Errol #32 — la función es de Samir). |
| Enum de entregables vs SRS | verificar | `estado_entregable_enum` generado = `enviado/en_revision/aprobado/con_cambios` — **no incluye `rechazado`**. Confirmar contra SRS si ese estado debía existir. |

---

## 4. Calidad / deuda técnica (scope A1)

- **Env vars sin Zod** — `reglas.md` §5 exige Zod en env vars; hoy hay `process.env.X!` en 9 archivos (middleware, clientes supabase, actions, callback). Crear `lib/env.ts` con schema y reemplazar los accesos.
- **Tests** — existe exactamente 1 archivo: `src/lib/auth/guards.test.ts` (5 tests, todos pasan). `tests/unit/` y `tests/e2e/` vacíos. El script `test` usa `--passWithNoTests`, que enmascara la ausencia. La cobertura global ahora es de Fressia (RNF-25), pero los tests de `lib/auth` son DoD de cada tarjeta de Samir: faltan tests de `actions.ts`, `queries.ts`, `schemas.ts`, `check-pwned-password.ts`.
- **Código muerto** — `src/lib/supabase/middleware.ts` exporta `updateSupabaseSession` y nadie lo importa (`src/middleware.ts` duplica el cliente inline). Viola `reglas.md` §8: usarlo o borrarlo.
- **Logout dual** — `Navbar.tsx` hace `signOut` con el browser client en vez de reusar la server action `signOut` de `actions.ts`. Dos vías paralelas para lo mismo.
- **Naming con fricción** — `lib/auth/schemas.ts:9` mezcla `'junior'` (nombre UI) con `'empresario'` (nombre BD) en el mismo `z.enum`; `onboarding/page.tsx` llama `dbRole` a una variable que contiene `'junior'` (la traducción real a `'egresado'` está en `actions.ts`). Funciona, pero invita a errores.
- **Leaked password protection deshabilitado** (advisor WARN) — el check HIBP propio (`check-pwned-password.ts`) mitiga en register/reset, pero el setting de Auth sigue apagado. Activarlo en el dashboard (no es migración).
- **Deploy Vercel** — pendiente; el propio README lo declara (línea 149). Obligatorio por brief §4.9, deadline 28-jun. La distribución v6 no le asigna dueño explícito — confirmar con el equipo quién lo hace.

---

## 5. Procesos que se pueden cerrar

| Proceso / archivo | Veredicto | Acción recomendada |
|---|---|---|
| `docs/decisiones-pendientes-auth.md` | **Desactualizado en lo central.** Q1 (resuelto: onboarding obligatorio implementado — página + middleware + callback), Q2 (resuelto, y la premisa del doc ya no es cierta: el trigger ya no asigna rol, deja `id_rol` NULL), Q6 (resuelto: auto-asignación única vía `assign_my_role`, solo egresado/empresario), recuperación de contraseña (resuelto: nativa, `resetPasswordForEmail`, sin tabla custom). Solo siguen vivos Q4 y la tabla `archivo`. | Archivar o reescribir dejando solo Q4 + `archivo` (ya están reflejados en la sección 3 de este doc). |
| `docs/db-modelo-xxi-impacto.md` | **Cumplido.** El grep exhaustivo confirma 0 referencias activas a tablas/columnas/estados viejos en `src/` y `supabase/`; los tipos reflejan XXI. Su línea 52 quedó vieja (dice que el trigger asigna `egresado`; desde la migración 0005 deja NULL). | Archivar; el proceso de reset terminó. |
| `files_sql_para_marketing/` (sin trackear) | **Snapshot congelado y peligroso.** Los 6 SQL son byte-idénticos a los del repo, pero faltan 9 de 15 migraciones (incluida `0000_rls_auto_enable` que corre primero). Quien la aplique hoy obtiene: trigger viejo de roles (rompe el onboarding), RPCs inexistentes que la app llama, y las vulnerabilidades de escalación que el hardening 0006-0011 ya cerró. | Borrarla y entregar a marketing una referencia inmutable (tag/commit o `supabase db dump`); si debe ser carpeta física, regenerarla completa con README de advertencia. **No commitearla.** |
| `coordinacion-santiago-13.md` (sin trackear) | **Vigente** — los 2 pendientes están confirmados contra la BD. Solo la numeración "0008" quedó vieja. | Mantener hasta que Santiago responda; decidir si se commitea o se pasa por otro canal. |
| Follow-ups RLS de la sesión 10-jun (`auth_rls_initplan`, `multiple_permissive_policies`) | **Resueltos** por las migraciones 0008 y 0011 — los advisors ya no los reportan. Quedan solo INFO/WARN intencionales (auditoria/mensajes sin policy a propósito, RPCs SECURITY DEFINER documentados, FKs frías). | Cerrado, nada que hacer. |
| `distribucion_propuesta.md` §8 tarjeta #79 y §11 plantilla | Usan los estados viejos `postulada`/`candidata` (el enum real tiene 7: `enviada`, `en_revision`, `contratada`, `no_seleccionada`, `retirada`, `finalizada`, `cancelada`) y el contrato RF-52 referencia `categorias_proyecto` (hoy `categorias`). | Doc compartido del equipo — proponer la corrección en la próxima reunión, no editar unilateralmente. |

---

## 6. Verificado y cerrado (no requiere acción)

- **Residuos del modelo XXI:** 0 referencias activas en código; tipos regenerados y sincronizados con el remoto.
- **Onboarding completo (Q1/Q2/Q6):** página, middleware (casos A-D), callback, `assign_my_role` con refuerzo a nivel BD (una sola vez, rechaza `administrador`).
- **Recuperación de contraseña:** nativa de Supabase, con chequeo HIBP fail-closed en register/reset.
- **RLS:** 0 tablas sin RLS; aislamiento verificado bajo JWT real el 10-jun.
- **Clientes Supabase:** server/browser/admin con `@supabase/ssr`; `SUPABASE_SERVICE_ROLE_KEY` solo en `admin.ts` protegido con `server-only`.
- **Calidad base:** `tsc --noEmit` limpio, `eslint --max-warnings=0` limpio.
- **Logout (RF-07):** server action implementada (con el matiz del logout dual de la sección 4).

### Nota de coordinación (no es tarea de Samir)

El campo `cedula` de la capa mock de empresa (`mockData.ts`, `CompanyProfileForm`, etc.) no toca BD; cuando esas páginas se cableen a Supabase debe mapearse a `empresarios.cedula_juridica`. Avisar a quien cablee `(company)` (Errol/Ronny).
