# Deuda técnica — mocks pendientes de reemplazar por datos reales

> Este documento registra dónde quedan datos **mock** (de mentira, en memoria) en
> el dashboard del empresario, qué se reemplazó por datos reales y qué falta. La
> regla del proyecto es no dejar código muerto (`reglas.md` §8/§12); estos
> huérfanos quedan **por decisión explícita del equipo**, para que quien los
> escribió pueda recuperarlos, y se borran cuando la página madure.

## Qué se reemplazó por datos REALES

- **"Mis proyectos publicados"** del dashboard (`/empresa`) ahora lee la base de
  datos real:
  - Server actions: `src/lib/projects/dashboard.ts`
    (`getMyPublishedProjects`, `cancelProject`).
  - UI: `src/components/features/projects/PublishedProjectsBoard.tsx`
    (tarjetas + filtro por estado + modal de detalle + cancelar).
  - El stat **"Proyectos activos"** del dashboard también cuenta proyectos reales
    (`estado_efectivo === 'abierto'`).

- **Perfil del empresario** (`/empresario/formulario-empresa` y
  `/empresario/perfil`) ahora usa datos REALES de las tablas `empresarios` y
  `usuarios`:
  - Server actions: `src/lib/company/actions.ts` (`getCompanyProfile`,
    `getCompanyProfileForEdit`, `saveCompanyProfile`, `isCompanyProfileComplete`).
  - El **guard "perfil completo"** pasó a server-side (en `empresario/page.tsx` y
    `empresario/perfil/page.tsx`, con `isCompanyProfileComplete`), reemplazando
    los `useEffect` que leían `currentCompany.isProfileFilled` del mock.
  - `empresario/perfil/page.tsx` es server component + `CompanyPerfilClient`
    (cuerpo) con los datos reales mapeados a `Company`.
  - El **banner**, el **sidebar** y la pestaña **Proyectos** del perfil ya usan
    datos reales: el badge de verificación refleja `estado_verificacion`, se
    quitaron las stats y los tabs falsos, y la pestaña Proyectos reusa
    `PublishedProjectsBoard` (proyectos reales de `getMyPublishedProjects`).
  - `CompanyProfileDetails` ya muestra SOLO datos reales (descripción, datos de
    la empresa y representante); el showcase hardcodeado quedó en `_orphans`.
  - `CompanyProfileForm` ya **no** sincroniza el mock: guarda solo en la BD
    (`saveCompanyProfile`) y redirige; el perfil y el dashboard releen datos
    reales en el server. Se eliminó `updateCompany` de `StateContext` (sin uso).
    Todo el flujo de **perfil del empresario** quedó libre de mocks.

## Huérfanos (código muerto preservado)

- `src/components/_orphans/MockPublishedProjectsSection.tsx`
  - Era la sección "Mis proyectos publicados" cuando usaba `useAppState()`
    (mock de `StateContext`), con su botón "Cerrar proyecto" (mock).
  - **No se importa en ningún lado.** Solo referencia.
  - **Qué hacer en el futuro:** borrarlo. La funcionalidad real ya vive en
    `PublishedProjectsBoard`. git conserva el historial igual.

- `src/components/_orphans/MockCompanyPerfilPage.tsx`
  - Versión MOCK de la página de perfil del empresario: leía `currentCompany`
    del `StateContext` y usaba un `useEffect` para el guard "perfil incompleto".
  - Reemplazada por `empresario/perfil/page.tsx` (server, real) +
    `CompanyPerfilClient`.
  - **No se importa en ningún lado.** Solo referencia.

- `src/components/_orphans/MockCompanyProjectsTab.tsx`
  - Pestaña "Proyectos" MOCK del perfil (proyectos, filtros y avatares
    inventados, sin datos de BD).
  - Reemplazada por `PublishedProjectsBoard` (proyectos reales). Solo la
    referencia `MockCompanyPerfilPage`.

- `src/components/_orphans/MockCompanyProfileDetails.tsx`
  - Detalle MOCK del perfil: proyectos (DeFi/RAG/Fintech), historial de
    contratación falso (Aether Dynamics…), cultura y redes hardcodeadas; casi
    nada salía de la BD. Reemplazado por `CompanyProfileDetails` (datos reales).

## Mocks que SIGUEN en uso (no se tocaron — fuera de esta tarea)

Estos siguen saliendo de `useAppState()` / `StateContext` y **bloquean** que el
dashboard sea 100% real. No se tocaron porque exceden la tarea de proyectos:

- **Postulaciones recibidas** (`applications`) — sección derecha del dashboard.
- **Stats** "Total postulaciones" y "Contratados" — derivan de las postulaciones
  mock.
- El filtro de postulaciones usa los **proyectos mock** del contexto
  (`projects` de `StateContext`) para resolver `myProjectIds`.

**Qué hacer en el futuro:** reemplazar las postulaciones por el flujo real de
`participaciones`/`contrataciones` (RF-30s/40s, otra sección). Cuando eso exista,
`StateContext` para empresa queda obsoleto y se borra junto al huérfano de arriba.

---

# Panel admin

## Qué se reemplazó por datos REALES

- **Gestión de usuarios** (RF-63): nueva página `/admin/users` que lee la base de
  datos real (no `useAppState`).
  - Query: `src/lib/admin/queries.ts` (`listUsers`) — service_role +
    `requireRole('admin')`, con búsqueda por nombre/correo y filtros por rol y
    estado de cuenta.
  - UI: `src/app/[locale]/(admin)/admin/users/page.tsx` (RSC, tabla) +
    `src/components/features/admin/AdminUserFilters.tsx` (filtros, isla client).
- **Entrada del panel** `/admin`: antes renderizaba el dashboard mock; ahora
  redirige a `/admin/users`.
- **Validaciones** (`/admin/validations`) es un hub con pestañas:
  - **Egresados** (RF-64): `getPendingGraduateVerifications` + `verificarEgresado`.
  - **Empresas** (RF-17): `getPendingCompanies` + `verificarEmpresa` /
    `rechazarEmpresa` (datos reales). Reemplaza el mock de `/admin/companies`, que
    ahora **redirige** a `/admin/validations?tab=empresas`.

## Huérfanos (código muerto preservado)

- `src/components/_orphans/MockAdminDashboard.tsx`
  - Era el dashboard del admin (`/admin`) cuando usaba `useAppState()` (mock de
    `StateContext`): stats, empresas pendientes y proyectos activos en memoria.
  - **No se importa en ningún lado.** Solo referencia.
  - **Qué hacer en el futuro:** borrarlo cuando el dashboard real madure. git
    conserva el historial igual.

- `src/components/_orphans/MockAdminCompanies.tsx`
  - Era `/admin/companies` cuando "verificaba" empresas con `useAppState()` /
    `updateCompanyStatus` (mock en memoria, sin escribir en la BD).
  - Reemplazada por la pestaña **Empresas** de Validaciones (datos reales).
    `/admin/companies` ahora redirige allí. **No se importa en ningún lado.**

## Mocks que SIGUEN en uso (no se tocaron — fuera de esta tarea)

- `src/app/[locale]/(admin)/admin/projects/page.tsx` — moderación de proyectos,
  sigue leyendo de `useAppState()` / `StateContext`.

**Qué hacer en el futuro:** reconstruir la moderación de proyectos con datos
reales en su propia tarea y, recién entonces, orfanar/borrar su versión mock.
