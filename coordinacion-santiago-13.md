# Coordinación tarjeta #13 — Flujo de postulaciones (v3 — lado BD cerrado)

**Para:** Santiago
**De:** Samir (A1 — Infra / Data / Auth / Seguridad)
**Fecha:** 2026-06-11
**Contexto:** Tarjeta #13 del plan A1 — flujo B (participaciones, cupo, máquina de estados)

> **Nota v3 (2026-06-11):** con tus dos respuestas ya incorporadas, el lado BD quedó
> **completo y aplicado al remoto**: migración `0013` (`flujo_b_unique_e_insert_check`,
> versión remota `20260611091025`) y migración `0014` (`flujo_b_maquina_estados`, versión
> remota `20260611161414`). La máquina de estados está verificada en vivo con 10 casos
> (4 cadenas legales aceptadas, 5 transiciones ilegales rechazadas, exención admin).
> Lo único pendiente de la tarjeta son tus server actions y queries (sección final).

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

### Dos dudas abiertas antes de que cierre el trigger — RESPONDIDAS e incorporadas en 0014

1. **¿`enviada → no_seleccionada` directo?** Tu mapa solo tiene `en_revision → no_seleccionada`.
   ¿El empresario puede rechazar sin pasar por `en_revision`, o siempre revisa primero?

   **RESPUESTA:** No, siempre debe pasar por `en_revision`.
   → El trigger rechaza `enviada → no_seleccionada` (verificado en vivo).

2. **Retiro del junior:** la RLS hoy solo deja retirarse desde `enviada` o `en_revision` —
   una vez `contratada` ya no. ¿Lo dejamos así, o necesitas que un junior pueda abandonar
   un contrato (eso sería cambiar la policy)?

   **RESPUESTA:** No, no puede abandonar la participacion cuando el estado es contratada. Una vez finalizado la participacion, el junior no puede abandonar la participacion. En caso de que el junior abandone la participacion, el estado de la participacion debe ser retirada. Para la finalizacion del contrato existe otra tabla que se encarga del proyecto que es la tala contrataciones, la cual se encarga de gestionar la duracion del proyecto y la finalizacion del mismo.
   → El trigger rechaza `contratada → retirada`; la RLS quedó intacta (verificado en vivo).

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

## Lo que faltaba — HECHO y aplicado al remoto (2026-06-11)

1. ✅ **`UNIQUE(id_proyecto, id_estudiante)`** — migración **0013**
   (`20260611091025_flujo_b_unique_e_insert_check.sql`). Además endureció la policy
   INSERT: solo estudiantes `verificado` y solo proyectos postulables
   (`abierto`/`en_recepcion`, activos, `fecha_cierre` vigente). **Ojo para tus pruebas:**
   el estudiante de prueba debe estar verificado o el INSERT falla por RLS.
2. ✅ **Trigger BEFORE UPDATE** de la máquina de estados — migración **0014**
   (`20260611161414_flujo_b_maquina_estados.sql`). Función
   `validar_transicion_participacion()` + trigger `trg_transicion_participaciones`
   (`BEFORE UPDATE OF estado`). Solo valida a `authenticated`; `service_role`/`postgres`
   exentos (mismo patrón que los guards de 0006, para correcciones admin).

### Errores que van a llegar a tus server actions (para que los caches)

| Situación | Código Postgres | Mensaje |
|---|---|---|
| Transición ilegal de estado | `23514` (check_violation) | `Transicion de estado invalida: X -> Y` |
| Cupo de 3 activas alcanzado | `23514` (check_violation) | `Cupo de 3 participaciones activas alcanzado` |
| Doble postulación al mismo proyecto | `23505` (unique_violation) | viola `participaciones_proyecto_estudiante_key` |
| Postulación bloqueada por RLS (no verificado / proyecto no postulable) | `42501` o 0 filas | depende del cliente |

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

1. ~~Me contestás las **dos dudas abiertas**~~ ✅ Respondidas.
2. ~~Yo escribo la migración (UNIQUE + trigger de transiciones)~~ ✅ 0013 + 0014 aplicadas
   al remoto y verificadas en vivo (2026-06-11).
3. **Te toca a vos:** las 3 actions + los 2 queries de la sección anterior. La BD ya
   valida cupo, unicidad y transiciones — tu código solo captura los errores de la tabla
   de arriba.
4. Lo cerramos en un PR conjunto.
