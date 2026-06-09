# Decisiones pendientes — Auth & RBAC

**Scope:** A1 · Samir  
**Fecha:** 2026-06-09  
**Estado:** Bloqueando implementación de `lib/auth/schemas.ts`, `assignRole`, y flujo de onboarding

---

## Contexto técnico (lo que ya sabemos del código)

El trigger `handle_new_user()` en `supabase/migrations/20260608000003_auth_trigger.sql` hace lo siguiente cada vez que un usuario se registra con Google OAuth:

```sql
-- Asigna 'junior' como rol por defecto a TODOS los usuarios nuevos
id_rol = (select id_rol from public.roles where nombre_rol = 'junior' limit 1)
-- estado_cuenta = 'pendiente'
```

El comentario en el trigger dice literalmente: **"el onboarding lo puede cambiar"**.

Esto significa que **Q2 está parcialmente respondida**: el trigger ya asigna el rol inicial. Lo que queda sin definir es el mecanismo para cambiarlo.

---

## Q1 — Flujo post-OAuth para usuarios nuevos

### El problema concreto

Hoy, cuando alguien se registra por primera vez con Google:
1. El trigger lo crea en `usuarios` con rol `'junior'` y `estado_cuenta = 'pendiente'`
2. El middleware lo detecta como `junior` y lo manda a `/es/junior`
3. Pero si esa persona es una **empresa**, aterrizó en el lugar equivocado

No hay pantalla que le pregunte al usuario nuevo si es junior o empresario.

### Lo que necesita decidirse

**Opción A — Onboarding obligatorio antes del primer acceso**

Flujo: `OAuth callback → detectar si es usuario nuevo → /onboarding → elige rol → su home`

- Requiere: página `/onboarding`, server action que llame `assignRole`, lógica en middleware para detectar `estado_cuenta = 'pendiente'`
- Ventaja: el usuario siempre aterriza en el lugar correcto
- Desventaja: un paso extra en el registro

**Opción B — Junior por defecto, empresario se registra por otra vía**

Flujo: `OAuth callback → /es/junior` (siempre). Los empresarios tienen un registro separado (formulario distinto, URL distinta).

- Requiere: nada adicional en el flujo OAuth
- Ventaja: más simple
- Desventaja: los empresarios tienen un flujo de registro diferente que hay que construir y comunicar

**Opción C — Onboarding lazy (puede cambiar rol después)**

Flujo: `OAuth callback → /es/junior` siempre. En el dashboard hay un botón "Soy empresa" que dispara el cambio de rol.

- Requiere: server action `assignRole` accesible desde el dashboard de junior
- Ventaja: no bloquea el primer acceso
- Desventaja: UX confusa (¿por qué un empresario ve el panel de junior primero?)

### Impacto en código

La decisión afecta directamente:
- `src/middleware.ts` — la línea marcada con `// TODO: redirigir a onboarding`
- `src/lib/auth/actions.ts` — `assignRole` (actualmente stub)
- `src/app/[locale]/(public)/` — si se crea página de onboarding

---

## Q2 — Quién asigna el rol y cuándo

### Estado actual

**Q2 está respondida por el trigger**: el rol inicial siempre es `'junior'`, asignado automáticamente en el registro.

Lo que queda sin definir es **quién puede cambiar ese rol** y en qué condiciones. Esto está conectado directamente con Q6.

---

## Q6 — Quién puede llamar `assignRole`

### El problema concreto

`assignRole` es la función que cambia el rol de un usuario (p.ej. `'junior'` → `'empresario'`). Actualmente es un stub en `src/lib/auth/actions.ts` porque no hay claridad sobre quién tiene permiso de llamarla.

### Lo que necesita decidirse

**Opción A — Solo el admin**

- El usuario nuevo llega como junior, un admin de FWD le cambia el rol manualmente
- Requiere: panel admin con acción de cambio de rol
- Ventaja: control total de quién es empresario (FWD valida primero)
- Desventaja: fricción operacional alta, no escala

**Opción B — El usuario se auto-asigna durante onboarding**

- El usuario nuevo elige su rol en una pantalla de onboarding
- No hay validación previa de FWD
- Requiere: pantalla de onboarding + `assignRole` sin restricción de rol entrante
- Ventaja: flujo completamente autónomo
- Desventaja: cualquiera puede declararse "empresa" sin verificación

**Opción C — El usuario elige en onboarding, pero el empresario pasa por verificación**

- El usuario elige en onboarding: `junior` → acceso inmediato. `empresario` → estado `'pendiente'` hasta que admin apruebe.
- La tabla `empresarios.estado_verificacion` ya existe para esto (`'pendiente'` / `'verificado'` / `'rechazado'`)
- El middleware y las RLS policies de `proyectos` ya bloquean a empresarios no verificados de publicar
- **Esta opción ya está soportada por el schema actual**
- Requiere: pantalla de onboarding + `assignRole` con lógica de estados

### Impacto en código

```typescript
// src/lib/auth/actions.ts — assignRole (pendiente de implementar)
export async function assignRole(
  userId: string,
  role: 'junior' | 'empresario'
): Promise<Result<void>> {
  // Si role === 'empresario':
  //   - Actualizar id_rol en usuarios
  //   - Crear registro en empresarios con estado_verificacion = 'pendiente'
  // Si role === 'junior':
  //   - Solo actualizar id_rol en usuarios
}
```

La política RLS en `proyectos` ya exige `estado_verificacion = 'verificado'` para publicar.  
Lo que falta definir es si el empresario accede a `/empresa` inmediatamente (con funcionalidad limitada) o solo después de ser verificado.

---

---

## Q4 — Scope de las funciones de perfil en `queries.ts`

### Estado

**Q4 no bloquea nada del scope A1 ahora mismo.** Está resuelta a nivel de middleware pero pendiente a nivel de páginas.

### Lo que está resuelto

El middleware solo necesita el rol del usuario. La función `get_my_role()` ya cubre eso — devuelve solo el string del rol sin joins adicionales. Correcto y suficiente.

### Lo que queda pendiente

Las tres funciones de perfil planificadas en `lib/auth/queries.ts` **no existen todavía**:

```typescript
getUserProfile()      // datos de usuarios.*
getStudentProfile()   // datos de estudiantes.* JOIN usuarios
getEmployerProfile()  // datos de empresarios.* JOIN usuarios
```

Estas las necesitan las **páginas**, no el middleware. Ejemplos:
- Dashboard junior → necesita `reputacion`, `proyectos_completados`, `titulo_fwd`, foto
- Dashboard empresa → necesita `nombre_empresa`, `estado_verificacion`, `sector`

### Lo que necesita decidirse

**No es una decisión de arquitectura — es una dependencia del equipo de frontend.**

Samir implementa estas funciones cuando los responsables de cada página (dashboard junior, dashboard empresa) confirmen exactamente qué campos van a consumir. Implementarlas antes es prematura — se construirían queries basadas en suposiciones.

**Acción:** Los miembros del equipo a cargo de las páginas deben especificar qué campos necesitan antes de que Samir construya estas queries.

---

---

## Tabla `recuperacion_contrasena` — ¿nativa o custom?

**Opción A — Supabase Auth nativo** (recomendada para MVP)
- `supabase.auth.resetPasswordForEmail(email, { redirectTo })` genera y envía el enlace automáticamente
- Expiración de 1h manejada por Supabase internamente
- Sin tabla en BD, sin código extra de validación
- Limitación: no puedes revocar el enlace antes de que expire ni tener historial de solicitudes

**Opción B — Tabla custom `recuperacion_contrasena`**
- Tú generas el token, lo guardas en BD con `expires_at`, envías el email vía Resend
- Control total: auditoría, revocación manual, límite de intentos por usuario
- Más código a mantener (~1 día de implementación vs ~2h de la opción A)

**Decisión pendiente:** ¿Se necesita control/auditoría de resets en el MVP, o basta con el comportamiento nativo de Supabase?

---

## Tabla `archivo` — pendiente

No aparece en el diagrama original ni en el schema actual. Pendiente de definir si aplica al MVP o se pospone. No bloquea ningún ítem activo de Fase 0.

---

## Resumen para la reunión de equipo

| Pregunta | Estado | Lo que necesitan decidir |
|---|---|---|
| **Q1** | ⏳ Pendiente | ¿Cómo elige el usuario nuevo su rol? ¿Onboarding obligatorio (Opción A), registro separado (Opción B), o cambio lazy (Opción C)? |
| **Q2** | ✅ Resuelto | El trigger asigna `'junior'` a todos los usuarios nuevos automáticamente |
| **Q4** | ⏳ Pendiente de frontend | Los responsables de dashboard junior y empresa deben especificar qué campos de perfil necesitan |
| **Q6** | ⏳ Pendiente | ¿Puede el usuario auto-asignarse `empresario`, o solo un admin lo hace? Y si se auto-asigna, ¿accede a `/empresa` inmediatamente (funciones limitadas) o solo tras verificación? |

### Recomendación técnica

La **Opción C** de Q6 combinada con la **Opción A** de Q1 es la que mejor encaja con el schema actual:
- Onboarding obligatorio al primer login
- Usuario elige rol
- Junior → acceso inmediato
- Empresario → acceso a `/empresa` con `estado_verificacion = 'pendiente'`, puede ver el panel pero no publicar proyectos hasta que admin apruebe

Esto no requiere cambiar ninguna migración. Solo requiere implementar la pantalla de onboarding y `assignRole`.
