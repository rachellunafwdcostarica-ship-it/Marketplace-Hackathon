# Auditoría — warnings y "errores" de `npm run build` (DYNAMIC_SERVER_USAGE)

**Fecha:** 2026-06-17 · **Rama:** `errol` (HEAD `a60b8e1`) · **Next.js:** 15.5.19 (Turbopack)
**Disparador:** la salida de `npm run build` muestra 4 warnings de ESLint y 6 líneas `{"level":"error", ... "digest":"DYNAMIC_SERVER_USAGE"}`.
**Alcance de este documento:** solo **reporte y diagnóstico**. No se modificó ni un archivo. Sirve para que cualquiera del equipo entienda qué pasa, qué se rompe si se ignora, qué reglas se incumplen y cuáles son las rutas de solución (curita vs. de raíz).

Etiquetas de confianza: **[Seguro]** = verificado en archivo y línea o en la propia salida del build; **[Probable]** = inferencia sólida pendiente de confirmar levantando la app; **[Adivinando]** = hueco que estoy rellenando, hay que verificarlo.

---

## 0. TL;DR

Son **dos problemas distintos** que la salida junta visualmente:

1. **4 warnings de ESLint** = código muerto (variables/imports sin usar). Cosmético, pero **viola `reglas.md §8` y la Definition of Done §11** ("compila sin warnings"). No rompe el build.
2. **6 "errores" `DYNAMIC_SERVER_USAGE`** = **NO son fallos del build** (el build termina en 59/59 OK). Son ruido que **genera tu propio código**: un `try/catch` en `src/lib/projects/marketplace.ts` que **se traga una señal interna de control de Next.js** y la disfraza de error. El efecto colateral grave [Probable]: tres páginas se hornean como estáticas con la **lista de proyectos vacía**.

La causa raíz del punto 2 es **un solo patrón** (`catch` que captura *todo*, incluidas las señales de framework) que además vive replicado en otros archivos de `lib/` como bomba latente.

---

## 1. Qué hace `npm run build` y por qué es relevante aquí

`next build` produce el bundle de **producción**. En el camino hace, entre otras cosas:

1. **Compila** TypeScript/JS y **corre ESLint** (de ahí los warnings). [Seguro]
2. **Generación estática (SSG/prerender):** intenta renderizar cada ruta **en tiempo de build** para servir HTML fijo (más rápido, cacheable). Una ruta solo puede ser estática si **no depende de datos por-request**. [Seguro]
3. El momento clave: cuando una página, durante ese prerender, llama a una **API dinámica** como `cookies()` (de `next/headers`), Next **lanza a propósito** una excepción `DynamicServerError` (con `digest: "DYNAMIC_SERVER_USAGE"`). **Eso no es un bug: es el mecanismo con el que Next aborta el render estático y marca la ruta como dinámica** (`ƒ`, server-rendered on demand). [Seguro]

En desarrollo (`next dev`) **todo se renderiza dinámico en cada request**, así que `cookies()` nunca está en contexto estático y el problema **no aparece**. Por eso es una trampa clásica "funciona en dev, falla/queda vacío en el build de producción". [Seguro]

---

## 2. Los 4 warnings de ESLint

Regla que los dispara: `@typescript-eslint/no-unused-vars`. Son declaraciones o imports que nunca se leen.

| # | Archivo:línea | Símbolo | Naturaleza |
|---|---|---|---|
| 1 | `src/components/features/admin/AdminCancelProjectButton.tsx:32` | `projectTitle` | definido y nunca usado |
| 2 | `src/components/features/admin/AdminProjectCharts.tsx:68` | `inactiveOffset` | asignado y nunca usado |
| 3 | `src/components/features/admin/CreateStrikeButton.tsx:61` | `t` | asignado y nunca usado (probable `useTranslations` huérfano) |
| 4 | `src/lib/projects/marketplace.ts:10` | `SupabaseEmpresarioRow` | tipo importado/definido y nunca usado (solo se usa `SupabaseProjectRow`, línea 9) — **[Seguro]**, verificado |

**Impacto si se ignoran:** ninguno en runtime. Pero son **código muerto** y eso descalifica higiene del repo (ver §6). El #3 (`t` sin usar) tiene un matiz: si era el hook de i18n y alguien dejó strings hardcoded en su lugar, podría esconder una violación de i18n — **[Probable]**, hay que abrir el archivo para confirmar.

---

## 3. Los 6 "errores" `DYNAMIC_SERVER_USAGE` — el problema real

### 3.1 La cadena exacta, paso a paso [Seguro]

Las tres páginas afectadas hacen lo mismo:

```ts
// junior/projects/page.tsx, marketplace/page.tsx
const result = await getMarketplaceProjects()
const initialProjects = result.ok ? result.data : []   // ← fallback a vacío
return <MarketplaceClient initialProjects={initialProjects} />
```

```ts
// junior/page.tsx
const [projectsResult, statsResult] = await Promise.all([
  getMarketplaceProjects(),
  getMisPostulacionesStats(),
])
const recommendedProjects = projectsResult.ok ? projectsResult.data.slice(0, 2) : []
```

1. En `build`, Next intenta prerenderizar estas rutas (el segmento `[locale]` usa `generateStaticParams` para `es`/`en`, y nada fuerza modo dinámico).
2. `getMarketplaceProjects()` → `createSupabaseServerClient()` → `await cookies()` (`src/lib/supabase/server.ts:8`).
3. `cookies()` lanza `DynamicServerError` (`digest: DYNAMIC_SERVER_USAGE`). Esa es la señal de Next para decir "esta ruta es dinámica".
4. **El `try/catch` en `src/lib/projects/marketplace.ts:95-98` la atrapa**, la pasa por `logger.error` (`logger.ts:15` → `console.error`) y devuelve `err('unexpected_error')`. La señal **nunca sube** hasta el renderer de Next.
5. En la página, `result.ok === false` → `initialProjects = []`.
6. La página renderiza "con éxito" una lista vacía.

El mensaje de log `"Unexpected error fetching marketplace projects"` es **único de esa función** (`marketplace.ts:96`), así que **[Seguro]**: las 6 líneas salen todas de ahí.

### 3.2 Por qué son 6 y no 3 [Seguro]

`3 rutas × 2 locales (es + en) = 6`. Cada render por idioma llama `getMarketplaceProjects()` una vez. Las rutas son:
`/[locale]/junior/projects`, `/[locale]/marketplace`, `/[locale]/junior`.

Detalle verificado: `getMisPostulacionesStats` (`src/lib/applications/queries.ts`) y `getCurrentUser` (`src/lib/auth/dal.ts`) **NO tienen `try/catch`** — usan chequeos `if (error)` explícitos. Por eso la ruta `junior`, que llama a dos funciones, **solo logea una vez por locale**: el segundo log no existe porque esas dos funciones no se tragan nada.

### 3.3 La consecuencia que de verdad importa [Probable, alta — verificar en runtime]

La tabla de rutas del build marca las tres con `●` (SSG, "prerendered as static HTML"), **no** con `ƒ` (Dynamic):

```
● /[locale]/junior/projects   0 B
● /[locale]/marketplace       0 B
● /[locale]/junior          2.65 kB
```

Si están realmente horneadas como estáticas, sirven el HTML del build: **lista de proyectos vacía**. Y `MarketplaceClient` (`src/components/features/marketplace/MarketplaceClient.tsx`) **no vuelve a pedir datos** — lo verifiqué completo: no hay `fetch`, ni react-query, ni server action; el `useEffect` (líneas 37-44) es solo un spinner falso de 400 ms. Lo que llegó en `initialProjects` es lo único que se muestra. Resultado esperado en producción: marketplace y listado del junior **vacíos** ("no hay proyectos"), aunque la BD tenga proyectos abiertos.

**Por qué lo marco [Probable] y no [Seguro]:** intenté confirmarlo en los artefactos del build y no pude cerrarlo limpio — bajo Turbopack no encontré el HTML prerenderizado en `.next/server/app/**` y `prerender-manifest.json` **no lista** estas rutas (devolvió `[]`). Eso deja una duda legítima sobre si en runtime terminan sirviéndose estáticas (vacías) o dinámicas (con datos). **La única forma de zanjarlo es levantar el build de producción** (`next start`) y abrir las tres páginas. Hasta entonces, lo seguro es el ruido en consola; lo grave (páginas vacías) es altamente probable pero **debe verificarse**, en línea con la metodología de las otras auditorías ("verificación en runtime al cerrar cada fase").

---

## 4. Qué problemas genera ignorar esto

1. **Ruido que entrena a ignorar errores** [Seguro]: 6 líneas `level:"error"` en cada build hacen que el equipo normalice los rojos y deje de mirar `console.error`. El día que haya un error **real** de Supabase, se perderá entre el ruido.
2. **Páginas vacías en producción** [Probable]: ver §3.3. Es el riesgo de negocio: un jurado o un usuario abre el marketplace y no ve proyectos.
3. **El `: []` esconde caídas reales de la BD** [Seguro]: el patrón `result.ok ? result.data : []` significa que si Supabase falla **de verdad** en producción (BD caída, RLS, red), el usuario igual ve "no hay proyectos" como si todo estuviera bien, sin aviso. Choca con `reglas.md §7` ("errores con copy amigable, nunca silenciados").
4. **Bomba latente con `redirect()`/`notFound()`** [Seguro]: el mismo patrón de `catch` que captura *todo* también se tragaría un `redirect()` o `notFound()` si alguien lo mete dentro de un `try`. Hoy no explota porque esas señales no están dentro de estos `try`, pero el patrón está repartido por `lib/` (ver §7). El día que pase, una redirección "no funcionará" y nadie sabrá por qué.

---

## 5. Reglas de `reglas.md` que se incumplen

| Regla | Texto | Incumplimiento |
|---|---|---|
| **§8 Anti-basura** | "Sin código muerto, sin imports sin usar." | Los 4 warnings (§2). [Seguro] |
| **§8 Anti-basura** | "Sin `try/catch` que silencia errores: siempre log + decisión." | El `catch` de `marketplace.ts` hace lo **inverso**: logea como *error* algo que **no** lo es (una señal de control), y de paso silencia el caso real de fallo bajo el mismo `'unexpected_error'`. [Seguro] |
| **§7 Manejo de errores** | "Errores de usuario con copy amigable, nunca stack técnico" / errores no silenciados. | El `: []` convierte un fallo de BD en "no hay proyectos" sin distinguir error de lista vacía. [Seguro] |
| **DoD §11.1** | "TypeScript compila sin errores **ni warnings**." | El build emite 4 warnings. [Seguro] |
| **DoD §11.2** | "ESLint pasa sin errores." | Pasa (son warnings, no errores), pero el espíritu de la DoD es build limpio. [Probable] |

> Nota: usar `cookies()` en server (vía el cliente Supabase con anon key + RLS) **sí** cumple `reglas.md §6` (`SUPABASE_SERVICE_ROLE_KEY` solo en servidor; el cliente usa anon key sometida a RLS). El problema no es leer cookies; es **tragarse la señal** que eso dispara en build.

---

## 6. Rutas de solución: curita vs. de raíz

### 6.1 Curita ❌ (no recomendado — qué NO hacer y por qué)

| Opción curita | Qué hace | Por qué es curita |
|---|---|---|
| Silenciar el log (`if (digest==='DYNAMIC_SERVER_USAGE') return err()` sin re-lanzar) | Quita las 6 líneas rojas | Deja la ruta **estática y vacía**. Tapa el síntoma visible y **empeora** el problema real: ya ni siquiera te enteras. |
| Borrar/“ajustar” el `try/catch` para que no logee | Quita el ruido | Pierdes el manejo del fallo **real** de BD. |
| Desactivar la regla ESLint de unused-vars | Quita los warnings | Esconde código muerto en vez de borrarlo. Viola §8 igual. |
| `eslint-disable` línea por línea | Calla cada warning | Ídem; ruido de directivas y deuda. |

**Todas las curitas comparten el mismo defecto:** atacan la *salida de consola*, no la *causa*. Y la peor (silenciar sin re-lanzar) **consolida** el bug de páginas vacías.

### 6.2 Solución de raíz ✅ (recomendada)

Dos capas, independientes pero complementarias:

**Capa A — restaurar la detección dinámica de Next (la que arregla el bug):**
Hacer que la señal `DYNAMIC_SERVER_USAGE` (y cualquier `redirect`/`notFound`) **vuelva a propagarse**, en lugar de ser tragada por el `catch`. Tres mecanismos posibles (ver §8 para el detalle de cada uno):

- **A1 — `unstable_rethrow(error)` al inicio de cada `catch`** *(recomendado)*. Re-lanza señales de framework y deja pasar al logger solo los errores reales. Arregla en la **capa de datos**, una sola vez donde está el bug. Verificado: `unstable_rethrow` **existe** en Next 15.5.19 (es función exportada de `next/navigation`). Contra: lleva el prefijo `unstable_`.
- **A2 — `export const dynamic = 'force-dynamic'` en las 3 páginas**. Declarativo a nivel de ruta; no usa APIs `unstable`. Contra: es **por-ruta** (alguien lo olvida en una ruta nueva) y **deja el `catch` frágil** para `redirect`/`notFound`.
- **A3 — Ambos** (cinturón y tirantes). Más robusto y más verboso/redundante.

**Capa B — limpiar el código muerto (los 4 warnings):** borrar las 4 variables/imports, revisando cada archivo antes para no romper interfaces (p. ej. si `projectTitle` es parte de un `Props`, decidir si se quita el uso o el campo).

### 6.3 Mi recomendación explícita

- **Alcance:** **Sistémico**. Endurecer el patrón en todos los `catch` de `lib/` que lo tienen, no solo `marketplace.ts`. Hoy solo `marketplace.ts` explota (es el único `catch`-swallow llamado durante prerender de página); el resto son **server actions** (corren en runtime, no en prerender), así que para `DYNAMIC_SERVER_USAGE` son **latentes** — pero el endurecimiento los blinda contra el día que alguien meta un `redirect()`/`notFound()` dentro del `try`. Es prevención barata.
- **Mecanismo:** **A1 (`unstable_rethrow`)**. Arregla la causa en la capa de datos; con él las rutas vuelven a `ƒ` **solas**, sin necesidad de `force-dynamic`. No es dependencia nueva (Next nativo), así que no roza `reglas.md §1`.
- **Warnings:** **Limpiarlos** en el mismo cambio (es coherente con §8 y la DoD §11).

> Decisión de equipo pendiente: el prefijo `unstable_` puede incomodar en un proyecto con "stack no negociable". Si se rechaza, la alternativa es **A2** (`force-dynamic`) — funciona para el síntoma visible, pero no blinda el `catch`.

---

## 7. Si se elige la solución de raíz: TODOS los archivos a tocar

### 7.1 Mínimo imprescindible (arregla el bug activo)

| Archivo | Qué se toca |
|---|---|
| `src/lib/projects/marketplace.ts` | `unstable_rethrow(error)` al inicio de los 3 `catch` (líneas **95**, **130**, **174**). El primero es el que explota hoy; los otros dos (`getMarketplaceProjectById`, `checkIfApplied`) alimentan rutas `[id]` ya dinámicas — se endurecen por consistencia. |

Con A2 en vez de A1, además/encambio:

| Archivo | Qué se toca |
|---|---|
| `src/app/[locale]/(app)/junior/projects/page.tsx` | `export const dynamic = 'force-dynamic'` |
| `src/app/[locale]/(app)/marketplace/page.tsx` | `export const dynamic = 'force-dynamic'` |
| `src/app/[locale]/(app)/junior/page.tsx` | `export const dynamic = 'force-dynamic'` |

### 7.2 Endurecimiento sistémico (preventivo — patrón `catch`-swallow replicado)

Mismo patrón `} catch (e) { logger.error(...); return err(...) }` que captura *todo*. Verificado por grep, con número de bloques `catch` por archivo:

| Archivo | Bloques `catch` (líneas) | ¿Activo hoy? |
|---|---|---|
| `src/lib/projects/marketplace.ts` | 95, 130, 174 | **Sí** (el del build) |
| `src/lib/company/actions.ts` | 102, 175, 279, 314, 366, 439 | Latente (server actions) |
| `src/lib/projects/actions.ts` | 87, 176, 229, 310 | Latente (server actions) |
| `src/lib/projects/dashboard.ts` | 139, 204 | Latente (`getMyPublishedProjects` alimenta una ruta de empresa) |
| `src/lib/projects/proposal.ts` | 121, 259 | Latente (ya re-lanza `AI_NOT_CONFIGURED`; falta el resto) |
| `src/lib/projects/publish.ts` | 169 | Latente (server action) |
| `src/lib/projects/chat.ts` | 143 | Latente (mapea mensajes; revisar) |

**NO necesitan tocarse** (verificado): `src/lib/applications/queries.ts`, `src/lib/auth/dal.ts`, `src/lib/projects/project-detail.ts`, `src/lib/deliverables/*`, `src/lib/admin/actions.ts` — **no usan `try/catch` envolvente**, sino chequeos `if (error)` que dejan propagar la señal. Tampoco los `catch {}` de `src/lib/supabase/server.ts:23`, `auth/actions.ts:43`, `auth/queries.ts:32,72`: son el **no-op intencional** de escritura de cookies del patrón oficial de Supabase SSR (correcto, no tocar).

> Antes de aplicar el sistémico: revisar cada `catch` y confirmar que la traducción de error real (p. ej. `chat.ts` mapea `AI_NOT_CONFIGURED`) se preserva **después** del `unstable_rethrow`. El orden correcto es: `unstable_rethrow(e)` primero, mapeo de errores reales después.

### 7.3 Limpieza de warnings

`AdminCancelProjectButton.tsx:32`, `AdminProjectCharts.tsx:68`, `CreateStrikeButton.tsx:61`, `marketplace.ts:10`. Borrar tras revisar cada archivo (el #3 puede destapar strings hardcoded si `t` era i18n — verificar).

### 7.4 Verificación obligatoria al cerrar (DoD §11)

1. `npm run build` → **0 warnings** y **0 líneas `DYNAMIC_SERVER_USAGE`**.
2. En la tabla de rutas, `junior`, `junior/projects` y `marketplace` deben pasar de `●` a **`ƒ`** (si se eligió A1) — la prueba de que ahora son dinámicas.
3. **Runtime:** `next start` y abrir las 3 páginas → deben mostrar **proyectos reales**, no el empty state. (Esto además zanja la duda [Probable] de §3.3.)
4. `npx tsc --noEmit` exit 0 y `npm test` verdes.

---

## 8. Apéndice — los tres mecanismos de la Capa A, en detalle

**A1 · `unstable_rethrow`** (Next nativo, `next/navigation`):
```ts
import { unstable_rethrow } from 'next/navigation'
// ...
} catch (error) {
  unstable_rethrow(error)   // re-lanza DYNAMIC_SERVER_USAGE, NEXT_REDIRECT, NEXT_NOT_FOUND
  logger.error('Unexpected error fetching marketplace projects', { error })
  return err('unexpected_error')
}
```
Pros: arregla la causa en un solo lugar (capa de datos); las rutas vuelven a `ƒ` solas; cubre las tres señales de framework. Contras: prefijo `unstable_`.

**A2 · `force-dynamic`** (config de ruta):
```ts
export const dynamic = 'force-dynamic'
```
Pros: no usa APIs `unstable`; explícito. Contras: por-ruta (se olvida fácil en rutas nuevas); **no** arregla el `catch`, que sigue pudiendo tragarse `redirect`/`notFound`; renderiza dinámico siempre (sin opción a ISR para la pág. pública de marketplace, que es una optimización futura).

**A3 · Ambos**: `unstable_rethrow` en los `catch` + `force-dynamic` declarativo en las 3 rutas. Máxima robustez; redundante.

---

## 9. El riesgo a decir en voz alta

Lo cómodo es callar las 6 líneas rojas y seguir. Sería un error: **el ruido es el síntoma, no la enfermedad**. La enfermedad es un `catch` que no distingue una señal de control de Next de un error real, y eso (a) probablemente está sirviendo el marketplace **vacío** en producción y (b) está replicado por `lib/` esperando a tragarse el primer `redirect()` que alguien escriba. El arreglo de raíz es pequeño (un `unstable_rethrow` por `catch`); el costo de la curita es un bug invisible que reaparece. **Antes de cerrar esto, hay que levantar `next start` y mirar las tres páginas** — esa es la única prueba que convierte el [Probable] de §3.3 en [Seguro].
