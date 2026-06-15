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
