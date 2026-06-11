# Coordinación tarjeta #13 — Flujo de postulaciones (v2 — corregido contra la BD)

**Para:** Santiago
**De:** Samir (A1 — Infra / Data / Auth / Seguridad)
**Fecha:** 2026-06-10
**Contexto:** Tarjeta #13 del plan A1 — flujo B (participaciones, cupo, máquina de estados)

> **Nota:** esta es la v2. La v1 quedó desactualizada: usaba estados que no existen en el
> esquema (`postulada`, `candidata`, `rechazada`) y daba por pendientes cosas que el reset
> del Modelo XXI ya dejó aplicadas. Todo lo de abajo está verificado contra la BD remota hoy.

---

## Estados reales (enum `estado_participacion_enum`)

```
enviada · en_revision · contratada · no_seleccionada · retirada · finalizada · cancelada
```

Son 7. No existen `postulada`, `candidata` ni `rechazada`. Tus transiciones usan los nombres
correctos.

---

## Máquina de estados acordada

**Las que mueve el empresario** (`avanzarEstado`):

```
enviada      → en_revision
en_revision  → contratada | no_seleccionada
contratada   → finalizada | cancelada
```

**La que mueve el junior** (`retirarPostulacion`) — ya permitida por RLS:

```
enviada      → retirada
en_revision  → retirada
```

Estados terminales (sin salida): `no_seleccionada`, `retirada`, `finalizada`, `cancelada`.

### Dos dudas abiertas antes de que cierre el trigger

1. **¿`enviada → no_seleccionada` directo?** Tu mapa solo tiene `en_revision → no_seleccionada`.
   ¿El empresario puede rechazar sin pasar por `en_revision`, o siempre revisa primero?
2. **Retiro del junior:** la RLS hoy solo deja retirarse desde `enviada` o `en_revision` —
   una vez `contratada` ya no. ¿Lo dejamos así, o necesitas que un junior pueda abandonar
   un contrato (eso sería cambiar la policy)?

Con esas dos respuestas hardcodeo el trigger sin bloquear nada válido.

---

## Lo que YA está aplicado (esquema XXI — no hay que hacer nada)

| Mecanismo | Cómo está implementado |
|---|---|
| Cupo ≤3 activas | Trigger `trg_cupo_participaciones` (BEFORE INSERT). Lee el máximo de `configuracion_sistema`, default 3. **Lo valida la BD, no tu código.** |
| Contador `participaciones_activas` | Trigger `trg_contadores_estudiante` (AFTER INSERT/UPDATE/DELETE). Se mantiene solo. |
| Crear contratación al adjudicar | Trigger `trg_crear_contratacion`: al pasar a `contratada` crea la fila en `contrataciones`. |
| Policy UPDATE junior (`retirada`) | `participaciones_update`: el junior solo puede mover a `retirada`, y solo desde `enviada`/`en_revision`. |
| Policy UPDATE empresario en entregables | `entregables_update`: el empresario puede aprobar/rechazar (`en_revision`/`aprobado`/`con_cambios`). |
| Policies SELECT | El junior ve solo las suyas; el empresario las de sus proyectos. Correctas. |
| Policy INSERT junior | `participaciones_insert_egresado`: obliga `estado='enviada'` y que la participación sea suya. |

---

## Lo que falta (migración 0008) — solo 2 cosas

1. **`UNIQUE(id_proyecto, id_estudiante)`** en `participaciones` — hoy un junior puede
   postularse dos veces al mismo proyecto.
2. **Trigger BEFORE UPDATE** que valide la máquina de estados de arriba (rechaza transiciones
   ilegales que la RLS no alcanza a frenar).

Lo escribo yo apenas me confirmes las dos dudas abiertas.

---

## Lo que necesito de vos (server actions en `lib/applications/`)

| Action | Qué hace | Notas |
|---|---|---|
| `postularse(id_proyecto, carta_postulacion)` | INSERT con `estado='enviada'` | **No valides el cupo en JS** — ya lo tira la BD. Solo cachá el error del trigger. |
| `retirarPostulacion(id_participacion)` | UPDATE a `'retirada'` | La RLS ya lo permite (solo el dueño, desde `enviada`/`en_revision`). |
| `avanzarEstado(id_participacion, nuevo_estado)` | UPDATE de estado (empresario) | Sigue el mapa de transiciones de arriba. |

**Queries de lectura (podés escribirlos en paralelo, no dependen de mí):**

```ts
// lib/applications/queries.ts
getMisPostulaciones()          // SELECT del junior (las suyas)
getPostulacionesDeProyecto()   // SELECT del empresario (por id_proyecto)
```

---

## Componentes que ya existen

En `src/components/features/applications/`:

- `ApplyForm.tsx`
- `ApplicationCard.tsx`
- `StatusBadge.tsx`

Solo hay que conectarlos a tus server actions cuando las tengas.

---

## Next step

1. Me contestás las **dos dudas abiertas** (rechazo directo + retiro post-contrato).
2. Yo escribo la 0008 (UNIQUE + trigger de transiciones).
3. Vos avanzás con las 3 actions + los 2 queries.
4. Lo cerramos en un PR conjunto.
