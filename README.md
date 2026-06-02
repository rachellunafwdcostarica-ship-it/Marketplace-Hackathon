# FWD Marketplace

> Marketplace de proyectos freelance para juniors egresados de Fundación Forward Costa Rica.
> Proyecto final de graduación + Hackathon · cohorte 2026-2 · Demo Day **8-jul-2026**.

Repositorio del equipo. El stack y la identidad visual se siguen **al pie de la letra** del brief oficial de FWD Talent para que el código pueda integrarse al producto madre (`jobs.fwdcostarica.com`).

---

## Adelante.

> Encontrá tu próximo proyecto. Pagado. Real. Cortito. Sin Upwork hostil.

Este repo no es un boilerplate genérico. Es el sustrato de un producto que puede entrar al producto vivo de FWD Talent. Lo que está fijado abajo no se mueve.

---

## ¿Dónde está el backend? ¿Dónde está el frontend?

Pregunta legítima si vienes de un stack tradicional (Express + React separados, o Node + Vue, etc.). **En Next.js 15 con App Router, backend y frontend viven en el mismo repositorio, dentro de la misma carpeta `src/`**. No hay dos proyectos hermanos `backend/` y `frontend/`: hay uno solo donde cada archivo declara si corre en servidor o en cliente.

Esto no es decisión del equipo: es el patrón que exige el brief de FWD para que el código pueda integrarse al producto madre. Mezclar la estructura clásica (carpetas hermanas) con la estructura Next.js rompe el patrón.

### Equivalencias mentales

Si veniste de Express + React, así se traduce lo que conocías:

| En Express + React era… | En Next.js 15 vive en… |
|---|---|
| Rutas REST (`app.get('/api/...')`) | `src/app/api/<recurso>/route.ts` — **úsalo solo si no podés usar Server Actions** (webhooks, OAuth callbacks, health-checks). En este proyecto casi no hace falta. |
| Controllers | Server Actions (`'use server'` en `src/lib/*/actions.ts`) — **patrón principal** del backend en este stack. |
| Servicios y lógica de negocio | `src/lib/` (TypeScript puro, sin React) |
| Middlewares (auth, errores) | `middleware.ts` en la raíz + helpers en `src/lib/auth/` |
| Modelos y migraciones de DB | `supabase/migrations/` (SQL versionado) |
| Acceso a la DB | Cliente Supabase server-side en `src/lib/supabase/server.ts` |
| Render del HTML | Server Components dentro de `src/app/` |
| Componentes interactivos | `'use client'` en `src/components/` |
| Estado del cliente | React state + hooks dentro de Client Components |
| Llamadas del cliente al "backend" | Server Actions importadas directamente (sin `fetch`) |

### Quién corre dónde

Esto es lo que importa para que cada miembro del equipo sepa qué está tocando:

| Carpeta / archivo | Corre en | Notas |
|---|---|---|
| `src/app/**/page.tsx` | **Servidor** (por defecto) | Solo lleva `'use client'` si necesita interactividad. |
| `src/app/**/layout.tsx` | **Servidor** | Define la jerarquía visual. |
| `src/app/api/**/route.ts` | **Servidor** | Endpoints REST. |
| `src/lib/**/actions.ts` | **Servidor** | Server Actions con `'use server'` arriba del archivo. |
| `src/lib/supabase/server.ts` | **Servidor** | Usa `SUPABASE_SERVICE_ROLE_KEY` — NUNCA se importa desde un Client Component. |
| `src/lib/supabase/client.ts` | **Cliente** | Solo usa `NEXT_PUBLIC_SUPABASE_ANON_KEY` (sometida a RLS). |
| `src/lib/` (resto, lógica pura) | Ambos | Funciones puras sin acceso a env ni a la DB. Reutilizables en cliente y servidor. |
| `src/components/ui/` | **Cliente** | Primitivos shadcn — casi todos llevan `'use client'`. |
| `src/components/features/` | Ambos | Server Components que pueden importar Client Components. |
| `middleware.ts` (raíz) | **Edge runtime** | Para protección de rutas, redirects de locale. |

> **Regla mental rápida:** si un archivo lee `SUPABASE_SERVICE_ROLE_KEY`, llama a `auth.users` con privilegios, o usa `fs`, **es servidor**. Si lleva `'use client'`, usa hooks de React (`useState`, `useEffect`), o escucha eventos del DOM, **es cliente**. Si no hace nada de lo anterior y solo procesa datos, **es lógica pura** y puede ir en ambos.

### División de trabajo en el equipo

Aunque no haya dos carpetas físicas, el rol de **frontend lead** y **backend/Supabase lead** sigue teniendo sentido:

- **Frontend lead** se enfoca en `src/components/`, `src/app/**/page.tsx` (la parte visual), `messages/es.json` y `en.json`, identidad visual.
- **Backend/Supabase lead** se enfoca en `src/lib/*/actions.ts` (donde vive el grueso del backend), `src/lib/supabase/`, `supabase/migrations/`, RLS policies, y `src/app/api/` solo cuando es inevitable (webhooks, health-checks).
- **Fullstack** rota entre los dos según la feature en curso.

Ambos modifican los mismos PRs en muchos casos, porque una feature como "postular a un proyecto" toca:
1. `src/components/features/applications/CoverLetterForm.tsx` (frontend lead).
2. `src/lib/applications/actions.ts` con `applyToProject` (backend lead).
3. `messages/es.json` y `messages/en.json` (frontend lead).
4. RLS policy en `supabase/migrations/00X_applications_rls.sql` (backend lead).

---

## Stack tecnológico (NO negociable)

| Capa | Tecnología |
|---|---|
| Framework | **Next.js 15** (App Router) |
| Lenguaje | **TypeScript** modo `strict: true` con `noUncheckedIndexedAccess` y `exactOptionalPropertyTypes` |
| Backend / DB | **Supabase** (Postgres + Auth + RLS + Storage) |
| Estilos | **Tailwind CSS v4** (con `@theme inline` en CSS) |
| Componentes | **shadcn/ui** |
| Internacionalización | **next-intl** (es + en, obligatorio bilingüe) |
| Validación | **Zod** en todas las fronteras (forms, server actions, env, IA) |
| Formularios | **react-hook-form** + `@hookform/resolvers` |
| Iconos | **lucide-react** |
| Testing | **Vitest** (unit) · Playwright opcional (E2E) |
| Tooling | ESLint · Prettier · Husky · lint-staged · commitlint (Conventional Commits) |
| Runtime | **Node.js 20 LTS+** · **npm** · **React 19** |
| Deploy | **Vercel** (URL pública obligatoria) |
| Animación | CSS / `tw-animate-css` (default) · **Framer Motion** permitido para bonus 2.0 |
| IA (opcional para 2.0) | Anthropic Claude · Google Gemini (matching, sugerencias de copy) |

### Exclusiones explícitas
- **Prohibido `any`** — si es inevitable, `unknown` con type guard.
- **Prohibido `@ts-ignore` / `@ts-expect-error`** sin comentario justificando.
- **Prohibido**: Material UI · Chakra · Mantine · Prisma · cualquier ORM sobre Supabase.
- **Prohibido**: emojis en código o copy (las celebraciones se hacen con iconos `lucide` o SVG).
- **Prohibido**: hardcoded strings (todo a `messages/es.json` y `messages/en.json`).
- **Prohibido**: hardcoded de colores en vez de tokens FWD.
- **Prohibido**: `#000` ni `#fff` puros (usar siempre tokens tintados oklch a 245°).
- **Prohibido**: pagos, contratos digitales, mensajería realtime, móvil nativo (fuera de alcance del MVP).

---

## Identidad visual FWD

Paleta y tipografías fijadas por el Brand Book. No se modifican.

### Paleta (hex anclados)

| Token | Hex | Rol |
|---|---|---|
| `--primary` | `#0A6CB9` | Azul FWD · CTAs, links |
| `--secondary` | `#662D91` | Púrpura · headings dark, profundidad |
| `--accent` | `#20BEC6` | Teal · success, complemento |
| `--highlight` | `#FFCB05` | Amarillo · destacar, badges |
| `--warning` | `#F7901E` | Naranja · atención, entrevistas |
| `--magenta` | `#EC008C` | Magenta · momento, destructive |

Neutrales: oklch tintados a **245°** azul FWD, chroma ≤ 0.01. Ver bloque completo en sección 5.5 del brief y `src/app/globals.css`.

### Tipografía
- **Display / titulares**: Archivo Narrow (Google Fonts, sustituto de Mundial Narrow).
- **Cuerpo / UI**: Figtree.
- **Mono / código**: JetBrains Mono.
- Importación con `next/font` (nunca `<link>` ni `@import`).

### Firma de marca
Todo título principal lleva un **punto azul firma** al final:

```tsx
<h1 className="font-heading text-3xl font-bold tracking-tight">
  Encontrá tu próximo proyecto<span className="text-primary">.</span>
</h1>
```

### Tres registros visuales
- **Brand expresivo** — landing pública, login, Demo Day showcase. Fondo `bg-secondary` + geometría FWD + display grande + CTAs `highlight`.
- **Product** — app autenticada del junior. Fondo `bg-canvas` + cards `bg-surface` + tipografía sobria.
- **Admin** — sidebar oscuro `oklch(0.18 0.020 270)` + contenido como candidato.

### Voz
Cálida · cercana · sin tecnicismos · confiada sin gritar · específica · bilingüe nativo es/en.
**NO**: corporate, startup gritada, coach motivacional, robótica, emojis.

---

## Estructura del proyecto

```
fwd-marketplace/
├── src/
│   ├── app/                                # === SERVIDOR por defecto ===
│   │   ├── globals.css                     # tokens FWD (brief §5.5 + §8.3)
│   │   ├── layout.tsx                      # RootLayout: carga next/font + idioma raíz
│   │   ├── [locale]/                       # rutas con UI (HTML traducido por next-intl)
│   │   │   ├── (public)/                   # landing, login (registro brand expresivo)
│   │   │   ├── (app)/                      # app autenticada del junior (registro product)
│   │   │   │   ├── marketplace/            # listado y detalle de proyectos
│   │   │   │   ├── applications/           # mis postulaciones
│   │   │   │   └── profile/                # perfil del junior
│   │   │   ├── (company)/                  # área de empresa contratante
│   │   │   │   ├── projects/               # publicar y administrar proyectos
│   │   │   │   └── candidates/             # ver postulaciones recibidas
│   │   │   ├── (admin)/                    # panel admin FWD (sidebar oscuro)
│   │   │   │   ├── dashboard/
│   │   │   │   ├── companies/              # aprobar empresas
│   │   │   │   └── moderation/             # moderar proyectos
│   │   │   └── layout.tsx                  # layout específico del segmento [locale]
│   │   └── api/                            # === SERVIDOR === endpoints REST sin locale
│   │       │                               # Probablemente casi vacío: las mutaciones van
│   │       │                               # por Server Actions en src/lib/*/actions.ts.
│   │       │                               # Solo se llena con webhooks o health-checks.
│   │       └── health/route.ts             # ejemplo: GET de healthcheck público
│   │
│   ├── components/
│   │   ├── ui/                             # === CLIENTE === primitivos shadcn ('use client')
│   │   └── features/                       # SERVIDOR + CLIENTE mezclados
│   │       ├── marketplace/                # ProjectCard, ProjectFilters, ProjectDetail
│   │       ├── applications/               # ApplicationRow, StatusPill, CoverLetterForm
│   │       ├── companies/                  # CompanyCard, CompanyOnboarding
│   │       ├── admin/                      # AdminSidebar, ApprovalCard
│   │       ├── auth/                       # LoginButton, GoogleSignInButton
│   │       ├── layout/                     # AppHeader, AppFooter, AdminShell, PublicShell
│   │       └── brand/                      # PageTitle, InsightSection, FwdGeoBackdrop (*)
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── server.ts                   # === SERVIDOR === usa SERVICE_ROLE_KEY
│   │   │   ├── client.ts                   # === CLIENTE === usa ANON_KEY (sometido a RLS)
│   │   │   └── middleware.ts               # helper para middleware.ts raíz
│   │   ├── marketplace/
│   │   │   ├── actions.ts                  # === SERVIDOR === 'use server' (mutaciones)
│   │   │   └── queries.ts                  # lógica pura: filterProjects, computeMatchScore
│   │   ├── applications/
│   │   │   ├── actions.ts                  # === SERVIDOR === applyToProject, etc.
│   │   │   └── validation.ts               # lógica pura: schemas Zod
│   │   ├── auth/                           # helpers de sesión y roles (servidor)
│   │   ├── i18n-format/                    # lógica pura: helpers de formato (fechas, monedas)
│   │   ├── constants/                      # JOB_TYPE, WORK_MODE, PROJECT_STATUS
│   │   ├── utils/                          # cn, otras utilidades
│   │   ├── result.ts                       # lógica pura: tipo Result<T, E>
│   │   └── logger.ts                       # logger estructurado (cero console.log)
│   │
│   ├── i18n/                               # config de next-intl (convención oficial v3+)
│   │   ├── routing.ts                      # defineRouting: locales soportados y default
│   │   └── request.ts                      # getRequestConfig: carga mensajes por locale
│   │
│   ├── types/                              # tipos compartidos: project.ts, application.ts
│   └── middleware.ts                       # === EDGE === locale routing (next-intl)
│
├── messages/
│   ├── es.json                             # textos en español
│   └── en.json                             # textos en inglés
│
├── supabase/
│   ├── migrations/                         # SQL versionado: 001_init.sql, 002_rls.sql
│   └── seeds/                              # 10 proyectos de ejemplo
│
├── public/                                 # assets estáticos
│
├── tests/
│   ├── unit/                               # vitest sobre lib/
│   └── e2e/                                # playwright (opcional)
│
├── .env.local.example                      # plantilla de variables
├── .env.local                              # variables reales (NO se sube a git)
├── .gitignore
├── next.config.ts
├── tsconfig.json                           # strict + noUncheckedIndexedAccess + exactOptionalPropertyTypes
├── eslint.config.mjs
├── .prettierrc
├── commitlint.config.cjs
├── components.json                         # config shadcn/ui
└── package.json
```

> **(\*)** `components/features/brand/` no está en el brief original (sección 6.1) — es decisión nuestra para agrupar `PageTitle`, `InsightSection` y `FwdGeoBackdrop` que el brief sí define (Apéndice A y sección 5.6) pero sin asignarles ubicación.

> **`src/app/globals.css`** vive dentro de `src/app/` directamente (siguiendo el brief sección 5.5 y 8.3 que lo nombran explícitamente), NO en una carpeta `styles/` separada.

> **Dos carpetas con "i18n" en el nombre, a propósito:** `src/i18n/` contiene la configuración de la librería next-intl (convención oficial v3+: `routing.ts` y `request.ts`). `src/lib/i18n-format/` contiene lógica pura para formatear fechas, monedas y números según locale (helpers nuestros, no de next-intl). Son responsabilidades distintas y los nombres están separados para evitar choque al importar.

> **Leyenda:** `=== SERVIDOR ===` corre solo en Node (Vercel serverless o build time). `=== CLIENTE ===` corre en el navegador del usuario. `=== EDGE ===` corre en Vercel Edge Runtime (más restringido que servidor). Las carpetas sin marca son lógica pura reutilizable o mezcla según el archivo.

> Las carpetas que arrancan vacías incluyen un `.gitkeep` para que git las preserve.

---

## Convenciones de código

### Naming
- Archivos: `kebab-case.ts` para utilidades, `PascalCase.tsx` para componentes.
- Carpetas: siempre `kebab-case`.
- Hooks: `useCamelCase`. Tipos: `PascalCase`. Constantes: `SCREAMING_SNAKE_CASE`.
- Booleanos: prefijo `is`, `has`, `should`, `can`.
- Funciones: verbo + sustantivo (`computeMatchScore`, no `matchScore`).
- **Prohibido** como nombre final: `data`, `info`, `item`, `temp`, `aux`, `stuff`.

### Anti-basura
- Sin código muerto, sin imports sin usar.
- Sin `console.log` (usar `lib/logger.ts`).
- TODOs solo con ticket: `// TODO(issue-N): descripción`.
- Sin archivos comentados (git guarda el historial).
- Sin magic numbers ni magic strings (extraer a constantes con nombre).
- Sin `.then()` anidados — siempre `async/await`.
- Sin `useEffect` como manager de estado — usar server components, react-query o estado derivado.
- Sin estilos inline salvo valores dinámicos calculados.
- Sin `try/catch` que silencia errores — siempre log + decisión.

### Error handling
Toda server action devuelve `Result<T, E>` tipado:

```ts
type Result<T, E = string> =
  | { ok: true; data: T }
  | { ok: false; error: E }
```

Toda llamada externa con timeout explícito. Error boundaries en cada layout principal. Errores de usuario con copy amigable, nunca stack técnico.

### Definition of Done por feature
Una feature está terminada solo si:

1. `npm run typecheck` y `npm run lint` pasan sin errores ni warnings.
2. Tests unitarios para la lógica nueva (Vitest sobre `lib/`).
3. Textos en `es.json` y `en.json`, nada hardcoded.
4. Accesibilidad básica: navegable por teclado, contraste correcto, labels en inputs.
5. Mobile verificado en **375 px**.
6. Commit limpio con Conventional Commit (`feat:`, `fix:`, `chore:`, etc.).

---

## Autenticación

**Google OAuth es obligatorio** para el MVP (brief sección 3.2). GitHub OAuth es opcional. Magic link por email se acepta solo como mínimo absoluto si no se logra configurar OAuth.

El flujo lo provee **Supabase Auth**, no se implementa a mano:

1. En Supabase Dashboard → Authentication → Providers, habilitar **Google** con `client_id` y `client_secret` de Google Cloud Console.
2. Configurar la URL de redirect en Google Cloud Console: `https://<tu-supabase-url>/auth/v1/callback`.
3. En el código, usar `supabase.auth.signInWithOAuth({ provider: 'google' })` desde un Client Component.
4. Después del login, decidir el rol del usuario (junior, empresa, admin). Las dos opciones aceptables:
   - Tabla `user_roles` con FK a `auth.users.id` (más explícito).
   - Campo `role` en `raw_user_meta_data` de `auth.users` (más simple).

> **Nunca expongas `SUPABASE_SERVICE_ROLE_KEY` al cliente.** Solo se lee desde `src/lib/supabase/server.ts`. El cliente del navegador usa `NEXT_PUBLIC_SUPABASE_ANON_KEY`, que está sometido a RLS.

---

## Variables de entorno

Antes de ejecutar, copia la plantilla y completa los valores:

```bash
cp .env.local.example .env.local
```

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=          # SOLO server, jamás expuesto al cliente

# IA (opcional, para features 2.0)
ANTHROPIC_API_KEY=
GEMINI_API_KEY=

# Email (opcional, para notificaciones)
RESEND_API_KEY=
```

---

## Ejecución

### Setup inicial

```bash
# 1. Instalar dependencias
npm install

# 2. Inicializar shadcn/ui (si arrancás de cero)
npx shadcn@latest init

# 3. Configurar Supabase local (opcional, también podés usar la nube)
npx supabase init
npx supabase start

# 4. Aplicar migraciones
npx supabase db push

# 5. Cargar seeds
npx supabase db seed
```

### Configurar next-intl (bilingüe obligatorio)

Cuatro pasos mínimos antes de poder renderizar texto traducido (convención oficial v3+):

1. **Crear `src/i18n/routing.ts`** con `defineRouting`: lista de locales soportados (`['es', 'en']`) y locale por defecto (`'es'`).
2. **Crear `src/i18n/request.ts`** con `getRequestConfig` que carga el archivo `messages/<locale>.json` correspondiente al request actual.
3. **Crear `src/middleware.ts`** raíz que invoque `createMiddleware` de `next-intl/middleware` para que las rutas se prefijen con el idioma (`/es/...`, `/en/...`).
4. **Crear `messages/es.json` y `messages/en.json`** con los strings agrupados por feature (ej. `marketplace.projectCard.applyButton`).

Además, en `next.config.ts` hay que aplicar el plugin `createNextIntlPlugin` (apuntando a `./src/i18n/request.ts`) para que Next.js sepa de la configuración server-side.

Referencia oficial: <https://next-intl.dev/docs/getting-started/app-router>.

### Configurar tokens FWD (paleta y fuentes)

1. **Pegar el bloque de tokens del brief sección 5.5** en `src/app/globals.css` (reemplazar el contenido por defecto que crea `create-next-app`).
2. **En `src/app/layout.tsx`** importar `Archivo_Narrow` y `Figtree` desde `next/font/google` y aplicar las variables CSS `--font-archivo-narrow` y `--font-figtree` al elemento `<html>`.

### Desarrollo

```bash
npm run dev           # Next.js en http://localhost:3000
npm run typecheck     # Verificar tipos
npm run lint          # ESLint
npm run test          # Vitest
npm run build         # Build de producción
```

### Deploy

Cada equipo configura su propio deploy en **Vercel**:
- Conectar el repo de GitHub.
- Configurar las env vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).
- URL pública obligatoria.

---

## Cronograma

| Tramo | Días | Hito |
|---|---|---|
| Setup | hoy → 8-jun | Repo, stack montado, "hola mundo" en lenguaje visual FWD |
| Core funcional | 9-jun → 22-jun | Listado, detalle, auth, postulación end-to-end |
| Polish y profesionalización | 23-jun → 28-jun | Tests, README, deploy estable, a11y, copy revisado |
| Jornada Hackathon (2.0) | 29-jun → 7-jul | Motion, micro-interacciones, X factor |
| **Demo Day** | **8-jul** | Pitch de 5 min · 1 min visión + 3 min walkthrough + 1 min preguntas |

---

## Recursos

- Plataforma madre: <https://jobs.fwdcostarica.com>
- shadcn/ui: <https://ui.shadcn.com>
- Supabase: <https://supabase.com/docs>
- next-intl: <https://next-intl.dev>
- Tailwind v4: <https://tailwindcss.com/docs>
- Brand Book FWD: PDF en el canal del Hackathon.

---

## Equipo

| Rol | Miembro |
|---|---|
| Frontend lead | _por completar_ |
| Backend / Supabase lead | _por completar_ |
| Diseño / UX | _por completar_ |
| Fullstack | _por completar_ |

> Commits firmados por cada miembro. Si solo uno commitea, se penaliza al equipo.

---

## Licencia y créditos

Proyecto desarrollado para Fundación Forward Costa Rica — programa FWD Talent.
Cualquier integración al producto madre se hace por PR al repo de `jobs.fwdcostarica.com`.
