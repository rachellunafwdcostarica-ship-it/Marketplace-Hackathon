# reglas.md — Reglas y restricciones del proyecto

Lee este archivo **completo antes de implementar o cambiar cualquier cosa**. Aplica a personas y a cualquier IA (Claude, Cursor, Copilot, Gemini).

Este archivo destila las **restricciones** del proyecto (stack, identidad visual, naming, prohibiciones, calidad) a partir del brief oficial `Marketplace_FWD_Brief.pdf` (FWD Talent, v1.0, 2026-05-27). Las **funciones** de la plataforma (flujos, roles, alcance) las define el `SRS_Plataforma_Talento_FWD` (v1.0, 2026-06-03), **fuente de verdad funcional vigente**. Resolución de conflictos: en restricciones, stack e identidad gana el brief; en funcionalidad, flujos y alcance gana el SRS. Las referencias entre paréntesis (§4.1, §5.5, etc.) apuntan a las secciones del brief, salvo que se indique "SRS".

Regla previa: el proyecto puede integrarse al producto vivo `jobs.fwdcostarica.com`, así que el código tiene que poder convivir con el de FWD Talent desde el día 1. Por eso el stack y la identidad visual no se negocian.

---

## 1. Stack no negociable (§4)

- **Next.js 15**, App Router. Server Components por defecto; `'use client'` solo donde haga falta interactividad (§4.1).
- **React 19** (viene con Next 15), **Node.js 20 LTS o superior**, **npm** como package manager (§4.8).
- **TypeScript** en modo `strict: true` con `noUncheckedIndexedAccess` y `exactOptionalPropertyTypes` (§4.1).
- **Supabase**: Postgres + Auth (OAuth) + RLS + Storage (§4.2).
- **Tailwind CSS v4** (la de `@theme inline` en CSS, **no** v3) (§4.3).
- **shadcn/ui** como base de componentes (§4.3).
- **next-intl** para `es` + `en`, mínimo bilingüe (§4.4).
- **Zod** en todas las fronteras (§4.5).
- **Vitest** para unit tests de lógica pura en `lib/`; Playwright opcional para E2E (§4.6).
- **ESLint + Prettier + Husky + lint-staged + commitlint** (Conventional Commits) (§4.7).
- **Vercel** para deploy, con URL pública obligatoria (§4.9).

Lista de instalación canónica: ver §8.2 del brief. No agregar dependencias que no estén en el brief sin justificarlo y dejarlo documentado.

### Prohibiciones de stack (§13 FAQ, §4)
- **Prohibido Prisma** o cualquier ORM sobre Supabase: usar el cliente Supabase nativo.
- **Prohibido Material UI, Chakra, Mantine**: shadcn/ui está fijado.
- Otro framework de animación distinto de CSS / `tw-animate-css`: **Framer Motion permitido solo para el bonus 2.0**, no "porque sí" (CSS variables + `transition` cubre el 90%).

---

## 2. TypeScript (§4.1)

- `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` habilitados.
- **Prohibido `any`.** Si es inevitable, `unknown` con type guard explícito.
- **`@ts-ignore` / `@ts-expect-error`: evitar.** El brief los permite solo con un comentario que justifique el porqué (§4.1). Regla práctica del equipo: por defecto **se arregla el tipo**; solo como último recurso, y siempre con el comentario justificando al lado.

---

## 3. Identidad visual — no negociable (§5)

Cada decisión visual está fijada. Lo único abierto a creatividad es lo que el brief marca `[LIBRE]`.

### Paleta (hex anclados, §5.1)
| Token | Hex | Rol |
|---|---|---|
| `--primary` | `#0A6CB9` | Azul FWD · botones, links, acento |
| `--secondary` | `#662D91` | Púrpura · profundidad, headings dark |
| `--accent` | `#20BEC6` | Teal · success, complemento |
| `--highlight` | `#FFCB05` | Amarillo · destacar, badges |
| `--warning` | `#F7901E` | Naranja · atención, entrevistas |
| `--magenta` | `#EC008C` | Magenta · momento, destructive |

La paleta es multicolor por diseño. No reducir a "un color + neutro". El morado es decisión institucional.

### Neutrales (§5.2)
- Neutrales en **oklch tintados a 245° azul FWD**, chroma ≤ 0.01.
- **Prohibido `#000` y `#fff` puros.** Siempre tokens tintados.

### Tipografía (§5.3)
- Display / titulares: **Archivo Narrow**. Cuerpo / UI: **Figtree**. Mono: **JetBrains Mono**.
- Importación con **`next/font`** (nunca `<link>` ni `@import` en CSS).
- Escala canónica `text-xs`→`text-7xl` según §5.3. Display solo Bold/ExtraBold con `tracking-tight`.

### Motion tokens — no negociables (§5.4)
- `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)`
- `--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1)`
- `--duration-fast: 160ms`, `--duration-base: 220ms`, `--duration-slow: 320ms`
- Usar siempre `duration-[var(--duration-fast)] ease-[var(--ease-out)]`, no las defaults del browser.

### Tokens completos (§5.5)
El bloque oklch completo de §5.5 se pega **tal cual** en `src/app/globals.css`, manteniendo `@theme inline`. Esos tokens no se modifican (se pueden agregar otros encima).

### Patrones canónicos (§5.6 + Apéndice A)
- **PageTitle** con punto azul firma `.` al final del título (`<span class="text-primary">.</span>`) en toda pantalla principal. Componente listo en Apéndice A.
- **InsightSection** como wrapper de secciones (eyebrow + título + descripción).
- **Button** con variants FWD: `default`, `secondary`, `accent`, `magenta`, `warning`, `highlight`, `outline`, `ghost`, `link`. CTAs principales y pills en `rounded-full`.
- **FwdGeoBackdrop** (paralelogramos fast-forward) en pantallas brand expresivas.
- **Status pills** tokenizadas para estados.

### Tres registros visuales (§5.7)
- **Brand expresivo**: landing pública, login, celebración, empties "wow". Fondo `bg-secondary` + geometría FWD + display grande + CTAs `highlight`.
- **Product**: app autenticada del junior (listado, detalle, postulaciones). Fondo `bg-canvas` + cards `bg-surface` + tipografía sobria.
- **Admin**: sidebar oscuro `oklch(0.18 0.020 270)` + contenido como candidato.

### Voz (§5.8)
- Cálida, cercana, confiada sin gritar, específica, bilingüe nativo es/en.
- No corporate, no startup gritada, no coach motivacional, no robótica.
- **Sin emojis en código ni en copy.** Celebraciones con iconos `lucide` o SVG.

---

## 4. Internacionalización (§4.4)

- next-intl con `es` + `en`. Ambos idiomas suenan naturales, no traducción literal (§5.8).
- **Cero strings hardcodeados** en componentes: todo va a `messages/es.json` y `messages/en.json`.

---

## 5. Validación (§4.5)

- **Zod en todas las fronteras**: forms, server actions, env vars, respuestas de IA.

---

## 6. Base de datos y backend (§4.2, §7)

- Supabase Postgres con **RLS habilitado en todas las tablas** y políticas explícitas (§7.2).
- Las migraciones se versionan en `supabase/migrations/` (§13 FAQ).
- El modelo de datos es **sugerencia, no obligación** (el SRS lo da como orientativo, §4 SRS). Si se diseña distinto, **explicarlo en el README** (§7).
- Auth con **Supabase Auth**. El método de login y los proveedores (Google, email, etc.) los define el SRS, no este archivo.
- Rol del usuario vía tabla `user_roles` o campo `role` en metadata de `auth.users`, con control de acceso por RLS según rol (§7.3). Los roles concretos los define el SRS.
- **`SUPABASE_SERVICE_ROLE_KEY` solo en servidor**, nunca expuesta al cliente. El cliente usa `NEXT_PUBLIC_SUPABASE_ANON_KEY` (sometida a RLS) (§13 FAQ).

---

## 7. Manejo de errores (§6.4)

- Toda server action devuelve `Result<T, E>` tipado (patrón en Apéndice B, `src/lib/result.ts`).
- Toda llamada externa con timeout explícito.
- Error boundaries en cada layout principal.
- Errores de usuario con copy amigable, nunca stack técnico.

---

## 8. Anti-basura — qué NO hacer nunca (§6.3)

- Sin código muerto, sin imports sin usar.
- Sin `console.log`: usar logger estructurado (`lib/logger.ts`).
- TODOs solo con ticket, en formato `// TODO(issue-N): descripción` (§6.3). Sin ticket, el pendiente va al tracker, no al código.
- Sin código comentado (código muerto dentro de comentarios): git guarda el historial, se borra.
- Sin magic numbers / magic strings: extraer a constantes con nombre.
- Sin `.then()` anidados: siempre `async/await`.
- Sin `useEffect` como manager de estado: server components, react-query o estado derivado.
- Sin estilos inline salvo valores dinámicos calculados.
- Sin `try/catch` que silencia errores: siempre log + decisión.
- **Sin hardcoded de colores**: siempre tokens FWD.

---

## 9. Naming (§6.2)

- Archivos: `kebab-case.ts` para utilidades, `PascalCase.tsx` para componentes. Carpetas: siempre `kebab-case`.
- Componentes `PascalCase`, hooks `useCamelCase`, tipos `PascalCase`, constantes `SCREAMING_SNAKE_CASE`.
- Booleanos con prefijo `is`, `has`, `should`, `can`.
- Funciones: verbo + sustantivo (`computeMatchScore`, no `matchScore`).
- Prohibido `data`, `info`, `item`, `temp`, `aux`, `stuff` como nombres finales.

---

## 10. Testing y tooling (§4.6, §4.7)

- Vitest sobre la lógica pura de `lib/`. Coverage deseado en `lib/`: 50% (no exigido).
- Playwright opcional para E2E.
- ESLint + Prettier desde el día 1. Conventional Commits + commitlint. Husky pre-commit.

---

## 11. Definition of Done por feature (§6.5)

1. TypeScript compila sin errores ni warnings.
2. ESLint pasa sin errores.
3. Tests unitarios para la lógica nueva.
4. Textos en `es.json` y `en.json`, nada hardcoded.
5. Accesibilidad básica: navegable por teclado, contraste correcto, labels en inputs.
6. Mobile verificado en 375 px.
7. Commit limpio con Conventional Commit.

---

## 12. Reglas locales del equipo (además del PDF)

Estas no salen del brief, son convenciones internas y se respetan igual:

- **No se deja código comentado** (código muerto dentro de comentarios): git guarda el historial, se borra (§6.3). Los comentarios explicativos **sí están permitidos**; aun así, se prefiere que el código se explique solo con nombres claros y que el "por qué" viva en commits y en el tracker.


---

## 13. Descalificaciones y penalizaciones (§9.3, §12)

- Plagio de otro equipo o de plataformas existentes (Workana, Upwork, etc.).
- Hardcoded de strings (cero i18n) o de colores (en vez de tokens).
- Cero tests. Cero deploy público. Cero responsive.
- Emojis en código o copy.
- `any` esparcido sin justificación.
- Commits de un solo miembro (se penaliza al equipo, §12.1).

---

## Antes de hacer un cambio — checklist rápido

1. ¿Toca stack o identidad visual? → tiene que calzar con §1 y §3 de este archivo. No se negocia.
2. ¿Agrego un string visible? → va a `messages/es.json` y `en.json`, nunca hardcoded.
3. ¿Agrego color? → token FWD, nunca hex suelto ni `#000`/`#fff`.
4. ¿Server action? → devuelve `Result<T, E>` y valida entrada con Zod.
5. ¿Tabla nueva? → RLS habilitado + políticas explícitas, y migración en `supabase/migrations/`.
6. ¿El cambio deja código comentado (código muerto)? → no, bórralo (git guarda el historial). Comentarios explicativos OK, pero prefiere nombres claros.
7. ¿Estoy por agregar una dependencia fuera del brief? → no, salvo que lo justifique y lo documente.
