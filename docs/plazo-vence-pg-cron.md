# Notificación `plazo_vence` vía pg_cron (RF-33)

> **Para quién es este documento:** una persona del equipo y/o su IA que va a
> implementar el aviso de "tu plazo está por vencer". Está pensado para que NO
> quede ninguna duda: incluye el qué, el porqué, el cómo paso a paso, el SQL y el
> TS concretos, las opciones que se descartaron y la razón, y el cumplimiento de
> `reglas.md` y del SRS. Léelo completo antes de tocar nada.
>
> **Estado:** diseño aprobado, **sin implementar**. La migración NO se ha creado
> todavía a propósito (decisión del dueño del feature). Este doc es la
> especificación para construirlo.

---

## 0. Resumen ejecutivo (una frase)

Un job de **pg_cron** corre cada hora, busca proyectos cuya ventana de ofertas
está por cerrar y crea una notificación in-app `plazo_vence` para cada postulante
vivo (`enviada` o `en_revision`), una sola vez por postulación, saltándose los
proyectos ya adjudicados o cuya fecha ya venció.

---

## 1. Requisito y contexto (SRS, fuente de verdad funcional)

- **RF-33 (Should):** "Notificar al estudiante la proximidad del vencimiento del
  plazo. El sistema avisa **antes** de que cierre la ventana de ofertas." → es lo
  que construimos.
- **RF-47 (Must):** notificaciones dentro de la plataforma (centro con
  leído/no leído). → este aviso es in-app; usa la campana ya existente.
- **RF-21 (Must):** el plazo del proyecto es de 5 a 15 días; vive en
  `proyectos.fecha_cierre`.
- **RF-46 (Must):** notificaciones por correo ante eventos clave, **incluido
  "vencimiento de plazo"**. → Esta entrega cubre **solo in-app (RF-47)**; el correo
  es el **único pendiente** para cerrar el evento. El sistema **ya tiene infra de
  correo** y la usa para otros eventos; ver §13 (veredicto) y §14 (cómo hacerlo).
- **RF-48 (Could):** preferencias de notificación configurables (silenciar
  tipos). → Ver §11: existe la columna `usuarios.tipos_notificacion_silenciados`
  pero NO está enforced en ningún lado; fuera de alcance aquí.

Prioridad MoSCoW: RF-33 es **Should** (importante, no bloquea el lanzamiento).

---

## 2. Decisión de arquitectura: pg_cron

`plazo_vence` es un evento **disparado por tiempo**, no por una acción de usuario.
Nadie hace clic "24 horas antes del cierre", así que **algo tiene que ejecutar
código a una hora determinada**. Esa pieza es un *scheduler*. Se eligió
**pg_cron** (cron dentro de Postgres) por:

1. La notificación se **escribe directo en la BD**; un scheduler dentro de la BD
   evita un round-trip HTTP y no expone ningún endpoint que haya que proteger.
2. La tabla `notificaciones` **no tiene policy de INSERT**: se escribe solo con
   `service_role` (decisión P1.1 del equipo, ver `pendientesnotificaciones.md`).
   Una función `SECURITY DEFINER` en Postgres inserta directo sin exponer la
   service-role key ni pasar por un server action.
3. El productor es naturalmente **basado en conjuntos** (un `INSERT ... SELECT`
   sobre un join): encaja perfecto en SQL, en una sola transacción atómica.
4. Frecuencia libre (cada hora) sin depender de los límites de plan de un cron
   externo.

> **Reparto de responsabilidades:** la lógica (función SQL + columna marcadora +
> config) la escribe quien implemente este doc. **Habilitar la extensión pg_cron
> y agendar el job lo hace Samir** (dueño de la BD) — ver §9 Parte C.

---

## 3. Opciones descartadas y por qué

| Opción | Por qué se descartó |
|---|---|
| **Vercel Cron** (el deploy es Vercel, `reglas.md §1`) | Es viable y es el **fallback** si no se puede habilitar pg_cron. Se descartó como primera opción porque obliga a exponer una API route protegida con `CRON_SECRET`, parte la lógica entre TS y un endpoint externo, y la frecuencia depende del plan de Vercel. pg_cron mantiene todo server-side, atómico y sin superficie expuesta. |
| **Estado de proyecto intermedio** (persistir "cerrado"/"en_evaluación" entre `abierto` y `adjudicado`) | **No resuelve el problema** (ver §4 completa). `plazo_vence` ocurre mientras el proyecto está `abierto`; no interviene ningún estado nuevo. Y un estado persistido necesitaría **el mismo scheduler** para que algo lo cambie a la hora del cierre, así que agrega complejidad sin aportar. Además **ese estado nunca existió en el diseño** (ver §4.5): no hay valor de enum que signifique "postulaciones cerradas". |
| **Disparo "de oportunidad" (piggyback on-read)** | Emitir el aviso cuando algún usuario carga una página. Poco confiable: depende de que haya tráfico y de que cargue justo la persona adecuada; no garantiza avisar **antes** del cierre. Incumple el criterio de RF-33. |
| **Server action (TS) como productor** | Imposible: un server action lo dispara una acción de usuario. Aquí no hay usuario ni request; debe ser por tiempo. |

---

## 4. Aclaración del malentendido del "estado intermedio" (LEER)

Durante el diseño, una persona insistía en que faltaba un **estado intermedio**
del proyecto (algo entre `abierto` y `adjudicado`) y que eso "bloqueaba"
`plazo_vence`. Su instinto **tiene base en el SRS** (RF-25 enumera "en recepción
de ofertas" y "cerrado"; RF-35 Must pide "cierre automático de la recepción").
Pero hay una confusión de requisitos. Aclaremos para que no se repita:

### 4.1. RF-33 ≠ RF-35

- **RF-33** (lo de este doc) = **avisar antes** del cierre. Ocurre **mientras el
  proyecto sigue `abierto`**. No necesita ningún estado nuevo.
- **RF-35** = dejar de aceptar ofertas al vencer el plazo. Hoy se cumple por
  **enforcement** (RLS + app, §4.2), **no** por un estado persistido — de hecho no
  existe ningún valor de enum que signifique "postulaciones cerradas" (§4.5).
  Confundir RF-35 con RF-33 es el error.

Aunque existiera un estado "cerrado" persistido, `plazo_vence` igual se dispara
**antes**, con el proyecto en `abierto`. El estado nuevo no lo habilita.

### 4.2. Cómo funciona HOY el cierre (para que se entienda que ya está cubierto)

El "deja de aceptar ofertas" de RF-35 **ya está garantizado**, pero por
**enforcement**, no por un cambio de estado:

1. **Capa app:** `postularse` (`src/lib/applications/actions.ts`) rechaza con
   `plazo_vencido` si `fecha_cierre < now()` (test
   `tests/.../postularse-action.test.ts:255`).
2. **Capa BD (RLS):** la policy `participaciones_insert_egresado`
   (`supabase/migrations/20260611091025_flujo_b_unique_e_insert_check.sql:45-61`)
   tiene en su `WITH CHECK`:
   ```sql
   and id_proyecto in (
     select id_proyecto from public.proyectos
     where estado in ('abierto','en_recepcion')
       and is_active = true
       and (fecha_cierre is null or fecha_cierre > now())  -- cierre validado en BD
   )
   ```
   `now()` es la hora del servidor de Postgres: **no se puede falsear** desde el
   cliente. Una inserción directa a Supabase con un `id_proyecto` vencido **es
   rechazada por la RLS**. No hay vector de "ofertar después del cierre".

### 4.3. Cómo se ve "cerrado" en el frontend HOY (estado derivado)

La columna `proyectos.estado` se **queda en `abierto`** tras el cierre (nada la
cambia sola). La UI **deriva** el estado en lectura:

- `computeEstadoEfectivoProyecto(estado, fechaCierre, now)`
  (`src/lib/projects/project-detail-logic.ts:14-21`): si `estado === 'abierto'` y
  `fecha_cierre` ya pasó, **muestra** `'en_evaluacion'`.
- **`en_evaluacion` NO existe en el enum** `estado_proyecto_enum`; es un valor
  derivado solo para mostrar (mismo patrón que el `no_seleccionada` cosmético de
  las ofertas vivas tras adjudicar). La fila en BD sigue diciendo `abierto`.

### 4.4. Conclusión

- Para **RF-33** (este doc): el estado intermedio es **irrelevante**. El productor
  filtra por `estado IN ('abierto','en_recepcion')` y `fecha_cierre` futura.
- **RF-35 persistido** (un flip real del estado al cerrar) es una tarea **aparte**
  (tracker: cierre automático, mencionado como "#37" en el comentario de
  `20260611091025`). Si algún día se quiere, sería un **valor de enum NUEVO** (no
  `finalizado`, que ya significa otra cosa — ver §4.5). Cuando exista pg_cron por
  este feature, agregarlo sería trivial, pero **no es parte de esta entrega**.

### 4.5. Semántica real de `estado_proyecto_enum` (aclaración del equipo)

El enum real es `borrador, abierto, en_recepcion, adjudicado, en_desarrollo,
finalizado, cancelado`. Mapeo y semántica respecto al SRS (RF-25), porque hay dos
trampas que confunden:

| SRS (RF-25) | Enum real | Significado real |
|---|---|---|
| abierto | `abierto` | recibiendo ofertas |
| en recepción de ofertas | `en_recepcion` | **sin validez práctica: es lo MISMO que `abierto`**; ningún flujo lo setea (estado dormido) |
| — | `borrador` | proyecto sin publicar |
| adjudicado | `adjudicado` | ganador elegido |
| en desarrollo | `en_desarrollo` | trabajo en curso |
| cerrado | `finalizado` | **TRAMPA: `finalizado` = el PROYECTO terminó (se aprobó el entregable final, vía `finalizar_proyecto_por_entregable`), atado a `contrataciones` — NO significa "se cerraron las postulaciones"** |
| cancelado | `cancelado` | cancelado |

**Conclusión clave:** **NO existe ningún estado que signifique "la ventana de
ofertas cerró".** Ese momento se maneja solo con `fecha_cierre` + RLS + el derivado
`en_evaluacion` (§4.2-4.3). El "cerrado" del SRS siempre fue el estado **terminal
del proyecto** (hoy `finalizado`), no el cierre de postulaciones. Por eso pedir un
"estado intermedio de cierre" es pedir algo que nunca estuvo en el diseño.

---

## 5. Diseño funcional

### 5.1. ¿Cuándo se activa?

- Un job de pg_cron corre **cada hora** (`0 * * * *`).
- En cada corrida emite avisos para proyectos cuyo `fecha_cierre` cae dentro de la
  **ventana de anticipación** configurable (por defecto 24 h).
- Con umbral de 24 h y corridas horarias, un postulante se entera dentro de la
  hora siguiente a cruzar la marca de "24 h para el cierre".

### 5.2. Configuración (en `configuracion_sistema`, y SÍ funciona)

- Clave nueva: **`plazo_aviso_horas`**, `tipo_dato = 'integer'`, valor por defecto
  `'24'`.
- `configuracion_sistema` está **completamente cableada** (corrige la duda de que
  "no funciona"): se lee y escribe vía el panel admin
  (`src/components/features/admin/SystemConfigForm.tsx` → server action
  `updateSystemConfig`, `src/lib/admin/actions.ts:283`) y otros consumidores ya la
  leen en runtime (p. ej. `strike-actions.ts:78` lee `strikes_para_suspension`; el
  trigger de cupo lee `cupo_max_participaciones`).
- `getSystemConfig` (`src/lib/admin/queries.ts:487`) lista **todas** las filas, así
  que la clave nueva **aparece automáticamente** en el panel admin y es editable
  en vivo. La función SQL lee el valor en cada corrida → cambiarlo en el panel
  cambia el comportamiento sin redeploy.
- Fallback: si la fila no existe o está vacía, la función usa **24** (mismo patrón
  de default que `strike-actions`).

### 5.3. ¿A qué estados de participación llega?

A **`enviada`** y **`en_revision`** (ambas son ofertas "vivas" que esperan
decisión). Decisión explícita del dueño del feature.

> **Importante (corrige una expectativa):** el aviso **NO** debe prometer "tienes
> tiempo para hacer cambios". El estudiante **no puede editar** una postulación
> enviada (no existe flujo de edición) y **retirarla es irreversible** (el UNIQUE
> `(id_proyecto, id_estudiante)` bloquea re-postularse tras retirar — migración
> `20260611091025` [F1]). El único mensaje honesto es **"la ventana cierra pronto;
> pronto se tomará una decisión"**.

### 5.4. Excepciones — cuándo NO se notifica

1. **Proyecto adjudicado antes del cierre:** se salta. El filtro
   `estado IN ('abierto','en_recepcion')` excluye `adjudicado`/`en_desarrollo`/
   `finalizado`/`cancelado`. **Doble seguridad:** al adjudicar, el RPC
   `adjudicar_participacion` (migración `20260621000000`) ya barre los `enviada`/
   `en_revision` a `no_seleccionada`, así que un proyecto decidido tampoco tiene
   participaciones vivas que notificar.
2. **Fecha ya vencida:** se salta (`fecha_cierre > now()`). Si ya cerró, no es
   "proximidad", es "vencido" → no aplica RF-33.
3. **Ya avisado:** se salta vía la columna marcadora `plazo_aviso_enviado_at`
   (idempotencia, §5.5).
4. **Proyecto inactivo / borrador:** `is_active = true` y el filtro de estado lo
   excluyen.

### 5.5. Idempotencia (evitar spam por cada corrida)

Columna nueva **`participaciones.plazo_aviso_enviado_at timestamptz`**. La función
solo toma participaciones con esa columna en `NULL`, y la sella con `now()` en la
misma transacción en que crea la notificación. Resultado: **un aviso por
postulación**, sin importar cuántas veces corra el cron.

### 5.6. Audiencia (resolución del destinatario)

`participaciones.id_estudiante` → `estudiantes.id_usuario` → ese `id_usuario` es el
`notificaciones.id_usuario`. La función hace ese join.

### 5.7. Contenido de la notificación (debe calzar con el render i18n-first)

| Campo | Valor |
|---|---|
| `tipo_evento` | `'plazo_vence'` (ya existe en el enum `tipo_notificacion_enum`) |
| `params` (jsonb) | `{ "titulo": <título del proyecto> }` |
| `mensaje` (varchar 255, fallback) | `La ventana de ofertas de "<titulo>" está por cerrar.` (texto plano; ver nota i18n) |
| `url_destino` | `/es/egresado/projects/<id_proyecto>` (prefijo de locale = `DEFAULT_LOCALE`, hoy `es`) |
| `leida` | `false` |
| Tono visual | `warning` (ya mapeado en `format.ts` `TONE_BY_TIPO.plazo_vence`) |
| Badge i18n | `types.plazo_vence` (ya existe: ES "Plazo" / EN "Deadline") |

> **Nota i18n (no es violación de `reglas.md`):** el texto que se MUESTRA sale de
> la plantilla i18n `content.plazo_vence` (es/en) usando `params.titulo`. La
> columna `mensaje` es solo **fallback** y columna NOT NULL; por eso la función
> SQL puede construir ese español plano (mismo patrón documentado en
> `pendientesnotificaciones.md §5`). **Las claves de `params` DEBEN coincidir** con
> las variables de la plantilla (`{titulo}`).

---

## 6. Cómo encaja con la arquitectura de notificaciones existente

El sistema ya tiene núcleo (`src/lib/notifications/create.ts`), render i18n-first
(`src/lib/notifications/format.ts`) y campana (`NotificationBell.tsx`). Los
productores actuales son TS (server actions + builder puro). **`plazo_vence` es la
excepción justificada:** al ser por tiempo y sin sesión de usuario, su productor
vive en **SQL** (la función pg_cron) y escribe directo en `notificaciones`
(`SECURITY DEFINER`, como hacen los demás caminos con `service_role`). Para que la
campana lo renderice bilingüe, falta **solo** registrarlo en el render i18n-first
(§9 Parte B). El resto (campana, lectura, marcar leída) ya lo cubre lo existente.

---

## 7. Cómo funciona el render en la campana (para no romperlo)

`resolveNotificationContent({tipo, mensaje, params})`
(`src/lib/notifications/format.ts`): si `tipo` está en `TIPOS_CON_PLANTILLA` y hay
`params` con claves → devuelve `{kind:'i18n', key:'content.plazo_vence', values}`;
si no → cae a `{kind:'raw', text: mensaje}`. Por eso es **obligatorio** agregar
`'plazo_vence'` a `TIPOS_CON_PLANTILLA` y crear la clave `content.plazo_vence`; si
no, la campana mostraría el fallback español a usuarios en inglés.

---

## 8. Modelo de datos — cambios

1. **Columna nueva:** `participaciones.plazo_aviso_enviado_at timestamptz NULL`.
2. **Config nueva:** fila en `configuracion_sistema` con clave `plazo_aviso_horas`.
3. **Función nueva:** `public.emitir_avisos_plazo_vence()` (`SECURITY DEFINER`).
4. **Sin tablas nuevas. Sin enums nuevos** (`plazo_vence` ya está en el enum).
5. **RLS:** la columna no necesita policy nueva. **Endurecimiento recomendado:**
   asegurar que ni egresado ni empresario puedan escribir
   `plazo_aviso_enviado_at` desde la app (solo la función la setea). Si el guard
   `guard_participaciones_estudiante_cols`
   (`20260610212717`) congela columnas para el egresado, incluir ahí la nueva
   columna; en todo caso, ninguna UI la expone, así que el riesgo es bajo.

---

## 9. Implementación paso a paso

### Parte A — Migración SQL (la escribe quien implementa; la aplica Samir)

Crear `supabase/migrations/<timestamp>_plazo_vence_pg_cron.sql`. Contenido:

```sql
-- ============================================================
-- plazo_vence (RF-33): aviso de proximidad del cierre de ofertas
-- NO aplicar sin Samir (crea función SECURITY DEFINER + requiere pg_cron).
-- ============================================================

-- 1. Columna marcadora de idempotencia.
alter table public.participaciones
  add column if not exists plazo_aviso_enviado_at timestamptz;

-- 2. Parámetro configurable (horas de anticipación). Editable en el panel admin.
insert into public.configuracion_sistema (clave, valor, tipo_dato, descripcion)
values ('plazo_aviso_horas', '24', 'integer',
        'Horas de anticipacion para avisar a los postulantes del cierre de ofertas (RF-33).')
on conflict (clave) do nothing;

-- 3. Productor: emite los avisos pendientes. SECURITY DEFINER porque
--    notificaciones no tiene policy de INSERT (solo service_role/owner).
create or replace function public.emitir_avisos_plazo_vence()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_horas    integer;
  v_emitidas integer;
begin
  -- Umbral configurable; default 24 si falta o esta vacio.
  select coalesce(nullif(valor, '')::integer, 24) into v_horas
  from public.configuracion_sistema
  where clave = 'plazo_aviso_horas';
  if v_horas is null then v_horas := 24; end if;

  with objetivo as (
    select pa.id_participacion, pa.id_estudiante, p.id_proyecto, p.titulo
    from public.participaciones pa
    join public.proyectos p on p.id_proyecto = pa.id_proyecto
    where p.estado in ('abierto', 'en_recepcion')
      and p.is_active = true
      and p.fecha_cierre is not null
      and p.fecha_cierre >  now()
      and p.fecha_cierre <= now() + make_interval(hours => v_horas)
      and pa.estado in ('enviada', 'en_revision')
      and pa.plazo_aviso_enviado_at is null
  ),
  marcadas as (
    update public.participaciones pa
    set plazo_aviso_enviado_at = now()
    from objetivo o
    where pa.id_participacion = o.id_participacion
    returning o.id_estudiante, o.id_proyecto, o.titulo
  )
  insert into public.notificaciones (id_usuario, tipo_evento, mensaje, url_destino, params, leida)
  select est.id_usuario,
         'plazo_vence',
         left('La ventana de ofertas de "' || m.titulo || '" esta por cerrar.', 255),
         '/es/egresado/projects/' || m.id_proyecto,
         jsonb_build_object('titulo', m.titulo),
         false
  from marcadas m
  join public.estudiantes est on est.id_estudiante = m.id_estudiante;

  get diagnostics v_emitidas = row_count;
  return v_emitidas;
end;
$$;

-- Solo el job (owner) la ejecuta; nunca clientes.
revoke execute on function public.emitir_avisos_plazo_vence() from public, anon, authenticated;
```

> Notas de implementación:
> - `left(..., 255)` protege el límite `varchar(255)` de `mensaje`.
> - El prefijo `/es/` debe ser igual a `DEFAULT_LOCALE` (`@/i18n/config`, hoy `es`).
>   Si algún día cambia el locale por defecto, ajustar aquí.
> - `'en_recepcion'` es un estado **dormido** (== `abierto`, ningún flujo lo setea;
>   ver §4.5). Se incluye solo por **paridad con la RLS de inserción** (que también
>   lista ambos); si se quisiera, podría dejarse solo `'abierto'` sin cambiar el
>   resultado hoy. No hace daño.

### Parte B — App (TypeScript): registrar el render i18n-first

1. **`src/lib/notifications/format.ts`** → agregar `'plazo_vence'` al set
   `TIPOS_CON_PLANTILLA` (ya está en `TONE_BY_TIPO` y `TIPOS_CONOCIDOS`).
2. **`messages/es.json`** → en `Notifications.content`:
   ```json
   "plazo_vence": "La ventana de ofertas de \"{titulo}\" está por cerrar; pronto la empresa tomará una decisión."
   ```
3. **`messages/en.json`** → en `Notifications.content`:
   ```json
   "plazo_vence": "The offer window for \"{titulo}\" is about to close; the company will decide soon."
   ```
4. **Test (`reglas.md §11.3`)** → en `tests/unit/notifications-format.test.ts`,
   añadir un caso: `resolveNotificationContent({tipo:'plazo_vence', mensaje:'x',
   params:{titulo:'Y'}})` devuelve `{kind:'i18n', key:'content.plazo_vence',
   values:{titulo:'Y'}}`. Correr la suite COMPLETA (`npx vitest run`).

`types.plazo_vence` (badge) **ya existe** en ambos json; no tocar.

### Parte C — Samir (infra de BD)

1. Habilitar la extensión: Dashboard de Supabase → Database → Extensions →
   `pg_cron` (o `create extension if not exists pg_cron;` con rol adecuado).
2. Agendar el job (corre cada hora):
   ```sql
   select cron.schedule(
     'plazo-vence-aviso-horario',
     '0 * * * *',
     $$ select public.emitir_avisos_plazo_vence(); $$
   );
   ```
3. (Opcional) Verlo: `select * from cron.job;` y el historial en
   `cron.job_run_details`.

---

## 10. Cumplimiento de `reglas.md` (checklist)

- **§1 Stack:** Supabase Postgres + migraciones versionadas en
  `supabase/migrations/`. pg_cron es extensión de Postgres (Supabase), no una
  dependencia npm nueva → no toca el stack de §1. Deploy sigue en Vercel.
- **§4 i18n:** texto visible en `es.json` + `en.json` (`content.plazo_vence`),
  cero hardcoded en UI. El `mensaje` SQL es fallback de columna NOT NULL, no UI.
- **§3 Identidad:** tono `warning` por token FWD (ya mapeado), sin hex, sin emojis.
- **§6 BD/RLS:** RLS ya habilitado en `participaciones`/`notificaciones`; la
  función es `SECURITY DEFINER` con `revoke execute` (mismo patrón que
  `recalcular_reputacion_*`). `SUPABASE_SERVICE_ROLE_KEY` no se expone (la función
  vive en la BD).
- **§8 Anti-basura:** sin magic strings (umbral en `configuracion_sistema`, no
  número suelto); nombres con verbo+sustantivo (`emitir_avisos_plazo_vence`).
- **§2 TS:** sin `any`; los cambios TS son i18n + un set + un test.
- **§11 Definition of Done:** compila, lint, **test de la lógica nueva**, textos en
  ambos idiomas, commit Conventional.

---

## 11. Brechas conocidas (declararlas, no esconderlas)

1. **Correo (RF-46, Must):** el SRS lista "vencimiento de plazo" como evento de
   correo (Must). Esta entrega es **solo in-app**; el correo es el **único
   pendiente** para cerrar el evento por completo (cómo hacerlo: §14). Ojo: el
   sistema **sí manda correos** hoy para otros eventos (strike, proyecto modificado,
   aprobación de cuenta, invitación admin); no es que "no haya correo", es que
   `plazo_vence` aún no lo cablea. RF-46 además pide correo para adjudicación,
   mensaje y entregable — tareas separadas, fuera de este doc.
2. **Silenciar tipos (RF-48, Could):** existe `usuarios.tipos_notificacion_silenciados`
   pero **no está enforced**. `plazo_vence` es el tipo más "ruidoso"; si se decide
   respetar el silencio, hay que cablear ese chequeo por primera vez (filtrar en la
   función por `not (tipo_evento = any(u.tipos_notificacion_silenciados))`). Fuera
   de alcance aquí.
3. **Cierre automático del estado (RF-35 persistido):** sigue siendo derivado en
   lectura (`en_evaluacion`), no un flip real del estado. Tarea aparte; el mismo
   pg_cron podría cubrirla luego.
4. **Locale del `url_destino`:** el prefijo `/es/` está fijo en SQL (= `DEFAULT_LOCALE`).
   Aceptable hoy; revisar si cambia el locale por defecto.

---

## 12. Verificación / pruebas (antes de dar por hecho)

1. **TS:** `npm run build` + `npm run lint` + `npx vitest run` (suite completa) en
   verde.
2. **SQL (en staging, lo corre Samir):**
   - Crear un proyecto `abierto` con `fecha_cierre = now() + 10 horas` y una
     participación `enviada` → `select public.emitir_avisos_plazo_vence();` debe
     devolver `1`, crear 1 notificación `plazo_vence` y sellar
     `plazo_aviso_enviado_at`.
   - Correr de nuevo → devuelve `0` (idempotencia).
   - Proyecto con `fecha_cierre = now() + 100 horas` (fuera de 24 h) → `0`.
   - Proyecto `adjudicado` → `0`.
   - Verificar en la campana que el texto sale traducido (es/en) y enlaza al
     proyecto.

---

## 13. Veredicto de cumplimiento SRS

Implementar según este doc **aborda RF-33 sin contradecir el SRS**. Puede tener
añadidos, pero no incumple nada. Detalle:

| Requisito | Pri. | Cómo queda |
|---|---|---|
| RF-33 (avisar la proximidad del vencimiento) | Should | **Satisfecho** (canal in-app) |
| RF-47 (notificaciones in-app, leído/no leído) | Must | **Satisfecho** (campana + `leida`) |
| RF-21 / RF-35 (plazo 5-15 d / cierre de recepción) | Must | Respetado: lee `fecha_cierre`, no altera el cierre (lo enforce la RLS) |
| RF-31 (retirar oferta) | Must | No afectado; el SRS no exige editar ni re-postular una oferta |
| RF-37 / RF-39 (adjudicar / descartar con aviso) | Must | No pisado; `plazo_vence` salta proyectos adjudicados |
| RF-48 (preferencias de notificación) | Could | No enforced — es **Could**, no Must; declarado en §11.2 |
| RNF-04 (RBAC) / RNF-15 (escalado) / RNF-21 (i18n) / RNF-25 (tests) | — | Respetados: función `revoke`-ada, emisión centralizada (evita duplicados entre instancias), es/en, test exigido |
| **RF-46 (correo, incl. "vencimiento de plazo")** | **Must** | **Pendiente** — esta entrega es solo in-app. Único Must abierto. Ver §14. |

**Conclusión:** el único **Must** que queda abierto es **RF-46 (correo)**, y no es
una contradicción introducida por este diseño, sino el paso que falta para cerrar
el evento al 100 %. El in-app de este doc ya satisface RF-33 (Should) + RF-47 (Must).

---

## 14. Cómo proseguir tras el in-app: el correo (RF-46) — único pendiente

El sistema **SÍ envía correos** hoy. Infra en `src/lib/email/gmail.ts`
(nodemailer/Gmail) + plantillas en `src/lib/email/templates/`. Ya se usa en:

- `src/lib/admin/strike-actions.ts` → correo `strike-applied`.
- `src/lib/projects/edit-description.ts` → correo `proyecto-modificado`.
- `src/lib/auth/actions.ts` (`account-approved`) y `src/lib/admin/admin-invite-link.ts`.

Patrón establecido: `createGmailTransport()` + `getGmailFrom()` + plantilla
(asunto + HTML) + `transport.sendMail(...)` dentro de `try/catch` con `logger`
(best-effort: si el correo falla, se loguea y no rompe el flujo). Los correos son
**es-only** (no se guarda el idioma del usuario; ver `proyecto-modificado.ts`).

### 14.1. El detalle de arquitectura (CLAVE, no obviarlo)

El productor de `plazo_vence` es **SQL (pg_cron)** y **NO puede** llamar a esa capa
TS de correo (nodemailer vive en Node, no en Postgres). Por eso el correo necesita
un **contexto TS** disparado también por tiempo. Dos caminos:

- **Opción A — productor en TS (recomendada si el correo va desde el inicio):**
  convertir el productor a una **ruta TS** (p. ej. `/api/cron/plazo-vence`,
  protegida con `CRON_SECRET`) que haga in-app (vía `crearNotificaciones`) **y**
  correo (vía la plantilla Gmail) en un solo lugar, disparada por el scheduler
  (pg_cron con `pg_net` pegándole a la ruta, **o** Vercel Cron). Reúsa el patrón de
  correo existente y unifica ambos canales; implica revisar la decisión "solo SQL"
  de §2.
- **Opción B — mantener pg_cron SQL para in-app + emisor de correo aparte:** dejar
  el pg_cron escribiendo las notificaciones in-app (como en este doc) y añadir un
  **segundo job TS** que lea las `plazo_vence` recién creadas **aún no enviadas por
  correo**, resuelva el destinatario y las envíe. Requiere un **marcador de
  idempotencia de correo** (p. ej. columna `notificaciones.correo_enviado_at`).

### 14.2. Pasos concretos (para cualquiera de las dos opciones)

1. Crear `src/lib/email/templates/plazo-vence.ts` (asunto + HTML, **es-only**, mismo
   layout de marca que `proyecto-modificado.ts`). Sin emojis, tokens/markup de marca.
2. Resolver el correo del estudiante: `usuarios.correo` vía
   `estudiantes.id_usuario` (mismo destinatario que el in-app).
3. Enviar con el patrón existente (`createGmailTransport().sendMail({ from:
   getGmailFrom(), to, subject, html })`) en `try/catch` + `logger.error` si falla
   (no romper: el in-app ya cumplió RF-47).
4. Marcar lo enviado para no reenviar en la siguiente corrida (marcador de §14.1
   Opción B, o lo emite la misma ruta TS en Opción A).
5. Verificar: `npm run build` + `npm run lint` + `npx vitest run`, y una prueba de
   envío en staging.

Con esto `plazo_vence` queda **completo para RF-46** (in-app + correo). Hasta
entonces, el in-app de este doc **ya cumple RF-33 (Should) y RF-47 (Must)**; el
correo es lo único que resta.

---

## 15. Referencias del repo

- Núcleo y patrón de notificaciones: `docs/pendientesnotificaciones.md`.
- Render i18n-first: `src/lib/notifications/format.ts`.
- Estado derivado del proyecto: `src/lib/projects/project-detail-logic.ts:14-21`.
- RLS de inserción (cierre en BD):
  `supabase/migrations/20260611091025_flujo_b_unique_e_insert_check.sql:45-61`.
- Barrido de sobres cerrados al adjudicar:
  `supabase/migrations/20260621000000_adjudicar_barre_sobres_cerrados.sql`.
- Config del sistema (lectura/escritura): `src/lib/admin/queries.ts`,
  `src/lib/admin/actions.ts`, `src/components/features/admin/SystemConfigForm.tsx`.
- Infra de correo (para §14): `src/lib/email/gmail.ts` (transport) y
  `src/lib/email/templates/` (plantillas). Ejemplos de envío:
  `src/lib/admin/strike-actions.ts`, `src/lib/projects/edit-description.ts`.
