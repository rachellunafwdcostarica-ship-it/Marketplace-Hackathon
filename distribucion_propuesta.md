**FWD Marketplace — Plataforma de Conexión de Talento Tecnológico**
**7 personas · división por `components/` (3) y `app/` (4) · v6 · 2026-06-09**
> **Actualización 2026-06-09:** se agregó la tarea de UI del ranking de estudiantes (RF-52) al backlog de Rachel (`C2`), espejo del backend que ya tiene Fressia (`A2`). Está marcada **[NUEVA · RF-52]** para diferenciarla del v5 original.
> **Rebalanceo 2026-06-09 (v6):** se equilibró la carga sin reescribir tareas, solo reasignando dueños. **Frontend:** todo el clúster admin (`UserTable`/`StatsCards`/`ModerationQueue`, UI de strikes/suspensión, Reportes+catálogos, validación egresados/moderación) pasó de Ronny (`C3`) a Sol (`C1`) — Ronny queda con empresa+auth, Sol suma admin. **Backend:** Foto de perfil (RF-06) pasó de Samir (`A1`) a Fressia (`A2`, su dominio de perfil); la tarjeta redundante de moderación+comentarios de Errol (`A4`) se consolidó en el hilo de `comentarios_entregable` que ya tenía Santiago (`A3`). No se repartió schema/migraciones ni rutas `(admin)`/`(company)` entre dueños, para no reintroducir conflictos en git.
> **Tarjetas v6.1 (2026-06-10):** el §8 se reescribió en formato anclado al SRS (requerimiento + criterio de aceptación **literales** + checklist por tarjeta) y se agregaron **6 tarjetas para huecos de cobertura del SRS**: RF-05 edición de perfil (UI → Rachel), RF-45 mensajería (UI del chat → Rachel), RF-53 réplica (UI → Rachel), RF-66 eliminar proyecto (UI → Sol), RNF-36 aceptación de términos (→ Ronny, en `RegisterForm`), RNF-37 eliminación de datos a solicitud (→ Samir). **Conteo final: Samir 17 · Errol 16 · Rachel 14 · Sol 13 · Fressia 13 · Santiago 11 · Ronny 8 (92 tarjetas).** Para aligerar a Samir (v6.2), Notificaciones backend (#20) pasó a Santiago y los seeds a Fressia; para aligerar a Errol, la gestión de catálogos admin (RF-68, su #54) pasó a Fressia (#12) y la cobertura de pruebas (RNF-25, `[S]`) se le asignó como su nueva #13. Además, Moderación de reportes (#42, era Could) se difirió a **Fase 2** (conserva su `[C]` real del SRS), así que Errol queda con **15 tarjetas activas** (16 con la diferida) — y su #54 quedó más liviano (solo reportes). Las tarjetas de fase futura conservan su **prioridad real del SRS** (M/S/C) y se marcan **Fase 2** — porque el SRS no marca nada como «Won't now». La integración base egresados FWD (RNF-30) se separó a una tarjeta `[M]` por ser prerrequisito de RF-64. Pendiente de forma consciente: el agente conversacional (RF-54..60/61, **Must** en el SRS) queda en Fase 2 — es un diferimiento del equipo, no del cliente. Could omitidos: RNF-08 antivirus, RNF-14 plan de desastres, RNF-39 retención.
**Stack confirmado del equipo:** Next.js 15 (App Router, Server Components por defecto) · React 19 · Node 20 LTS · TypeScript `strict` · Supabase (Postgres + Auth + RLS + Storage) · Tailwind v4 (`@theme inline`) · shadcn/ui · next-intl (es/en) · Zod · react-hook-form · Vitest · deploy en Vercel.
Es un **monolito Next.js**: no hay frontend/backend separados ni API REST con NestJS/Prisma. La división sigue siendo por `components/` (3 personas) y `app/` + `lib/` + `supabase/` (4 personas), porque esa frontera evita choques en git.
Convenciones vigentes: la guía de git y commits sigue siendo `instalacion.md` (PR hacia `dev`, `npm ci` vs `npm install`, hooks Husky, checklist pre-PR). Desde la última actualización de `reglas.md`, los comentarios explicativos están permitidos; solo se prohíbe dejar código comentado y los TODO van con ticket en formato `// TODO(issue-N): …`.
***
## 1. Por qué esta división no choca en git
`src/components/**` y `src/app/**` + `src/lib/**` siguen siendo árboles de carpetas distintos. Si el equipo de `components` solo edita `components/` y el de `app` solo edita `app/` + `lib/` + `supabase/`, no pisan el mismo archivo y los conflictos de merge se reducen al mínimo.
El punto de contacto sigue siendo el `import`: una página importa un componente y le pasa datos por props, así que el contrato debe definirse antes de implementar.
La regla operativa es simple: **cada feature cruza equipos solo por contrato de props, nunca por edición compartida del mismo archivo**.
```text
EQUIPO COMPONENTS (3)          EQUIPO APP (4)
src/components/                src/app/[locale]/**
 ui/                          src/lib/**
 features/                    supabase/**
                              src/types/
                              middleware.ts
▲ exporta UI                 │ importa UI y le pasa datos
└──────── contrato de props ─┘
```

***
## 2. Archivos compartidos "calientes"
| Archivo | Dueño | Regla para los demás |
|---|---|---|
| `messages/es.json` + `en.json` | todos | Namespacing: cada feature edita solo su bloque (`auth`, `marketplace`, `applications`, `company`, `admin`, `brand`, `common`). Claves en orden alfabético. |
| `src/app/globals.css` | **Sol** | Se congela tras el setup. Nadie más lo edita. |
| `package.json` / lock | **Samir** | Avisar antes de instalar; deps fuera del brief van justificadas. `npm install` solo si cambian deps a propósito; el resto corre `npm ci` tras un pull que cambie el lock. |
| `src/components/ui/` | **Sol** | Los demás piden el primitivo, no lo crean por su cuenta. |
| `src/types/` | **Samir** | Tipos de feature van en la carpeta de la feature. |
| `app/[locale]/layout.tsx` · `middleware.ts` | **Samir** | Cada grupo de ruta usa su propio `layout.tsx` interno. |
***
## 3. Equipo COMPONENTS (3)

| Label | Persona | Rol | Carpetas que posee | Qué construye | RF (visual) |
|---|---|---|---|---|---|
| `C1` | **Sol** | Design System + Layout base + Brand + **Admin UI** | `components/ui/`, `features/brand/`, `features/layout/`, `features/admin/` + `globals.css` | Primitivos shadcn, `PageTitle`, `InsightSection`, `FwdGeoBackdrop`, navbar, footer, shell base + `UserTable`, `ModerationQueue`, `StatsCards` | RNF-17/18/20/21, RF-47, RF-63..69 |
| `C2` | **Rachel** | Componentes Estudiante / Marketplace | `features/marketplace/`, `features/applications/` | `ProjectCard`, `ProjectFilters`, `ProjectDetail`, `SkillPicker`, `PortfolioCard`, `ApplyForm`, `ApplicationCard`, `StatusBadge` | RF-09..15, RF-19/26, RF-27..33 |
| `C3` | **Ronny** | Componentes Empresa / Auth | `features/companies/`, `features/auth/` | `LoginForm`, `RegisterForm`, `RoleSelector`, `CompanyForm`, `ProjectForm`, `CandidateCard`, `OfferReview`, evaluación/rating UI | RF-01..08, RF-16..18, RF-34..39, RF-49/50 |

**Ajuste acordado (v6):** Sol mantiene la base visual y primitivos, y suma la **UI de admin** (`features/admin/`) que antes tenía Ronny — la base visual ya está casi cerrada (tokens, primitivos, brand y shells listos), así que tiene capacidad para features.
**Ajuste acordado:** Rachel absorbe tareas visuales que antes estaban en Sol para aligerarla, además de quedarse con marketplace/applications.
**Ajuste acordado (v6):** Ronny queda enfocado en **empresa + auth** (sin admin), para reducir su carga y mantener una frontera de carpetas limpia frente a Sol (Sol = `features/admin/`, Ronny = `features/companies/` + `features/auth/`).
***
## 4. Equipo APP (4)

| Label | Persona | Rol | Carpetas que posee | Qué construye | Tablas / RF (lógica-datos) |
|---|---|---|---|---|---|
| `A1` | **Samir** | Infra + Data + Auth | `supabase/migrations/`, `supabase/seeds/`, `lib/supabase/`, `lib/auth/`, `src/types/`, `(public)/`, `middleware.ts` | Schema, RLS, sesiones, login/registro/verificación, RBAC, seeds | `usuarios`, `roles`, `empresarios`, `estudiantes`, `proyectos`, `participaciones`, `categorias_proyecto`, `areas_negocio`, `tecnologias`, `notificaciones`, `auditoria` |
| `A2` | **Fressia** | Marketplace lectura + perfil/portafolio + reputación | `(app)/marketplace/`, `lib/marketplace/` | Listado, detalle, lectura, filtros, perfil, portafolio, reputación | `habilidades_tecnicas`, `estudiantes.url_portafolio`, `proyecto_tecnologias`, `proyectos.id_categoria`, `estudiantes.reputacion` |
| `A3` | **Santiago** | Postulaciones / ofertas / entregables | `(app)/applications/`, `lib/applications/` | Postular, retirar, estado, entregables, cierre por vencimiento | `participaciones`, `entregables`, `mensajes` |
| `A4` | **Errol** | Empresa + Admin | `(company)/projects/`, `(company)/candidates/`, `(admin)/dashboard,companies,moderation/` + su `lib/` | Publicación, edición, evaluación, adjudicación, panel admin, moderación | `empresarios`, `proyectos`, `participaciones`, `contrataciones`, `evaluaciones`, `usuarios.nivel_admin`, `reportes_moderacion`, `tecnologias`, `categorias_proyecto`, `habilidades_tecnicas` |

**Ajuste acordado:** Samir conserva la base técnica, pero ya no carga toda la complejidad de negocio.
**Ajuste acordado (v6):** Foto de perfil (RF-06) pasa de Samir a **Fressia**, que ya es dueña de perfil/portafolio; así Samir baja a 16 sin repartir schema ni migraciones.
**Ajuste acordado:** Santiago absorbe parte de la lógica técnica de su dominio para aliviar a Samir, sin tocar schema, RLS ni auth base; su hilo de `comentarios_entregable` ahora cubre también el lado empresa (consolida la tarjeta redundante que tenía Errol, A4-17).
**Ajuste acordado:** Fressia y Santiago deben apoyarse en seeds y catálogos definidos temprano.

***

## 5. Contrato entre equipos

Antes de implementar una feature cruzada, los dos dueños acuerdan la interfaz de props y la pegan en la tarjeta de Trello.
Components construye la UI con datos mockeados y sin tocar `app/` ni `lib/` del otro equipo.
App scaffoldea la página real y conecta Supabase, server actions y datos reales.
La integración ocurre por PR pequeño y revisión, no por edición compartida del mismo archivo.

***

## 6. Organización en Trello

**Columnas:** Backlog (2.0) · To Do (MVP) · In Progress · Review/PR · Done
**Labels:** una por persona (`C1` … `A4`) · MVP / 2.0 · bloqueante · por dominio (`auth`, `marketplace`, `applications`, `company`, `admin`).

### Formato de cada tarjeta
• **RF** que cubre · **Prioridad** (M/S/C).
• **Carpetas que toca**.
• **Tabla(s) afectadas**.
• **Namespace i18n** que va a editar.
• **Contrato de props** si cruza equipos.
• **DoD:** typecheck + lint + tests `lib/` + i18n es/en + responsive 375px + commit limpio.
### Reglas de orden
• Una tarjeta = una rama = un conjunto de carpetas de un solo dueño.
• Si dos tarjetas activas comparten carpeta, se hacen en serie.
• PRs pequeños y frecuentes hacia `dev`, nunca push directo.
***

## 7. Prioridad y fases

### MVP ahora
RF-01..05, 07, 09..11, 14, 16..22, 24..29, 31, 32, 34..37, 39, 63..66.

### Should
RF-06, 12, 13, 23, 30, 33, 42, 44, 48, 67, 68.

### Could
RF-08, 15, 53, 64 visual, 69.

### Fase 2 — diferido por el equipo (post-MVP)
> **Importante:** el SRS **no marca ningún requisito como «Won't now»** — define la categoría W en §1.4 pero no la usa en ninguno; los 69 RF y 39 RNF están todos en **M/S/C** (todo en alcance para el cliente). Por eso aquí **no usamos `[W]` como prioridad**: cada tarjeta conserva su prioridad real del SRS y se marca **Fase 2** para indicar que el equipo la difiere a post-MVP. Aviso: el agente conversacional (RF-54..60, RF-61) está en Fase 2 pero el SRS lo marca **Must** — diferimiento consciente y riesgo de cara al Demo Day.
Agente IA y matching (RF-54..62), entregables completos, evaluación/reputación/rankings extendidos, mensajería y notificaciones completas, CV PDF, reportes avanzados.
***
## 8. Backlog actualizado por persona

### Samir — `A1` · Infra, Data, Auth, Seguridad · 17 tarjetas

#### 1. Schema + migraciones iniciales — `#9` · `[M]`
- **Requerimiento (SRS):** habilita RF-01..08 (cuentas, perfil, sesiones). El modelo del SRS §4 es orientativo.
- **Listo cuando (equipo):** existen `usuarios`, `roles`, `empresarios`, `estudiantes`, `proyectos`, `participaciones`, `categorias_proyecto`, `areas_negocio`, `tecnologias`, `notificaciones`, `auditoria` y la migración corre limpia.
- **En cristiano:** la base de datos de todo; sin esto, APP no avanza. — **tu parte:** schema + tipos.
- **Toca:** `supabase/migrations`, `src/types` · **Check:** [ ] tablas + FKs · [ ] migración corre sin error · [ ] tipos en `src/types`

#### 2. RLS + políticas + clientes + middleware — `#10` · `[M]`
- **Requerimiento (SRS RNF-04):** "Control de acceso basado en roles (RBAC)." · **(RNF-06):** "Validación y sanitización de entradas para prevenir inyección y XSS."
- **Listo cuando:** toda tabla con RLS + políticas por rol; clientes server/browser; middleware adjunta la sesión.
- **En cristiano:** que cada quien solo vea/toque lo suyo y la sesión viaje en cada request. — **tu parte:** lógica/infra.
- **Toca:** `supabase/migrations`, `lib/supabase`, `middleware.ts` · **Check:** [ ] RLS en todas · [ ] políticas por rol · [ ] middleware de sesión

#### 3. Auth: registro, verificación, login, logout — `#11` · `[M]`
- **Requerimiento (SRS RF-01):** "Registro de usuarios con uno de tres roles… seleccionado durante el alta." · **RF-02** verificación · **RF-03** login · **RF-07** logout/sesiones.
- **Listo cuando:** crea cuenta con permisos y envía verificación (RF-01); cuenta «pendiente» hasta confirmar enlace que **expira en 24 h** (RF-02); tras **5 intentos fallidos** se bloquea temporal (RF-03); el token se invalida al salir (RF-07).
- **En cristiano:** crear cuenta con rol, confirmar por correo, entrar y salir. — **tu parte:** lógica (UI: Ronny #70). **[cruza: Ronny C3]**
- **Toca:** `lib/auth`, `(public)` · **Check:** [ ] registro+verificación · [ ] enlace expira 24 h · [ ] bloqueo tras 5 intentos · [ ] logout invalida token

#### 4. Recuperación de contraseña — `#12` · `[M]`
- **Requerimiento (SRS RF-04):** "Recuperación de contraseña vía correo electrónico."
- **Listo cuando:** "El enlace de restablecimiento es de un solo uso y expira en 1 hora."
- **En cristiano:** "olvidé mi contraseña", seguro. — **tu parte:** lógica (UI: Ronny #70). **[cruza: Ronny C3]**
- **Toca:** `lib/auth`, `(public)` · **Check:** [ ] enlace de un solo uso · [ ] expira en 1 h · [ ] fija nueva contraseña

#### 5. RBAC: helpers + guards — `#15` · `[M]`
- **Requerimiento (SRS RNF-04):** "Control de acceso basado en roles (RBAC)."
- **Listo cuando:** todo server action sensible pasa por un guard de rol.
- **En cristiano:** la pieza que bloquea acciones según el rol, reutilizable. — **tu parte:** lógica.
- **Toca:** `lib/auth` · **Check:** [ ] helpers de rol · [ ] guards en server actions · [ ] tests en `lib/`

#### 6. Edición de perfil base + Storage — `#21` · `[M]`
- **Requerimiento (SRS RF-05):** "Edición de la información del perfil."
- **Listo cuando:** "Los cambios se persisten y se reflejan de inmediato."
- **En cristiano:** que el usuario edite sus datos y exista el Storage de archivos. — **tu parte:** lógica + bucket (UI del formulario: Rachel C2, tarjeta 12 nueva). **[cruza: Rachel C2]**
- **Nota:** la tarjeta decía "RF-06"; edición de perfil es **RF-05** (RF-06 foto pasó a Fressia).
- **Toca:** `lib/auth`, `supabase` · **Check:** [ ] persiste cambios · [ ] se reflejan de inmediato · [ ] bucket de Storage listo

#### 7. Auditoría + rate limiting — `#16` · `[S]`
- **Requerimiento (SRS RNF-05):** "Registro de eventos de auditoría para acciones sensibles." · **RNF-07:** "Límite de tasa (rate limiting) en los endpoints críticos."
- **Listo cuando:** acciones sensibles quedan en `auditoria`; endpoints críticos con rate limit.
- **En cristiano:** dejar rastro y frenar abuso. — **tu parte:** lógica.
- **Toca:** `lib/`, `supabase` · **Check:** [ ] log en `auditoria` · [ ] rate limit en endpoints críticos

#### 8. Respaldos / retención — `#17` · `[S]`
- **Requerimiento (SRS RNF-13):** "Respaldos automáticos diarios con retención definida."
- **Listo cuando:** respaldos automáticos diarios + política de retención definida.
- **En cristiano:** que los datos estén respaldados. — **tu parte:** infra. *(los seeds de catálogos pasaron a Fressia A2 #1)*
- **Toca:** `supabase` · **Check:** [ ] respaldos diarios · [ ] retención definida

#### 9. 2FA opcional — `#97` · `[C]`
- **Requerimiento (SRS RF-08):** "Autenticación de dos factores (2FA) opcional."
- **Listo cuando:** "El usuario puede activar 2FA por correo o aplicación autenticadora."
- **En cristiano:** segundo factor para quien lo quiera. — **tu parte:** lógica.
- **Toca:** `lib/auth` · **Check:** [ ] 2FA por correo · [ ] 2FA por app · [ ] activable/desactivable

#### 10. Integración base de egresados FWD — `#19` · `[M]` · *(split de #19 — parte MVP)*
- **Requerimiento (SRS RNF-30):** "Integración con la base de datos de egresados de FWD Costa Rica para la validación de estudiantes." — **prerrequisito de RF-64** (Must, Errol #52).
- **Listo cuando:** existe el cotejo del título del estudiante contra la base de egresados FWD, disponible para el panel admin.
- **En cristiano:** la conexión que permite validar quién es egresado FWD; sin esto, RF-64 no funciona. — **tu parte:** integración. **[cruza: Errol A4]**
- **Toca:** `lib/` (integración egresados) · **Check:** [ ] conexión a base egresados · [ ] cotejo de título · [ ] expuesto para validación admin

#### 11. Esquema Flujo B en `participaciones` — `#79` · `[M]` · 5.1
- **Requerimiento (SRS):** soporta RF-32 (estados de la postulación).
- **Listo cuando:** estados `postulada`/`en_revision`/`candidata`/`contratada`, `participaciones_activas` denormalizado + trigger, CHECK de cupo ≤3.
- **En cristiano:** modelar los estados y el tope de 3 activas. — **tu parte:** schema.
- **Toca:** `supabase/migrations`, `src/types` · **Check:** [ ] ENUM de estados · [ ] contador + trigger · [ ] CHECK cupo ≤3

#### 12. Esquema strikes / suspensión — `#80` · `[M]` · 5.2
- **Requerimiento (SRS):** soporta RF-65 (suspender/reactivar con motivo).
- **Listo cuando:** tabla `strikes`, `usuarios.cantidad_strikes` + trigger, ENUM `estado_cuenta` con `suspendida`/`suspendida_severa`.
- **En cristiano:** tablas para sancionar con motivo y niveles. — **tu parte:** schema.
- **Toca:** `supabase/migrations`, `src/types` · **Check:** [ ] `strikes` (motivo/actor/revocación) · [ ] contador + trigger · [ ] ENUM dos niveles

#### 13. Esquema ubicación — `#81` · `[M]` · 5.3
- **Requerimiento (SRS):** complementa RF-20 (contexto del proyecto).
- **Listo cuando:** sede en `empresarios`, modalidad+ubicación en `proyectos` con CHECK (obligatoria si no es remoto), `estudiantes.modalidad_preferida`.
- **En cristiano:** guardar dónde está la empresa y la modalidad del proyecto. — **tu parte:** schema.
- **Toca:** `supabase/migrations`, `src/types` · **Check:** [ ] sede empresario · [ ] modalidad+ubicación con CHECK · [ ] `modalidad_preferida`

#### 14. Esquema trazabilidad + consentimientos — `#82` · `[M]` · 5.4
- **Requerimiento (SRS RNF-38):** "Consentimiento explícito para el procesamiento de datos por IA y para el cotejo con la base de egresados FWD." (habilita RF-69, RF-44)
- **Listo cuando:** tabla `reportes_moderacion`, tabla `comentarios_entregable` (hilo), doble timestamp de consentimientos.
- **En cristiano:** tablas de moderación/comentarios + consentimiento legal. — **tu parte:** schema.
- **Toca:** `supabase/migrations`, `src/types` · **Check:** [ ] `reportes_moderacion` · [ ] `comentarios_entregable` · [ ] timestamps de consentimiento

#### 15. Enforcement de `estado_cuenta` en login — `#83` · `[M]` · 5.2
- **Requerimiento (SRS RF-65):** "Suspender o reactivar cuentas."
- **Listo cuando:** "La cuenta suspendida no puede iniciar sesión…" (la decisión de suspender la toma Errol).
- **En cristiano:** que una cuenta suspendida no pueda entrar. — **tu parte:** lógica. **[cruza: Errol A4]**
- **Toca:** `lib/auth`, `middleware.ts` · **Check:** [ ] login bloquea cuenta suspendida · [ ] mensaje claro

#### 16. Eliminación de datos personales a solicitud — *NUEVA (hueco RNF-37)* · `[M]`
- **Requerimiento (SRS RNF-37):** "Eliminación de datos personales bajo solicitud del usuario."
- **Listo cuando:** existe un flujo que borra/anonimiza los datos del usuario que lo solicita, respetando integridad referencial; queda registrado en `auditoria`.
- **En cristiano:** el "derecho al olvido". — **tu parte:** lógica + políticas. **Crear tarjeta nueva en Trello (lista Samir).**
- **Toca:** `lib/auth`, `supabase` (RLS/migración) · **Check:** [ ] flujo de solicitud · [ ] borrado/anonimización · [ ] respeta FKs · [ ] queda en `auditoria`

#### 17. Capa de abstracción de IA + logging — *split de #19* · `[M]` · **Fase 2**
- **Requerimiento (SRS RNF-33):** "Modelos de IA reemplazables sin afectar el resto (capa de abstracción)." · **RNF-32:** "Registro de las solicitudes procesadas por IA." · **RNF-34** (S): "Mecanismo de respaldo (fallback) ante fallo o indisponibilidad del proveedor de IA."
- **En cristiano:** la base para enchufar el agente IA (RF-54..62); el SRS lo marca **Must**, pero el equipo lo difiere a Fase 2. — **tu parte:** lógica. **Crear tarjeta nueva en Trello (split de #19, lista Samir).**
- **Toca:** `lib/ai`, `lib/` · **Check:** [ ] capa de abstracción reemplazable · [ ] logging de solicitudes IA · [ ] fallback ante fallo del proveedor (RNF-34)

***

### Fressia — `A2` · Marketplace (lectura), Perfil/Portafolio, Reputación · 13 tarjetas

#### 1. Catálogos: seeds + datos + lectura — `#22` · `[M]`
- **Requerimiento (SRS RF-22):** "Indicar tecnologías requeridas." → *listo cuando:* "Selección desde el catálogo de tecnologías." · **RF-20** áreas de negocio.
- **En cristiano:** las listas base que todos los formularios consumen — incluye **cargar los seeds** de catálogos. — **tu parte:** seeds + lógica/lectura. *(seeds movidos de Samir A1 #17 para aligerarlo)*
- **Toca:** `lib/marketplace`, `supabase/seeds` · **Check:** [ ] seeds de `tecnologias`/`categorias`/`areas` cargados · [ ] lectura de catálogos

#### 2. Perfil / Portafolio estudiante — `#23` · `[M]`
- **Requerimiento (SRS RF-09):** "Registro de habilidades técnicas con nivel de dominio." → "catálogo con nivel básico, intermedio o avanzado." · **RF-10** portafolio (visible público o solo empresas) · **RF-11** proyectos (título, descripción, tecnologías, fecha) · **RF-14** historial finalizados con calificación.
- **En cristiano:** el perfil del estudiante con habilidades, proyectos e historial. — **tu parte:** lógica/datos (UI: Rachel #65). **[cruza: Rachel C2]**
- **Toca:** `lib/marketplace`/`lib/profile`, `(app)` · **Check:** [ ] habilidades con nivel · [ ] portafolio con visibilidad · [ ] proyectos con sus 4 campos · [ ] historial con calificación

#### 3. Listado de proyectos + detalle — `#24` · `[M]`
- **Requerimiento (SRS RF-19, lectura):** publicar/mostrar proyecto con título, descripción y categoría. · **RF-25:** "Cambiar el estado del proyecto…" → "el estado… restringe las acciones según corresponda."
- **En cristiano:** ver la lista y el detalle de proyectos con su estado. — **tu parte:** lógica/datos (UI: Rachel #62/#64). **[cruza: Rachel C2]**
- **Toca:** `(app)/marketplace`, `lib/marketplace` · **Check:** [ ] listado · [ ] detalle · [ ] estado visible

#### 4. Búsqueda y filtrado — `#26` · `[M]`
- **Requerimiento (SRS RF-26):** "Búsqueda y filtrado de proyectos por tecnología, área de negocio, fecha y categoría." → *listo cuando:* "Los resultados se filtran y devuelven en **menos de 1 segundo**." (RNF-11)
- **En cristiano:** encontrar proyectos rápido. — **tu parte:** lógica/datos (UI: Rachel #63). **[cruza: Rachel C2]**
- **Toca:** `lib/marketplace`, `(app)/marketplace` · **Check:** [ ] filtra por los 4 criterios · [ ] responde <1 s

#### 5. Validación de links Git y demo — `#28` · `[S]`
- **Requerimiento (SRS RF-12):** "Adjuntar enlaces a repositorios Git." → "valida que la URL sea un repositorio accesible." · **RF-13:** demo en vivo → "Valida el formato de la URL."
- **En cristiano:** comprobar que los enlaces sirven antes de guardarlos. — **tu parte:** lógica.
- **Toca:** `lib/marketplace`/`lib/profile` · **Check:** [ ] valida repo Git accesible · [ ] valida formato de demo

#### 6. Cálculo de reputación acumulada — `#29` · `[M]`
- **Requerimiento (SRS RF-51):** "Calcular la reputación acumulada del estudiante." → *listo cuando:* "Promedio ponderado de calificaciones, visible en el perfil."
- **En cristiano:** la nota acumulada que se ve en el perfil. — **tu parte:** lógica/datos (se alimenta de la evaluación de Errol #49).
- **Toca:** `lib/marketplace`, `estudiantes.reputacion` · **Check:** [ ] promedio ponderado · [ ] visible en perfil

#### 7. Foto de perfil — `#18` · `[S]` · *(movida de Samir A1)*
- **Requerimiento (SRS RF-06):** "Carga de fotografía de perfil." → *listo cuando:* "Acepta JPG/PNG de hasta 5 MB; valida formato y tamaño."
- **En cristiano:** que el estudiante suba su foto, validada. — **tu parte:** lógica/datos; reusa el bucket de Samir.
- **Toca:** `lib/marketplace`/`lib/profile`, `(app)`, `usuarios.foto_perfil` · **Check:** [ ] acepta JPG/PNG · [ ] rechaza >5 MB · [ ] persiste la URL

#### 8. Rankings de estudiantes (backend) — `#30` · `[S]`
- **Requerimiento (SRS RF-52):** "Generar rankings de estudiantes." → *listo cuando:* "Ranking por reputación, filtrable por tecnología o categoría."
- **En cristiano:** la lógica del ranking que Rachel muestra. — **tu parte:** lógica/datos (UI: Rachel #99). **[cruza: Rachel C2]**
- **Toca:** `lib/marketplace` · **Check:** [ ] ordena por reputación · [ ] filtra por tecnología/categoría

#### 9. Exportar perfil a CV PDF — `#31` · `[C]`
- **Requerimiento (SRS RF-15):** "Exportación del perfil como CV en PDF." → *listo cuando:* "El usuario descarga un PDF con sus datos, habilidades y proyectos."
- **En cristiano:** botón para descargar el perfil como PDF. — **tu parte:** lógica.
- **Toca:** `lib/marketplace`/`lib/profile` · **Check:** [ ] genera PDF · [ ] incluye datos, habilidades y proyectos

#### 10. Recomendación de estudiantes + matching — `#33` · `[M]` · **Fase 2**
- **Requerimiento (SRS RF-61):** "Recomendar estudiantes verificados…" → "Lista priorizada con porcentaje de coincidencia, solo entre verificados." · **RF-62** score de afinidad explicable.
- **En cristiano:** sugerir candidatos con porcentaje de afinidad. — **tu parte:** lógica/IA.
- **Toca:** `lib/marketplace`, `lib/ai` · **Check:** [ ] solo verificados · [ ] porcentaje de coincidencia · [ ] score explicable

#### 11. Orden del listado por `modalidad_preferida` — `#84` · `[S]` · 5.3
- **Requerimiento (SRS):** complemento de RF-26 (ordenamiento).
- **En cristiano:** que los proyectos que coinciden con la modalidad preferida salgan primero (ordena, no filtra). — **tu parte:** lógica/datos.
- **Toca:** `lib/marketplace`, `(app)/marketplace` · **Check:** [ ] ordena por coincidencia de modalidad · [ ] no filtra (muestra todo)

#### 12. Gestión de catálogos admin — `#54` · `[S]` · *(movida de Errol A4)*
- **Requerimiento (SRS RF-68):** "Gestión de catálogos (tecnologías, categorías y habilidades)." → *listo cuando:* "El administrador agrega, edita o desactiva ítems del catálogo."
- **En cristiano:** alta/edición/baja de los catálogos que tú ya posees (consolida tu dominio de catálogos). — **tu parte:** lógica/datos (UI: Sol #76). **[cruza: Sol C1]**
- **Toca:** `lib/marketplace`, `tecnologias`/`categorias_proyecto`/`habilidades_tecnicas` · **Check:** [ ] agregar ítem · [ ] editar ítem · [ ] desactivar ítem

#### 13. Cobertura de pruebas automatizadas — *NUEVA (RNF-25)* · `[S]`
- **Requerimiento (SRS RNF-25):** "Cobertura de pruebas automatizadas mínima definida (p. ej. ≥ 70%)."
- **En cristiano:** que el proyecto tenga suficientes tests (meta ~70%) y que corran antes de cada PR; tú eres la dueña de la cobertura. — **tu parte:** configurar el umbral en Vitest + velar por que cada quien escriba los tests de su `lib/` (ya están en el DoD). **Crear tarjeta nueva en Trello (lista Fressia).**
- **Toca:** `tests/`, config de Vitest · **Check:** [ ] Vitest con umbral de cobertura · [ ] cobertura ≥70% en `lib/` · [ ] corre en el checklist pre-PR

***

### Santiago — `A3` · Ofertas/Postulaciones, Entregables, Mensajería · 11 tarjetas

#### 1. Enviar oferta — `#25` · `[M]`
- **Requerimiento (SRS RF-27):** "Enviar una oferta a un proyecto abierto dentro del plazo definido." → *listo cuando:* "No se permite ofertar dos veces al mismo proyecto ni en proyectos cuyo plazo ha vencido o que están cerrados."
- **En cristiano:** que el estudiante postule, sin trampas. — **tu parte:** lógica/datos (UI: Rachel #66). **[cruza: Rachel C2]**
- **Toca:** `lib/applications`, `(app)/applications` · **Check:** [ ] no duplica oferta · [ ] rechaza plazo vencido · [ ] rechaza proyecto cerrado

#### 2. Prototipo + propuesta en la oferta — `#34` · `[M]`
- **Requerimiento (SRS RF-28):** "Desarrollar y subir un prototipo como parte de la oferta." → "archivo y/o enlace que el empresario podrá revisar." · **RF-29:** propuesta de solución → "se muestra al empresario."
- **En cristiano:** que la oferta lleve prototipo y planteamiento. — **tu parte:** lógica/datos + Storage.
- **Toca:** `lib/applications`, Storage · **Check:** [ ] prototipo (archivo/enlace) · [ ] propuesta de solución · [ ] visibles para empresa

#### 3. Retirar oferta + consultar estado — `#36` · `[M]`
- **Requerimiento (SRS RF-31):** "Retirar una oferta enviada." → "Solo si… no ha sido adjudicada y el plazo no ha vencido." · **RF-32:** estado → "enviada, en revisión, adjudicada o no seleccionada."
- **En cristiano:** retirar la oferta y ver en qué va. — **tu parte:** lógica/datos.
- **Toca:** `lib/applications` · **Check:** [ ] retira solo si no adjudicada y plazo vigente · [ ] muestra los 4 estados

#### 4. Cierre automático al vencer el plazo — `#37` · `[M]`
- **Requerimiento (SRS RF-35):** "Cierre automático de la recepción de ofertas al vencer el plazo." → "Al cumplirse los días definidos (5 a 15), el proyecto deja de aceptar nuevas ofertas."
- **En cristiano:** que el proyecto deje de aceptar ofertas solo al cumplirse el plazo. — **tu parte:** job/edge function programada.
- **Toca:** `lib/applications`, `supabase` (edge function) · **Check:** [ ] cierra al vencer · [ ] no acepta ofertas tras cierre

#### 5. Adjuntar propuesta técnica + aviso de vencimiento — `#38` · `[S]`
- **Requerimiento (SRS RF-30):** "Adjuntar propuesta técnica y documentación complementaria." → "Acepta texto y archivos (PDF u otros) hasta un límite definido." · **RF-33:** aviso → "avisa antes de que cierre la ventana de ofertas."
- **En cristiano:** adjuntar documentos y avisar antes del cierre. — **tu parte:** lógica.
- **Toca:** `lib/applications` · **Check:** [ ] adjunta texto/archivos con límite · [ ] aviso de proximidad de vencimiento

#### 6. Entregables parciales y final — `#39` · `[M]`
- **Requerimiento (SRS RF-40):** "Subir entregables parciales (hitos)." → "Asociados a un proyecto adjudicado; registra fecha y autor." · **RF-41:** final → "Marca el proyecto como listo para revisión."
- **En cristiano:** subir avances y el entregable final. — **tu parte:** lógica/datos.
- **Toca:** `lib/applications`, `entregables` · **Check:** [ ] parcial con fecha y autor · [ ] final marca listo para revisión

#### 7. Versionado de entregables + aprobar/cambios — `#40` · `[S]`
- **Requerimiento (SRS RF-42):** "Versionado de entregables." → "conserva las versiones previas con su historial." · **RF-44:** aprobar → "aprueba o devuelve con comentarios; queda registrado."
- **En cristiano:** historial de versiones + aprobar o pedir cambios. — **tu parte:** lógica/datos.
- **Toca:** `lib/applications`, `entregables` · **Check:** [ ] conserva versiones previas · [ ] aprobar/devolver con comentario registrado

#### 8. Mensajería interna por proyecto (lógica) — `#41` · `[M]`
- **Requerimiento (SRS RF-45):** "Mensajería interna entre estudiante y empresario." → *listo cuando:* "Hilo de conversación por proyecto; no editable tras enviar."
- **En cristiano:** el chat por proyecto. — **tu parte:** lógica/datos (UI del chat: Rachel — ver C2 nueva). **[cruza: Rachel C2]**
- **Toca:** `lib/applications`, `mensajes` · **Check:** [ ] hilo por proyecto · [ ] no editable tras enviar

#### 9. Flujo B en `lib/applications` — `#35` · `[M]` · 5.1
- **Requerimiento (SRS):** soporta RF-32 (estados de la postulación).
- **En cristiano:** postular con carta+portafolio sin prototipo; el prototipo solo si pasas a candidata. — **tu parte:** lógica.
- **Listo cuando:** postular sin prototipo, validar cupo ≤3, server actions → candidata y → en_revision, prototipo solo para candidatos.
- **Toca:** `lib/applications`, `(app)/applications` · **Check:** [ ] postular sin prototipo · [ ] valida cupo ≤3 · [ ] transiciones de estado · [ ] prototipo solo candidatos

#### 10. Hilo de `comentarios_entregable` (ambos lados) — `#85` · `[S]` · 5.4
- **Requerimiento (SRS RF-44):** "Aprobación o solicitud de cambios sobre un entregable." → "aprueba o devuelve con comentarios; queda registrado." *(consolida la tarjeta redundante #89 de Errol)*
- **En cristiano:** el hilo de comentarios, visible para estudiante y empresa. — **tu parte:** lógica en `lib/applications`, servida por props a ambos lados (tú no tocas `(company)`). **[cruza: Ronny/Errol]**
- **Toca:** `lib/applications`, `comentarios_entregable` · **Check:** [ ] varios comentarios por entregable · [ ] mismo hilo a estudiante y empresa

#### 11. Notificaciones backend (in-app + email) — `#20` · `[M]` · *(movida de Samir A1)*
- **Requerimiento (SRS RF-47):** "Notificaciones dentro de la plataforma." → "Centro de notificaciones con estado leído / no leído." · **RF-46:** "Notificaciones por correo electrónico." (RNF-29)
- **Listo cuando:** centro in-app leído/no leído; correos ante eventos clave: **adjudicación, vencimiento de plazo, mensaje y entregable**.
- **En cristiano:** el motor que dispara avisos; encaja contigo porque casi todos son eventos de postulación/entregable/mensaje. — **tu parte:** lógica + Resend (UI: Sol #60). **[cruza: Sol C1]**
- **Toca:** `lib/notifications`, `supabase` · **Check:** [ ] in-app leído/no leído · [ ] email en los 4 eventos

***

### Errol — `A4` · Empresa, Proyectos, Adjudicación, Admin (backend) · 16 tarjetas

#### 1. Perfil de empresario — `#32` · `[M]`
- **Requerimiento (SRS RF-16):** "Creación y administración del perfil del empresario." → "registra nombre o razón social, sector, descripción y logo." · **RF-17** tipo (empresa/emprendedor) · **RF-18** publicar necesidad sin conocimientos técnicos.
- **En cristiano:** que el empresario cree su perfil y publique su necesidad. — **tu parte:** lógica/datos (UI: Ronny #71). **[cruza: Ronny C3]**
- **Toca:** `(company)`, `lib/` · **Check:** [ ] nombre/sector/descripción/logo · [ ] tipo empresa/emprendedor · [ ] publica necesidad

#### 2. Publicar proyecto — `#43` · `[M]`
- **Requerimiento (SRS RF-19):** "Publicar proyectos con título, descripción y categoría." → "solo si los campos obligatorios están completos." · **RF-20** área · **RF-21** plazo 5–15 días ("rechaza valores fuera de rango") · **RF-22** tecnologías.
- **En cristiano:** crear el proyecto con sus datos y plazo válido. — **tu parte:** lógica/datos (UI: Ronny #73). **[cruza: Ronny C3]**
- **Toca:** `(company)/projects`, `proyectos` · **Check:** [ ] valida obligatorios · [ ] área de negocio · [ ] plazo 5–15 (rechaza fuera) · [ ] tecnologías

#### 3. Editar proyecto + ciclo de vida/estados — `#44` · `[M]`
- **Requerimiento (SRS RF-24):** "Editar proyectos publicados." → "Editable solo mientras no haya ofertas adjudicadas; los cambios notifican a los oferentes." · **RF-25** estados → "restringe las acciones según corresponda."
- **En cristiano:** editar (mientras no haya adjudicación) y manejar estados. — **tu parte:** lógica/datos.
- **Toca:** `(company)/projects`, `proyectos` · **Check:** [ ] editable solo sin adjudicación · [ ] notifica oferentes · [ ] estados restringen acciones

#### 4. Revisar ofertas recibidas — `#46` · `[M]`
- **Requerimiento (SRS RF-34):** "Revisar las ofertas recibidas con su prototipo y propuesta." → "Lista las ofertas con el perfil del estudiante, su reputación, el prototipo y la propuesta, para compararlas."
- **En cristiano:** ver las ofertas para comparar. — **tu parte:** lógica/datos (UI: Ronny #72). **[cruza: Ronny C3]**
- **Toca:** `(company)/candidates`, `participaciones` · **Check:** [ ] muestra perfil + reputación + prototipo + propuesta

#### 5. Calificar, adjudicar, habilitar contacto, descartar — `#47` · `[M]`
- **Requerimiento (SRS RF-36):** calificar (1–5) + comentarios. · **RF-37:** adjudicar → "registra la adjudicación y notifica a los involucrados." · **RF-38:** habilitar contacto. · **RF-39:** descartar con notificación.
- **En cristiano:** el momento de la decisión. — **tu parte:** lógica/datos; al adjudicar crea `contrataciones`. **[cruza: Ronny C3 #72]**
- **Toca:** `(company)/candidates`, `participaciones`, `contrataciones` · **Check:** [ ] calificar · [ ] adjudicar + notificar · [ ] habilitar contacto · [ ] descartar con aviso

#### 6. Descarga de entregables por el empresario — `#48` · `[M]`
- **Requerimiento (SRS RF-43):** "Descarga de entregables por parte del empresario." → "Accesible solo para el empresario propietario del proyecto."
- **En cristiano:** que solo el dueño descargue los entregables. — **tu parte:** lógica/datos.
- **Toca:** `(company)`, `entregables` · **Check:** [ ] descarga solo propietario · [ ] bloquea a terceros

#### 7. Evaluación final del estudiante — `#49` · `[M]`
- **Requerimiento (SRS RF-49):** calificar al cierre (1–5) → "Solo el empresario contratante… tras finalizar." · **RF-50:** comentario → "se asocia a la calificación y al proyecto."
- **En cristiano:** la nota y comentario final; alimenta la reputación. — **tu parte:** lógica/datos (alimenta Fressia #29; UI: Ronny #75). **[cruza: Ronny C3]**
- **Toca:** `(company)`, `evaluaciones` · **Check:** [ ] solo contratante · [ ] solo tras finalizar · [ ] comentario asociado

#### 8. Flag `usa_ia` en el proyecto — `#50` · `[S]`
- **Requerimiento (SRS RF-23):** "Indicar si el proyecto involucra inteligencia artificial." → "Campo booleano visible en el detalle del proyecto."
- **En cristiano:** marcar si el proyecto usa IA. — **tu parte:** lógica/datos.
- **Toca:** `(company)/projects`, `proyectos.usa_ia` · **Check:** [ ] booleano persistido · [ ] visible en detalle

#### 9. Gestión de usuarios: suspender/reactivar — `#51` · `[M]`
- **Requerimiento (SRS RF-63):** "Gestión de usuarios por parte del administrador." → "Buscar, ver y editar los estados de las cuentas." · **RF-65:** suspender/reactivar → "La cuenta suspendida no puede iniciar sesión; se registra el motivo." (bloqueo en login: Samir #83)
- **En cristiano:** el admin busca usuarios y suspende/reactiva con motivo. — **tu parte:** lógica/datos (UI: Sol #74). **[cruza: Sol C1]**
- **Toca:** `(admin)`, `usuarios.nivel_admin` · **Check:** [ ] buscar/ver/editar estado · [ ] suspender con motivo · [ ] reactivar

#### 10. Validación de egresados FWD — `#52` · `[M]`
- **Requerimiento (SRS RF-64):** "Validación de estudiantes como egresados de FWD Costa Rica." → "el administrador aprueba o rechaza estudiantes cotejando el título contra la base de datos de egresados." (integración: Samir #19)
- **En cristiano:** aprobar/rechazar estudiantes cotejando contra la base FWD. — **tu parte:** lógica/datos (UI: Sol #77). **[cruza: Sol C1, Samir A1]**
- **Toca:** `(admin)`, `estudiantes.estado_verificacion` · **Check:** [ ] cotejo contra base FWD · [ ] aprobar · [ ] rechazar

#### 11. Eliminar proyectos que incumplan — `#53` · `[M]`
- **Requerimiento (SRS RF-66):** "Eliminar proyectos que incumplan políticas." → *listo cuando:* "Requiere motivo y notifica al empresario."
- **En cristiano:** quitar proyectos que violan políticas, con motivo y aviso. — **tu parte:** lógica/datos (UI/botón: Sol #74-bis). **[cruza: Sol C1]**
- **Toca:** `(admin)`, `proyectos`, `reportes_moderacion` · **Check:** [ ] exige motivo · [ ] notifica al empresario

#### 12. Reportes administrativos — `#54` · `[S]`
- **Requerimiento (SRS RF-67):** "Generar reportes administrativos de usuarios, proyectos y actividad." → *listo cuando:* "Exportables a CSV/PDF con filtros de fecha."
- **En cristiano:** la lectura agregada de usuarios/proyectos/actividad, exportable. — **tu parte:** lógica/datos (UI: Sol #76). *(la gestión de catálogos RF-68 pasó a Fressia A2)* **[cruza: Sol C1]**
- **Toca:** `(admin)`, `usuarios`/`proyectos`/`auditoria` · **Check:** [ ] reporte exportable CSV/PDF · [ ] filtros de fecha

#### 13. Moderación de reportes + réplica + preferencias — `#42` · `[C]` · **Fase 2** (diferido por el equipo)
- **Requerimiento (SRS RF-69):** "Moderación de reportes…" → "Cola de reportes con acciones de resolución." · **RF-53** réplica del estudiante · **RF-48** preferencias de notificación.
- **En cristiano:** la cola de reportes con acciones, la réplica y las preferencias. — **tu parte:** lógica/datos (UI: Sol #77). **[cruza: Sol C1]**
- **Toca:** `(admin)`, `reportes_moderacion` · **Check:** [ ] cola con acciones de resolución · [ ] réplica del estudiante · [ ] preferencias

#### 14. Conectar transición → en_revision / → candidata — `#86` · `[M]` · 5.1
- **Requerimiento (SRS):** soporta RF-32 (estados desde el lado empresa).
- **En cristiano:** al abrir una postulación desde la empresa, moverla de estado. — **tu parte:** lógica en `(company)/candidates` (transición definida por Santiago #35). **[cruza: Santiago A3, Ronny C3]**
- **Toca:** `(company)/candidates` · **Check:** [ ] → en_revision al abrir · [ ] → candidata al marcar

#### 15. Aplicar/revocar strike + máquina de suspensión — `#87` · `[M]` · 5.2
- **Requerimiento (SRS RF-65):** "Suspender o reactivar cuentas." (UI: Sol #93; bloqueo en login: Samir #83)
- **En cristiano:** la lógica de sancionar: strikes, suspensión leve vs severa, vínculo strike↔reporte. — **tu parte:** lógica/datos en `(admin)`. **[cruza: Sol C1, Samir A1]**
- **Toca:** `(admin)`, `strikes` · **Check:** [ ] aplicar/revocar strike · [ ] suspensión leve vs severa · [ ] vínculo strike↔reporte

#### 16. Persistir sede del empresario y modalidad del proyecto — `#88` · `[M]` · 5.3
- **Requerimiento (SRS):** complemento de RF-16 y RF-19 (datos de ubicación).
- **En cristiano:** guardar la sede de la empresa y la modalidad/ubicación del proyecto. — **tu parte:** lógica/datos (UI: Ronny #95). **[cruza: Ronny C3]**
- **Toca:** `(company)/projects`, perfil empresario · **Check:** [ ] sede empresario · [ ] modalidad+ubicación proyecto

> **Eliminada en v6:** la antigua tarjeta #89 (cola de moderación + comentarios). Su cola ya está en #53/#42; el hilo de comentarios se consolidó en Santiago #85.

***

### Sol — `C1` · Design System, Layout, Brand + Admin UI · 13 tarjetas

#### 1. Tokens FWD en `globals.css` + fuentes — `#55` · `[M]`
- **Requerimiento (SRS RNF-21):** "Interfaz en español, preparada para internacionalización." (identidad visual: brief §5)
- **En cristiano:** los colores, tipografías y motion de la marca, base de toda la UI. — **tu parte:** UI base.
- **Toca:** `globals.css` · **Check:** [ ] paleta + neutrales oklch · [ ] motion tokens · [ ] fuentes `next/font`

#### 2. Primitivos shadcn — `#57` · `[M]`
- **Requerimiento (SRS RNF-18):** "Compatibilidad con los principales navegadores modernos."
- **En cristiano:** los bloques de UI que todos piden, no recrean. — **tu parte:** UI.
- **Toca:** `components/ui` · **Check:** [ ] Button/Input/Select/Textarea · [ ] Card/Dialog/Badge · [ ] Table/Tabs

#### 3. Brand: PageTitle, InsightSection, FwdGeoBackdrop — `#58` · `[M]`
- **Requerimiento:** identidad FWD (brief §5; `PageTitle` con punto azul firma).
- **En cristiano:** los componentes de marca. — **tu parte:** UI.
- **Toca:** `features/brand` · **Check:** [ ] PageTitle · [ ] InsightSection · [ ] FwdGeoBackdrop

#### 4. Layout / Shells por rol — `#59` · `[M]`
- **Requerimiento:** estructura de página por rol (junior/empresa/admin).
- **En cristiano:** el "marco" de cada pantalla. — **tu parte:** UI.
- **Toca:** `features/layout` · **Check:** [ ] Navbar · [ ] Footer · [ ] Sidebar admin · [ ] shell por rol

#### 5. Centro de notificaciones (UI) — `#60` · `[M]`
- **Requerimiento (SRS RF-47):** "Notificaciones dentro de la plataforma." → "Centro de notificaciones con estado leído / no leído."
- **En cristiano:** la campanita con la lista de notificaciones. — **tu parte:** UI (lógica: Santiago #11). **[cruza: Santiago A3]**
- **Toca:** `features/layout` · **Check:** [ ] lista de notificaciones · [ ] estado leído/no leído

#### 6. Status pills + estados vacíos + a11y + responsive — `#61` · `[S]`
- **Requerimiento (SRS RNF-17):** "Interfaz responsive para dispositivos móviles." · **RNF-20:** "accesibilidad WCAG 2.1 nivel AA."
- **En cristiano:** chips de estado, pantallas vacías y accesibilidad/responsive base. — **tu parte:** UI.
- **Toca:** `components/ui`, `features/shared` · **Check:** [ ] status pills · [ ] estados vacíos · [ ] responsive 375px · [ ] a11y teclado/contraste

#### 7. Pills/badges de estados nuevos + chips de modalidad — `#90` · `[S]` · 5.1–5.3
- **Requerimiento (SRS):** soporte visual de estados nuevos del flujo B y modalidad.
- **En cristiano:** variantes para `en_revision`, `candidata`, `suspendida`, strikes y chips remoto/híbrido/presencial. — **tu parte:** UI (los demás las piden, no las crean).
- **Toca:** `components/ui`, `features/brand` · **Check:** [ ] estados de postulación · [ ] estados de cuenta · [ ] chips de modalidad

#### 8. Admin: UserTable + StatsCards + ModerationQueue — `#74` · `[M]` · *(movida de Ronny)*
- **Requerimiento (SRS RF-63):** "Gestión de usuarios…" → "Buscar, ver y editar los estados de las cuentas." · **RF-69:** moderación → "Cola de reportes con acciones de resolución."
- **Nota:** `StatsCards` es soporte de RF-67 (no es RF propio); la etiqueta vieja "RF-66" era incorrecta.
- **En cristiano:** el panel donde el admin busca usuarios, ve métricas y modera. — **tu parte:** UI mockeada (lógica: Errol #51/#42). **[cruza: Errol A4]**
- **Toca:** `features/admin` · **Check:** [ ] tabla con buscador y estado · [ ] cola de moderación · [ ] tarjetas de métricas

#### 9. UI de strikes y suspensión — `#93` · `[M]` · *(movida de Ronny)* · 5.2
- **Requerimiento (SRS RF-65):** "Suspender o reactivar cuentas." → "se registra el motivo."
- **En cristiano:** los botones para sancionar/reactivar con motivo. — **tu parte:** UI; reusa tu `StatusPill` (lógica: Errol #87). **[cruza: Errol A4]**
- **Toca:** `features/admin` · **Check:** [ ] aplicar strike con motivo obligatorio · [ ] revocar · [ ] muestra nivel de suspensión

#### 10. Reportes UI + catálogos admin — `#76` · `[S]` · *(movida de Ronny)*
- **Requerimiento (SRS RF-67):** "Generar reportes administrativos…" → "Exportables a CSV/PDF con filtros de fecha." · **RF-68:** catálogos → "agrega, edita o desactiva ítems."
- **En cristiano:** la vista de reportes y la pantalla de catálogos. — **tu parte:** UI (reportes: Errol #54; catálogos: Fressia #12). **[cruza: Errol A4, Fressia A2]**
- **Toca:** `features/admin` · **Check:** [ ] vista de reportes con filtro de fecha · [ ] botón exportar · [ ] CRUD de catálogos

#### 11. Validación egresados UI + moderación + preferencias — `#77` · `[C]` · *(movida de Ronny)*
- **Requerimiento (SRS RF-64):** "Validación de estudiantes como egresados…" → "aprueba o rechaza cotejando el título contra la base de egresados." · **RF-48:** preferencias → "activa o desactiva los tipos de notificación."
- **En cristiano:** validar egresados, moderar y elegir notificaciones. — **tu parte:** UI (lógica: Errol #52/#42; cotejo: Samir). **[cruza: Errol A4, Samir A1]**
- **Toca:** `features/admin` · **Check:** [ ] pantalla aprobar/rechazar egresado · [ ] vista de moderación · [ ] toggles de preferencias

#### 12. UI de eliminar proyecto (con motivo) — *NUEVA (hueco RF-66 UI)* · `[M]`
- **Requerimiento (SRS RF-66):** "Eliminar proyectos que incumplan políticas." → "Requiere motivo y notifica al empresario."
- **En cristiano:** el botón/diálogo del admin para eliminar un proyecto con motivo. — **tu parte:** UI (lógica: Errol #53). **Crear tarjeta nueva en Trello (lista Sol).** **[cruza: Errol A4]**
- **Toca:** `features/admin` · **Check:** [ ] botón eliminar · [ ] `Dialog` pide motivo obligatorio · [ ] avisa que notificará al empresario

#### 13. Landing page — *NUEVA* · `[S]`
- **Requerimiento:** entregable del brief (§10: screenshots del landing) + identidad visual §5. *(No es un RF del SRS; es la página pública de entrada.)*
- **En cristiano:** la página pública de marketing — hero con la voz "Adelante.", secciones de valor para empresa y estudiante, y CTA a registro/login. — **tu parte:** UI con tus componentes de marca; la ruta `(public)` ya existe (no requiere tarea de Samir).
- **Toca:** `features/brand`/`features/landing`, consumida por `(public)/page.tsx` · **Check:** [ ] hero con voz de marca · [ ] secciones de valor (empresa/estudiante) · [ ] CTA a registro/login · [ ] responsive 375px

***
### Rachel — `C2` · Componentes Estudiante / Marketplace · 14 tarjetas

#### 1. ProjectCard + grid del listado — `#62` · `[M]`
- **Requerimiento (SRS RF-19, UI):** mostrar proyecto con título, descripción y categoría.
- **En cristiano:** la tarjeta de proyecto y la grilla. — **tu parte:** UI (datos: Fressia #24). **[cruza: Fressia A2]**
- **Toca:** `features/marketplace` · **Check:** [ ] tarjeta con datos clave · [ ] grilla responsive

#### 2. ProjectFilters — `#63` · `[M]`
- **Requerimiento (SRS RF-26, UI):** "Búsqueda y filtrado por tecnología, área de negocio, fecha y categoría."
- **En cristiano:** los filtros de búsqueda. — **tu parte:** UI (lógica/<1s: Fressia #26). **[cruza: Fressia A2]**
- **Toca:** `features/marketplace` · **Check:** [ ] filtro tecnología · [ ] área · [ ] fecha · [ ] categoría

#### 3. ProjectDetail — `#64` · `[M]`
- **Requerimiento (SRS RF-19/25, UI):** detalle con descripción, requisitos, empresa, plazo y estado.
- **En cristiano:** la pantalla de detalle del proyecto. — **tu parte:** UI (datos: Fressia #24). **[cruza: Fressia A2]**
- **Toca:** `features/marketplace` · **Check:** [ ] descripción/requisitos/empresa/plazo · [ ] estado visible

#### 4. SkillPicker + PortfolioCard/Form — `#65` · `[M]`
- **Requerimiento (SRS RF-09, UI):** "catálogo con nivel básico, intermedio o avanzado." · **RF-10/11/14** portafolio.
- **En cristiano:** elegir habilidades con nivel y armar el portafolio. — **tu parte:** UI (datos: Fressia #23). **[cruza: Fressia A2]**
- **Toca:** `features/marketplace` · **Check:** [ ] picker con nivel · [ ] form de portafolio · [ ] lista de proyectos

#### 5. ApplyForm UI — `#66` · `[M]`
- **Requerimiento (SRS RF-27/28/29, UI):** carta/propuesta + subir prototipo.
- **En cristiano:** el formulario para postular. — **tu parte:** UI (lógica: Santiago #25/#34). **[cruza: Santiago A3]**
- **Toca:** `features/applications` · **Check:** [ ] campo propuesta · [ ] subir prototipo (archivo/enlace)

#### 6. ApplicationCard + StatusBadge — `#67` · `[M]`
- **Requerimiento (SRS RF-32, UI):** "enviada, en revisión, adjudicada o no seleccionada."
- **En cristiano:** la tarjeta que muestra en qué va una postulación. — **tu parte:** UI (datos: Santiago #36). **[cruza: Santiago A3]**
- **Toca:** `features/applications` · **Check:** [ ] muestra los 4 estados con badge

#### 7. Inputs de links Git/demo + aviso de vencimiento — `#68` · `[S]`
- **Requerimiento (SRS RF-12/13, UI):** enlaces Git/demo. · **RF-33, UI:** aviso de vencimiento.
- **En cristiano:** campos para enlaces y aviso de cierre cercano. — **tu parte:** UI (validación: Fressia #28; aviso: Santiago #38). **[cruza: Fressia/Santiago]**
- **Toca:** `features/marketplace`/`features/applications` · **Check:** [ ] inputs Git/demo · [ ] aviso de proximidad de vencimiento

#### 8. UI de ranking de estudiantes — `#99` · `[S]`
- **Requerimiento (SRS RF-52):** "Generar rankings de estudiantes." → "Ranking por reputación, filtrable por tecnología o categoría."
- **En cristiano:** la lista/tabla de ranking filtrable. — **tu parte:** UI `RankingList`+`RankingFilters` (datos: Fressia #30). **[cruza: Fressia A2 — contrato abajo]**
- **Toca:** `features/marketplace` · **Check:** [ ] ordena por reputación · [ ] filtra por tecnología/categoría · [ ] pide `Table`/`Badge` a Sol

> **[RF-52] — Contrato de props (cruza C2 Rachel ↔ A2 Fressia)**
> - **RF / Prioridad:** RF-52 · `S` (Should) · Fase 3
> - **Carpetas que toca:** `src/components/features/marketplace/` (nuevos `RankingList` + `RankingFilters`)
> - **Tabla(s) afectadas:** ninguna directa — la UI consume lo que expone `lib/marketplace` (Fressia). Datos de origen: `estudiantes.reputacion` (0-5, denormalizado), `habilidades_tecnicas`, catálogos `tecnologias` y `categorias_proyecto`
> - **Namespace i18n:** `marketplace` (claves nuevas en es/en, orden alfabético)
> - **Contrato de props:** sí (ver abajo); se acuerda y se pega en la tarjeta antes de empezar
> - **DoD:** typecheck + lint + tests `lib/` (lado Fressia) + i18n es/en + responsive 375px + commit limpio
>
> ```typescript
> // Contrato C2 (Rachel) <-> A2 (Fressia) · RF-52 ranking de estudiantes
> // Datos: APP (Fressia) mapea la fila de Supabase a esta forma; la UI solo recibe.
> interface RankingListProps {
>   estudiantes: Array<{
>     id: string;
>     nombre: string;
>     posicion: number;            // ranking calculado en lib/marketplace (Fressia)
>     reputacion: number;          // 0-5, denormalizado estudiantes.reputacion
>     habilidades: string[];       // derivado de habilidades_tecnicas
>     portfolioUrl: string | null; // estudiantes.url_portafolio
>   }>;
>   filtros: {
>     tecnologias: Array<{ id: string; nombre: string }>; // catálogo tecnologias
>     categorias: Array<{ id: string; nombre: string }>;  // catálogo categorias_proyecto
>   };
>   onFiltrar: (filtro: { idTecnologia?: string; idCategoria?: string }) => void; // el re-orden lo hace APP
>   disabled?: boolean;
> }
> ```

#### 9. UI del agente conversacional / chat — `#69` · `[M]` · **Fase 2**
- **Requerimiento (SRS RF-54..58):** agente que guía al empresario (Must) · **RF-59** (S): "guardar y reanudar el historial de la conversación" · **RF-60** (S): "sugerir tecnologías apropiadas mediante IA" · **RF-61** tarjetas de recomendación.
- **En cristiano:** el chat donde el empresario arma su proyecto con IA; el SRS lo marca **Must**, el equipo lo difiere a Fase 2. — **tu parte:** UI.
- **Toca:** `features/marketplace` · **Check:** [ ] chat de entrevista · [ ] guardar/reanudar conversación · [ ] sugerir tecnologías · [ ] tarjetas de recomendación

#### 10. ApplyForm en dos fases — `#91` · `[M]` · 5.1
- **Requerimiento (SRS RF-32, UI):** `StatusBadge` con `en_revision`/`candidata`.
- **En cristiano:** primero carta+portafolio sin prototipo; el prototipo solo al pasar a candidata. — **tu parte:** UI (lógica: Santiago #35). **[cruza: Santiago A3]**
- **Toca:** `features/applications` · **Check:** [ ] fase 1 sin prototipo · [ ] prototipo solo candidata · [ ] badge en_revision/candidata

#### 11. Selector de modalidad + ubicación en cards — `#92` · `[S]` · 5.3
- **Requerimiento (SRS):** complemento de RF-26 (presentación).
- **En cristiano:** elegir modalidad preferida y mostrar país/ciudad y modalidad en las tarjetas. — **tu parte:** UI (datos: Fressia #84, Errol #88). **[cruza: Fressia/Errol]**
- **Toca:** `features/marketplace` · **Check:** [ ] selector de modalidad en perfil · [ ] muestra país/ciudad y modalidad en cards

#### 12. UI de edición de perfil — *NUEVA (hueco RF-05 UI)* · `[M]`
- **Requerimiento (SRS RF-05):** "Edición de la información del perfil." → "Los cambios se persisten y se reflejan de inmediato."
- **En cristiano:** el formulario con el que el estudiante edita sus datos. — **tu parte:** UI (lógica: Samir #21). **Crear tarjeta nueva en Trello (lista Rachell).** **[cruza: Samir A1]**
- **Toca:** `features/auth`/`features/marketplace` · **Check:** [ ] formulario de edición · [ ] refleja cambios al guardar

#### 13. UI del chat de mensajería — *NUEVA (hueco RF-45 UI)* · `[M]`
- **Requerimiento (SRS RF-45):** "Mensajería interna entre estudiante y empresario." → "Hilo de conversación por proyecto; no editable tras enviar."
- **En cristiano:** la pantalla de chat por proyecto. — **tu parte:** UI `MessageThread` (lógica: Santiago #41). **Crear tarjeta nueva en Trello (lista Rachell).** **[cruza: Santiago A3]**
- **Toca:** `features/applications` · **Check:** [ ] hilo por proyecto · [ ] enviar mensaje · [ ] no editable tras enviar

#### 14. UI de réplica a una calificación — *NUEVA (hueco RF-53 UI)* · `[C]`
- **Requerimiento (SRS RF-53):** "Permitir réplica del estudiante a una calificación." → "El estudiante puede responder una vez a un comentario recibido."
- **En cristiano:** que el estudiante responda (una vez) un comentario de evaluación. — **tu parte:** UI (lógica: Errol #42). **Crear tarjeta nueva en Trello (lista Rachell).** **[cruza: Errol A4]**
- **Toca:** `features/marketplace` · **Check:** [ ] campo de réplica · [ ] solo una vez por comentario
***
### Ronny — `C3` · Componentes Empresa / Auth · 8 tarjetas

#### 1. Auth UI — `#70` · `[M]`
- **Requerimiento (SRS RF-01, UI):** registro con `RoleSelector`. · **RF-03** login · **RF-04** recuperar contraseña · **RF-02** aviso de verificación.
- **En cristiano:** las pantallas de login, registro con rol, recuperar contraseña y aviso de verificación. — **tu parte:** UI (lógica: Samir #11/#12). **[cruza: Samir A1]**
- **Toca:** `features/auth` · **Check:** [ ] LoginForm · [ ] RegisterForm + RoleSelector · [ ] recuperar contraseña · [ ] aviso de verificación

#### 2. CompanyForm — `#71` · `[M]`
- **Requerimiento (SRS RF-16, UI):** nombre/razón social, sector, descripción, logo. · **RF-17** tipo empresa/emprendedor.
- **En cristiano:** el formulario del perfil de empresario. — **tu parte:** UI (lógica: Errol #32). **[cruza: Errol A4]**
- **Toca:** `features/companies` · **Check:** [ ] campos de perfil · [ ] selector tipo empresa/emprendedor

#### 3. ProjectForm — `#73` · `[M]`
- **Requerimiento (SRS RF-19..22, UI):** título, descripción, categoría, área, plazo 5–15, tecnologías. · **RF-24** editar.
- **En cristiano:** el formulario para publicar/editar un proyecto. — **tu parte:** UI (lógica: Errol #43/#44). **[cruza: Errol A4]**
- **Toca:** `features/companies` · **Check:** [ ] campos obligatorios · [ ] plazo 5–15 (rechaza fuera) · [ ] selector de tecnologías

#### 4. CandidateCard + OfferReview + adjudicar/descartar — `#72` · `[M]`
- **Requerimiento (SRS RF-34, UI):** comparar ofertas. · **RF-36/37/39, UI:** calificar, adjudicar, descartar.
- **En cristiano:** la tarjeta de candidato y la vista para revisar/adjudicar/descartar. — **tu parte:** UI (lógica: Errol #46/#47). **[cruza: Errol A4]**
- **Toca:** `features/companies` · **Check:** [ ] tarjeta de candidato · [ ] revisar oferta · [ ] adjudicar/descartar

#### 5. Evaluación / rating UI — `#75` · `[M]`
- **Requerimiento (SRS RF-49, UI):** calificar 1–5. · **RF-50, UI:** comentario.
- **En cristiano:** las estrellas + comentario para evaluar al cierre. — **tu parte:** UI (lógica: Errol #49). **[cruza: Errol A4]**
- **Toca:** `features/companies` · **Check:** [ ] selector de estrellas 1–5 · [ ] campo de comentario

#### 6. Acción "marcar como candidata" — `#94` · `[M]` · 5.1
- **Requerimiento (SRS RF-32, UI):** transición de estado.
- **En cristiano:** el botón en la tarjeta de candidato para moverlo a "candidata". — **tu parte:** UI (lógica: Errol #86/Santiago #35). **[cruza: Errol/Santiago]**
- **Toca:** `features/companies` · **Check:** [ ] botón marcar candidata · [ ] refleja nuevo estado

#### 7. Campos de ubicación en CompanyForm y ProjectForm — `#95` · `[S]` · 5.3
- **Requerimiento (SRS):** complemento de RF-16 y RF-19 (ubicación).
- **En cristiano:** alcance/sede de la empresa + modalidad/ubicación del proyecto (obligatoria si no es remoto). — **tu parte:** UI (lógica: Errol #88). **[cruza: Errol A4]**
- **Toca:** `features/companies` · **Check:** [ ] alcance + sede en CompanyForm · [ ] modalidad + ubicación en ProjectForm · [ ] obligatoria si no es remoto

#### 8. Consentimientos + términos en RegisterForm — `#96` · `[S]` · 5.4
- **Requerimiento (SRS RNF-38):** "Consentimiento explícito para el procesamiento de datos por IA y para el cotejo con la base de egresados FWD." · **RNF-36** *(hueco)*: "Aceptación de términos y condiciones antes del uso de la plataforma."
- **En cristiano:** los checks de consentimiento legal y de términos en el registro. — **tu parte:** UI en `RegisterForm` (el timestamp lo guarda Samir #15). **[cruza: Samir A1]**
- **Toca:** `features/auth` · **Check:** [ ] check consentimiento IA · [ ] check cotejo FWD · [ ] **check términos y condiciones (RNF-36)**

> **Movido a Sol (C1) en v6:** Admin `UserTable`/`StatsCards`/`ModerationQueue`, Reportes UI + catálogos admin, validación egresados/moderación/preferencias, y UI de strikes/suspensión. Ronny queda enfocado en **empresa + auth**.
***

## 9. Contrato por tarjeta

Cada tarjeta en Trello debe llevar: **RF + prioridad**, **carpetas que toca**, **tabla(s) afectadas**, **namespace i18n**, **contrato de props** si cruza equipos, y el **DoD** de `reglas.md §11`.
Si una tarjeta comparte carpeta con otra activa, se hace en serie; no se paraleliza.
Si una tarjeta cruza equipos, el contrato de props debe quedar escrito antes de empezar.
***
## 10. Ajustes recomendados para esta versión

• Mantener a Samir como base técnica, no como dueño de toda la complejidad del producto.
• Mantener a Sol como base visual + **dueño de la UI de admin** (`features/admin/`), aprovechando que la base visual ya está casi cerrada.
• Dejar a Rachel con marketplace/applications y además parte de la carga visual que antes tenía Sol.
• Dejar a Ronny con **empresa + auth** (sin admin); el clúster admin pasa a Sol (v6).
• Darle a Santiago más peso de implementación técnica dentro de su dominio, para descargar a Samir sin romper la fundación.
• Registrar en cada tarjeta el RF exacto y la(s) tabla(s) afectadas, así Trello funciona como espejo del documento y no como lista vaga de tareas.
Este documento ya queda listo como base para reemplazar la versión anterior y usarlo directamente en Trello y en la coordinación del equipo.

***

## 11. Acuerdos del equipo + plantilla de contrato de props

Esta sección reúne en un solo lugar los acuerdos que ya viven repartidos en §1–§9 y agrega la plantilla de contrato de props que faltaba. Es la referencia rápida; el detalle operativo sigue en cada sección.

### Regla madre (§1)
• Cada quien edita SOLO sus carpetas: COMPONENTS → `components/`; APP → `app/` + `lib/` + `supabase/`.
• Los equipos se tocan solo por el `import` + props, nunca editando el mismo archivo.

### Archivos calientes y su dueño (§2)
• `messages/es.json` + `en.json` → de todos; cada feature edita solo su bloque (auth, marketplace, applications, company, admin, brand, common); claves en orden alfabético.
• `globals.css` y `components/ui/` → Sol; los demás piden el primitivo, no lo crean.
• `package.json`/lock y `src/types/` → Samir; los tipos de cada feature van en su carpeta.
• `layout.tsx` raíz y `middleware.ts` → Samir; cada grupo de ruta usa su propio `layout.tsx` interno.

### Cruce de equipos (§5)
• COMPONENTS construye la UI con datos mockeados, sin tocar `app/` ni `lib/`.
• APP arma la página real y conecta Supabase, server actions y datos.
• La integración pasa por un PR chico con revisión, nunca por edición compartida.

### Tarjeta y ramas (§6, §9)
• Una tarjeta = una rama = carpetas de un solo dueño.
• Tarjetas que comparten carpeta → se hacen en serie, no en paralelo.
• PRs chicos y frecuentes hacia `dev`, nunca push directo.
• Cada tarjeta lleva: RF, prioridad (M/S/C), carpetas, tabla(s), namespace i18n, contrato de props si cruza equipos, y el DoD.
• DoD: typecheck + lint + tests de `lib/` + i18n es/en + responsive 375px + commit limpio.

### Código y git (en `instalacion.md` y `reglas.md`)
• PR hacia `dev`, hooks Husky, checklist pre-PR (`instalacion.md`).
• Comentarios explicativos permitidos; prohibido dejar código comentado; TODO con ticket: `// TODO(issue-N): …` (`reglas.md`).

### Contrato de props (plantilla)
Cuando una tarjeta cruza equipos, los dos dueños acuerdan ESTA interfaz ANTES de empezar y la pegan en la tarjeta de Trello. El de COMPONENTS la co-ubica con su componente (es su dueño); el de APP la importa y conforma a ella, sin editarla.
Fija tres cosas:
• Datos que entran: nombres, tipos y forma exacta del objeto.
• Acciones que salen: la firma de cada callback/server action (qué recibe, qué devuelve).
• Quién mapea la fila de Supabase a esa forma: lo hace APP en la página, no el componente.

```typescript
// Plantilla. Ejemplo real: CandidateCard (Ronny C3 <-> Errol A4, 5.1)
interface CandidateCardProps {
  candidate: {
    id: string;
    nombre: string;
    reputacion: number;                 // 0-5, denormalizado (5.5)
    habilidades: string[];
    portfolioUrl: string | null;
    estado: 'postulada' | 'en_revision' | 'candidata' | 'contratada';
  };
  onMarcarCandidata: (candidateId: string) => Promise<void>;  // server action: la pone APP
  disabled?: boolean;
}
```

Los nombres de campo son lo que el par acuerde; la forma es lo que importa.
|



