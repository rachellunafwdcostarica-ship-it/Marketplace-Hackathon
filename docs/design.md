# FWD Talent — Design System

Documento de referencia del lenguaje visual de la plataforma. Vivo: cualquier decisión nueva pasa por acá antes de mergear.

## Filosofía

**Tipografía + color + motion = personalidad.** No usamos ilustraciones genéricas ni stock; la marca se sostiene en el sistema mismo.

**Tres registros, una marca.** Distintos contextos piden distintos tonos. Lo que los une son los tokens, la familia tipográfica y la curva de animación.

---

## Los tres registros

### 1. Brand expresivo

**Cuándo:** home del candidato, login, página de marca, momentos de celebración (level up, badges, hero del Viaje del Héroe).

**Cómo se ve:**

- Color blocking confiado en azul / púrpura / magenta / amarillo
- Geometría FWD (paralelogramos fast-forward) como decorador de heros
- Tipografía display fuerte (Archivo Narrow extrabold en `text-5xl`+ con palabra clave en `text-highlight`)
- Animaciones explícitas: shimmer en barras de progreso, pulse glow en hitos activos, flame flicker en racha

**Tokens dominantes:** `bg-primary`, `text-highlight`, gradientes `from-primary via-secondary to-accent`, sombras `shadow-dramatic`.

**Componentes representativos:** `JourneyCircle`, `LevelCard`, el hero del dashboard (`(app)/app/page.tsx`), el hero de Recursos (`(app)/app/resources/page.tsx`).

### 2. Candidato product

**Cuándo:** todo el resto del candidato — Empleos, Aplicaciones, Favoritas, Recursos, Astro, Mi Progreso (excepto el LevelCard hero), todos los detail pages del candidato.

**Cómo se ve:**

- Fondo `bg-canvas` (papel cálido casi blanco)
- Cards en `bg-surface` con `shadow-soft` y `rounded-2xl`
- Tipografía: `font-heading` para títulos y labels, `font-body` para cuerpo
- Acento de color por sección (Empleos azul, Aplicaciones naranja, Favoritas magenta, Recursos teal, Astro púrpura, Progreso amarillo)
- Motion sutil: hover lift de `-translate-y-0.5`, transición `var(--duration-fast)` + `var(--ease-out)`

**Tokens dominantes:** `bg-surface`, `text-ink-strong`, `text-ink-muted`, `border-border`, `shadow-soft`.

**Componentes representativos:** `JobCard`, `RecentAnnouncementsCard`, `InsightSection`, `StatusPill`.

### 3. Admin dark

**Cuándo:** todo el shell del admin (sidebar). Los dashboards del admin (panel central) siguen el registro Candidato product — solo el chrome es dark.

**Cómo se ve:**

- Sidebar fondo `oklch(0.18 0.020 270)` (negro azulado, NO negro puro)
- Texto blanco con jerarquía via opacidad (`text-white` / `text-white/60` / `text-white/40`)
- Topbar morado `bg-secondary` con shield amarillo + eyebrow "FUNDACIÓN FORWARD"
- Active state en sidebar: `bg-white/15` con texto blanco

**Por qué dark:** convención fuerte de "estás en herramienta de admin", ayuda al admin a saber dónde está parado de un vistazo. Decisión explícita, no deuda técnica.

**Tokens dominantes:** valores oklch arbitrarios — TODO futuro: tokenizarlos como `--surface-admin`, `--ink-on-admin-*`.

**Componentes representativos:** `AdminSidebar`, `AdminShell.topbar`.

---

## Tokens canónicos

### Paleta FWD (brand book)

| Token         | Hex       | Uso                                           |
| ------------- | --------- | --------------------------------------------- |
| `--primary`   | `#0a6cb9` | Azul FWD · botones, links, acento general     |
| `--secondary` | `#662d91` | Púrpura · Astro, comunicaciones, admin topbar |
| `--accent`    | `#20bec6` | Teal · CTAs secundarios, recursos             |
| `--highlight` | `#ffcb05` | Amarillo · destacar palabras, badges, trophy  |
| `--warning`   | `#f7901e` | Naranja · entrevistas, racha, warnings        |
| `--magenta`   | `#ec008c` | Magenta · favoritas, errores, destructive     |

### Neutrales (oklch tintados a 245°)

| Token              | Uso                          |
| ------------------ | ---------------------------- |
| `--canvas`         | Fondo página                 |
| `--surface`        | Cards, contenedores          |
| `--surface-sunken` | Inputs, tabla headers        |
| `--ink-strong`     | Títulos y texto principal    |
| `--ink`            | Texto secundario             |
| `--ink-muted`      | Texto terciario, metadata    |
| `--ink-subtle`     | Disabled, placeholders       |
| `--border`         | Bordes default               |
| `--border-strong`  | Bordes en focus o destacados |

### Motion

| Token             | Valor                             | Uso                                 |
| ----------------- | --------------------------------- | ----------------------------------- |
| `--ease-out`      | `cubic-bezier(0.23, 1, 0.32, 1)`  | Apertura general, ease default      |
| `--ease-in-out`   | `cubic-bezier(0.77, 0, 0.175, 1)` | Transiciones bidireccionales        |
| `--ease-drawer`   | `cubic-bezier(0.32, 0.72, 0, 1)`  | Drawers, sheets                     |
| `--duration-fast` | `160ms`                           | Hover, focus, tooltips, links       |
| `--duration-base` | `220ms`                           | Apertura de overlays, sheets        |
| `--duration-slow` | `320ms`                           | Transiciones deliberadas (level up) |

### Tipografía

- **Display / titulares:** `font-heading` → Archivo Narrow (sustituto de Mundial Narrow del brand book oficial)
- **Cuerpo / UI:** `font-body` → Figtree
- **Mono / código:** `font-mono` → mono del sistema (Tailwind default). Se usa en tablas/IDs del admin. No hay una fuente mono cargada vía `next/font`; si se quiere JetBrains Mono real, hay que importarla.

**Escala canónica del candidato:**

- `text-xs` (12px) — chips, metadata, badges
- `text-sm` (14px) — UI body, tabla rows
- `text-base` (16px) — párrafos
- `text-lg` (18px) — section titles
- `text-xl` (20px) — page subtitles
- `text-2xl` (24px) — section headers
- `text-3xl` (30px) — page titles
- `text-4xl` / `text-5xl` (36-48px) — heros candidato
- `text-6xl` / `text-7xl` (60-72px) — heros brand expresivo

---

## Firmas de marca

### El "." del título

Todos los `PageTitle` con `tone="brand"` agregan automáticamente un `.` en `text-primary` al final del título. Es la firma de marca: misma que el `Adelante.` del logo.

### Geometría FWD

Tres paralelogramos fast-forward decoran los heros del brand expresivo (`hero-geo`). Vienen del logo de FWD y son la única forma "ilustrada" que usa la marca — todo lo demás es tipografía + color.

### Eyebrow + título

Patrón canónico de cada pantalla:

1. Eyebrow uppercase (`text-[10px]` tracking wide) — categoría / sección
2. Título display con punto azul — el "qué"
3. Headline dinámico opcional — contexto en una línea

---

## Componentes compartidos clave

| Componente                      | Cuándo usarlo                                                                                                                                          |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `InsightSection`                | Wrapper de cualquier sección con eyebrow + título + descripción + acción opcional. Default del admin para todo.                                        |
| `PageTitle` con `tone="brand"`  | Top de cada pantalla principal del candidato y admin                                                                                                   |
| `StatusPill`                    | Cualquier estado en píldora — success, partial, failed, running, unknown                                                                               |
| `JobCard`                       | Tarjeta de oferta horizontal — Empleos, Favoritas, recomendaciones                                                                                     |
| `EmptyState` con `tone="brand"` | Estados vacíos con personalidad                                                                                                                        |
| `Dialog` (shadcn)               | Ventana emergente para leer contenido completo o confirmar. Ej.: `RecentAnnouncementsList` abre el mensaje completo de una comunicación desde el Hero. |

---

## TODOs / deuda registrada

- Tokenizar el sidebar admin como `--surface-admin` + `--ink-on-admin-*` (hoy son oklch arbitrarios)
- Decidir destino de tokens `--color-*-tint` (líneas 205+ de globals.css): adopción amplia o eliminar
- Auditar `htmlFor`/`id` pairing en los ~5 forms con `<Input>`
- Variant FWD en `input.tsx` (similar a las de `badge.tsx` y `card.tsx`)

---

## Cambios recientes

| Fecha      | Cambio                                                                                     | PR            |
| ---------- | ------------------------------------------------------------------------------------------ | ------------- |
| 2026-05    | Tokens de motion adoptados en primitivos shadcn; variants FWD en `badge.tsx` y `card.tsx`  | varios        |
| 2026-05    | Fase completa del candidato + admin rediseñada                                             | varios        |
| 2026-05-27 | Cierre del rediseño — documento creado + tipografía display del hero                       | #232          |
| 2026-05-27 | Consistencia del rediseño — eyebrow universal + perfil + tablas del admin                  | #233          |
| 2026-05-27 | Entry flows — brand expresivo púrpura + onboarding refinado                                | #234          |
| 2026-05-28 | Badge "Completado" sólido + logo del landing visible en mobile                             | #248          |
| 2026-06-08 | Patrón `Dialog`: el card de comunicaciones abre el mensaje completo en modal desde el Hero | merge directo |