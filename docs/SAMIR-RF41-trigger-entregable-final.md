# RF-41 — Trigger `entregable final → en_revision` + actualización del RPC

**Dirigido a:** Samir (dueño de la BD)
**Rama:** `fressia`
**Fecha:** 2026-06-22
**Requiere acción de Samir:** Sí — aplicar migración al remoto

---

## 1. Por qué se hace este cambio

### El requerimiento funcional

El SRS §2.7 RF-41 dice:

> "El egresado marca el entregable final como listo para revisión del empresario."

El mecanismo diseñado en la base de datos para cumplir este requerimiento es el valor `'en_revision'` dentro de `estado_entregable_enum`, que existe desde la migración inicial `20260608000001`:

```sql
create type estado_entregable_enum as enum (
  'enviado', 'en_revision', 'aprobado', 'con_cambios'
);
```

### El problema actual

Hoy, `registrarEntregable()` en `src/lib/deliverables/actions.ts` inserta **todos** los entregables con `estado: 'enviado'`, sin distinción entre parciales y finales:

```typescript
// actions.ts línea 50
estado: 'enviado',   // igual para tipo='parcial' y tipo='final'
```

Esto significa que cuando el egresado sube el entregable final, el empresario no recibe ninguna señal diferenciada de "este está listo para tu revisión". Un entregable parcial y uno final llegan al empresario con el mismo estado `'enviado'`. El `'en_revision'` de `estado_entregable_enum` está **completamente sin usar** en todo el sistema.

### Por qué no basta con un cambio de código

La RLS `entregables_update` WITH CHECK (migración `20260622130000`) permite al empresario setear `'en_revision'`, `'aprobado'` o `'con_cambios'`. Ese permiso ya está. El bloqueador real está en dos lugares:

**Bloqueador 1 — el RPC `finalizar_proyecto_por_entregable` (migración `20260618140000`, línea 74):**

```sql
if v_estado_ent <> 'enviado' then
    raise exception 'ESTADO_INVALIDO';
end if;
```

El RPC rechaza en base de datos cualquier entregable que no esté en `'enviado'`. Si el entregable final llega con `'en_revision'`, el RPC falla y el cierre del ciclo nunca ocurre.

**Bloqueador 2 — guard en app code (`actions.ts` línea 139):**

```typescript
if (entregable.estado !== 'enviado') return err('estado_invalido')
```

La server action `responderEntregable()` también bloquea por estado antes de siquiera llegar al RPC.

Ninguno de los dos se resuelve solos con un cambio de código del lado de la aplicación: el RPC es lógica en la BD que el equipo de frontend no puede alterar.

---

## 2. Qué se cambia exactamente

### Cambio A — Nuevo trigger BEFORE INSERT en `entregables`

Se crea un trigger que intercepta cada INSERT en la tabla `entregables`. Si el entregable que se está insertando es de tipo `'final'`, el trigger cambia automáticamente su `estado` de `'enviado'` (el default) a `'en_revision'` antes de que la fila se persista.

```sql
create or replace function auto_set_estado_entregable_final()
returns trigger as $$
begin
  if new.tipo_entregable = 'final' then
    new.estado := 'en_revision';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_auto_estado_entregable_final
  before insert on entregables
  for each row execute function auto_set_estado_entregable_final();
```

**Por qué un trigger y no un cambio en el código de la app:**
El trigger centraliza la regla en la BD. Cualquier vía que inserte un entregable final (la app, un script, PostgREST directo) queda cubierta automáticamente. No depende de que el desarrollador que toque `registrarEntregable()` recuerde pasar `'en_revision'`.

**Compatibilidad con el trigger existente `trg_validar_estado_entregable`:**
Este trigger (migración `20260608000005`) también es BEFORE INSERT y solo valida el estado del PROYECTO (debe ser `adjudicado` o `en_desarrollo`). No valida el estado del entregable propio. Ambos triggers coexisten sin conflicto. En PostgreSQL, los BEFORE ROW triggers corren en orden alfabético por nombre:
- `trg_auto_estado_entregable_final` → corre primero (cambia estado a `'en_revision'`)
- `trg_validar_estado_entregable` → corre segundo (valida el proyecto, pasa sin problema)

**Entregables parciales no se ven afectados.** La condición `tipo_entregable = 'final'` es exacta.

### Cambio B — Actualización del RPC `finalizar_proyecto_por_entregable`

Se reemplaza la función con `CREATE OR REPLACE FUNCTION` para ampliar el check de estado de `'enviado'` exacto a `NOT IN ('enviado', 'en_revision')`:

```sql
-- ANTES (línea 74 de 20260618140000):
if v_estado_ent <> 'enviado' then
    raise exception 'ESTADO_INVALIDO';
end if;

-- DESPUÉS:
if v_estado_ent not in ('enviado', 'en_revision') then
    raise exception 'ESTADO_INVALIDO';
end if;
```

El resto de la función (`SECURITY INVOKER`, grants, orden crítico de updates, comentarios) queda intacto.

**Por qué se mantiene `'enviado'` en el IN:** Entregables existentes en la BD que ya tienen `estado='enviado'` (cargados antes de este deploy) deben seguir funcionando. El RPC acepta ambos estados durante la transición.

---

## 3. Qué NO cambia en la BD

- No se altera ningún enum (`ALTER TYPE` — ninguno).
- No se altera ninguna tabla (`ALTER TABLE` — ninguna).
- No se agrega ni elimina ninguna policy RLS.
- El trigger existente `trg_validar_estado_entregable` no se toca.
- La tabla `contrataciones`, `participaciones` y `proyectos` no se tocan.
- El flujo de cierre (proyecto → finalizado, contratacion → finalizado, participacion → finalizada) no cambia.

---

## 4. Archivo de migración

El archivo está en:

```
supabase/migrations/20260622200000_rf41_trigger_entregable_final.sql
```

Contiene exactamente los dos cambios descritos arriba (trigger + RPC), nada más.

---

## 5. Lo que tienes que hacer (Samir)

### Paso 1 — Revisar el archivo de migración

Leer `supabase/migrations/20260622200000_rf41_trigger_entregable_final.sql` y confirmar que el contenido coincide con lo descrito en este documento. Si hay algo que no te convence, avísale a Fressia antes de continuar.

### Paso 2 — Aplicar al remoto

Este proyecto no tiene entorno local Docker (`config.toml` no existe). La BD es solo remota. Una vez que apruebes el contenido, ejecutas:

```bash
npx supabase db push --linked
```

### Paso 3 — Verificar en el Dashboard o psql

Confirmar que el trigger fue creado:

```sql
select trigger_name, event_manipulation, action_timing
from information_schema.triggers
where event_object_table = 'entregables'
order by trigger_name;
```

Debes ver tres triggers:
- `trg_auto_estado_entregable_final` (BEFORE INSERT) — el nuevo
- `trg_entregables_updated_at` (BEFORE UPDATE) — preexistente
- `trg_validar_estado_entregable` (BEFORE INSERT, BEFORE UPDATE) — preexistente

Confirmar que el RPC fue actualizado:

```sql
select prosrc
from pg_proc
where proname = 'finalizar_proyecto_por_entregable';
```

El cuerpo debe contener `not in ('enviado', 'en_revision')` y no el `<> 'enviado'` anterior.

### Paso 4 — Avisar a Fressia

Una vez que confirmes que todo está aplicado correctamente, avísale a Fressia para que pueda activar los cambios de código del lado de la app (actualización de `responderEntregable()` y la UI) que dependen de este deploy.

---

## 6. Resumen de impacto

| Componente | Estado antes | Estado después |
|---|---|---|
| Entregable final en BD | `'enviado'` (igual que parcial) | `'en_revision'` (auto, por trigger) |
| Entregable parcial en BD | `'enviado'` | `'enviado'` (sin cambio) |
| RPC al aprobar final | Rechaza si estado != `'enviado'` | Acepta `'enviado'` o `'en_revision'` |
| RF-41 cumplido | No | Sí |
| Entregables existentes | Siguen funcionando (RPC acepta `'enviado'`) | Sin impacto |
