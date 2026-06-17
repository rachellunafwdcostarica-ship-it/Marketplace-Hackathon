# Auditoría de datos quemados (no provenientes de Supabase)

> **Fecha:** 2026-06-16 · **Rama:** `samir` · **Alcance:** todo `src/`
> **Modo:** solo lectura. No se modificó código.
> **Autor:** auditoría asistida (Claude) — verificada archivo:línea.

---

## 0. Cómo leer este reporte (criterio, no solo lista)

"Todo dato que no venga de Supabase" tomado literal incluye cosas que **deben**
estar fuera de la BD por las propias reglas del proyecto (i18n en `messages/`,
tokens de color/motion, enums de catálogo). Reportar eso como falla es ruido.

Por eso clasifico cada hallazgo en una de estas categorías:

| Cat. | Significado | ¿Es problema? |
|---|---|---|
| **A — MOCK-COMO-REAL** | Dato inventado que se renderiza al usuario como si fuera real (proyectos, postulaciones, empresas, stats, candidatos). Debería venir de Supabase. | **Sí. Crítico.** |
| **B — FALLBACK INVENTADO** | `?? 'comp-1'`, `?? 'Juan Pérez'`: respaldo ficticio cuando falta el dato real. | Sí, medio. |
| **C — OPCIONES QUE DEBERÍAN SER BD/CONFIG** | Rangos y listas hardcodeados en JSX que en un producto vivo se configuran. | Sí, bajo. |
| **D — STRING HARDCODED (viola i18n)** | Texto visible en JSX en vez de `messages/es.json`/`en.json`. | Sí, bajo. |
| **E — COLOR HARDCODED** | Hex suelto en vez de token FWD. | Sí, bajo. |
| **F — CATÁLOGO/ENUM LEGÍTIMO** | Constante fija del sistema (modalidades, monedas, roles). | **No.** Se lista para descartar. |

**La conclusión incómoda va primero (sección 1).** Lo de bajo nivel (strings,
colores, código comentado) está al final y es secundario frente a lo de fondo.

---

## 1. Lo que importa: la mitad de la plataforma no toca Supabase

**[Seguro]** El motor `src/lib/DemoDataContext.tsx` hidrata `localStorage` con
los arrays de `src/lib/constants/mockData.ts` y los sirve a la UI. Está cableado
en los tres layouts autenticados (`(app)`, `(company)`, `(admin)`), así que es la
fuente de datos por defecto de casi toda la app, **no Supabase**.

**[Seguro]** `src/lib/marketplace/` y `src/lib/applications/` **están vacías** (sin
archivos). No existe ninguna server action que liste proyectos abiertos para el
egresado ni que registre sus postulaciones en la BD. El flujo central del
egresado (RF de marketplace y postulación) **no tiene backend**: lee mock y
escribe a `localStorage`.

Consecuencia directa, verificada archivo por archivo:

- **Toda la experiencia del egresado es mentira en memoria:**
  - `/junior` (dashboard): las 3 stats salen de filtrar `applications` mock por
    `MOCK_JUNIOR_NAME = 'Juan Pérez'`; los "proyectos recomendados" salen de
    `mockProjects`. (`(app)/junior/page.tsx:28-66`)
  - `/marketplace`: lista y filtra `mockProjects`. (`(app)/marketplace/page.tsx:19`)
  - `/applications`: lista `mockApplications` filtradas por `'Juan Pérez'`.
    (`(app)/applications/page.tsx:17-21`)
  - `/junior/projects` y `/junior/projects/[id]`: idem, mock. (grep `useDemoData`)
  - `/junior/projects/[id]/apply`: al enviar hace `setTimeout(1200)` simulando
    red y llama `addApplication()`, que escribe en `localStorage` con
    `candidateName: 'Juan Pérez'` / `candidateEmail: 'juan.perez@fwd.edu'`
    **hardcodeados** — no el usuario autenticado, no Supabase.
    (`apply/page.tsx:91-110` + `DemoDataContext.tsx:312-320`)
  - `/junior/portfolio`: `PortfolioManager` lee/escribe `studentPortfolio` del
    mock; persiste en `localStorage`. (`PortfolioManager.tsx:48`)

- **El dashboard del empresario es híbrido (mitad real, mitad mock):**
  - Proyectos publicados → **REAL** (`getMyPublishedProjects`, server).
  - Postulaciones recibidas y las stats "Total postulaciones" / "Contratados" →
    **mock** del contexto. (`CompanyDashboardClient.tsx:54-104`)

- **`/empresario/postulaciones` es el peor caso individual (sección 3.4).**

> **Esto no es "deuda técnica menor".** `reglas.md` §13 marca como **descalificación**
> el plagio/relleno y la falta de datos reales; el brief vende integración con el
> producto vivo. Una demo donde el revisor entra como egresado y ve "Juan Pérez"
> con proyectos de "TechFlow Solutions" que nunca tocaron la BD es exactamente el
> riesgo que las reglas intentan evitar.

---

## 2. El motor del problema (raíz común)

### 2.1 `src/lib/constants/mockData.ts` — el catálogo de mentira (Cat. A)
Define todo el universo falso que ve la app:
- `MOCK_JUNIOR_NAME = 'Juan Pérez'`, `MOCK_COMPANY_ID = 'comp-1'` (`:9-10`).
- `mockCompanies` (4 empresas: TechFlow, Innovatech, Global Devs, EduTech) con
  cédulas, emails, webs y **logos de Unsplash** inventados (`:12-73`).
- `mockProjects` (6 proyectos con presupuestos, stacks, fechas) (`:75-184`).
- `mockApplications` (4 postulaciones: Juan Pérez, María García, Carlos Ruiz)
  con cover letters, `@fwd.edu`, CVs de Google Drive falsos (`:186-247`).
- `mockStudentSkills`, `mockStudentPortfolio` (`:249-272`).

### 2.2 `src/lib/DemoDataContext.tsx` — el servidor de mentira
- Carga los `mock*` a estado + `localStorage` si no hay nada guardado (`:72-180`).
- Único punto donde mezcla algo real: `getCompanyProfile()` para el empresario
  logueado (`:182-226`). Todo lo demás es mock.
- **Fallbacks inventados (Cat. B):**
  - `:295-296` → `companyId: ... ?? 'comp-1'`, `companyName: ... ?? 'TechFlow Solutions'`.
  - `:315-316` → `candidateName: 'Juan Pérez'`, `candidateEmail: 'juan.perez@fwd.edu'`.
- Wrappers: `(app)/layout.tsx:46`, `(company)/layout.tsx:46`, `(admin)/layout.tsx:39`.
  (En admin el provider está montado pero **ninguna página admin lo consume** —
  ver 4.2; conviene quitarlo de ese layout para no inducir a error.)

---

## 3. Inventario CRÍTICO (Cat. A — mock-como-real en runtime)

### 3.1 Egresado — `src/app/[locale]/(app)/`
| Archivo:línea | Qué se renderiza falso |
|---|---|
| `junior/page.tsx:28-66` | Stats y recomendados desde `useDemoData()` + filtro por `MOCK_JUNIOR_NAME` |
| `marketplace/page.tsx:19-92` | Grid de proyectos = `mockProjects` filtrados en cliente |
| `applications/page.tsx:13-21` | Lista de postulaciones de `'Juan Pérez'` (mock) |
| `junior/projects/page.tsx:19` | Listado de proyectos (mock) |
| `junior/projects/[id]/page.tsx:25,33` | Detalle de proyecto + `MOCK_JUNIOR_NAME` |
| `junior/projects/[id]/apply/page.tsx:47,91-110` | Postular → `localStorage`, usuario hardcodeado |

### 3.2 Empresario — dashboard
`src/app/[locale]/(company)/empresario/CompanyDashboardClient.tsx`
- `:54-69` toma `projects`/`applications`/`currentCompany` del mock; filtra
  postulaciones por `company?.id || 'comp-1'`.
- `:90-103` stats "Total postulaciones" y "Contratados" derivan de mock.
- (Los proyectos publicados sí son reales: `initialProjects` por prop server.)

### 3.3 Portafolio del egresado
`src/components/features/marketplace/PortfolioManager.tsx:48` — `studentPortfolio`
del mock; cambios persisten solo en `localStorage`.

### 3.4 `src/app/[locale]/(company)/empresario/postulaciones/page.tsx` — el peor caso
Pantalla que parece 100% real y es casi toda inventada:
- `:29-66` `MOCK_MOCKUP_CANDIDATES`: 3 candidatos fijos (Camila López, Marco Ruas,
  Elena Smith) con **avatares de Unsplash** y emails `@fwd.edu`. Se **anteponen
  siempre** a cualquier dato (`:122 return [...MOCK_MOCKUP_CANDIDATES, ...realApps]`).
- `:210, 229, 248, 267` stats hardcodeadas: **1,248** / **452** / **84** / **12**.
- `:100-103` "match score" inventado a partir del **largo de la cover letter**.
- `:117` avatar de candidatos reales generado con `api.dicebear.com` (servicio externo).
- `:559-583` embudo de conversión con barras fijas **30% / 60% / 95% / 45%**.
- `:494-538` paginación falsa (botones 1·2·3 sin lógica) y `disabled`.
- `:605` botón "IA match" que solo dispara un `toast`.
- Además importa desde `@/lib/StateContext` (alias deprecado de `DemoDataContext`).

---

## 4. Inventario MEDIO

### 4.1 `src/app/[locale]/showcase/page.tsx` (Cat. A, alcance limitado)
Página de showcase de componentes con datos sample inventados: `sampleProject`
("Acme Capital", budget 650), `sampleApplication` ("María Soto",
`maria@example.com`), `sampleCompany` (cédula `3-101-789012`), `DashboardStats`
12/48/7, tabla "Foodly/Acme", `NotificationCenter` con items fijos, y
`availableStacks=['Next.js','React','Node','Python']`.
- **Riesgo:** la ruta `/[locale]/showcase` es alcanzable por URL directa en
  producción (no está enlazada en `Navbar`, pero **no está gateada**). Un revisor
  que la abra ve datos falsos. Recomendación: gatearla a `NODE_ENV!=='production'`
  o moverla fuera del routing público.

### 4.2 Doc desactualizado (no es dato quemado, pero induce a error)
`docs/deuda-tecnica-mocks.md` afirma que `admin/projects/page.tsx` "sigue leyendo
de `useAppState()`". **Falso hoy:** ese archivo ya usa `listAllProjectsForAdmin()`
contra Supabase (`admin/projects/page.tsx:8,45`). El doc debe corregirse.

### 4.3 `src/components/layout/Navbar.tsx`
- `:253` punto de notificación falso (`bg-magenta animate-pulse`) sin fuente real:
  simula "tienes notificaciones" siempre. (Cat. A visual)
- `:92-100` `mockLinks` (Favoritos, Recursos) — están marcados `isMock` y
  renderizados deshabilitados, así que es honesto; se documenta, no es engaño.
- `:288` el avatar siempre enlaza a `/empresario/perfil` sin importar el rol (bug
  de navegación, no dato quemado — anotado de paso).

---

## 5. Inventario BAJO (zonas grises y limpieza)

### 5.1 Opciones hardcodeadas que deberían ser config/BD (Cat. C)
`src/components/features/marketplace/ProjectFilters.tsx`
- `:111-113` rangos de duración ("1-2 semanas", "3-4 semanas", "1+ meses").
- `:133-135` rangos de presupuesto ("< 500 USD", "500-800 USD", "800+ USD").
Los límites 500/800 también están duplicados en la lógica de
`marketplace/page.tsx:72-75`. Si el negocio cambia los tramos, hay que tocar dos
lugares. **Recomendación:** extraer a una constante (`lib/.../budget-ranges.ts`).

### 5.2 Strings hardcodeados que violan i18n (Cat. D — `reglas.md` §4)
| Archivo:línea | String |
|---|---|
| `components/features/auth/OnboardingRoleForm.tsx:70` | `title="Adelante"` |
| `components/features/auth/RoleSelector.tsx:21,27-28` | `'Egresado'/'Busco proyectos'`, `'Empresario'/'Publico proyectos'` |
| `components/layout/AdminShell.tsx:111,123` | `"ES"` / `"EN"` |
| `components/layout/SidebarAdmin.tsx:68` | `"Marketplace FWD"` |
| `components/layout/Navbar.tsx:184` | `"Marketplace FWD"` (marca; defendible, pero repetida) |

> Nota: "Marketplace FWD" como nombre de marca es defendible hardcodeado, pero
> está repetido en ≥3 lugares; conviene un único `BRAND_NAME`.

### 5.3 Colores hex sueltos (Cat. E — `reglas.md` §3.2)
`components/features/auth/OAuthButtons.tsx:30,34,38,42` — `#EA4335`, `#4285F4`,
`#FBBC05`, `#34A853` (logo de Google). Son colores de marca de un tercero, así
que el hex es defendible; aun así rompe la regla "solo tokens FWD". Decisión del
equipo si se tolera por ser identidad externa.

### 5.4 Código comentado / dead code (viola `reglas.md` §8 y §12)
Bloques `""" ANTES """ / """ DESPUES """` dejados dentro del código (no en consola):
- `components/features/marketplace/PortfolioManager.tsx:4-10, 41-47`
- `app/[locale]/(app)/junior/projects/[id]/apply/page.tsx:105-108`
- `components/layout/SidebarEmpresaNuevo.tsx:3-4`
`reglas.md` dice borrarlos (git guarda el historial). No es "dato quemado" pero
salió en el barrido y contradice las reglas.

### 5.5 Huérfanos mock preservados (`src/components/_orphans/`)
`MockCompanyProjectsTab.tsx`, `MockCompanyProfileDetails.tsx`,
`MockPublishedProjectsSection.tsx`, `MockCompanyPerfilPage.tsx`,
`MockAdminDashboard.tsx`, `MockAdminCompanies.tsx`. Contienen datos 100% falsos
(DeFi/RAG/Fintech, "Aether Dynamics", redes y cédulas inventadas). **No se
importan en runtime** (verificado), así que no engañan al usuario; quedan por
decisión del equipo (`docs/deuda-tecnica-mocks.md`). Se borran cuando madure.

---

## 6. Lo que SÍ es real (para descartar)

- **Admin** (`(admin)/admin/*`): users, validations (egresados/empresas),
  projects, settings, dashboard → todo vía `src/lib/admin/queries.ts` con
  `service_role` + `requireRole('admin')`. Sin datos quemados de display.
- **Perfil de empresa** (`empresario/perfil`, `formulario-empresa`): real vía
  `src/lib/company/actions.ts`.
- **Proyectos publicados del empresario**: real vía `src/lib/projects/dashboard.ts`.
- **Catálogos legítimos (Cat. F, NO son hallazgo):** `MODALIDADES`, `MONEDAS`,
  `PLAZO_MIN/MAX_DIAS` (`lib/projects/schemas.ts`); `COMPANY_TYPES`,
  `OPERATING_SCOPES` (`lib/company/schemas.ts`); `NIVELES_TECNICOS`
  (`lib/ai/schemas.ts`); enums admin (`lib/admin/queries.ts`).
- **Few-shot en prompts de IA** (`lib/ai/provider.ts`): los ejemplos ("algo como
  Uber pero para fontaneros", stacks de ejemplo) son guía del modelo, no datos de
  negocio renderizados. Legítimo.
- **`??` defensivos** en `lib/company/actions.ts`, `lib/projects/actions.ts`:
  coalescen a `''`/`[]`/`null` para datos faltantes de la BD; no fabrican datos.

---

## 7. Tabla maestra de archivos afectados

| Archivo | Cat. | Severidad |
|---|---|---|
| `lib/constants/mockData.ts` | A | Crítico (raíz) |
| `lib/DemoDataContext.tsx` | A,B | Crítico (raíz) |
| `app/[locale]/(app)/junior/page.tsx` | A | Crítico |
| `app/[locale]/(app)/marketplace/page.tsx` | A | Crítico |
| `app/[locale]/(app)/applications/page.tsx` | A | Crítico |
| `app/[locale]/(app)/junior/projects/page.tsx` | A | Crítico |
| `app/[locale]/(app)/junior/projects/[id]/page.tsx` | A | Crítico |
| `app/[locale]/(app)/junior/projects/[id]/apply/page.tsx` | A | Crítico |
| `components/features/marketplace/PortfolioManager.tsx` | A | Crítico |
| `app/[locale]/(company)/empresario/CompanyDashboardClient.tsx` | A | Crítico |
| `app/[locale]/(company)/empresario/postulaciones/page.tsx` | A | Crítico |
| `app/[locale]/showcase/page.tsx` | A | Medio (reachable por URL) |
| `components/layout/Navbar.tsx` | A,D | Medio/Bajo |
| `components/features/marketplace/ProjectFilters.tsx` | C | Bajo |
| `components/features/auth/OnboardingRoleForm.tsx` | D | Bajo |
| `components/features/auth/RoleSelector.tsx` | D | Bajo |
| `components/layout/AdminShell.tsx` | D | Bajo |
| `components/layout/SidebarAdmin.tsx` | D | Bajo |
| `components/features/auth/OAuthButtons.tsx` | E | Bajo |
| `components/features/marketplace/PortfolioManager.tsx` (comentarios) | — | Bajo (limpieza) |
| `app/.../apply/page.tsx` (comentarios) | — | Bajo (limpieza) |
| `components/layout/SidebarEmpresaNuevo.tsx` (comentarios) | — | Bajo (limpieza) |
| `_orphans/*` (6 archivos) | A | Nulo (no en runtime) |

---

## 8. Recomendaciones priorizadas (no ejecutadas — requieren tu aprobación)

1. **Construir el backend del egresado (lo único que cierra el hueco real):**
   crear `lib/marketplace/` (listar proyectos `abierto` desde Supabase) y
   `lib/applications/` (server action de postulación → tabla real con el usuario
   autenticado). Migrar `/marketplace`, `/junior`, `/applications`,
   `/junior/projects*` y `apply` a esas queries. Esto requiere coordinación de BD
   con Samir (protocolo de migraciones de `CLAUDE.md`).
2. **Reemplazar las postulaciones del empresario** (`CompanyDashboardClient` y
   `postulaciones/page.tsx`) por el flujo real; eliminar `MOCK_MOCKUP_CANDIDATES`,
   las stats 1248/452/84/12, el embudo y la paginación falsos.
3. **Retirar `DemoDataContext` del `(admin)/layout.tsx`** (no se usa) para no
   inducir a error.
4. **Gatear `/showcase`** a entornos no-producción.
5. **Quitar el punto de notificación falso** del `Navbar` hasta que haya fuente real.
6. **Limpieza barata** (no bloquea demo): strings a i18n (§5.2), extraer rangos de
   presupuesto (§5.1), borrar código comentado (§5.4), corregir
   `docs/deuda-tecnica-mocks.md` (§4.2).

---

## 9. Límites de esta auditoría (honestidad)

- **[Seguro]** Todo lo de Cat. A/B citado tiene evidencia archivo:línea directa.
- **No verifiqué en runtime**: no levanté la app; la afirmación "el egresado ve
  datos falsos" se basa en lectura estática del flujo de datos (provider →
  hook → render), que es inequívoca, pero no la confirmé con la app corriendo.
- **i18n (`messages/`) y `supabase/`: AUDITADOS** en la extensión — ver §10 y §11.
- El conteo de severidades es mi criterio; ajústalo según qué penaliza el jurado.

---

## 10. Extensión — i18n (`messages/es.json` y `en.json`)

Sospecha confirmada: **hay datos mock disfrazados de labels de i18n**. Lo que
decide la severidad es si la clave la consume un componente **vivo** o solo un
huérfano. Lo verifiqué clave por clave.

### 10.1 CRÍTICO — cifras falsas renderizadas en runtime (Cat. A)

**Landing pública — `src/app/[locale]/page.tsx:108-124`** (namespace `Landing`):
| Clave (`messages`) | Valor | Se muestra como |
|---|---|---|
| `Landing.statsProjectsNumber` (`es.json:67`) | `+500` | "Proyectos Completados" |
| `Landing.statsTalentNumber` (`:69`) | `+1,200` | "Desarrolladores Registrados" |
| `Landing.statsCompaniesNumber` (`:71`) | `+150` | "Empresas Aliadas" |

> **Esto es lo más visible de toda la auditoría.** Es la portada pública. Con la
> BD vacía, afirmar "+1,200 desarrolladores" y "+500 proyectos completados" es una
> cifra inflada/falsa — justo lo que el brief penaliza. **Corrige mi nota previa:**
> el barrido de landing dio la página por "limpia" porque las stats "salen de
> i18n"; precisamente por salir de i18n como números fijos, son mock-como-real.

**`CompanyPostulations` (página viva `empresario/postulaciones/page.tsx`):**
| Clave | Valor | Línea |
|---|---|---|
| `totalApplicantsSub` | `"+12% este mes"` | `es.json:856` |
| `pendingReviewSub` | `"Promedio 4h de espera"` | `:858` |
| `selectedSub` | `"Meta 80% alcanzada"` | `:860` |
| `hiredSub` | `"3 nuevos hoy"` | `:862` |
| `aiMatchDesc` | `"...ha identificado 5 nuevos talentos..."` | `:875` |

Refuerzan §3.4: además de los números 1248/452/84/12 hardcodeados en JSX, los
sublabels de "tendencia" también son métricas inventadas, aquí desde i18n.

### 10.2 MEDIO — fallback inventado en componente vivo (Cat. B)
`EmpresaPerfil.sidebarHeader = "Global Corp"` (`es.json:765`) se usa en
`CompanyProfileSidebar.tsx:83` como `{company?.name || t('sidebarHeader')}`: si un
perfil real no tiene nombre, el sidebar muestra "Global Corp". Debería ser un
texto neutro ("Tu empresa"), no un nombre de empresa falso.

### 10.3 BAJO — contenido mock como i18n MUERTO (solo lo usan huérfanos)
Estas claves del namespace `EmpresaPerfil` solo las referencian
`_orphans/MockCompanyProfileDetails.tsx` y `_orphans/MockCompanyProjectsTab.tsx`
(no están en runtime). Son i18n muerto que acompaña a código muerto:
- `projectDeFiTitle/Desc`, `projectRAGTitle/Desc`, `projectFintechTitle/Desc` (`:799-804`)
- `missionText` (`:796`), `cultureAsync/Settlement/ElevationTitle+Desc` (`:809-814`)
- `freelancersHired` (`:816`), `projectsInCourse` (`:829`), `appsReceived` (`:838`)
- `projectFutureDesc = "+50 Nuevos Proyectos en Preparación"` (`:806`)
- `companyName = "FWD Soluciones Tecnológicas"` (`:790`), `tagline = "...desde 2018."`
  (`:791`), `statProjects/Talent/Rating` (`:792-794`) — **sin consumidor vivo**.
- `menuActualizarPlan` (`:847`), `actualizarPlanToast = "...en simulación"` (`:848`).

**Recomendación:** se borran junto con los huérfanos que las usan (no antes, o
romperías el build de los huérfanos). No engañan al usuario hoy.

### 10.4 LEGÍTIMO (descartar)
- `fullNamePlaceholder = "Juan Pérez"` (`:115`), `fieldNamePlaceholder = "Ej.
  TechFlow Solutions"` (`:348`): son **placeholders de formulario** (pistas), no
  datos renderizados como reales. Correcto.
- `Footer.tagline` (namespace `Footer`, no `EmpresaPerfil`): copy genérico, no la
  tagline falsa "desde 2018". Correcto.
- `badgeVersion = "FWD Talent Marketplace v1.0"`: etiqueta de versión/marca. OK.
- **Nota:** `en.json` espeja `es.json` en todas estas claves (mismos números y
  contenido mock en inglés). Los hallazgos aplican a ambos idiomas.

---

## 11. Extensión — `supabase/` (migraciones y seeds)

**Buena noticia, y zanja una duda de fondo:** la BD real **no** tiene sembrados
los usuarios/empresas/proyectos falsos del frontend. "TechFlow", "Juan Pérez",
los proyectos DeFi — **nada de eso existe en Supabase**; viven solo en el mock del
cliente.

### 11.1 Seeds = catálogos legítimos (Cat. F, no es hallazgo)
`supabase/migrations/20260608000006_seed_data.sql` siembra **solo catálogo/config**:
- `configuracion_sistema`: valores reales de negocio (cupo participaciones=3,
  strikes=3, plazos 5/15 días, intentos login=5, bloqueo 30 min, tamaños de
  archivo). (`:7-16`)
- `areas_negocio` (10, RF-20) (`:19-30`), `categorias` (10, RF-19) (`:33-37`),
  `tecnologias` (~52) (`:40-52`).
- `20260608000002_seed_roles.sql`: 3 roles (`administrador`, `egresado`,
  `empresario`). Legítimo.
- `supabase/seeds/` está **vacía** (solo `.gitkeep`). No hay seed de datos de prueba.

### 11.2 Consecuencia accionable
Los catálogos `areas_negocio`, `categorias`, `tecnologias` **ya están en la BD** y
el wizard de proyectos del empresario sí los consume (`lib/projects/actions.ts`).
Pero el filtro de stack del **marketplace del egresado** deriva su lista de los
stacks de los proyectos *mock* (`marketplace/page.tsx:31-35`) en vez de leer
`tecnologias` de la BD. Cuando se construya el backend del egresado (§8.1),
conviene alimentar esos filtros desde las tablas de catálogo reales, no recrearlos.

### 11.3 Verificación remota fila por fila (certeza total)
Se consultó la BD remota (solo lectura, con visto bueno del dueño) el 2026-06-16.
Conteos y muestreo de contenido de las tablas de datos:

| Tabla | Filas | Veredicto |
|---|---|---|
| `usuarios` | 28 | Cuentas reales del equipo FWD + 2 QA (`test.egresado@fwd.edu`, `test.empresario@fwd.edu`). **Ningún "Juan Pérez/juan.perez@fwd.edu" del mock.** |
| `estudiantes` | 9 | Todos limpios: `reputacion=null`, `proyectos_completados=0`, `participaciones_activas=0`. Sin métricas infladas. |
| `empresarios` | 6 | Reales de prueba (TECH-CPX, Empresa Test, rofersaTech, DevSolutions, trioTeam, "Mario darío"). **Ningún "TechFlow Solutions/Innovatech/Global Corp/FWD Soluciones".** |
| `proyectos` | 4 | Reales, `generado_por_ia=true` (joyería, mariscos, clínica dental, alitas). **Ningún DeFi/RAG/Fintech del mock.** |
| `participaciones` / `contrataciones` | 0 / 0 | Confirma a nivel BD que postular (egresado) **no escribe nada**. |
| `areas_negocio`/`categorias`/`tecnologias`/`roles`/`configuracion_sistema` | 10/10/52/3/8 | Catálogo seed, legítimo. |

**Conclusión [Seguro]:** el universo mock del frontend **no existe en Supabase**.
La BD contiene solo datos reales/orgánicos de prueba del equipo. Sube de "ninguna
migración inserta datos falsos" a "verificado fila por fila: no hay datos falsos".

### 11.4 Contaminación menor del mock en datos reales (Cat. B, nuevo)
Varios `empresarios` reales tienen valores que vienen **textualmente del mock**
(`mockData.ts` comp-1): `sitio_web = "https://techflow.io"` y
`cedula = "3-101-234567"` repetidos en ≥3 registros distintos. Es el placeholder
del formulario filtrándose como dato real (testers copiaron el ejemplo, o el form
lo prellenó). No es grave, pero ensucia datos reales y refuerza la recomendación
de §10.4: los placeholders no deben ser valores plausibles copiables.

### 11.5 Observación de integridad (fuera de "datos quemados", anotada)
Varias filas de `usuarios` tienen `id_rol = null` (incluido el dueño) pese a
`estado_cuenta='activa'`: usuarios que no completaron onboarding/asignación de
rol. No es dato falso; es un hueco de integridad que conviene revisar aparte.

---

## 12. Tabla maestra — adiciones de la extensión

| Archivo / clave | Cat. | Severidad |
|---|---|---|
| `app/[locale]/page.tsx:108-124` + `Landing.stats*Number` (`es/en.json:67-71`) | A | **Crítico (portada pública)** |
| `CompanyPostulations.*Sub` + `aiMatchDesc` (`es.json:856-875`) | A | Crítico (refuerza §3.4) |
| `EmpresaPerfil.sidebarHeader "Global Corp"` (`:765`) → `CompanyProfileSidebar.tsx:83` | B | Medio |
| `EmpresaPerfil` proyectos/cultura/historial mock (`:790-848`) | A | Bajo (i18n muerto) |
| `supabase/migrations/*seed*` | F | Nulo (catálogo legítimo) |

**Recomendación añadida:** sustituir las 3 stats de la landing por (a) cifras
reales calculadas desde Supabase, o (b) si aún no hay volumen, copy honesto sin
números inventados. Es la corrección de mayor impacto visual y la de menor costo.
