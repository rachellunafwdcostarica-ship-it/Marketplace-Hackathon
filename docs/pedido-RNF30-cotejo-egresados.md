# Cotejo de egresados (RNF-30 / RF-64) — estado y lo único pendiente

> **Actualizado 2026-06-23.** La mayor parte de este pedido **ya está implementada**
> (lo hizo SOL). Este doc se actualizó para que nadie rehaga lo ya hecho. Lo único
> que falta son **datos de FWD** (punto 2).

## Contexto

- **RNF-30** (SRS, línea 413): _"Integración con la base de datos de egresados de
  FWD Costa Rica para la validación de estudiantes."_
- **RF-64** (SRS, línea 318): el admin valida egresados cotejando contra esa base.

## Estado de los 3 puntos originales

### 1. Tabla de cotejo — ✅ HECHO (distinto de lo propuesto)

Existe `public.egresados_fwd_oficial` (migración
`20260622164248_create_egresados_fwd.sql`):

- PK `correo` (text) + `fecha_agregado`. RLS habilitada, **solo admin** lee/escribe
  (RNF-35: protege los datos personales).
- El cotejo real corre en `verificarEgresado` (`src/lib/admin/actions.ts:243`):
  coteja el `correo` del usuario contra la tabla; si no figura →
  `err('egresado_no_encontrado')`.
- El consentimiento del cotejo (RNF-38, `cotejo_fwd`) se captura en el registro
  (`src/lib/auth/actions.ts`).

**Diferencia con la propuesta original:** se decidió cotejar **solo por correo**
(no correo + título). El título lo declara el egresado en su perfil
(`estudiantes.titulo_fwd`); el correo basta para confirmar que figura en el padrón
FWD. Por eso la tabla no lleva columna de título.

### 2. Padrón real de egresados — ⏳ PENDIENTE (es lo único que falta, y es de FWD)

El export real de los egresados de FWD (al menos el **correo** de cada uno) para
sembrar la tabla. **Estos datos los tiene FWD; el equipo de dev no los puede
generar.**

- **Stopgap actual (2026-06-23):** mientras llega el padrón real, la tabla se
  sembró con los correos de los egresados de prueba del equipo, para que el flujo
  de verificación funcione en demo. **Son datos temporales: cuando llegue el export
  real de FWD, se borran y se cargan los reales.**
- Si FWD expone una **API** en lugar de un export, pasar URL + método de
  autenticación + formato de respuesta.

### 3. Parche del egresado huérfano — ✅ HECHO / NO APLICA

Se verificó contra la BD: **0 egresados con rol pero sin fila en `estudiantes`**.
No hay huérfanos. No hay nada que correr.

## Resumen

| # | Pedido original | Estado |
|---|---|---|
| 1 | Crear tabla de cotejo | ✅ Hecho (`egresados_fwd_oficial`, correo-only) |
| 2 | Padrón real de egresados (correo) | ⏳ **Pendiente — lo entrega FWD** |
| 3 | Parche del egresado huérfano | ✅ No aplica (0 huérfanos) |

**Lo único que queda:** que FWD entregue el padrón real de egresados (correos) para
reemplazar el seed de prueba.
