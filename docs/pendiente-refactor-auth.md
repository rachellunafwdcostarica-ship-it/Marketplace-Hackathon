# Pendiente: Refactor de Registro / Verificación / Aprobación (Auth)

> Plan de implementación detallado. Las decisiones de diseño ya están **fijadas
> (§9)**. **No implementar hasta confirmar con Samir el trigger M1 (§4) y
> "Confirm email" ON (§5)** — sin esa config nada de esto funciona (ver PASO 0). Objetivo:
> cumplir RF-01, RF-02, RF-03, RF-17, RF-64 y RF-65 sin romper `reglas.md`. Toca
> código + migraciones (Samir) + config Supabase.

## PASO 0 — REQUISITO BLOQUEANTE (antes de una sola línea de código)
**Nada de este plan arranca sin esto. El primer paso real NO es código:**
1. **Confirmar con Samir que se puede activar "Confirm email" = ON** en el dashboard de Supabase (Auth → Email). Sin esto, `admin.createUser({ email_confirm:false })` **no impide el login** → el "registro ≠ login" (RF-02) no funciona y el diseño se cae.
2. **Confirmar con Samir que el trigger M1** ("correo confirmado → `estado_cuenta='activa'`", §4) se puede correr en su setup (es un trigger sobre `auth.users`).
3. **Confirmar que `pg_cron` está disponible** para el job de limpieza de huérfanos (§14) — puede ir después, pero conviene saberlo ya.

Si (1) NO es posible, **detenerse y reabrir el diseño** (habría que volver a la activación por admin). **No empezar a codear hasta tener el OK de Samir en (1) y (2).**

## 1. Problema actual (verificado en código)
- `signUpWithPassword` (`auth/actions.ts:418`) usa `admin.createUser({ email_confirm: true })` → **auto-login**: el registro funciona como login. **Viola el espíritu de RF-02** (la cuenta debería quedar pendiente hasta confirmar el correo).
- El rol y el perfil de empresario se completan en `/onboarding/empresario`, cuya **page asigna el rol con solo visitarla** (`assign_my_role` en el render). Flujo frágil de dos pasos.
- `approveUser` (admin) pone `estado_cuenta = activa` → la activación depende del admin, no del correo. Doble confirmación (aprobar + verificar).
- `ultimo_login_at` está **muerto** (nadie lo escribe; solo se congela en `security_hardening:85`). No sirve para detectar usuarios nuevos: usar `auth.users.email_confirmed_at`.

## 2. Modelo de estados (tres conceptos separados — NO mezclar)
| Estado | Tabla | Valores | Lo mueve | Significa |
|---|---|---|---|---|
| `email_confirmed_at` | `auth.users` | null / timestamp | el **usuario** (confirma correo) | RF-02: probó acceso al buzón |
| `estado_cuenta` | `usuarios` | pendiente/activa/suspendida/suspendida_severa | trigger (al confirmar correo) + admin (suspender/reactivar, RF-65) | operatividad |
| `estado_verificacion` | `estudiantes`/`empresarios` | pendiente/verificado/rechazado | **admin** (RF-64/RF-17) | egresado/empresa validado |

- **`is_active`** queda solo para RF-65 (habilitar/deshabilitar). NO es "en línea".
- **Rechazo** = `estado_verificacion = rechazado` (sin enum nuevo). El login lo bloquea.

## 3. Flujo objetivo (las dos llaves)
1. **Registro (RF-01):** dos caminos en `/register`, el usuario elige uno (ver §14). **A) correo + contraseña:** el form lleva TODO (rol + campos) → crea `usuarios` (pendiente) + perfil, **sin auto-login**, y manda email con **enlace + código**. **B) Google/OAuth:** Google da correo + nombre (correo **ya confirmado**); el rol y los campos se cargan después en `/onboarding` (bloqueante).
2. **Confirmar correo (RF-02):** enlace (`/auth/confirm`) o código (pantalla) → `verifyOtp` → `email_confirmed_at` se setea → **trigger** pone `estado_cuenta = activa` → sesión.
3. **Verificación admin (RF-64/RF-17):** admin verifica (coteja correo+`titulo_fwd` del egresado / correo+4 campos del empresario) → `estado_verificacion = verificado` + email "verificado" + notificación in-app `cuenta_verificada`. Rechaza → bloquea.
4. **Acceso (RF-03):** sin confirmar → pantalla de **código**; confirmado pero **sin rol** (caso OAuth, §14) → **`/onboarding`** bloqueante; confirmado + con rol pero **no verificado** → pantalla **"en revisión"**; verificado → panel completo. Suspendido/rechazado → bloqueado.

## 4. Qué requiere SAMIR (migraciones SQL)
- **M1 — Trigger de activación (NUEVO).** `AFTER UPDATE OF email_confirmed_at ON auth.users`: si `OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL` → `UPDATE public.usuarios SET estado_cuenta='activa' WHERE id_usuario = NEW.id AND estado_cuenta='pendiente'`. `security definer`. **Es la pieza "correo confirmado → activa".** Precedente: ya existe `handle_new_user` como trigger sobre `auth.users`, así que es plausible — Samir debe confirmar que corre en su setup.
- **M2 — (opcional) deprecar `assign_my_role`.** El registro deja de usarlo (ver A1). Se puede dejar como está (sin uso) o borrarlo en una migración. No urgente.
- **NO requiere migración:** mover los 4 campos del empresario (las columnas ya existen; solo `tipo_empresario` es NOT NULL y lo provee el registro). Tampoco el `titulo_fwd` (ya existe, nullable).

## 5. Qué requiere CONFIG de Supabase (dashboard — Samir/dueño)
- **C1 — Auth → "Confirm email" = ON.** CRÍTICO: con `email_confirm:false` en `createUser`, Supabase solo **bloquea el login de correos no confirmados si "Confirm email" está ON**. Si está OFF, el "registro ≠ login" NO funciona (el usuario podría loguear sin confirmar).
- **C2 — Redirect URLs:** agregar `/auth/confirm` a las allowed redirect URLs (si no está).
- El **contenido** del email lo manda nuestro código por **Gmail** (no la plantilla de Supabase), así que no hace falta tocar plantillas de Supabase.

## 6. ¿Será un trigger? — SÍ
La activación "correo confirmado → `estado_cuenta=activa`" se hace con el **trigger M1**, no en el route handler. Motivo: es una regla de negocio que debe valer **siempre** y por **cualquier vía** de confirmación (enlace o código), sin depender de que el código la invoque en cada punto. Un olvido dejaría cuentas inconsistentes.

## 7. Plan archivo por archivo (CÓDIGO)
- **`src/lib/auth/actions.ts` → `signUpWithPassword`:**
  - Ampliar el Zod schema por rol: egresado → `+ tituloFwd` (`'frontend'|'backend'|'fullstack'`); empresario → `+ tipoEmpresario`, `nombreEmpresa`, `cedula`, `sitioWeb?`.
  - `admin.createUser({ email_confirm: false, user_metadata: { full_name, role } })`.
  - Tras crear, con **service_role**: asignar `id_rol` (resolver de `roles` + `UPDATE usuarios`) y crear la fila de perfil (`insert estudiantes {id_usuario, titulo_fwd}` / `insert empresarios {id_usuario, tipo_empresario, nombre_empresa, cedula, sitio_web}`). *(Reemplaza a `assign_my_role`, que necesita sesión y aquí no hay.)*
  - `admin.generateLink({ type: 'signup', email })` → `properties.hashed_token` (enlace) + `properties.email_otp` (código). Enviar email Gmail con **ambos** (enlace a `/auth/confirm?token_hash=…&type=…` + código).
  - Retornar `ok` **sin sesión**. Mantener el chequeo de correo duplicado (error neutro).
  - **`approveUser`:** ver Decisión §9.1 (mantener solo para RF-65 / separar).
- **`src/components/features/auth/RegisterForm.tsx`** (y `register/page.tsx`): campos condicionales por rol (egresado → select `titulo_fwd`; empresario → select `tipo_empresario` + `nombre_empresa` + `cedula` + `sitio_web` opcional). Bloquear "Crear cuenta" hasta completar los requeridos. Textos a i18n.
- **`/onboarding` se MANTIENE** (es el hogar del Camino B / OAuth — ver §14). **Fusionar** `/onboarding/empresario` dentro de `/onboarding` (un solo form que recoge rol + campos según rol, **reutilizando el mismo componente de campos del form de registro**). El camino contraseña (A) NO pasa por `/onboarding`; el camino OAuth (B) SÍ. *(Antes este punto decía "eliminar /onboarding/empresario" asumiendo solo-contraseña; queda corregido.)*
- **`src/middleware.ts`:** reenrutar con la nueva máquina. **El middleware NO chequea `estado_verificacion`** (eso va en el layout, §9.3); solo mira sesión + `email_confirmed_at` + suspensión:
  - no auth → `/login`; auth + `email_confirmed_at` NULL → `/verify-email`; auth + confirmado + **sin rol** → `/onboarding` (caso OAuth, el middleware ya lo hace); auth + confirmado + con rol → deja pasar; suspendido/desactivado (`estado_cuenta` suspendida o `is_active=false`) → bloqueo.
  - Quitar **CASO F** (`/onboarding/empresario`). Ajustar **CASO LANDING** para no dejar pasar no-confirmados.
- **Layout del panel** (server component de `(app)`/`(company)`): es el **gate de verificación** (§9.3). Lee `estado_verificacion` **una vez** al entrar: `!= 'verificado'` → redirect a `/pending-approval` ("en revisión"); `= 'rechazado'` → pantalla de rechazo (puede ser `/pending-approval` con copy distinto). Defensa adicional: `signInWithPassword` puede rechazar el login de `estado_verificacion='rechazado'` (`err('account_rejected')`).
- **`/verify-email` (pantalla del código):** form que toma el código y llama `verifyOtp({ email, token, type:'email' })` → sesión → redirect. El email se pasa por query (`/verify-email?email=…`) tras el registro. Reusar/renovar la página existente `verify-email`.
- **`/pending-approval` ("en revisión"):** ajustar copy a "tu cuenta está en revisión por el equipo". i18n.
- **`/auth/confirm` (route handler):** ya existe (lo usa `approveUser`). Verificar que soporta `type` de signup y redirige según estado tras confirmar.
- **Email templates** (`src/lib/email/templates/`):
  - NUEVO `account-verification.ts`: email del registro (enlace + código). i18n del asunto/cuerpo (o es-only documentado, como los demás templates).
  - `account-approved.ts`: reconvertir en el email de "verificado" (FASE 3) o reemplazar por el de `cuenta_verificada` (ver `pendientesnotificaciones.md`).
- **`src/lib/admin/actions.ts`** (`setGraduateVerification`/`setCompanyVerification`): al `verificado`, disparar email "verificado" + notificación in-app `cuenta_verificada` (enlaza con el pendiente de notificaciones §3.1 de `pendientesnotificaciones.md`).

## 8. Auditoría de verificación en server actions (SEGURIDAD)
La "pantalla en revisión" es UX; la seguridad está en cada action (los POST **no** pasan por el gate del middleware, `middleware.ts:66`). **Ya chequean** `estado_verificacion='verificado'`: `postularse`, `publishProject`, `proposal-ai/proposal`, `proposal-ai/chat`, `projects/actions.ts` (flag). **Auditar y agregar el check donde falte:**
- `deliverables/actions.ts` (subir/aprobar entregables — RF-44).
- mensajería (RF-45, si existe la action).
- `project-detail.ts`: `adjudicarParticipacion`, `setParticipacionEstado`, `setProjectEstado`.
- `projects/edit-description.ts`: `editProjectDescription`.
- evaluaciones (calificar al estudiante — RF-49).
Regla: si un usuario **no verificado** podría invocarla, debe devolver `err('not_verified')`/`cuenta_no_verificada` antes de actuar.

## 9. Decisiones FIJADAS (con el porqué — para quien lea esto sin contexto)
Todas estas ya están decididas; abajo el porqué de cada una.

1. **`approveUser` se mantiene SOLO para reactivar (RF-65); se le quita "aprobar cuenta nueva" y el magic link.**
   *Por qué:* la activación de cuentas nuevas pasa a la confirmación de correo (trigger M1). Pero `approveUser` HOY hace `estado_cuenta='activa' + is_active=true`, que también es la **reactivación de cuentas suspendidas/desactivadas (RF-65)**. Borrarla entera rompería RF-65. Se conserva esa mitad y se elimina el envío del magic link `account-approved` (que era para cuentas nuevas). Conviene renombrarla a `reactivarUsuario` para que el nombre no mienta.
2. **El perfil (`estudiantes`/`empresarios`) se crea con `service_role` vía una función compartida `crearPerfilUsuario(userId, rol, datos)`, usada en AMBOS caminos (registro password Y onboarding OAuth), NO en `handle_new_user`.**
   *Por qué:* en el registro password no hay sesión (sin auto-login), así que `assign_my_role` (que usa `auth.uid()`) no sirve. Meter la creación en el trigger lo vuelve frágil. Una función con `service_role` funciona con o sin sesión, **no duplica lógica entre los dos caminos** y es testeable. `assign_my_role` queda jubilado. *(El detalle de por qué OAuth también la usa está en §14.)*
3. **El gate de "en revisión" va en el LAYOUT del panel (server component), NO en el middleware.**
   *Por qué:* `estado_verificacion` vive en `estudiantes`/`empresarios` (otra tabla). Chequearlo en el middleware sería una query extra en **cada** request (el middleware ya hace `get_my_role` + `get_my_account_status`), lo que roza RNF-09 (<2s). El layout del panel lo chequea **una vez al entrar** y redirige a `/pending-approval` si no está verificado. La seguridad real de las acciones (POST) la cubre cada server action (§8), no el middleware.
4. **La pantalla "en revisión" reutiliza `/pending-approval`.**
   *Por qué:* ya existe, ya está contemplada en el middleware; solo cambia el copy. Una ruta nueva duplicaría sin ganancia.
5. **El email de verificación (enlace + código) por Gmail (custom) — SOLO en el Camino A (contraseña).**
   *Por qué:* control total del contenido (i18n, marca FWD) reusando la infra de Gmail; el enlace cumple la letra de RF-02 y el código da la UX de la pantalla. **El Camino B (OAuth) NO manda este email:** Google ya confirma el correo, así que no se llama `generateLink` ni se envía verificación (§14). No se usa la plantilla de email de Supabase.
6. **Coexisten los dos métodos de registro; el onboarding bloqueante es SOLO del Camino B (OAuth); los huérfanos se limpian con un job.**
   *Por qué:* contraseña y Google son métodos separados que el usuario elige (ninguno reemplaza al otro). El Camino A carga todo en el form (sin onboarding); el Camino B carga rol + campos en `/onboarding` bloqueante (Google no los pide). Un usuario OAuth que abandona el onboarding queda huérfano (inofensivo: el middleware lo atrapa, no entra a nada); un job `pg_cron` (Samir) borra los `id_rol IS NULL` con más de X días. Detalle completo en §14.

## 10. Tests (cómo pasarlos)
- **`auth/actions.test.ts`:** actualizar `signUpWithPassword` — mockear `@/lib/supabase/admin` (`createUser`, `generateLink`, `from().update/insert`), `createGmailTransport`. Aserciones: `email_confirm:false`, se crean las filas de perfil, NO se crea sesión, error neutro en duplicado.
- **Lógica pura nueva:** extraer la validación del registro y el enrutado del middleware a `*-logic.ts` para testearlos con Vitest sin tocar I/O.
- **Tests existentes de middleware/onboarding:** actualizar al nuevo enrutado; borrar los de `/onboarding/empresario`.
- **Correr la suite COMPLETA** (`npx vitest run`, nunca filtrada). Verificar `npm run build` + `npm run lint` (0 errores).

## 11. Cuidados de reglas.md
- **i18n:** todo texto nuevo (form, pantallas, emails) a `messages/es.json` + `en.json`. Cero hardcode.
- **Sin emojis, sin hex** (tokens FWD), **sin `any`**.
- **Zod** en el registro (validar todos los campos por rol). **`Result<T,E>`** en las server actions.
- **`SUPABASE_SERVICE_ROLE_KEY` solo en servidor.** El locale, con `DEFAULT_LOCALE` de `@/i18n/config` (no `routing`).
- **`git add` selectivo** (varias terminales). Conventional commit, sin nombrar la IA.
- **Auth es sensible y transversal:** coordinar con quien toque `auth/` en paralelo; este refactor pisa registro, login, middleware y panel admin.

## 12. Cambios en el panel administrador (RF-63) para el nuevo diseño
**Contexto:** hoy el admin hace DOS actos sobre una cuenta nueva — primero **verificar** (`estado_verificacion`) y después **aprobar** (`approveUser` → `estado_cuenta='activa'`). De hecho `approveUser` rechaza con `user_not_verified` si todavía no se verificó (doble confirmación encadenada). El nuevo diseño **elimina la aprobación manual**: la cuenta se activa sola al confirmar el correo (trigger M1). El admin queda con **un solo acto** sobre cuentas nuevas: **verificar / rechazar**. Cambios concretos:

- **`src/components/features/admin/AccountStatusActions.tsx`:**
  - El botón **"Aprobar"** (`handleApprove` → `approveUser`, líneas 78-88, 143-155) hoy aparece cuando la cuenta NO está activa, lo que **incluye las `pendiente`**. Cambiar: **no mostrarlo para `pendiente`** (esas se activan al confirmar el correo, no por el admin).
  - **Reconvertirlo en "Reactivar"**, visible solo para cuentas **`suspendida`/`suspendida_severa` o `is_active=false`** (RF-65). Ajustar la condición `canApprove` (línea 62) para **excluir `'pendiente'`**.
  - **Quitar** el manejo de `result.error === 'user_not_verified'` (líneas 83-84): ya no aplica, porque reactivar no depende de la verificación.
  - **"Desactivar"** (`deactivateUser`) y **"Reenviar invitación"** (admins) se mantienen igual.
- **`src/lib/auth/actions.ts` → `approveUser`:** quitar el bloque que genera y envía el magic link `account-approved` (≈ líneas 296-352, era para cuentas nuevas). Mantener solo `estado_cuenta='activa', is_active=true` + la auditoría (reactivación RF-65). Renombrar a `reactivarUsuario` (y actualizar el import en `AccountStatusActions.tsx`).
- **Cola de verificación (`/admin/validations` + `src/lib/admin/queries.ts`):** se mantiene y pasa a ser el **único trámite** del admin sobre cuentas nuevas. Ya lista egresados con `titulo_fwd` (`queries.ts:45`) y empresarios con `nombre_empresa, tipo_empresario, cedula, sitio_web…` (`queries.ts:130`), o sea **ya tiene los datos del registro para cotejar** — no hay que agregar columnas. `verificarEgresado/Empresa` y `rechazarEgresado/Empresa` (`admin/actions.ts`) no cambian su firma; al **verificar**, AGREGAR el email "verificado" + la notificación in-app `cuenta_verificada` (ver `pendientesnotificaciones.md` §3.1).
- **`/admin/users`:** una cuenta en estado **`pendiente`** ahora significa **"correo sin confirmar"** (antes era "esperando aprobación del admin"). El admin **no actúa** sobre ella: se resuelve sola cuando el usuario confirma el correo. *(Opcional: mostrar una etiqueta "correo sin confirmar" leyendo `auth.users.email_confirmed_at` vía un RPC, para que el admin entienda por qué un usuario no avanza.)*
- **NO se toca** el flujo de invitación de **administradores** (`resendAdminInvite`, `admin-invite-link`): los admins se crean por invitación, no por este registro. Queda intacto.

## 13. Resumen para quien retome (TL;DR)
El admin **deja de aprobar cuentas**; solo **verifica/rechaza** perfiles (con los datos que ya llegan del registro) y **suspende/reactiva** (RF-65). La cuenta se **activa sola** al confirmar el correo (trigger). El registro **deja de loguear** y pide confirmar el correo (enlace+código). El empresario carga sus 4 campos y el egresado su `titulo_fwd` — **en el form si entra por contraseña (Camino A), o en `/onboarding` si entra por Google (Camino B)** (§14). **Antes de tocar código: confirmar con Samir (1) el trigger M1 y (2) "Confirm email" ON en Supabase** — sin (2) nada de esto funciona.

## 14. Camino OAuth (Google) — coexiste con el registro por contraseña
`/register` ofrece **dos métodos** y el usuario elige UNO; ninguno reemplaza al otro:
- **Camino A — correo + contraseña:** el form lleva todo (correo, contraseña, nombre, rol, campos). **No hay onboarding.** Es el flujo de §3 + §7.
- **Camino B — Google (OAuth):** Google entrega solo **correo + nombre**; NO pregunta rol ni `titulo_fwd`/4 campos. Por eso el usuario OAuth pasa por un **onboarding bloqueante**.

**Flujo del Camino B:**
1. Clic "Continuar con Google" → `/auth/callback` (ya existe). Supabase crea el `auth.user` con el **correo ya confirmado** (Google lo verificó) → el trigger M1 pone `estado_cuenta='activa'`. **No hay pantalla de código** (RF-02 lo cumple Google).
2. El usuario llega **sin rol** (`id_rol=NULL`, sin perfil). El **middleware lo manda a `/onboarding`** (ya lo hace: sin rol → onboarding) y **no lo deja pasar al panel** hasta completar. Si se sale y vuelve a loguear, **le reaparece** el onboarding.
3. En `/onboarding`: elige rol + carga los campos (egresado → `titulo_fwd`; empresario → 4 campos), reutilizando el componente de campos del form de registro. Al enviar → `crearPerfilUsuario` (service_role) → "en revisión".
4. Si **abandona** el onboarding: queda **huérfano** (fila en `usuarios` sin rol/perfil). Inofensivo: el middleware lo reenvía a `/onboarding` en cada login, no entra a ningún panel ni aparece en la cola del admin (no tiene perfil), y **no se verifica** hasta completar.

**Limpieza de huérfanos (DECIDIDO: sí).** Job `pg_cron` (gate Samir) que borra usuarios con `id_rol IS NULL` y `fecha_registro` de más de **X días** (p. ej. 7). Evita que se acumulen e inflen las métricas (RNF-16). Solo toca registros incompletos abandonados.

**Creación de perfil unificada (DECIDIDO).** Una sola función `crearPerfilUsuario(userId, rol, datos)` con **`service_role`**, llamada desde el Camino A (registro password, sin sesión) y el Camino B (onboarding OAuth). `assign_my_role` queda jubilado. El `service_role` es backend invisible — el usuario solo ve el form (A) o el onboarding (B).

**Diferencias clave A vs B:**
| | A — contraseña | B — Google/OAuth |
|---|---|---|
| Correo | a confirmar (código/enlace) | ya confirmado por Google |
| Pantalla de código | sí | no |
| Dónde se cargan los campos | en el form de registro | en `/onboarding` (bloqueante) |
| Onboarding | no pasa | obligatorio hasta completar |
| Crea perfil | `crearPerfilUsuario` (service_role) | `crearPerfilUsuario` (service_role) |
