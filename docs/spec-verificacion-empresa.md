# Especificación — Verificación de empresas/empresarios (dominio Admin)

> **Para:** quien lleve el dominio Admin (mismo patrón que la verificación de egresados, ADM-1).
> **Escrito por:** equipo de Empresario, como handoff. **Nosotros NO tocamos rutas de admin.**
> **Estado:** pendiente de implementar. La columna `empresarios.estado_verificacion` existe pero **nada en el código real la mueve a `'verificado'`**.

---

## 1. El problema (por qué esto bloquea todo)

Hoy un empresario puede registrarse, elegir su rol, completar su perfil de empresa y llegar hasta el final del flujo de publicación, pero **no puede publicar nunca**, porque:

- `publishProject` (`src/lib/projects/publish.ts:61`) e `initProjectPublishing` (`src/lib/projects/actions.ts:127`) exigen `empresarios.estado_verificacion = 'verificado'`.
- Esa columna está **congelada** para el rol `authenticated` por el guard-trigger `guard_empresarios_protected_cols` (`supabase/migrations/20260610000006_security_hardening_rls.sql:99`). El propio empresario no la puede cambiar.
- **No existe** ninguna server action que la mueva (solo hay `verificarEgresado` para estudiantes, no para empresas).
- La página `src/app/[locale]/(company)/.../admin/companies/page.tsx` que *parece* aprobar empresas es **100 % mock**: usa `useAppState()` / `updateCompanyStatus`, cambia un estado en memoria y **no escribe en la base de datos**.

**Conclusión:** ningún empresario puede publicar hasta que exista este flujo. No es un bug de datos puntual; es un RF sin implementar.

---

## 2. Modelo de datos (lo que ya existe, no hay que migrar)

Tabla `empresarios` (`supabase/migrations/20260608000001_initial_schema.sql:211`):

| Columna | Tipo | Notas |
| --- | --- | --- |
| `id_empresario` | uuid PK | |
| `id_usuario` | uuid FK → usuarios | único |
| `tipo_empresario` | enum `('empresa_formal','emprendedor')` | NOT NULL |
| `nombre_empresa` | varchar(150) | NOT NULL |
| `sector` | varchar(80) | |
| `descripcion` | text | |
| `logo` | varchar(150) | path en storage |
| `sitio_web` | varchar(150) | |
| `cedula_juridica` | varchar(50) | solo aplica a empresa formal (ver nota) |
| `alcance_operativo` | enum | nacional / internacional / ambos |
| `pais_sede`, `ciudad_sede` | varchar | |
| `estado_verificacion` | enum `('pendiente','verificado','rechazado')` | **default `'pendiente'`** ← el gate |
| `verificado_at` | timestamptz | lo setea el admin |
| `verificado_por` | uuid FK → usuarios | id del admin |

> **Nota sobre la cédula:** el equipo de Empresario va a renombrar `cedula_juridica → cedula` (genérica) para que sirva a ambos tipos (empresa formal = cédula jurídica; emprendedor = cédula de identidad). Si esa migración ya entró cuando implementes esto, leé `cedula` en vez de `cedula_juridica`. Coordinen el nombre final antes de cablear la UI.

La fila en `empresarios` **NO nace en el registro ni en el onboarding** (los campos NOT NULL lo impiden; ver `20260609000005_onboarding_and_validation.sql:168`). Nace cuando el empresario **completa su perfil** (`saveCompanyProfile`). Por eso la verificación de empresa **solo puede ocurrir después de que el perfil está completo** — no se puede verificar una empresa que todavía no existe como fila.

---

## 3. Flujo temporal (dónde encaja esto)

```
registro (OAuth) → onboarding (rol 'empresario') → approveUser (estado_cuenta='activa')
   → empresario completa su perfil  → nace fila empresarios (estado_verificacion='pendiente')
   → [ADMIN] verifica la empresa    → estado_verificacion='verificado'   ◄── ESTO ES LO QUE FALTA
   → empresario publica
```

Son **dos verificaciones distintas, a propósito** (igual que con estudiantes):

- `usuarios.estado_cuenta = 'activa'` (`approveUser`) → "la persona es real, puede entrar".
- `empresarios.estado_verificacion = 'verificado'` (esta spec) → "la empresa/emprendedor puede publicar".

---

## 4. Qué implementar (checklist)

Todo esto es **espejo** de la verificación de egresados, que ya está hecha y funciona. Copiá ese patrón.

### 4.1. Server actions — `src/lib/admin/actions.ts`

**`verificarEmpresa(idEmpresario: string): Promise<Result<void>>`**
Espejo de `verificarEgresado` (mismo archivo, línea 26). Pasos:
1. Validar `idEmpresario` con `z.string().uuid()`.
2. `requireRole('admin')`.
3. Obtener el `user.id` del admin (para `verificado_por`).
4. **`createSupabaseAdminClient()`** (service_role) — obligatorio: el guard-trigger congela estas columnas para `authenticated`, solo `service_role` las puede escribir.
5. `UPDATE empresarios SET estado_verificacion='verificado', verificado_at=now(), verificado_por=<adminId> WHERE id_empresario=<idEmpresario>` con `.select(...)` para detectar si tocó alguna fila.
6. Si no tocó filas → `err('empresa_no_encontrada')`.
7. `revalidatePath('/admin/companies', 'page')`.
8. Devolver `ok(undefined)`.

**`rechazarEmpresa(idEmpresario: string): Promise<Result<void>>`**
Idéntica, pero `estado_verificacion='rechazado'`. (Decidir si `rechazado` también limpia `verificado_at/por` o los deja; recomendación: setear `verificado_at=now()`, `verificado_por=<adminId>` igual, como traza de quién y cuándo rechazó.)

### 4.2. Query — `src/lib/admin/queries.ts`

**`getPendingCompanies(): Promise<Result<PendingCompany[]>>`**
Espejo de `getPendingUsers` (mismo archivo, línea 22):
1. `requireRole('admin')`.
2. **`createSupabaseAdminClient()`** — la policy `empresarios_select_own` (`20260608000004_cleanup_and_rls.sql:184`) solo deja ver el registro propio; el admin necesita service_role para ver empresas ajenas.
3. `SELECT` de `empresarios` con `estado_verificacion='pendiente'`, **join a `usuarios`** para traer `nombre`, `apellido_1`, `apellido_2`, `correo`, `fecha_nacimiento` del representante.
4. Ordenar por algo estable (p. ej. `updated_at` asc).

Campos a devolver (lo que el admin necesita para **decidir**):
- Empresa: `id_empresario`, `nombre_empresa`, `tipo_empresario`, `sector`, `descripcion`, `cedula` (jurídica si formal), `alcance_operativo`, `pais_sede`, `ciudad_sede`, `logo`, `sitio_web`.
- Representante (de `usuarios`): nombre completo, `correo`, `fecha_nacimiento`.

> Considerá también una variante que liste **todas** las empresas con filtro por estado (pendiente/verificado/rechazado), igual que `listUsers` hace para usuarios — así el admin ve el historial, no solo la cola.

### 4.3. UI

- **`VerifyCompanyButton`** (+ opcional `RejectCompanyButton`) — espejo de `src/components/features/auth/VerifyGraduateButton.tsx`: `useState(loading)`, llama la action, `toast` de éxito/error, `router.refresh()`.
- **Reescribir `admin/companies/page.tsx`** — sacarlo del mock (`useAppState`/`updateCompanyStatus`) y conectarlo a `getPendingCompanies` + las actions reales. Puede pasar a Server Component (como `validations/page.tsx`) que hace el fetch y pasa los datos.
- Mostrar al admin **el criterio adaptado al tipo** (RF-17):
  - **empresa_formal** → resaltar `cedula` (jurídica), `sitio_web`, `sector`.
  - **emprendedor** → resaltar datos personales del representante (nombre, correo).

### 4.4. i18n

Agregar claves en `messages/es.json` y `messages/en.json` (namespace `Admin`), en paridad es/en. Cero strings hardcoded (regla del brief §8).

### 4.5. Identidad visual

Seguir los tokens FWD y el patrón `PageTitle` con punto de color (ver `validations/page.tsx` y `companies/page.tsx` actuales). Sin colores ni emojis hardcoded.

---

## 5. División de trabajo (para no chocar)

- **El gate de tokens lo implementa el equipo de Empresario, NO admin.** Hoy `sendChatMessage` y `generateProposal` no chequean verificación → un no verificado quema tokens de IA. Nosotros agregamos ese chequeo del lado empresario. Vos (admin) **solo tenés que producir `estado_verificacion='verificado'`**; el resto del flujo ya reacciona a esa columna.
- **No toques el flujo de publicación ni el wizard del empresario.** Tu único producto es mover `estado_verificacion`.

---

## 6. Criterios de aceptación

1. Un admin ve la lista de empresas con `estado_verificacion='pendiente'`, con datos suficientes para decidir (incluida la cédula si es empresa formal).
2. Al verificar, `empresarios.estado_verificacion` pasa a `'verificado'` **en la base de datos** (no en memoria), con `verificado_at` y `verificado_por` seteados.
3. Tras verificar, ese empresario puede completar el flujo y publicar (lo confirma el equipo de Empresario).
4. Al rechazar, queda en `'rechazado'` y no puede publicar.
5. Las acciones fallan con error claro si el caller no es admin.
6. Cero strings/colores hardcoded; paridad es/en.

---

## 7. Desbloqueo provisional (mientras esto no exista)

Para que el equipo de Empresario pueda probar el flujo **ya**, alguien con acceso a la base (Samir) puede correr un único:

```sql
update public.empresarios
set estado_verificacion = 'verificado', verificado_at = now()
where id_usuario = '<uid-del-empresario-de-prueba>';
```

Esto es solo un parche de datos para pruebas; **no reemplaza** la implementación de esta spec.

---

## 8. Referencias de código (el patrón a copiar)

| Qué | Dónde |
| --- | --- |
| Action de verificar (egresado) | `src/lib/admin/actions.ts:26` (`verificarEgresado`) |
| Query de cola pendiente | `src/lib/admin/queries.ts:22` (`getPendingUsers`) |
| Botón de verificar | `src/components/features/auth/VerifyGraduateButton.tsx` |
| Página de cola (Server Component) | `src/app/[locale]/(admin)/admin/validations/page.tsx` |
| Cliente service_role | `src/lib/supabase/admin.ts` (`createSupabaseAdminClient`) |
| Guard-trigger que congela la columna | `supabase/migrations/20260610000006_security_hardening_rls.sql:99` |
| Policy de lectura (solo propio) | `supabase/migrations/20260608000004_cleanup_and_rls.sql:184` |
| Página mock a reemplazar | `src/app/[locale]/(admin)/admin/companies/page.tsx` |
