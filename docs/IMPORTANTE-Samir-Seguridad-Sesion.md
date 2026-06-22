# IMPORTANTE — Samir — Seguridad de sesión

Documento de coordinación sobre **dónde y cómo se almacena la sesión del usuario**.
Surge de una consulta durante la feature de invitación/activación de admins. No es
un bug ni una vulnerabilidad introducida por nosotros: es el modelo estándar de
Supabase. Acá queda explicado para que el equipo lo conozca y decida si endurece.

## 1. Qué se guarda en el navegador

| Dato | Dónde | `HttpOnly` | Para qué |
|---|---|---|---|
| `sb-<ref>-auth-token` (access + refresh token) | Cookie | **No** | Sesión de Supabase (la lee servidor y cliente) |
| `fwd_role` | localStorage **y** cookie | No | Pista de UI para pintar la vista del rol sin parpadeo |

## 2. El token de sesión NO es httpOnly — y es correcto

- `@supabase/ssr` escribe la cookie de sesión **sin `HttpOnly` a propósito**: el
  SDK del navegador (`createBrowserClient`) necesita poder leer la sesión desde
  esa cookie. Si se forzara `HttpOnly`, el cliente Supabase dejaría de funcionar
  en toda la app.
- Implicación honesta: al ser legible por JavaScript, el token queda **expuesto a
  XSS** (el mismo nivel de exposición que cualquier dato en localStorage).
- Mitigaciones ya presentes: `SameSite=Lax` + PKCE (defensa CSRF), token de acceso
  de vida corta (~1 h) y rotación del refresh token.
- Conclusión: **es el modelo estándar y correcto de Supabase**, no una mala
  configuración. La defensa real no es esconder el token, es **prevenir el XSS**.

## 3. `fwd_role` NO es una frontera de seguridad

- Es solo un **caché de UI** para no parpadear mientras carga el rol real.
- La autorización real **no lo usa nunca**:
  - El **middleware** decide con `get_my_role` (RPC contra la BD).
  - Cada **server action** revalida con `requireRole` / `requireSuperadmin`.
  - **RLS** en las tablas es la última línea.
- Si alguien edita `localStorage.fwd_role = 'administrador'`, solo cambia
  cosméticos un instante; no obtiene acceso a datos ni acciones de admin.
- Riesgo único a vigilar: que en el futuro **alguien use `fwd_role` para dar
  acceso sin recheck del servidor**. Hoy no ocurre (solo lo lee `AuthContext`,
  del lado del cliente).

## 4. Footgun al probar invitaciones / recuperación de contraseña

Probar el enlace de invitación **en el mismo navegador donde hay una sesión de
admin activa** es peligroso:

- `verifyOtp` crea la sesión del invitado encima de la sesión actual.
- Si el token **expiró o se quemó** (single-use, escáneres de correo, 1 h), la
  sesión del admin **sigue activa** y la página de reset podría dejar fijar una
  contraseña nueva **a la cuenta equivocada** (la del admin).

**Regla: probar SIEMPRE en ventana de incógnito o en otro navegador.** En
producción no aplica (el invitado usa su propio dispositivo).

## 5. Endurecimiento recomendado (tarea aparte, pendiente)

Si se quiere subir el piso de seguridad, lo serio es:

1. **Auditar superficies de XSS** (revisar cualquier `dangerouslySetInnerHTML`,
   render de HTML/entrada de usuario sin sanitizar, dependencias que inyecten).
2. **Agregar un header de Content-Security-Policy (CSP)** estricto, que es la
   defensa de fondo contra robo de token por XSS.

Estas dos tareas **no están hechas** y requieren coordinación. No bloquean la
feature de invitación, pero conviene agendarlas.
