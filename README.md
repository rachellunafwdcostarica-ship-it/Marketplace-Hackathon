# FWD Marketplace

Marketplace donde empresas publican proyectos cortos (1–12 semanas) y los egresados del programa FWD Costa Rica postulan para tomarlos. Proyecto final del programa + entrega de Demo Day del Hackathon FWD 2026 (08 de julio).

## Estado

Stack montado y "hola mundo" navegable en el lenguaje visual FWD (hito Setup del §2.1). `npm run dev`, `npm run typecheck`, `npm run lint` y `npm run build` pasan sin errores; la raíz redirige a `/es` y existe `/en`. Pendiente: features del MVP (§3.2), el schema de DB en Supabase (las relaciones aún no se definen) y el deploy en Vercel.

La estructura de carpetas usa la sección 6.1 del brief como base, más las adiciones que exigen otras secciones del mismo brief: `(company)/` y subpaneles de `(admin)/` (§3.2), `supabase/migrations/` (§7) y `tests/` (§4.6).

Las reglas del proyecto viven en [`reglas.md`](./reglas.md) (destilado del brief oficial). Toda persona o IA debe leerlo antes de implementar; `CLAUDE.md` lo enlaza para las herramientas de IA.

## Stack

Sale completo del brief (§4 y §8.2):

- Next.js 15 (App Router, Server Components por defecto)
- React 19 · Node.js 20 LTS+ · npm
- TypeScript en modo `strict: true` con `noUncheckedIndexedAccess` y `exactOptionalPropertyTypes`
- Supabase (Postgres + Auth + RLS + Storage) con `@supabase/supabase-js` + `@supabase/ssr`
- Tailwind CSS v4 con `@theme inline` y tokens FWD
- shadcn/ui (+ `class-variance-authority`, `clsx`, `tailwind-merge`)
- lucide-react
- next-intl (es / en)
- Zod para validación en todas las fronteras
- react-hook-form + `@hookform/resolvers`
- Vitest para unit tests; Playwright opcional para E2E
- ESLint, Prettier, Husky, lint-staged, commitlint (Conventional Commits)
- Deploy en Vercel

No se agregan dependencias fuera de esa lista sin justificarlo y documentarlo.

## Estructura de carpetas

Refleja la estructura **real** del repo. Base: §6.1 del brief, más las carpetas que exigen §3.2, §7 y §4.6, y los ajustes que el equipo hizo al construir (que difieren del plan original; ver "Decisiones técnicas no obvias").

```
src/
  app/
    [locale]/
      (public)/        landing, login, register, onboarding, verify-email, forgot-password
      (app)/           junior autenticado (layout = guard de rol)
        junior/        dashboard + projects/[id]/apply
        applications/
        marketplace/
      (company)/       empresa contratante (layout = guard de rol)
        empresa/       dashboard + new-project
        candidates/    (placeholder, vacío)
        projects/      (placeholder, vacío)
      (admin)/         panel admin FWD (layout = guard de rol)
        admin/         dashboard + companies + projects + validations
        dashboard/, companies/, moderation/   (placeholders, vacíos)
      403/             acceso denegado
      showcase/        catálogo de design system (dev, no producto)
      layout.tsx       root layout: fuentes (next/font) + NextIntlClientProvider
      page.tsx         landing
    auth/callback/     intercambio de sesión OAuth (sin locale)
  components/
    ui/                primitivos shadcn: button, input, select, textarea, card,
                       dialog, badge, table, tabs, label, skeleton, sonner + carouseles
    layout/            chrome global (barrel index.ts): Navbar, Footer, SidebarAdmin,
                       NotificationCenter, JuniorShell, CompanyShell, AdminShell
    features/          componentes de producto
      DashboardStats.tsx, SearchBar.tsx   (widgets compuestos, en la raíz por decisión)
      brand/           identidad (barrel index.ts): PageTitle, InsightSection,
                       FwdLogo, FwdGeoBackdrop, BrandPatterns
      shared/          reutilizables (barrel index.ts): StatusPill, EmptyState,
                       LoadingSkeleton, ModalityChip
      auth/            cards y flujos de auth (AuthCard, RoleSelector, ...)
      applications/    tarjeta y estado de postulación
      companies/       tarjeta de empresa
      marketplace/     tarjetas y detalle de proyecto, filtros, skill picker
  lib/
    supabase/          clientes server + browser, admin, helper de middleware
    auth/              sesión y roles (normalizeRole, ROLE_HOME)
    admin/             lógica de administración
    marketplace/, applications/, constants/, i18n/, utils/
    result.ts          patrón Result<T, E> (Apéndice B)
    stateContext.tsx   estado mock en cliente (fase prototipo)
  i18n/                config de next-intl: routing.ts, request.ts
  types/
  middleware.ts        guard de locale + sesión (next-intl)
messages/
  es.json
  en.json
supabase/
  migrations/
  seeds/
tests/
  unit/
  e2e/
public/
```

## Cómo arrancar en local

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

La app queda disponible en `http://localhost:3000` (redirige a `/es`). Para el "hola mundo" no hacen falta las claves de Supabase todavía; se completan en `.env.local` cuando se conecten las features.

El setup desde cero (scaffold + instalación del stack + tokens FWD) sigue la sección 8.2 del brief, resumida en [`reglas.md`](./reglas.md).

## Variables de entorno

El archivo `.env.local.example` define el contrato. Copiarlo a `.env.local` y completar los valores.

Requeridas (Supabase, MVP):

- `NEXT_PUBLIC_SUPABASE_URL` — URL del proyecto Supabase del equipo.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — clave pública del proyecto Supabase (cliente, sometida a RLS).
- `SUPABASE_SERVICE_ROLE_KEY` — clave de servicio (solo server, nunca cliente).

Opcionales (features 2.0):

- `ANTHROPIC_API_KEY` — Claude API, para features de IA del 2.0.
- `GEMINI_API_KEY` — Gemini API, para matching algorítmico del 2.0.
- `RESEND_API_KEY` — envío de correos transaccionales.

## Scripts npm

- `npm run dev` — servidor de desarrollo.
- `npm run build` — compilar para producción.
- `npm run start` — servidor de producción local.
- `npm run lint` — ESLint.
- `npm run typecheck` — TypeScript sin emit.
- `npm run test` — Vitest.
- `npm run test:e2e` — Playwright (opcional).

## Identidad visual

Paleta, tipografías y motion tokens son no negociables y vienen del brief sección 5.

- Tipografías: Archivo Narrow (titulares) + Figtree (cuerpo) + JetBrains Mono (código), importadas con `next/font`.
- Paleta anclada en hex y neutrales oklch tintados a 245° azul FWD.
- Motion tokens fijados en §5.4 (`--ease-out`, `--duration-fast/base/slow`).
- Patrón canónico de `PageTitle` con punto azul firma `.` al final del título.
- Voz "Adelante." cálida, cercana, sin emojis en código ni en copy.

## Screenshots

Pendiente. Se agregan las pantallas principales (landing, listado, detalle, postulación) cuando exista UI navegable, según el entregable §10 del brief.

## Deploy

Pendiente. Deploy en Vercel con URL pública obligatoria (§4.9, §10): conectar el repo de GitHub y configurar las tres variables de Supabase en Project Settings → Environment Variables.

## Equipo y roles

| Rol | Miembro |
|---|---|
| Frontend lead | _por completar_ |
| Backend / Supabase lead | _por completar_ |
| Diseño / UX | _por completar_ |
| Fullstack | _por completar_ |

Commits firmados por cada miembro. Si solo uno commitea, se penaliza al equipo (§12.1).

## Decisiones técnicas no obvias

- La estructura sigue §6.1 como base, pero §6.1 es un "resumen" del CLAUDE.md madre. Las features obligatorias de empresa y admin (§3.2), las migraciones (§7) y los tests (§4.6) exigen carpetas que §6.1 no lista: por eso existen `(company)/`, los subpaneles de `(admin)/`, `supabase/migrations/` y `tests/`.
- Hay dos carpetas i18n a propósito: `src/i18n/` para la configuración de next-intl (`routing.ts`, `request.ts`) y `src/lib/i18n/` para helpers de formato (nombre canónico del brief §6.1). Se distinguen por la ruta de import.
- Organización de `components/` (design system C1/Sol): los primitivos shadcn viven en `components/ui/`; el chrome global de página en `components/layout/` (`Navbar`, `Footer`, `SidebarAdmin`, `NotificationCenter`, `JuniorShell`/`CompanyShell`/`AdminShell`), **separado** de `features/`. Dentro de `components/features/`: `brand/` agrupa la identidad (`PageTitle`, `InsightSection`, `FwdLogo`, `FwdGeoBackdrop`, `BrandPatterns`), `shared/` los reutilizables transversales (`StatusPill`, `EmptyState`, `LoadingSkeleton`, `ModalityChip`), y las subcarpetas por área (`auth/`, `marketplace/`, `applications/`, `companies/`) los componentes específicos. Cada agrupación expone un `index.ts` (barrel): `import { PageTitle } from '@/components/features/brand'`, `import { StatusPill } from '@/components/features/shared'`, `import { Navbar } from '@/components/layout'`. **`DashboardStats` y `SearchBar` se mantienen en la raíz de `features/` por decisión** (no en `shared/`) por dos razones: (1) son **widgets compuestos** con datos/estado (DashboardStats arma tarjetas desde un array de `stats`; SearchBar es un input controlado), no átomos de UI transversales como los de `shared/`; y (2) moverlos obligaría a reescribir imports en páginas de otros roles (3 dashboards + 2 listados, en `app/*`), un churn cross-role que se evita a propósito.
- Las server actions devuelven `Result<T, E>` tipado (Apéndice B del brief, `src/lib/result.ts`).
- El schema de DB de §7 es sugerencia. Si el equipo lo diseña distinto, se documenta el porqué aquí (el brief lo exige).
- Convención de comentarios (reglas.md §12): se prohíbe el código comentado (código muerto dentro de comentarios); los comentarios explicativos sí se permiten, aunque se prefiere que el código se explique con nombres claros y que el "por qué" viva en los commits y el tracker.

## Versionado

Cohorte FWD 2026-2. Brief inicial publicado el 27 de mayo de 2026.
