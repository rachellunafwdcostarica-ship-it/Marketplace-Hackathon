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

## Huérfanos (código muerto preservado)

- `src/components/_orphans/MockPublishedProjectsSection.tsx`
  - Era la sección "Mis proyectos publicados" cuando usaba `useAppState()`
    (mock de `StateContext`), con su botón "Cerrar proyecto" (mock).
  - **No se importa en ningún lado.** Solo referencia.
  - **Qué hacer en el futuro:** borrarlo. La funcionalidad real ya vive en
    `PublishedProjectsBoard`. git conserva el historial igual.

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

## Huérfanos (código muerto preservado)

- `src/components/_orphans/MockAdminDashboard.tsx`
  - Era el dashboard del admin (`/admin`) cuando usaba `useAppState()` (mock de
    `StateContext`): stats, empresas pendientes y proyectos activos en memoria.
  - **No se importa en ningún lado.** Solo referencia.
  - **Qué hacer en el futuro:** borrarlo cuando el dashboard real madure. git
    conserva el historial igual.

## Mocks que SIGUEN en uso (no se tocaron — fuera de esta tarea)

Estas páginas del admin siguen leyendo de `useAppState()` / `StateContext` y son
de otras tareas (verificación de empresas y moderación de proyectos). **No** se
orfanaron para no dejar sus rutas en 404 sin reemplazo real:

- `src/app/[locale]/(admin)/admin/companies/page.tsx` — verificación de empresas.
- `src/app/[locale]/(admin)/admin/projects/page.tsx` — moderación de proyectos.

**Qué hacer en el futuro:** reconstruir cada una con datos reales en su propia
tarea y, recién entonces, orfanar/borrar su versión mock.
