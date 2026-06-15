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
  - **Pendiente (fase final):** `CompanyProfileForm` aún sincroniza el mock
    `StateContext` (`updateCompany`).

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
