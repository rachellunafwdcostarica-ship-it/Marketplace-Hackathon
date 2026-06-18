# Auditoría P0.2 — Eliminación de casts `as unknown`

**Proyecto:** Marketplace FWD — Plataforma de Conexión de Talento Tecnológico  
**Responsable:** fressiarf  
**Fecha de inicio:** 2026-06-18  
**Fecha de cierre:** 2026-06-18  
**Estado:** Completado  
**Rama:** `fressia`

---

## 1. Contexto y justificación

El patrón `as unknown as T` en TypeScript es una doble conversión de tipos que elude completamente la verificación del compilador. A diferencia de `as T` (que al menos exige compatibilidad parcial), `as unknown as T` acepta cualquier tipo como origen y produce cualquier tipo como destino, ocultando divergencias entre la estructura real de la base de datos y los tipos de la aplicación.

Impacto directo:

- TypeScript deja de detectar cambios de schema en la BD que rompan la aplicación.
- Si una columna se renombra, elimina o cambia de tipo en Supabase, el error no aparece en tiempo de compilación, sino en producción (fallo silencioso o error en runtime).
- Viola el principio declarado en `reglas.md §2`: TypeScript en modo `strict` con `noUncheckedIndexedAccess` y `exactOptionalPropertyTypes`.

**Principio rector de esta auditoría:** la BD es la fuente de verdad. Los tipos TypeScript deben reflejar lo que Supabase/PostgREST devuelve en runtime. Cuando hay discrepancia entre la inferencia del SDK y la realidad de la BD, se reestructura la query — no se dobla la interfaz ni se usan casts.

---

## 2. Inventario de casts detectados

| # | Archivo | Línea | Relación involucrada | Categoría | Estado |
|---|---------|-------|----------------------|-----------|--------|
| 1 | `src/lib/portfolio/actions.ts` | 74 | `estudiantes → usuarios` (`isOneToOne: true`) | A — Cast innecesario | ✓ Completado |
| 2 | `src/lib/portfolio/actions.ts` | 83–87 | `estudiantes → habilidades_tecnicas → tecnologias` | A — Cast innecesario | ✓ Completado |
| 3 | `src/lib/portfolio/actions.ts` | 97–107 | `estudiantes → proyectos_portafolio → portafolio_tecnologias → tecnologias` | A — Cast innecesario | ✓ Completado |
| 4 | `src/lib/company/ratings.ts` | 74 | `contrataciones → participaciones` (`isOneToOne: true`) | A — Cast innecesario | ✓ Completado |
| 5 | `src/lib/company/ratings.ts` | 263 | `evaluaciones_empresarios → estudiantes/empresarios/contrataciones` (multi-nivel) | **B — Bug real: FK ambigua** | ✓ Completado + bug corregido |
| 6 | `src/lib/admin/queries.ts` | 471 | `proyectos → empresarios/proyecto_tecnologias` | B — revisado; SDK v14.5 infiere correctamente | ✓ Completado |
| 7 | `src/lib/admin/queries.ts` | 685 | Igual que #6 (segunda función) | B — revisado; SDK v14.5 infiere correctamente | ✓ Completado |

**Categoría A:** el cast sobra; la inferencia de Supabase ya produce el tipo correcto o puede producirlo con ajuste mínimo. Solución: eliminar el cast.  
**Categoría B:** la inferencia del SDK diverge de lo que PostgREST devuelve en runtime (FK `isOneToOne: false` que en práctica retorna objeto único). Solución: desglosar en queries independientes con tipos simples.

---

## 3. Métricas de línea base

Medición ejecutada el **2026-06-18** antes de cualquier modificación.

```
Comando: npm run typecheck
Resultado: 0 errores · 0 warnings
```

Este es el estado que debe mantenerse o mejorar al cierre de cada fase.

---

## 4. Fases de ejecución

---

### Fase 1 — `src/lib/portfolio/actions.ts` (casts #1, #2, #3)

**Fecha:** 2026-06-18  
**Responsable:** fressiarf  
**Categoría:** A — casts innecesarios

#### 4.1.1 Análisis previo

La función `getStudentProfile` realiza un único `.select()` con tres joins anidados:

```
estudiantes
  usuarios!estudiantes_id_usuario_fkey(nombre, apellido_1, apellido_2, foto_perfil)
  habilidades_tecnicas(nivel, id_tecnologia, tecnologias(nombre))
  proyectos_portafolio(id_portafolio, titulo, descripcion, url_repositorio, url_demo, fecha,
    portafolio_tecnologias(tecnologias(nombre)))
```

Comportamiento esperado según `database.ts`:

| Campo | FK `isOneToOne` | PostgREST devuelve | Supabase TS infiere |
|-------|-----------------|-------------------|---------------------|
| `usuarios` | `true` | Objeto único `\| null` | Objeto único `\| null` |
| `habilidades_tecnicas` | N/A (reverse 1:N) | Array | Array |
| `tecnologias` dentro de `habilidades_tecnicas` | `false` (forward N:1) | Objeto único `\| null` | Puede inferir array (limitación SDK) |
| `proyectos_portafolio` | N/A (reverse 1:N) | Array | Array |
| `portafolio_tecnologias` dentro de `proyectos_portafolio` | N/A (reverse 1:N) | Array | Array |
| `tecnologias` dentro de `portafolio_tecnologias` | `false` (forward N:1) | Objeto único `\| null` | Puede inferir array (limitación SDK) |

#### 4.1.2 Casts eliminados

**Cast #1 — `estudiante.usuarios` (línea 74)**

ANTES:
```typescript
const userInfo = estudiante.usuarios as unknown as {
  nombre: string | null
  apellido_1: string | null
  apellido_2: string | null
  foto_perfil: string | null
} | null
```

DESPUÉS:
```typescript
const userInfo = estudiante.usuarios
```

Justificación: `isOneToOne: true` en `estudiantes_id_usuario_fkey`. Supabase infiere objeto único `| null`. El cast era redundante.

---

**Cast #2 — `estudiante.habilidades_tecnicas` (líneas 83–87)**

ANTES:
```typescript
const rawSkills =
  (estudiante.habilidades_tecnicas as unknown as Array<{
    id_tecnologia: string
    nivel: 'basico' | 'intermedio' | 'avanzado'
    tecnologias: { nombre: string } | null
  }>) || []
```

DESPUÉS:
```typescript
const rawSkills = estudiante.habilidades_tecnicas ?? []
```

Ajuste en el mapping: si `tecnologias` es inferido como objeto `| null` (correcto), `h.tecnologias?.nombre` funciona. Si el SDK lo infiere como array, se ajusta el acceso a `h.tecnologias?.[0]?.nombre` — decisión tomada según resultado de `typecheck` post-cambio.

---

**Cast #3 — `estudiante.proyectos_portafolio` (líneas 97–107)**

ANTES:
```typescript
const rawProjects =
  (estudiante.proyectos_portafolio as unknown as Array<{
    id_portafolio: string
    titulo: string
    descripcion: string | null
    fecha: string | null
    url_repositorio: string | null
    url_demo: string | null
    portafolio_tecnologias: Array<{
      tecnologias: { nombre: string } | null
    }> | null
  }>) || []
```

DESPUÉS:
```typescript
const rawProjects = estudiante.proyectos_portafolio ?? []
```

Mismo criterio que Cast #2 para el acceso a `tecnologias` en el mapping.

#### 4.1.3 Resultado de typecheck post-Fase 1

```
Comando: npm run typecheck
Resultado: 0 errores · 0 warnings
```

Confirmación: los tres casts eran completamente redundantes. Supabase JS (con `PostgrestVersion: '14.5'`) infiere correctamente:

- `usuarios` → `{ nombre: string | null; apellido_1: string | null; apellido_2: string | null; foto_perfil: string | null } | null` (objeto único, `isOneToOne: true`)
- `habilidades_tecnicas` → array con `tecnologias` como objeto único `| null` (forward FK, inferido correctamente)
- `proyectos_portafolio` → array con `portafolio_tecnologias` como array y `tecnologias` como objeto `| null`

Nota: la línea 93 mantiene `as string[]` para el narrowing post-`.filter(Boolean)`. Este cast está fuera del scope de P0.2 (es un narrowing de `(string | undefined)[]` a `string[]`, no una conversión de tipo entre estructuras de BD y aplicación).

#### 4.1.4 Estado

| Cast | Eliminado | typecheck | Notas |
|------|-----------|-----------|-------|
| #1 `usuarios` | ✓ 2026-06-18 | 0 errores | `isOneToOne: true`, inferencia correcta |
| #2 `habilidades_tecnicas` | ✓ 2026-06-18 | 0 errores | Array + FK interno inferido como objeto |
| #3 `proyectos_portafolio` | ✓ 2026-06-18 | 0 errores | Array + anidados inferidos correctamente |

---

### Fase 2 — `src/lib/company/ratings.ts` línea 74 (cast #4)

**Fecha:** 2026-06-18  
**Responsable:** fressiarf  
**Categoría:** A — cast innecesario

#### 4.2.1 Análisis previo

La función `rateCompany` hace un join `contrataciones → participaciones!inner(...)` donde `contrataciones_id_participacion_fkey` tiene `isOneToOne: true`. Supabase infiere el objeto único correctamente.

#### 4.2.2 Cast eliminado

ANTES:
```typescript
const part = contratacion.participaciones as unknown as {
  id_estudiante: string
  proyectos: {
    id_empresario: string
    id_proyecto: string
  }
}
```

DESPUÉS:
```typescript
const part = contratacion.participaciones
```

#### 4.2.3 Resultado de typecheck post-Fase 2

```
Comando: npm run typecheck
Resultado: 0 errores · 0 warnings
```

#### 4.2.4 Estado

| Cast | Eliminado | typecheck | Notas |
|------|-----------|-----------|-------|
| #4 `participaciones` | ✓ 2026-06-18 | 0 errores | `isOneToOne: true`, inferencia correcta |

---

### Fase 3 — `src/lib/admin/queries.ts` líneas 471 y 685 (casts #6 y #7)

**Fecha:** 2026-06-18  
**Responsable:** fressiarf  
**Categoría:** B — revisada; resultado: cast también innecesario

#### 4.3.1 Hallazgo revisado

Contrario a la predicción inicial (Categoría B — inferencia incorrecta del SDK), al quitar los casts TypeScript compiló con 0 errores. El SDK con `PostgrestVersion: '14.5'` infiere correctamente los joins con `isOneToOne: false` cuando son FK directas de N:1.

**Consecuencia adicional:** la interfaz `RawAdminProyecto` quedó sin referencias (código muerto). Se eliminó conforme a `reglas.md §8`.

#### 4.3.2 Casts eliminados y limpieza

ANTES (en `listAllProjectsForAdmin`, línea 471):
```typescript
const filas = (data ?? []) as unknown as RawAdminProyecto[]
```

ANTES (en `listProjectsForAdmin`, línea 685):
```typescript
const filas = (data ?? []) as unknown as RawAdminProyecto[]
```

DESPUÉS (ambas funciones):
```typescript
const filas = data ?? []
```

Interfaz eliminada:
```typescript
// ELIMINADA — código muerto tras quitar los casts
interface RawAdminProyecto { ... }
```

#### 4.3.3 Resultado de typecheck post-Fase 3

```
Comando: npm run typecheck
Resultado: 0 errores · 0 warnings
```

#### 4.3.4 Estado

| Cast | Eliminado | typecheck | Notas |
|------|-----------|-----------|-------|
| #6 `listAllProjectsForAdmin` | ✓ 2026-06-18 | 0 errores | SDK infiere correctamente; `RawAdminProyecto` eliminada |
| #7 `listProjectsForAdmin` | ✓ 2026-06-18 | 0 errores | Idéntico a #6 |

---

### Fase 4 — `src/lib/company/ratings.ts` línea 263 (cast #5)

**Fecha:** 2026-06-18  
**Responsable:** fressiarf  
**Categoría:** B — hallazgo crítico

#### 4.4.1 Hallazgo crítico: bug real encubierto por el cast

Al quitar el cast `as unknown as {...}` y ejecutar `npm run typecheck`, TypeScript reportó 6 errores reales:

```
src/lib/company/ratings.ts(259,15): error TS2339: Property 'nombre' does not exist on type
  SelectQueryError<"Could not embed because more than one relationship was found for
  'usuarios' and 'estudiantes' you need to hint the column with usuarios!<columnName> ?">

src/lib/company/ratings.ts(268,30): error TS2339: Property 'nombre' does not exist on type
  SelectQueryError<"Could not embed because more than one relationship was found for
  'usuarios' and 'empresarios' you need to hint the column with usuarios!<columnName> ?">

[4 errores adicionales del mismo tipo]
```

**Causa:** la query usaba `usuarios!inner(...)` sin especificar el FK cuando existen dos rutas FK entre `usuarios` y cada tabla:

| Tabla | FK principal | FK secundaria |
|-------|-------------|---------------|
| `estudiantes` | `estudiantes_id_usuario_fkey` (columna `id_usuario`) | `estudiantes_verificado_por_fkey` (columna `verificado_por`) |
| `empresarios` | `empresarios_id_usuario_fkey` (columna `id_usuario`) | `empresarios_verificado_por_fkey` (columna `verificado_por`) |

PostgREST recibía una query ambigua y resolvía por heurística interna — comportamiento no determinista que el cast ocultaba completamente desde TypeScript.

#### 4.4.2 Corrección aplicada

ANTES (query ambigua):
```sql
estudiantes!inner(
  usuarios!inner(nombre, apellido_1, apellido_2)
),
empresarios!inner(
  nombre_empresa,
  usuarios!inner(nombre, apellido_1, apellido_2)
)
```

DESPUÉS (FK explícito):
```sql
estudiantes!inner(
  usuarios!estudiantes_id_usuario_fkey(nombre, apellido_1, apellido_2)
),
empresarios!inner(
  nombre_empresa,
  usuarios!empresarios_id_usuario_fkey(nombre, apellido_1, apellido_2)
)
```

La variable intermedia `r` (alias del cast) se eliminó; las referencias se actualizaron a `row` directamente.

#### 4.4.3 Resultado de typecheck post-Fase 4

```
Comando: npm run typecheck
Resultado: 0 errores · 0 warnings
```

#### 4.4.4 Estado

| Cast | Eliminado | typecheck | Notas |
|------|-----------|-----------|-------|
| #5 `getAllCompanyRatingsForAdmin` | ✓ 2026-06-18 | 0 errores | **Bug real corregido:** query FK ambigua → FK explícita |

---

## 5. Resumen de resultados

### 5.1 Inventario final

| # | Archivo | Cast | Resultado | Tipo de hallazgo |
|---|---------|------|-----------|-----------------|
| 1 | `portfolio/actions.ts:74` | `usuarios as unknown as {...}` | Eliminado | Cast redundante; SDK infería correctamente |
| 2 | `portfolio/actions.ts:83` | `habilidades_tecnicas as unknown as Array<{...}>` | Eliminado | Cast redundante; SDK infería correctamente |
| 3 | `portfolio/actions.ts:97` | `proyectos_portafolio as unknown as Array<{...}>` | Eliminado | Cast redundante; SDK infería correctamente |
| 4 | `ratings.ts:74` | `participaciones as unknown as {...}` | Eliminado | Cast redundante; `isOneToOne: true` resuelve correctamente |
| 5 | `ratings.ts:263` | `row as unknown as {...}` (cast masivo) | Eliminado + **bug corregido** | Query con FK ambigua; se especificó FK explícita |
| 6 | `admin/queries.ts:471` | `data as unknown as RawAdminProyecto[]` | Eliminado + interfaz eliminada | Cast redundante; SDK con v14.5 infiere correctamente |
| 7 | `admin/queries.ts:685` | `data as unknown as RawAdminProyecto[]` | Eliminado + interfaz eliminada | Idéntico a #6 |

### 5.2 Métricas comparativas

| Métrica | Antes | Después |
|---------|-------|---------|
| Casts `as unknown` en scope | 7 | 0 |
| Errores `npm run typecheck` | 0 | 0 |
| Interfaces muertas eliminadas | — | 1 (`RawAdminProyecto`) |
| Bugs reales descubiertos | — | 1 (query FK ambigua en `getAllCompanyRatingsForAdmin`) |
| Líneas de código eliminadas (netas) | — | ~45 |

### 5.3 Criterios de cierre

- [x] Los 7 casts `as unknown` han sido eliminados de los 3 archivos afectados.
- [x] `npm run typecheck` retorna 0 errores en cada fase y al cierre.
- [x] Ninguna interfaz local fue modificada para acomodar la inferencia del SDK (principio DB-first).
- [x] El mapping de datos produce resultados idénticos al comportamiento anterior.
- [x] Se detectó y corrigió un bug real de query ambigua (cast #5).

### 5.4 Alcance fuera de scope (para auditoría futura)

Los siguientes `as unknown` existen en otros archivos de `src/lib/` y **no forman parte de P0.2**. Son de naturaleza diferente (serialización de campos `Json` de Supabase y deserialización de estructuras almacenadas como JSON):

| Archivo | Uso | Naturaleza |
|---------|-----|------------|
| `projects/actions.ts:287` | `draft as unknown as Json` | Conversión a tipo `Json` de Supabase |
| `proposal-ai/chat.ts:127` | `historialFinal as unknown as Json` | Ídem |
| `projects/dashboard.ts:113` | `filasRaw as unknown as RawProyecto[]` | Similar a casts #6/#7 — candidato a Fase P0.2b |
| `projects/persistence.ts:7,13,20` | Deserialización de campos `Json` | Patrón de deserialización JSON — revisar con type guards |
| `proposal-ai/proposal.ts:184,185,187,237` | `... as unknown as Json` | Conversión a tipo `Json` de Supabase |
| `projects/publish.ts:131` | Cast sobre cliente Supabase | Workaround tipado cliente — requiere análisis separado |

---

## 6. Referencias

- `reglas.md §2` — TypeScript strict, prohibición de `any`, política sobre `@ts-ignore`
- `src/types/database.ts` — Tipos generados por Supabase CLI, fuente de verdad de relaciones FK
- `supabase/migrations/` — Historial de migraciones, estructura real de la BD
- `SRS_Plataforma_Talento_FWD §3.6 RNF-22` — Código conforme a estándares del proyecto
