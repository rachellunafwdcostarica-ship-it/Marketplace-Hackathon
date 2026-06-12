# Impacto en código — alineación de migraciones al modelo XXI

El reset arregla la base, **no tu código**. Buscá (grep) estos identificadores en tu repo
Next.js y ajustá donde aparezcan. Ordenado por riesgo.

## 1. Tablas renombradas (rompe queries/tipos que las nombren)
| Antes | Ahora |
|---|---|
| `categorias_proyecto` | `categorias` |
| `estudiante_habilidades` | `habilidades_tecnicas` |

## 2. Columnas renombradas en `participaciones`
| Antes | Ahora | Nota |
|---|---|---|
| `propuesta` | `planteamiento_solucion` | mismo tipo (TEXT) |
| `prototipo_url` | `prototipo_enlaces` | **cambió de VARCHAR a TEXT[]** — ahora es un array; el código que leía/escribía un string único debe manejar lista |
| `documentacion_url` | `documentacion_tecnica` | mismo tipo (VARCHAR) |

## 3. Columnas eliminadas
- `usuarios.cedula`, `usuarios.url_cedula`, `usuarios.contrasena_hash`
- `participaciones.aceptada_at`, `participaciones.rechazada_at`, `participaciones.motivo_rechazo` (vestigios del flujo B)
- `proyectos.id_categoria` → la categoría ahora es **N:M** vía `proyecto_categorias`. El código que leía `proyecto.id_categoria` ahora hace `join proyecto_categorias`.

## 4. Columnas agregadas
- `usuarios.tipos_notificacion_silenciados` (ENUM[], default `{}`) — RF-48
- `estudiantes.url_portafolio` (VARCHAR) — de aquí se lee el portfolio del estudiante

## 5. Tipos/ENUM que cambiaron
- `notificaciones.tipo_evento`: VARCHAR → ENUM `tipo_notificacion_enum`. Ahora **solo** acepta uno de 11 valores: `mensaje_nuevo, postulacion_recibida, plazo_vence, participacion_no_seleccionada, participacion_contratada, entregable_aprobado, entregable_rechazado, evaluacion_recibida, cuenta_verificada, cuenta_suspendida, strike_recibido`.
- `estado_participacion_enum`: **9 → 7 valores**. Eliminados: `postulada` (usar `enviada`), `candidata`, `rechazada`. El código que seteaba esos estados debe migrar a los nuevos.

## 6. Tablas nuevas (no existían en las migraciones)
- `proyectos_portafolio`, `portafolio_tecnologias`, `proyecto_categorias`

---

## Supuestos que hice — VERIFICÁ vos
1. **Nombre del rol del estudiante:** el seed (0002) y el auth trigger (0003) usan `'junior'`. Si tu XXI/código usa `'estudiante'`, hay que alinear ambos archivos. No lo cambié porque seed y trigger ya son consistentes entre sí.
2. **`estudiantes.url_portafolio`:** lo agregué como `VARCHAR(150)` porque XXI dice que el portfolio se lee de ahí. Confirmá que es un único enlace y no otra estructura.
3. **RF-64 (cotejo FWD):** asumido **manual** (un admin marca `estudiantes.estado_verificacion`). Si lo querés **automático** contra la base de egresados, falta un campo para el identificador del match (el esquema actual no lo tiene).

## Cómo aplicar (datos descartables = reset)
Las 5 migraciones están pensadas para correr **en orden, sobre una base vacía**.
En Supabase CLI existe un comando de reset que vacía y reaplica las migraciones del proyecto;
**verificá el comando exacto en la doc de tu versión** (no lo cito de memoria para no pasarte algo desactualizado).
Alternativa: en el SQL Editor del dashboard, dropear el esquema `public` y ejecutar 0001→0005 en orden.


---

## ACTUALIZACIÓN (reconciliado al modelo + completado)
- **Roles finalizados** en `roles.nombre_rol`: `administrador`, `egresado`, `empresario` (3). El estudiante ahora es **`egresado`** (antes el draft usaba `junior`). El `auth_trigger` crea usuarios nuevos con rol `egresado`.
- **`moderador` y `superadmin` NO son roles** — son valores de `usuarios.nivel_admin` (`ENUM superadmin/admin/moderador`, nullable, solo para administradores). El código que distinga moderador debe leer `nivel_admin`, no `nombre_rol`.
- **Nueva columna** `usuarios.nivel_admin` (RF-63).
- **0005** ahora trae 23 índices y 8 triggers (se agregó `validar_nivel_admin`).
- **0006 (nuevo)** siembra config (8 parámetros) + catálogos: `areas_negocio` (10), `categorias` (10, solo `nombre`), `tecnologias` (52, solo `nombre`).
- **Catálogos sin `descripcion`/`categoria`:** mi `categorias` y `tecnologias` solo tienen `nombre`. Si tu UI agrupa tecnologías por categoría (Frontend/Backend/…), esa columna NO existe en el modelo XXI actual — habría que agregarla aparte.

---

## AUDITORÍA CONTRA XXI + VALIDACIÓN FUNCIONAL (sesión 10-jun)

Se corrieron las **6 migraciones en un Postgres 16 real** (con stubs de Supabase) y se auditó campo por campo contra XXI.

### Cambio aplicado — impacto en código
- **`participaciones` ahora tiene `retirada_at` (TIMESTAMPTZ) y `motivo_retiro` (TEXT).** XXI los pide; van con el estado `retirada`. Si tu UI deja que el egresado se retire de una postulación, ahí guardás cuándo y por qué. Antes faltaban.

### Decisión pendiente — criterio tuyo
- **Spelling de visibilidad del portafolio.** XXI escribe `portfolio_visible_publicamente` (inglés) en `estudiantes`; mi schema y el resto del modelo usan `portafolio_visible_publicamente` (español). Dejé el mío por consistencia. Calzar literal con XXI obliga a renombrar la columna **y** el código que la lea. Recomiendo NO hacerlo (es typo de XXI).

### Divergencia deliberada — no es bug
- **`usuarios.fecha_nacimiento` es NULLABLE**, aunque XXI la marca NOT NULL. Si fuera NOT NULL el signup reventaría: `handle_new_user` crea la fila sin ese campo. Tu onboarding debe pedir/guardar `fecha_nacimiento` después del registro.

### Qué se validó funcionando (no solo "aplica sin error")
- Crea: **26 tablas, 25 enums, 53 policies RLS, 57 índices**, seeds (3 roles, 10 áreas, 10 categorías, 52 tecnologías, 8 config).
- **Los 9 triggers se comportan bien con datos reales:** `handle_new_user` (auto-crea usuario al registrarse), `validar_nivel_admin`, cupo (rechaza la 4ta participación activa), contadores de estudiante, contratación automática al adjudicar, recálculo de reputación, strikes (suspende a los 3), y bloqueo de entregable si el proyecto no está en `adjudicado`/`en_desarrollo`.
- **Pendiente:** aislamiento RLS (que cada usuario solo vea sus filas). Se confirma del todo aplicando en un Supabase real; los stubs locales no replican `auth.uid()` bajo JWTs reales.

> El set son **6 archivos** (0001→0006), no 5 — las menciones a "5 migraciones / 0001→0005" de más arriba son de una versión previa de este doc.
> El supuesto #1 de arriba (rol `junior`) quedó **resuelto**: el rol del estudiante es `egresado`.
