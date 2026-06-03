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

Sección 6.1 del brief como base, más las carpetas que exigen §3.2, §7 y §4.6.

```
src/
  app/
    [locale]/
      (public)/        landing, login
      (app)/           app autenticada del junior
        marketplace/   listado y detalle
        applications/  mis postulaciones
      (company)/       área de empresa contratante (§3.2)
        projects/      publicar y administrar proyectos
        candidates/    postulaciones recibidas
      (admin)/         panel admin FWD (§3.2)
        dashboard/
        companies/     aprobar empresas
        moderation/    moderar proyectos
      layout.tsx       root layout: fuentes + NextIntlClientProvider
      page.tsx         landing hola mundo
  components/
    ui/                primitivos shadcn
    features/
      marketplace/
      applications/
      companies/
      admin/
      auth/
      layout/
      brand/           PageTitle, InsightSection, FwdGeoBackdrop
  lib/
    supabase/          clientes server + browser, helper de middleware
    marketplace/       lógica pura
    applications/      lógica pura + server actions
    auth/              sesión y roles
    i18n/              helpers de formato (nombre canónico §6.1)
    constants/
    utils/
  i18n/                config de next-intl: routing.ts, request.ts
  types/
  middleware.ts        edge locale routing (next-intl)
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
- `components/features/brand/` agrupa `PageTitle`, `InsightSection` y `FwdGeoBackdrop`, que el brief define (§5.6, Apéndice A) sin asignarles ubicación.
- Las server actions devuelven `Result<T, E>` tipado (Apéndice B del brief, `src/lib/result.ts`).
- El schema de DB de §7 es sugerencia. Si el equipo lo diseña distinto, se documenta el porqué aquí (el brief lo exige).
- Convención de no comentarios: ningún archivo del repo lleva comentarios de ninguna sintaxis. El contexto va a los commits y al tracker.

## Versionado

Cohorte FWD 2026-2. Brief inicial publicado el 27 de mayo de 2026.
