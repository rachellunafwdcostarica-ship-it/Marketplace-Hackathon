# Barry — tareas independientes (cero / mínima coordinación)

> **Para:** Barry. **De:** auditoría re-verificada contra HEAD `e62c6f9` (18-jun).
> **Complementa** `docs/PlanParaBarry.md` (el plan completo). Este documento extrae **solo** lo que Barry puede
> hacer **sin coordinar con otros dueños de módulo ni con la BD compartida**.

---

## La verdad incómoda primero

`PlanParaBarry.md` está diseñado para que Barry tome **lo transversal** (infra, contratos, BD). **Lo transversal
es coordinación por definición.** De las 21 tareas del plan, **ninguna es 100% independiente** tal como están
escritas: casi todas nombran a Samir/Errol/Fressia/Rachel/María del Sol/equipo en su línea de "Dependencias".

Este documento hace lo único honesto posible: **separa, dentro de esas tareas, la pieza *greenfield* que Barry
hace solo** de la pieza de *wiring/apply* que vive en otro módulo o en la BD. Y la ordena por cuánta coordinación
queda realmente.

**Tres niveles (leelos como semáforo):**
- **🟢 Tier 1 — Independiente puro.** Barry lo hace y queda hecho. Nadie tiene que aprobar ni aplicar nada.
- **🟡 Tier 2 — Independiente con aviso.** Barry lo hace solo; solo avisa al equipo (no pide permiso).
- **🟠 Tier 3 — Autoría independiente, aplica Samir.** Barry escribe el artefacto **solo** (un `.sql`, unos
  tests); el `apply`/merge es un paso aparte. El trabajo de Barry es solitario, pero el efecto necesita un
  segundo paso. *(Como tú eres Samir, en la práctica este paso lo cierras vos mismo.)*

> Todo lo que **no** está aquí (P1.1–P1.5, P2.5, P2.7 fixes, P2.8, P3.3, P3.4) es **intrínsecamente coordinado**
> y se queda en el plan principal.

---

## 🟢 Tier 1 — Independiente puro

### T1.1 · Score de matching (RF-61/RF-62) — función pura + tests `[del plan: P3.2]`
**Lo más independiente del documento.** Es greenfield total: tablas que ya existen, sin migración, sin tocar
archivos de nadie.

- **Qué entregar:** `src/lib/marketplace/match-score.ts` con una **función pura** `computeMatchScore(...)` que,
  dado un proyecto (`proyecto_tecnologias`) y candidatos (`habilidades_tecnicas` de estudiantes con
  `estado_verificacion='verificado'`), devuelva un **ranking explicable** (intersección de tecnologías + el
  desglose del porqué). + `src/lib/marketplace/match-score.test.ts` (Vitest).
- **Decisión propia de Barry (no necesita a nadie):** la ponderación del score (solo intersección, o + nivel de
  habilidad / `estudiantes.reputacion` / `proyectos_completados`). El SRS pide "EXPLICABLE" → el retorno debe
  incluir el motivo de cada match. Documentar la fórmula en el JSDoc.
- **Por qué es independiente:** archivo nuevo, sin importadores previos, sin BD. El único acoplamiento (mostrarlo
  en la UI del empresario) **queda fuera de alcance** y se delega a Errol como tarea separada.
- **DoD:** `vitest run` verde · función pura (sin I/O) · sin strings hardcoded de UI · sin `any`.

### T1.2 · Borrar el duplicado muerto `src/lib/supabase/projects.ts` `[del plan: P2.7]`
- **Qué:** `getProjects`/`createProject`/`updateProject` en `src/lib/supabase/projects.ts` **no tienen un solo
  importador** (verificado por grep) — es una 2ª implementación divergente de `lib/portfolio/actions.ts`, muerta.
- **Acción:** confirmar 0 importadores (`grep -r "supabase/projects"` / los 3 nombres) y **borrar el archivo**.
- **Por qué es independiente:** nadie lo usa; borrarlo no rompe nada. No toca BD ni módulos vivos.
- **DoD:** `typecheck`/`build` verdes tras el borrado.

### T1.3 · Auditoría de lectura `knip` + `jscpd` (one-shot) `[del plan: P2.7]`
- **Qué:** correr `npx knip` (exports/archivos sin uso) y `npx jscpd src` (copy-paste) **sin agregarlas a
  `package.json`** (son deps fuera del brief §8.2). Producir un **reporte** (`docs/code-health-report.md`).
- **Por qué es independiente:** es **lectura pura**. No modifica código de nadie; solo genera el inventario que
  después alimenta los fixes por módulo (esos sí coordinados).
- **DoD:** reporte commiteado; los hallazgos automatizables se proponen para CI en T2.1.
- **Nota:** los **fixes** que salgan (extraer `BRAND_NAME`, dedup 500/800, etc.) **no** son independientes —
  tocan módulos con dueño. Aquí solo entra el *audit*.

### T1.4 · Borrar el motor mock muerto `[del plan: P2.6]`
- **Qué:** `grep useDemoData` halla 0 consumidores (solo la definición + el shim deprecado `StateContext.tsx`).
  Borrar `DemoDataContext.tsx`, `StateContext.tsx`, `mockData.ts` y quitar `<DemoDataProvider>` de
  `(app)/layout.tsx:46-51`.
- **Por qué es (casi) independiente:** wiring muerto; nadie lo consume (confirmado 0 en `(company)`/`(admin)`).
- **Único matiz de coordinación (aviso, no permiso):** `(app)/layout.tsx` es un archivo **compartido** → hacerlo
  en una ventana donde nadie más lo tenga en vuelo, para no generar conflicto de merge. Por eso lo dejo en Tier 1
  pero con esta nota; si querés cero-riesgo de merge, coordiná el momento.
- **DoD:** `grep useDemoData` = 0 · `typecheck`/`build` verdes · la app autenticada sigue montando.

---

## 🟡 Tier 2 — Independiente con aviso

### T2.1 · CI no-bloqueante (GitHub Actions) `[del plan: P0.3]`
- **Qué:** crear `.github/workflows/ci.yml` que corra `npm ci` + `typecheck` + `lint` + `vitest run` +
  `next build` en PRs a `dev`, como **check NO-bloqueante** (no *required*). + quitar `--passWithNoTests` de
  `package.json:16` + agregar bloque `coverage`/`thresholds` a `vitest.config.ts`.
- **Por qué es independiente:** son archivos nuevos (`.github/` sin dueño) + 2 archivos compartidos de baja
  fricción. Como **no** es *required*, **no bloquea el PR de nadie** hasta que el equipo decida promoverlo.
- **Bonus inmediato:** este CI atrapa de una el `tsc` roto por `nodemailer`/`resend` sin instalar (`npm ci` los
  trae del lockfile) → cierra el síntoma de §8 del plan.
- **Qué dejar FUERA (es de equipo / Samir):** volverlo *required check*, el step de **paridad de migraciones** y
  el de **drift de `gen types`**. Marcarlos como item aparte del plan.
- **Aviso (no permiso):** decirle al equipo que el workflow existe y que en X semanas se propone volverlo
  *required*.
- **DoD:** el workflow corre verde en un PR de prueba; los 4 steps ejecutan; el check aparece como no-bloqueante.

---

## 🟠 Tier 3 — Autoría independiente, aplica Samir

> Barry escribe el artefacto **solo**; el `apply`/merge es un segundo paso. No es "cero coordinación" en el
> momento de aplicar, pero el trabajo de Barry no depende de nadie. Como vos sos Samir, cerrás el paso 2.

### T3.1 · `.sql` del fix de los dos triggers de reputación `[del plan: P2.3]`
- **Qué:** una migración nueva que reescriba `recalcular_reputacion` y `recalcular_reputacion_empresario` con
  `... AFTER INSERT OR UPDATE OR DELETE OF puntuacion` y `COALESCE(NEW.id_estudiante, OLD.id_estudiante)` /
  `COALESCE(NEW.id_empresario, OLD.id_empresario)`. Hoy borrar una evaluación nunca recalcula el promedio (bug
  duplicado en ambos, verificado en BD remota).
- **Independiente:** Barry escribe el `.sql` completo, listo para aplicar. **Apply = Samir.**

### T3.2 · `.sql` del fix de `initplan` en la policy de evaluaciones `[del plan: P2.2]`
- **Qué:** migración de una línea que cambie `auth.uid()` crudo por `(select auth.uid())` en el `WITH CHECK` de
  `evaluaciones_empresarios_insert_estudiante` (versión vigente: la recreada por `20260618120000`, líneas 21 y
  27-28). Elimina el WARN `auth_rls_initplan`.
- **Independiente:** Barry escribe el `.sql`. **Apply = Samir.**

### T3.3 · `.sql` del CHECK `1..5` en `calificacion_prototipo` `[del plan: P4]`
- **Qué:** `ALTER TABLE participaciones ADD CONSTRAINT participaciones_calificacion_prototipo_chk CHECK
  (calificacion_prototipo IS NULL OR calificacion_prototipo BETWEEN 1 AND 5)`. La tabla ganó 4 CHECKs en
  `20260618000000` pero ninguno sobre esta columna (verificado en BD remota).
- **Independiente:** Barry escribe el `.sql`. **Apply = Samir.**

### T3.4 · Set de evals deterministas del agente IA `[del plan: P2.4]`
- **Qué:** tests nuevos en `tests/` (Vitest) que ejerciten el agente con casos del banco
  `docs/agente-casos-conversacion.md` (incluida la regresión conocida del 15-jun) de forma determinista.
- **Independiente:** archivos nuevos en `tests/`, no tocan `proposal-ai/*` de Errol. *(El run real puede necesitar
  mockear el provider para ser determinista — parte del diseño del propio Barry.)*

### T3.5 · ADRs de decisión (texto, no código) `[del plan: P3.1, P3.5]`
- **Qué:** dos documentos de decisión cortos: (a) **padrón de egresados** (tabla local `egresados_fwd` vs API de
  FWD vs riesgo aceptado firmado — RNF-30); (b) **PDF del portafolio** (print-only + `window.print()` vs dep
  server-side — RF-15). Son criterio senior puro.
- **Independiente:** es redacción de criterio. La implementación que salga sí tiene dueño, pero la **decisión** es
  de Barry.

---

## Resumen ejecutivo

| Tier | Tarea | Toca a otro? |
|---|---|---|
| 🟢 | T1.1 Score de matching (función pura + tests) | No |
| 🟢 | T1.2 Borrar `supabase/projects.ts` muerto | No |
| 🟢 | T1.3 Audit `knip`/`jscpd` one-shot (reporte) | No |
| 🟢 | T1.4 Borrar motor mock muerto | Solo aviso (layout `(app)`) |
| 🟡 | T2.1 CI no-bloqueante + quitar `--passWithNoTests` | Solo aviso al equipo |
| 🟠 | T3.1 `.sql` triggers reputación | Apply = Samir |
| 🟠 | T3.2 `.sql` initplan policy | Apply = Samir |
| 🟠 | T3.3 `.sql` CHECK `calificacion_prototipo` | Apply = Samir |
| 🟠 | T3.4 Evals del agente IA (tests nuevos) | No (run puede mockear) |
| 🟠 | T3.5 ADRs (padrón egresados, PDF) | No (decisión) |

**Recomendación de arranque:** **T1.1** (mayor valor visible y cero fricción) → **T2.1** (vuelve verificable
todo lo demás y atrapa el `tsc` roto) → **T1.2/T1.3/T1.4** (limpieza barata) → los `.sql` de Tier 3, que como sos
Samir cerrás de una.
