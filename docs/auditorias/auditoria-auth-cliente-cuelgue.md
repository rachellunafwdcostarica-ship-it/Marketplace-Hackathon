# Auditoría — cuelgue por `supabase.auth.getUser()` / `getSession()` en el cliente

**Fecha:** 2026-06-17 · **Rama:** `errol` (HEAD `a60b8e1`) · **Next.js:** 15.5.19 · **Supabase SSR:** `@supabase/ssr`
**Disparador:** un formulario de la app (`CompanyProfileForm`) se quedaba en "Cargando" para siempre al guardar. La causa fue una llamada `supabase.auth.getUser()` ejecutada **desde el navegador** que nunca resolvía. Ese caso **ya está resuelto** (commit local `7e03648`) y queda **fuera del alcance** de este documento. Este informe documenta los **otros dos lugares del código donde vive el mismo patrón y todavía no está resuelto**.
**Alcance:** solo **reporte y diagnóstico**. No se modificó ningún archivo. La remediación es tarea de otra persona/equipo. El objetivo es que quien la tome entienda qué pasa, dónde, qué reglas se incumplen y cómo se arregla **desde la raíz** (no con parches).

Etiquetas de confianza: **[Seguro]** = verificado en archivo y línea; **[Probable]** = inferencia sólida pendiente de confirmar en runtime; **[Adivinando]** = hueco que hay que verificar.

---

## 0. TL;DR

Dos componentes `'use client'` llaman a la API de autenticación de Supabase **desde el navegador** como paso bloqueante:

1. **`junior/applications/page.tsx`** — 🔴 **Riesgo alto.** En el `useEffect` de montaje llama `supabase.auth.getUser()` del cliente antes de cargar los datos. Si esa llamada se cuelga, **toda la página "Mis Postulaciones" queda en "cargando" para siempre, en cada visita**.
2. **`reset-password/page.tsx`** — 🟡 **Riesgo bajo.** En el `useEffect` de montaje llama `supabase.auth.getSession()`. `getSession` lee de almacenamiento local (no hace red), así que es mucho menos propenso a colgarse, pero comparte el mismo "auth lock".

**Causa raíz común:** se está haciendo **autenticación en el cliente** cuando corresponde hacerla en el **servidor**. La cura no es ponerle un timeout ni un `try/catch` a `getUser` — eso es tapar el síntoma. La cura es **mover la autenticación y la carga de datos al servidor** (server component + server action), exactamente como ya se hizo en el formulario de empresa. Para el caso 2, además, el repo ya tiene el patrón correcto por eventos (`onAuthStateChange` en `AuthContext.tsx`).

---

## 1. El patrón y por qué se cuelga

### 1.1 Qué hace `getUser()` en el navegador [Seguro]

`supabase.auth.getUser()` **no** lee la sesión local: hace una **petición de red** al servidor de Auth de Supabase para **validar el token** contra el backend. Es decir, cada llamada es un viaje de red navegador→Supabase. Además, `@supabase/ssr` serializa las operaciones de auth con un **lock** del navegador (`navigator.locks`, el "auth lock") para evitar carreras entre pestañas.

Si por cualquier razón esa petición no responde o el lock queda tomado, el `await` **nunca resuelve**: no lanza error, no entra a ningún `catch`, simplemente se queda colgado. El componente que lo espera queda atrapado en su estado de carga.

### 1.2 Por qué sabemos que es real (la evidencia) [Seguro]

Esto no es teórico: tumbó el formulario de empresa. Síntomas observados:
- El botón quedaba en "Cargando..." indefinidamente (más de 2 minutos).
- En la terminal de `next dev` **no aparecía ningún `POST`** — la server action de guardado ni siquiera llegaba a ejecutarse, porque el cuelgue era **antes**, en el `getUser()` del cliente.

Al mover la obtención del usuario al servidor, el guardado volvió a funcionar. Y al probar **subir una imagen** (otra llamada navegador→Supabase, al Storage) **sí funcionó**: eso descarta que la red navegador→Supabase esté bloqueada en general.

### 1.3 Conclusión sobre el mecanismo [Probable]

Como la red navegador→Supabase **sí** funciona (lo probó la subida de imagen), el cuelgue no es "internet caído": apunta al **camino específico de `getUser()`** — el "auth lock" tomado/deadlock, o un stall de la validación del token. No se cerró al 100% la causa exacta porque la solución correcta **la esquiva por completo** (no llama a `getUser` en el cliente), así que dejar de depender de ese camino es la cura independientemente del mecanismo fino.

> Diferencia importante para este informe: **`getUser()` (red + lock) es mucho más peligroso que `getSession()` (solo lock, lee local)**. Por eso el caso 1 (que usa `getUser`) es alto y el caso 2 (que usa `getSession`) es bajo.

---

## 2. Caso A 🔴 — `junior/applications/page.tsx` (alto)

**Archivo:** `src/app/[locale]/(app)/junior/applications/page.tsx`
**Naturaleza:** página `'use client'` (la pantalla "Mis Postulaciones" del egresado).

### 2.1 Qué hace, paso a paso [Seguro]

```ts
// línea 1
'use client'
// ...
const [loading, setLoading] = useState(true)      // arranca en "cargando"

const fetchApplications = async () => {
  const supabase = createSupabaseBrowserClient()   // línea 27 — cliente del NAVEGADOR
  const { data: { user } } = await supabase.auth.getUser()   // línea 31 — PRIMER await, BLOQUEANTE
  if (!user) { setLoading(false); return }
  // ... luego consulta estudiantes y participaciones, también desde el cliente
  setLoading(false)
}

useEffect(() => { fetchApplications() }, [])        // línea 94 — corre en cada montaje
```

1. La página monta con `loading = true`.
2. El `useEffect` dispara `fetchApplications()` **en cada visita**.
3. El **primer `await` es `supabase.auth.getUser()` del navegador** (línea 31).
4. `loading` solo pasa a `false` **después** de que esa llamada resuelva.

### 2.2 Consecuencia [Probable, alta]

Si `getUser()` se cuelga (el mismo mecanismo que tumbó el formulario de empresa), **la página entera queda en "cargando" para siempre, en cada carga**. Es **peor que el formulario**: ahí era un botón de guardar puntual; acá es la **carga completa de la pantalla** — el egresado nunca ve sus postulaciones.

Además, toda la obtención de datos (consultas a `estudiantes` y `participaciones`) ocurre **en el cliente**, lo que multiplica viajes de red y expone la forma de las consultas al navegador.

### 2.3 Confianza

- [Seguro] El patrón existe en las líneas indicadas (verificado contra HEAD `a60b8e1`).
- [Probable] Que se cuelgue igual que el formulario: es **idéntica llamada** (`getUser` del mismo cliente de navegador), pero el cuelgue es intermitente y depende del estado del lock, así que se debe **confirmar en runtime** reproduciendo la condición.

---

## 3. Caso B 🟡 — `reset-password/page.tsx` (bajo)

**Archivo:** `src/app/[locale]/(public)/reset-password/page.tsx`
**Naturaleza:** página `'use client'` (fijar nueva contraseña tras el enlace de recuperación).

### 3.1 Qué hace [Seguro]

```ts
const [sessionOk, setSessionOk] = useState<boolean | null>(null)  // null = "comprobando"

useEffect(() => {
  const supabase = createSupabaseBrowserClient()
  supabase.auth.getSession().then(({ data }) => {   // línea 52
    setSessionOk(Boolean(data.session))
  })
}, [])
```

Al montar, consulta `getSession()` para saber si hay una **sesión de recuperación** válida (la que crea el enlace del correo) y decidir si muestra el formulario o el aviso de "enlace inválido".

### 3.2 Por qué el riesgo es bajo [Probable]

`getSession()` **lee de almacenamiento local** y **no hace red** para validar el token, así que es mucho menos propenso a colgarse que `getUser()`. Comparte el "auth lock", de modo que el riesgo **no es cero**, pero es marginal comparado con el caso A. Si llegara a colgarse, la pantalla quedaría en "comprobando" sin avanzar (`sessionOk` nunca deja de ser `null`).

### 3.3 Matiz que condiciona la solución [Probable]

El flujo de recuperación de contraseña suele depender de que el **token de recuperación llegue en la URL** (fragment `#access_token=...` o `?code=...`) y se procese **en el cliente**. Por eso este caso **no se arregla simplemente "moviéndolo al servidor"** como el caso A: la solución depende de **qué flujo de auth está configurado** (implícito vs PKCE), cosa que **no verifiqué** en esta auditoría. Ver §5.2.

---

## 4. Reglas de `reglas.md` que se incumplen

| Regla | Texto | Incumplimiento |
|---|---|---|
| **§1 Stack** | "Server Components por defecto; `'use client'` solo donde haga falta interactividad." | `junior/applications/page.tsx` es una página entera `'use client'` que carga datos en el cliente, cuando debería ser un server component. [Seguro] |
| **§8 Anti-basura** | "Sin `useEffect` como manager de estado: server components, react-query o estado derivado." | Ambos casos usan `useEffect` de montaje para orquestar fetch/estado. El caso A es el incumplimiento claro (carga de datos); el caso B es más matizado (chequeo de sesión). [Seguro] caso A · [Probable] caso B |

> Nota: el caso A ya tiene un **modelo correcto dentro del mismo repo**: la página de perfil de empresa (`formulario-empresa/page.tsx`) es un server component que obtiene el usuario con `getCurrentUser()` y pasa los datos por prop. Replicar ese patrón es la cura.

---

## 5. Solución de raíz (no parches)

### 5.0 Lo que NO se debe hacer (parches) ❌

| Parche | Por qué es parche |
|---|---|
| Ponerle un `timeout`/`Promise.race` a `getUser()` | Convierte el cuelgue en un error silencioso; el dato sigue sin cargar y no se arregla la causa. |
| Envolver `getUser()` en `try/catch` | No hay excepción que atrapar: el problema es que **nunca resuelve**, no que lance. Inútil. |
| Spinner/reintentos en el cliente | Maquilla la espera; el lock sigue ahí. |
| Cambiar `getUser()` por `getSession()` en el caso A | Reduce el riesgo, pero **sigue siendo auth en el cliente** y mantiene la violación de `reglas.md §1/§8`. Curita, no cura. |

Todas comparten el mismo defecto: atacan el **síntoma en el cliente** en vez de **sacar la autenticación del cliente**.

### 5.1 Caso A — convertir a carga en el servidor ✅ [Seguro como dirección]

Reestructurar `junior/applications/page.tsx` siguiendo el patrón **ya probado** del formulario de empresa:

1. **La página pasa a ser un server component** (async, sin `'use client'`).
2. La autenticación se hace en el servidor con `getCurrentUser()` (`src/lib/auth/dal.ts`, ya existe y está memoizado) — **el navegador nunca llama a `getUser()`**.
3. La obtención de postulaciones se mueve a una **server query** en `src/lib/applications/queries.ts`, hermana de la ya existente `getMisPostulacionesStats` (p. ej. `getMisPostulaciones()` que devuelva la lista con `Result<T>`). Usa `createSupabaseServerClient`, donde la red sí responde.
4. La parte interactiva (el botón "retirar" → `retirarPostulacion`, que **ya es server action**) se aísla en un **componente cliente pequeño** que recibe los datos por prop, igual que `CompanyProfileForm` recibe `initialProfile`.

Resultado: cero llamadas de auth en el cliente, y de paso cumple `reglas.md §1` y §8.

### 5.2 Caso B — pasar a un patrón por eventos o a code-exchange en servidor ✅ [Probable — depende del flujo]

El repo ya tiene el patrón correcto: **`AuthContext.tsx` usa `supabase.auth.onAuthStateChange(...)`** (suscripción por eventos, no bloqueante) en lugar de sondear `getSession()`. Dos rutas de raíz, según el flujo de auth configurado (hay que **confirmarlo** antes de elegir):

- **B1 — Por eventos (si el flujo entrega el token en el cliente):** sustituir el `getSession().then(...)` de montaje por `onAuthStateChange`, escuchando el evento **`PASSWORD_RECOVERY`** (y/o `SIGNED_IN`) para decidir `sessionOk`. Evita la llamada bloqueante de montaje y se alinea con `AuthContext`. [Probable]
- **B2 — Code-exchange en el servidor (si el flujo es PKCE con `?code=`):** procesar la recuperación en una **route handler del servidor** con `exchangeCodeForSession(...)`, dejando la página sin lógica de sesión en el cliente. Más alineado con "auth en el servidor", pero es un cambio mayor. [Adivinando — requiere ver la config de Supabase Auth y el `redirectTo` del correo de recuperación]

> Antes de tocar el caso B: **verificar el flujo real** (¿el correo de recuperación manda a un `#access_token` o a un `?code=`?). De eso depende cuál de B1/B2 aplica. No documentado aquí porque no se verificó en esta auditoría.

---

## 6. Archivos a tocar (resumen para quien tome la tarea)

| Caso | Archivo | Acción de raíz |
|---|---|---|
| A | `src/app/[locale]/(app)/junior/applications/page.tsx` | Convertir a server component; quitar `createSupabaseBrowserClient` + `getUser` + consultas cliente. |
| A | `src/lib/applications/queries.ts` | Añadir `getMisPostulaciones()` (server query con `Result<T>`), hermana de `getMisPostulacionesStats`. |
| A | (nuevo) componente cliente de lista | Recibe las postulaciones por prop y conserva el botón "retirar" (`retirarPostulacion`, ya server action). |
| B | `src/app/[locale]/(public)/reset-password/page.tsx` | Reemplazar `getSession().then(...)` de montaje por `onAuthStateChange` (B1) o mover a code-exchange en servidor (B2), según el flujo. |
| — | `src/lib/auth/AuthContext.tsx` | **Referencia** del patrón correcto (`onAuthStateChange`). No se toca; se cita como modelo. |

---

## 7. Verificación al cerrar (cuando se arregle)

1. **Caso A:** abrir "Mis Postulaciones" como egresado → carga las postulaciones reales sin quedarse en "cargando". En la terminal **no** debe haber dependencia de un `getUser` de cliente; los datos llegan ya renderizados del servidor.
2. **Caso B:** abrir el enlace de recuperación de contraseña → muestra el formulario (sesión válida) o el aviso de enlace inválido, sin quedarse en "comprobando".
3. `npx tsc --noEmit` exit 0, `npm run lint` y `npm test` verdes.
4. Confirmar que **ningún archivo `'use client'`** vuelve a llamar `supabase.auth.getUser()` / `getSession()` como paso bloqueante (un grep de `auth.getUser`/`auth.getSession` cruzado con `createSupabaseBrowserClient` debe quedar **solo** en patrones por eventos como `AuthContext`).

---

## 8. El riesgo a decir en voz alta

Lo cómodo es decir "el formulario de empresa ya funciona, listo". Sería incompleto: **el formulario era un caso, no la enfermedad**. La enfermedad es un patrón —autenticar en el navegador con `getUser()`/`getSession()` como paso bloqueante— que está **replicado**. El caso A (`junior/applications`) es el más peligroso porque congela una pantalla completa en cada visita, y es **probable** que se cuelgue exactamente igual que el formulario, porque es la misma llamada. El arreglo de raíz no es ponerle timeouts a `getUser`: es **sacar la autenticación del cliente** y dejarla en el servidor, que es donde el resto del proyecto ya la hace bien. Mientras eso no se haga, la pantalla de postulaciones del egresado es una bomba de tiempo silenciosa. **Antes de cerrarlo, hay que reproducir el cuelgue en runtime** para convertir el [Probable] de §2.3 en [Seguro].
