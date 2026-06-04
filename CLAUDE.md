# CLAUDE.md

## Antes de implementar o cambiar cualquier cosa

**Lee `reglas.md` (en la raíz del repo) y verifica que tu cambio no viole ninguna regla.** Es obligatorio para personas y para cualquier IA.

La única fuente de verdad es el brief oficial `Marketplace_FWD_Brief.pdf` de FWD Talent. `reglas.md` es su destilado y viaja con el repo. Si algo entra en conflicto, gana el brief.

## No negociables (resumen — el detalle está en `reglas.md`)

- **Stack fijo**: Next.js 15 (App Router, RSC por defecto) · React 19 · TypeScript `strict` + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` · Supabase (Postgres + Auth + RLS + Storage) · Tailwind v4 (`@theme inline`) · shadcn/ui · next-intl (es/en) · Zod · Vitest · Vercel. No agregar dependencias fuera del brief (§8.2) sin justificar.
- **Prohibido**: `any` sin `unknown`+guard · `@ts-ignore`/`@ts-expect-error` · Prisma u otro ORM · Material UI/Chakra/Mantine · strings hardcoded (todo a `messages/es.json` y `en.json`) · colores hardcoded (solo tokens FWD) · `#000`/`#fff` puros · emojis en código o copy.
- **Identidad visual fijada** (§5): paleta hex, neutrales oklch 245°, Archivo Narrow + Figtree + JetBrains Mono vía `next/font`, motion tokens §5.4, patrón `PageTitle` con punto azul firma, tres registros visuales, voz "Adelante.".
- **Backend**: server actions devuelven `Result<T, E>` · RLS + políticas en toda tabla · `SUPABASE_SERVICE_ROLE_KEY` solo en servidor.


## Estado actual

Bootstrap en curso. La estructura de carpetas sigue §6.1 del brief como base, más las adiciones que exigen §3.2 (empresa/admin), §7 (`supabase/migrations/`) y §4.6 (`tests/`). Las dependencias y archivos de configuración se instalan en el paso de bootstrap.
