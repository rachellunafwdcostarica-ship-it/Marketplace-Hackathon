# Plan de remediación — datos quemados → Supabase

> **Fecha:** 2026-06-16 · **Rama:** `samir` · Acompaña a `docs/auditoria-datos-quemados.md`.
> **Estado:** propuesta. Nada implementado. Requiere tu visto bueno por fase.

---

## Principio rector

El problema **no es la BD** — es que la UI sirve mock desde `localStorage`
(`DemoDataContext`) en vez de leer/escribir las tablas reales **que ya existen y
ya tienen datos**. La remediación es: **cablear cada pantalla a Supabase y borrar
el mock que reemplaza, pantalla por pantalla.**

### Hecho clave verificado: CERO migraciones necesarias

Consulté la BD remota (2026-06-16). Todo lo que la remediación necesita ya está:

| Pieza | Estado en BD |
|---|---|
| `participaciones` (postulación) | Tabla completa + enum `estado` + triggers de máquina de estados (`validar_transicion_participacion`), cupo (`validar_cupo_participaciones`) y `sync_postulaciones_pendientes`. RLS: `insert_egresado`, `select`, `update`. |
| `proyectos` (marketplace) | RLS `select` para `authenticated` (el egresado ya puede leer). |
| `proyectos_portafolio` + `portafolio_tecnologias` | Tablas completas. RLS CRUD `own` + select público. |
| Catálogos `areas_negocio`/`categorias`/`tecnologias` | Seed cargado (10/10/52). |

**Conclusión [Seguro]:** la remediación es 100% capa de aplicación — server
actions `Result<T,E>` + Zod (reglas §5/§7) y wiring de UI. **No se toca la BD**
salvo que durante la implementación aparezca un hueco puntual de columna/policy;
si pasa, se trata como migración aparte con tu aprobación (protocolo `CLAUDE.md`).

---

## Orden de prioridad (por impacto/visibilidad ÷ esfuerzo y dependencias)

```
Fase 0  Frenar la sangría        (sin BD, alto impacto visual)   ── independiente
Fase 1  Marketplace egresado     (solo lectura)                  ── base de la 2
Fase 2  Postulación + recepción  (escritura, el corazón)         ── depende de 1
Fase 3  Portafolio egresado      (escritura, autocontenido)      ── paralela a 2
Fase 4  Demolición del mock      (limpieza final)                ── incremental
```

Esfuerzo en tallas (S/M/L) **aproximadas** — verifícalas, no son horas exactas.

---

## Fase 0 — Frenar la sangría (lo que un jurado ve falso, ya)

Objetivo: que nada inventado quede visible a un revisor. Bajo esfuerzo, alto impacto.

| # | Acción | Archivo | Talla |
|---|---|---|---|
| 0.1 | Stats de la landing → conteos reales (`count` de `proyectos` abiertos, `estudiantes` verificados, `empresarios`) **o** copy honesto sin números | `app/[locale]/page.tsx:108-124` + `messages` `Landing.stats*` | S |
| 0.2 | Gatear `/showcase` a `NODE_ENV!=='production'` (o sacarla del routing) | `app/[locale]/showcase/page.tsx` | XS |
| 0.3 | Quitar el punto de notificación falso (`bg-magenta animate-pulse`) | `components/layout/Navbar.tsx:253` | XS |
| 0.4 | En `postulaciones`: borrar `MOCK_MOCKUP_CANDIDATES`, stats `1248/452/84/12`, embudo `30/60/95%`, paginación y "match score" inventados. Dejar la tabla guiada por datos reales (vacía hoy → empty state) | `empresario/postulaciones/page.tsx` | S |

> 0.1 es la corrección de **mayor impacto visual y menor costo** de todo el plan.
> Decisión tuya: ¿conteos reales (más honesto, hoy darían números chicos) o copy
> sin cifras? Ver "Decisiones".

---

## Fase 1 — Marketplace del egresado (solo lectura)

Objetivo: que el egresado vea los **proyectos reales abiertos**, no `mockProjects`.
Read-only ⇒ riesgo bajo, sin escritura, sin RLS de insert.

**Crear** `src/lib/marketplace/queries.ts`:
- `listOpenProjects(filtros)` → `proyectos` con `estado='abierto'` + join empresa
  (`empresarios.nombre_empresa`), tecnologías (`proyecto_tecnologias`→`tecnologias`),
  área/categoría. Devuelve `Result<Project[], E>`.
- `getOpenProjectDetail(id)` → detalle + tecnologías. `Result<Project, E>`.
- Catálogos para filtros: `listTecnologias()`, `listAreas()`, `listCategorias()`
  desde las tablas reales (hoy el filtro de stack se deriva del mock).

**Migrar a datos reales (RSC donde se pueda):**
- `app/[locale]/(app)/marketplace/page.tsx`
- `app/[locale]/(app)/junior/projects/page.tsx`
- `app/[locale]/(app)/junior/projects/[id]/page.tsx`

Talla: **M-L**. Dependencia: ninguna (las tablas y RLS select ya están).

---

## Fase 2 — Postulación + recepción (escritura, el corazón)

Objetivo: conectar egresado ↔ empresario con `participaciones` reales. Es la pieza
que más valor desbloquea y la de mayor riesgo/coordinación.

**Crear** `src/lib/applications/actions.ts`:
- `postularAProyecto({ idProyecto, cartaPostulacion, ... })` → INSERT en
  `participaciones` (estado `enviada`, `id_estudiante` del usuario actual). Zod +
  `Result`. Los triggers ya validan cupo (máx 3) y unicidad — la action traduce
  esos errores a copy amigable (reglas §7).
- `cambiarEstadoPostulacion(id, nuevoEstado)` (empresario): `en_revision`,
  `contratada`, `no_seleccionada` — respetando la máquina de estados (el trigger
  rechaza saltos inválidos).
- `retirarPostulacion(id)` (egresado): `retirada` desde `enviada`/`en_revision`.

**Crear** `src/lib/applications/queries.ts`:
- `getMisPostulaciones()` (egresado) y `getPostulacionesDeMisProyectos()` (empresario).

**Cablear y quitar mock:**
- `junior/projects/[id]/apply/page.tsx` (quitar `setTimeout` + `addApplication`).
- `(app)/applications/page.tsx` y `(app)/junior/page.tsx` (stats reales).
- `empresario/CompanyDashboardClient.tsx` (postulaciones recibidas + stats reales).
- `empresario/postulaciones/page.tsx` (tabla real; ya limpiada en 0.4).

Talla: **L**. Verificar en implementación: forma exacta del enum `estado` y que la
RLS `select` deje al empresario ver postulaciones de SUS proyectos (la policy
existe; confirmar el predicado). **Coordinación:** ver "Decisiones" (ownership flujo B).

---

## Fase 3 — Portafolio del egresado (escritura, autocontenido)

Objetivo: portafolio real, no `mockStudentPortfolio` en `localStorage`. Independiente
de la Fase 2 ⇒ puede ir en paralelo.

**Crear** `src/lib/portfolio/actions.ts` + `queries.ts`:
- CRUD sobre `proyectos_portafolio` (+ `portafolio_tecnologias`) del estudiante
  actual. `Result` + Zod. RLS CRUD `own` ya existe.

**Cablear y quitar mock:**
- `components/features/marketplace/PortfolioManager.tsx` (quitar `useDemoData`).
- `app/[locale]/(app)/junior/portfolio/*`.

Talla: **M**. Dependencia: ninguna.

---

## Fase 4 — Demolición del mock + limpieza (incremental + barrido final)

Se borra el mock **a medida que cada pantalla migra**; al final, barrido:

1. Borrar `lib/DemoDataContext.tsx`, `lib/constants/mockData.ts`, alias
   `lib/StateContext.tsx`, `MOCK_JUNIOR_NAME`; quitar `DemoDataProvider` de los 3
   layouts (`(app)`, `(company)`, `(admin)` — en admin nunca se usó).
2. Borrar `_orphans/*` y sus claves i18n muertas (`EmpresaPerfil` DeFi/RAG/Fintech,
   cultura, `freelancersHired`, etc. — ver auditoría §10.3).
3. `sidebarHeader: "Global Corp"` → copy neutro ("Tu empresa").
4. Limpiar contaminación del mock en datos reales: que los placeholders del
   formulario de empresa **no** sean valores plausibles copiables (`techflow.io`,
   `3-101-234567`) — ver auditoría §11.4.
5. i18n: `OnboardingRoleForm "Adelante"`, `RoleSelector` labels, `AdminShell ES/EN`,
   `Marketplace FWD` a un único `BRAND_NAME`. Hex de OAuth (opcional, marca de Google).
6. Borrar bloques comentados `ANTES/DESPUES` (`PortfolioManager`, `apply`,
   `SidebarEmpresaNuevo`, `Footer`) — reglas §8/§12.
7. Corregir `docs/deuda-tecnica-mocks.md` (afirma que `admin/projects` es mock; ya es real).

Talla: **M**.

---

## Tabla resumen de priorización

| Fase | Qué desbloquea | Esfuerzo | Riesgo | Migración |
|---|---|---|---|---|
| 0 | Credibilidad ante el jurado | S | Bajo | No |
| 1 | Egresado ve proyectos reales | M-L | Bajo | No |
| 2 | Postular y recibir (ambos roles) | L | Medio | No |
| 3 | Portafolio real | M | Bajo | No |
| 4 | Código limpio, cero mock | M | Bajo | No |

---

## Decisiones que necesito de ti antes de ejecutar

1. **Landing (0.1):** ¿conteos reales desde la BD (honesto, hoy son cifras chicas)
   o copy sin números mientras no haya volumen? Recomiendo **conteos reales**.
2. **Ownership del flujo B (Fase 2):** la memoria del proyecto lo daba como tarea
   de Santiago. La BD ya está lista; ¿las server actions/UI de postulación las
   tomo yo, o coordino con él para no pisar trabajo?
3. **Alcance ahora:** ¿hago el plan completo, o solo Fase 0 + Fase 1 como primer
   lote (lo que más mejora la demo con menor riesgo) y reevaluamos?

## Definition of Done por feature (reglas §11) — aplica a cada fase
TS sin errores · ESLint limpio · tests Vitest de la lógica nueva en `lib/` ·
textos en `es.json` + `en.json` · a11y básica · móvil 375px · commit conventional.

## Lo que este plan NO incluye
- Refactor del wizard de proyectos o del flujo de IA (ya son reales).
- Panel admin (ya es real).
- Mensajería, notificaciones, evaluaciones, strikes (tablas vacías, otra tarea).
- Verificación en runtime (levantar la app) — se hace al cerrar cada fase.
