# Pendientes de Notificaciones (RF-46 email · RF-47 in-app)

> Contexto autocontenido para retomar el trabajo de notificaciones. Estado al
> momento de pausar para el refactor de auth. **No dejar nada a la imaginación:**
> abajo está la arquitectura, lo hecho, lo que falta, el orden, el patrón paso a
> paso y los cuidados de `reglas.md`.

## 1. Arquitectura ya construida (NO reinventar)

- **Núcleo de escritura** `src/lib/notifications/create.ts`:
  - `crearNotificaciones(inputs[])` y `crearNotificacion(input)`.
  - Usa `service_role` (`createSupabaseAdminClient`): la tabla `notificaciones`
    **no tiene policy INSERT**, esa es la única vía (decisión P1.1 del equipo).
  - **Blindado:** captura cualquier excepción y devuelve `Result` (nunca lanza).
    Por eso los callers que SOLO usan el núcleo no necesitan `try/catch`, solo
    `if (!result.ok) logger.error(...)`.
  - Lógica pura en `src/lib/notifications/create-logic.ts`
    (`NotificacionInput`, `buildNotificacionRows`, `validateNotificacionInputs`
    con Zod, `MENSAJE_MAX_LEN = 255`). Exporta `TipoNotificacion`.
- **Render i18n-first** `src/lib/notifications/format.ts` (lógica pura, testeada):
  - `getNotificationTone(tipo)` → token FWD (`primary/accent/warning/magenta`).
  - `getNotificationTypeKey(tipo)` → clave i18n del badge (`types.<tipo>` o
    `types.generic`).
  - `resolveNotificationContent({tipo, mensaje, params})` → si el tipo está en
    `TIPOS_CON_PLANTILLA` y hay `params` (objeto con claves) → `{kind:'i18n',
    key:'content.<tipo>', values}`; si no → `{kind:'raw', text: mensaje}`.
    **`params` null o `{}` cae a raw** (protege el fallback de notificaciones
    viejas previas al i18n-first).
- **Campana única** `src/components/features/notifications/NotificationBell.tsx`
  (`'use client'`): sirve a egresado, empresario **y admin** (se montó en
  `Navbar.tsx` y `AdminShell.tsx`; el componente viejo del admin se eliminó).
  Lee con `getMisNotificaciones`/`getMisNotificacionesNoLeidasCount` (RLS, sesión
  del usuario), marca leída, polling 60s, count exacto.
- **Server actions de lectura** `src/lib/notifications/actions.ts`
  (`'use server'`, RLS): `getMisNotificaciones`, `getMisNotificacionesNoLeidasCount`,
  `marcarNotificacionLeida`, `marcarTodasMisNotificacionesLeidas`. Devuelve
  `params` en `NotificacionItem`.
- **i18n** `messages/es.json` + `en.json` bajo `Notifications`: `types.*` (badges)
  y `content.*` (cuerpos i18n-first).
- **Migración aplicada** (Samir, 2026-06-20): `notificaciones.params jsonb`.

## 2. Eventos YA implementados y commiteados (6 de 12 del enum)

| tipo_evento | productor | params |
|---|---|---|
| `proyecto_modificado` | `projects/edit-description.ts` | `{ titulo }` |
| `strike_recibido` | `admin/strike-actions.ts` (`addStrike`) | `{ cantidad, maximo }` |
| `cuenta_suspendida` | `admin/strike-actions.ts` (`addStrike`, al llegar al límite) | `{ cantidad }` |
| `participacion_contratada` | `projects/project-detail.ts` (`adjudicarParticipacion` → `notificarAdjudicacion`) | `{ titulo }` |
| `participacion_no_seleccionada` | idem adjudicación | `{ titulo }` |
| `postulacion_recibida` | `applications/actions.ts` (`postularse` → `notificarPostulacion`) | `{ titulo }` |

Lógica pura testeada de cada uno en `*-notificacion-logic.ts`
(`strike-notificacion-logic.ts`, `adjudicacion-notificacion-logic.ts`,
`postulacion-notificacion-logic.ts`) + tests en `tests/unit/`.

## 3. Eventos PENDIENTES (orden sugerido)

1. **`cuenta_verificada`** — BLOQUEADO por el refactor de auth (ver §6). El
   evento "el admin verifica la cuenta" se está rediseñando; reanudar SOLO
   cuando el flujo de verificación/aprobación esté cerrado. Decisiones ya
   tomadas antes de pausar (revalidar contra el nuevo flujo):
   - Copy genérico (mismo para egresado y empresa, es un tipo **sin variables**):
     ES "¡Tu cuenta fue verificada! Ya tienes acceso completo a la plataforma." /
     EN "Your account has been verified! You now have full access to the platform."
   - `url_destino`: egresado → `/egresado/projects`, empresa → `/empresario`.
   - Solo se notifica al **verificar** (el enum no tiene tipo de rechazo).
   - **Reto técnico:** es la primera notificación **sin variables**. Hoy
     `params: {}` → raw. Para que sea bilingüe sin romper el fallback de las
     otras, agregar un set `TIPOS_SIN_VARIABLES` en `format.ts`: esos tipos usan
     plantilla i18n aunque no tengan params; los tipos con variables siguen igual.
     Cubrir con test.
   - Productores: `admin/actions.ts` `setGraduateVerification` (egresado: el
     `userId` ya es `id_usuario`) y `setCompanyVerification` (empresa: extender el
     `.select('id_empresario')` a `'id_empresario, id_usuario'` para el
     destinatario sin query extra). Notificar solo cuando `estado === 'verificado'`.
   - **Email (RF-46)** decidido aparte: plantilla nueva simple (aviso + link al
     `/login`, sin magic link). NOTA: ya existe `email/templates/account-approved.ts`
     que se usa en `auth/actions.ts approveUser` para OTRO evento (aprobación de
     cuenta con magic link). No confundirlos.
2. **`evaluacion_recibida`** — cuando el empresario evalúa al estudiante al cierre
   (RF-49). Buscar el flujo de evaluación (`company/...` o `evaluaciones`).
3. **`entregable_aprobado` / `entregable_rechazado`** — al revisar un entregable
   (RF-44). Flujo en `deliverables/actions.ts`.
4. **`mensaje_nuevo`** — requiere el sistema de mensajería (RF-45). Cablear cuando
   ese flujo exista.
5. **`plazo_vence`** — requiere un **scheduler** (`pg_cron`/Edge) que NO existe
   (RF-33). **Gate Samir/Barry**; no es libre. Va al final.

## 4. Patrón paso a paso para agregar un generador (seguir EXACTO)

1. **CREAR** `src/lib/<area>/<x>-notificacion-logic.ts` con
   `build<X>Notificacion(...)` **puro** → `NotificacionInput` (o `[]`). Importa
   `NotificacionInput`/`TipoNotificacion` de `@/lib/notifications/create-logic`.
2. **CREAR** `tests/unit/<x>-notificacion-logic.test.ts` (vitest).
3. **EDITAR** el server action del evento: tras el éxito del evento, llamar a
   `crearNotificacion(build...)`. **Best-effort:**
   - Si SOLO se llama al núcleo → `if (!result.ok) logger.error(...)`, **sin**
     `try/catch` (el núcleo está blindado).
   - Si la función hace **lecturas propias** (queries para resolver audiencia o
     título) → envolver en `try/catch` autoblindado con **log + decisión** (§8 de
     `reglas.md`: el `try/catch` con log explícito NO viola la regla; el prohibido
     es el que silencia). Ver `notificarAdjudicacion`/`notificarPostulacion`.
4. **EDITAR** `format.ts` → agregar el tipo a `TIPOS_CON_PLANTILLA` (y a
   `TIPOS_SIN_VARIABLES` si no tiene variables).
5. **EDITAR** `messages/es.json` + `en.json` → `content.<tipo>` en ambos.
6. Verificar y commitear (ver §5).

## 5. Cuidados para NO romper reglas.md ni los tests

- **i18n:** cero strings hardcodeados de UI; todo a `es.json` + `en.json`. El
  `mensaje` raw (español) que se guarda en la fila es solo fallback/columna
  NOT NULL; el texto mostrado sale de la plantilla `content.<tipo>`.
- **Sin emojis** en código ni copy. **Sin hex**: tokens FWD. **Sin `any`**.
- **Locale en server code:** importar `DEFAULT_LOCALE` de `@/i18n/config`, NUNCA
  `routing` de `@/i18n/routing` (arrastra `next/navigation` → rompe vitest).
- **`url_destino`:** egresado `/${DEFAULT_LOCALE}/egresado/projects/{id}`,
  empresario `/${DEFAULT_LOCALE}/empresario/proyecto/{id}` (ojo: `proyecto`
  singular en empresario, `projects` en egresado — así es el repo).
- **Server actions** devuelven `Result<T,E>`; Zod en la frontera (el núcleo ya
  valida). `SUPABASE_SERVICE_ROLE_KEY` solo en servidor.
- **Tests:** correr la suite **COMPLETA** (`npx vitest run`), nunca filtrada por
  nombre — un import nuevo en `lib/` compartido puede romper la carga de tests de
  otros módulos y el filtro no los incluye. En tests de server actions que llamen
  a un productor, **mockear `@/lib/supabase/admin`** (patrón en
  `strike-actions.test.ts`, `applications/actions.test.ts`) para que no intente
  una conexión real (si no, el test hace timeout).
- **Verificación antes de commit:** `npm run build` (compila + typecheck de
  `src/`), `npm run lint` (0 errores), `npx vitest run` (todo verde).
- **Commits:** `git add` selectivo archivo por archivo (NUNCA `git add .`: hay
  varias terminales trabajando en paralelo). Conventional commit, descripción en
  español, sin nombrar a la IA como autor.

## 6. Dependencia con el refactor de auth (por qué se pausó `cuenta_verificada`)

El evento "cuenta verificada" depende de cómo quede el flujo de
**verificación/aprobación** que se está rediseñando: unificar `approveUser`
(estado_cuenta) con `verificarEgresado`/`verificarEmpresa` (estado_verificacion),
mover 4 campos del onboarding al registro, registro sin auto-login (RF-02), y
posiblemente un trigger "verificado → cuenta activa". Hasta que ese flujo esté
cerrado, NO cablear `cuenta_verificada` (el productor y el momento cambian).
