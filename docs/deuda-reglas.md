# Deuda con `reglas.md`

Registro de incumplimientos conocidos de `reglas.md` que **siguen pendientes** en el repo,
con su causa y cómo resolverlos. La fuente de verdad es siempre el brief oficial
`Marketplace_FWD_Brief.pdf`; las referencias `§x.y` apuntan a sus secciones.

> Última actualización: 2026-06-04 · Contexto: integración de UI rescatada + tokens FWD.

## Cómo leer esta tabla

- **Estado** `🟠 bloqueada` = depende de una fuente o decisión externa.
  `🟡 alcance` = se dejó fuera a propósito (fase posterior o decisión de diseño).
- Cada ítem dice **a qué se debe** y **qué falta** para cerrarlo.

---

## 1. Bloqueadas por el brief oficial (PDF)

### D-01 · Bloque oklch canónico §5.5 no está pegado tal cual
- **Regla:** §5.5 — el bloque oklch completo del brief se pega *"tal cual"* en `src/app/globals.css`.
- **Estado:** 🟠 bloqueada.
- **A qué se debe:** no disponemos del `Marketplace_FWD_Brief.pdf` para copiar el bloque literal.
  El `globals.css` actual (del bootstrap) es una versión hecha a mano: hex para la marca + oklch
  para neutrales a 245°. Funciona, pero no es el bloque oficial.
- **Qué falta:** quien tenga el PDF pega el bloque §5.5 literal, manteniendo `@theme inline`.
  Se pueden agregar tokens encima, pero los del brief no se modifican.

### D-02 · `#ffffff` puro como foreground de tokens
- **Regla:** §5.2 — prohibido `#000` / `#fff` puros; neutrales en oklch tintados a 245°.
- **Estado:** 🟠 bloqueada (ligada a D-01).
- **A qué se debe:** `globals.css` (del bootstrap, no del rescate) define
  `--primary-foreground`, `--secondary-foreground`, `--warning-foreground`,
  `--magenta-foreground` como `#ffffff`. También `--accent-foreground` / `--highlight-foreground`
  usan `#1a1a1a`, que no está tintado a 245°.
- **Qué falta:** sustituir por neutrales tintados (ej. blanco → `oklch(0.99 0.005 245)`,
  negro → `oklch(0.18 0.01 245)`). Conviene hacerlo junto con D-01 para no tocar la base dos veces.

---

## 2. Decisiones de alcance

### D-03 · Strings hardcoded en la página de showcase
- **Regla:** §4 / §11 — cero strings hardcodeados; todo a `messages/{es,en}.json`.
- **Estado:** 🟡 alcance.
- **A qué se debe:** `src/app/[locale]/showcase/page.tsx` es una **página de desarrollo**
  (catálogo visual de componentes), no una pantalla del MVP. i18n-izar sus textos
  ("Botones", "Default", etc.) ensucia `messages/` con copy que no es de producto.
- **Qué falta — decidir una:**
  1. **Borrar el showcase** antes del entregable (era una herramienta de verificación), o
  2. mantenerlo como dev-only e i18n-izarlo, o
  3. moverlo fuera de `src/app` para que no entre al build de producto.

### D-04 · CTAs y pills sin `rounded-full`
- **Regla:** §5.6 — "CTAs principales y pills en `rounded-full`".
- **Estado:** 🟡 alcance (estético).
- **A qué se debe:** los botones rescatados usan `rounded-lg` y los badges `rounded-4xl`.
  Cambiarlo afecta el look de todos los botones a la vez; se dejó para validación visual previa.
- **Qué falta:** decisión de diseño. Si se aprueba, ajustar `buttonVariants` (radio de CTAs)
  y `badgeVariants` a `rounded-full`.

---

## 3. Fases posteriores del proyecto

### D-05 · Sin tests (Vitest)
- **Regla:** §10 / §11 / §17 — Vitest sobre la lógica pura de `lib/`; "cero tests" descalifica.
- **Estado:** 🟡 alcance (depende de fase backend).
- **A qué se debe:** lo rescatado son componentes **presentacionales** (UI), sin lógica testeable.
  La lógica real (matching, filtros, validaciones Zod, server actions con `Result<T,E>`)
  vive en `lib/` y **aún no existe**, porque va sobre Supabase y no se ha integrado.
- **Qué falta:** al construir `lib/` (§6, §7), escribir los Vitest correspondientes.
  Coverage deseado en `lib/`: 50% (no exigido).

---

## 4. Convenciones en conflicto

### D-06 · Archivos en `src/components/ui/` en minúscula
- **Regla:** §9 — `PascalCase.tsx` para componentes.
- **Estado:** 🟡 alcance (conflicto de convenciones).
- **A qué se debe:** §4.3 fija **shadcn/ui**, cuyo CLI genera los archivos base en minúscula
  (`button.tsx`, `card.tsx`, `select.tsx`). Renombrarlos a PascalCase rompería el flujo de
  `npx shadcn add ...` y se desalinea del estándar de la librería.
- **Qué falta:** se asume como **excepción documentada**: los primitivos de `ui/` siguen la
  convención de shadcn (minúscula); el resto de componentes (`features/`, `layout/`) sí usan
  `PascalCase.tsx` según §9.

---

## Resumen

| ID | Tema | Regla | Estado | Desbloquea con |
|----|------|-------|--------|----------------|
| D-01 | Bloque oklch §5.5 | §5.5 | 🟠 | PDF oficial |
| D-02 | `#fff` puro en tokens | §5.2 | 🟠 | PDF oficial (con D-01) |
| D-03 | Strings del showcase | §4/§11 | 🟡 | Decidir destino del showcase |
| D-04 | `rounded-full` en CTAs | §5.6 | 🟡 | Decisión de diseño |
| D-05 | Tests Vitest | §10/§11 | 🟡 | Fase backend (`lib/`) |
| D-06 | Nombres en `ui/` | §9 | 🟡 | Excepción documentada (shadcn) |

> Lo ya resuelto (paleta FWD aplicada, colores/strings de componentes tokenizados,
> Navbar/Footer con i18n, motion tokens, Button con variants FWD) no aparece aquí:
> esta es solo la lista de lo que **falta**.
