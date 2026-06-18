# Plan para Barry — tareas técnicas duras del Marketplace FWD

> **Para:** Barry (Project Manager técnico). **De:** auditoría re-verificada contra el código vivo.
> **Fecha:** 2026-06-18 (re-sincronizado contra HEAD `a6646d2`) · **Rama:** `samir`. Base original `5029e23`;
> desde entonces entraron `5a1cac5` (fix P0), el feature de Errol `3f97a28` (sobre cerrado + estado efectivo)
> y un merge de `dev`. Las citas `archivo:línea` están re-ancladas a `a6646d2`.
> **Propósito:** que Barry tome **lo difícil de verdad** — deuda de infraestructura, bombas de runtime y
> decisiones de arquitectura transversales — y deje el wiring de módulo a cada responsable.

---

## 0. La verdad incómoda primero

**Las cinco auditorías de `docs/auditorias/` describen un repo que ya no existe.** Están fechadas entre el
12 y el 17 de junio sobre ramas anteriores (`samir@7fc3818`, `errol@a60b8e1`). Desde entonces se mergeó casi
todo el trabajo de producto. Si alguien le entrega a Barry esas auditorías tal cual, le da **una lista con
tareas ya hechas**.

Por eso este documento **no copia** las auditorías: re-verifica hallazgo por hallazgo contra el código actual
(originalmente `5029e23`, re-anclado a `a6646d2`) con verificación adversarial — cada item marcado "abierto" se intentó refutar buscando si ya
se había resuelto en alguna rama. Método: 28 agentes (14 de verificación por área + contraverificación
adversarial + crítico de completitud + un agente que consultó la **BD remota por MCP, solo lectura**).

**Números del barrido:** 119 hallazgos evaluados · **62 confirmados abiertos** · **31 de nivel "Barry"**
(técnicamente difíciles, transversales o de criterio senior) + 11 huecos nuevos que ningún área cubría.

### Lo que YA está resuelto (no lo toquen — detalle en §7)
Postulación real (`lib/applications`), perfil + verificación de empresa, agente IA con LLM + gate de tokens,
publicación de proyecto por RPC atómico, entregables (subir/versionar/firmar/aprobar), verificación de
egresados (productor `estado_verificacion`), `env.ts`/`env.server.ts` con Zod adoptados, bug `getPendingUsers`
(`'admin'` vs `'administrador'`), cuelgue de `getUser()` en `junior/applications`, `comentario_empresario`
(columna materializada), rename `cedula_juridica → cedula`. **Higiene TS limpia** (sin `any`, sin `@ts-ignore`).
**+ (18-jun, commit `5a1cac5`):** migración fantasma `20260617180000` reconciliada y `database.ts` regenerado
contra la BD viva — cierra los **P0.1 y P0.2 originales** (detalle en §7).
**+ (merge `3f97a28`, Errol):** ofertas en **sobre cerrado** (UI del sello cableada en `ParticipationsPanel`)
+ **estado efectivo** de participación derivado en lectura (RF-34/RF-32).

### Cómo leer las prioridades
- **P0 — Infra que sangra ya.** Bloquea el flujo de trabajo del equipo o revienta en producción con datos reales.
- **P1 — Decisiones transversales.** *Una* decisión de Barry destraba 3–5 RF a la vez. El mayor apalancamiento.
- **P2 — Riesgos técnicos y de seguridad.** No bloquean hoy, pero son trampas que escalan.
- **P3 — Features con criterio senior.** Requieren decidir antes de codear (algoritmo, fuente de datos, alcance).
- **P4 — Higiene mecánica.** No es de Barry; se lista para que no se pierda y se delegue.

Etiquetas: **[Seguro]** = verificado archivo:línea en HEAD · **[Probable]** = inferencia sólida ·
**[Verificar]** = requiere confirmar en runtime/SQL.

---

## P0 — Infraestructura que sangra ya

> **Los P0.1 y P0.2 originales (drift inverso de migraciones + drift de tipos) ya están RESUELTOS** en el
> commit `5a1cac5` (ver §7). Resultó que el SQL no estaba perdido (estaba en `schema_migrations`) y el objeto
> era una v2 deliberada "sobre cerrado" aplicada al remoto sin commitear; se reconcilió el repo con la BD (sin
> tocarla) y se regeneró `database.ts`. **Esos dos slots se reemplazan abajo por tareas que siguen abiertas.**

### P0.1 · Blindar el flujo de migraciones — que la "migración fantasma" no se repita
**[Seguro]** La causa raíz de la migración huérfana `20260617180000` fue **aplicar DDL al remoto sin
commitear el `.sql`** (probable `apply_migration` por MCP o push directo). El síntoma se arregló
(`5a1cac5`), pero **el hábito sigue vivo**: nada impide que mañana alguien vuelva a desincronizar git↔BD.

- **Por qué es de Barry:** es disciplina de infraestructura del equipo, no un bug de módulo. Una sola
  migración aplicada "a mano" al remoto vuelve a bloquear `db push`/`reset` de todos.
- **Qué dejar montado:**
  1. **Regla escrita** (en `CLAUDE.md`/`README`): ninguna migración se aplica al remoto sin su `.sql`
     commiteado primero; `apply_migration` por MCP queda **prohibido** sobre el proyecto remoto compartido.
  2. **Chequeo de paridad en CI** (se engancha con P0.3): un step que corra el equivalente a
     `supabase migration list` y **falle si hay versiones remote-only** (aplicadas pero no en git, o al revés).
  3. **Un solo dueño de BD** (Samir) y un flujo explícito PR → merge → apply.
- **Acción `[Verificar]`:** diff completo `migration list` (remoto) vs `supabase/migrations/` (local) para
  confirmar que **no quedan OTRAS** remote-only. Hoy local = remoto = 35 tras `5a1cac5`, pero nada lo vigila.
- **Dependencias / coordinación:** **NO independiente.** Es una convención que obliga a todos → hay que
  **acordarla con el equipo**, en especial **Samir** (dueño de BD; la regla redefine quién aplica migraciones).
  Toca archivos **compartidos** (`CLAUDE.md`/`README`); el step de CI vive en `.github/` (nuevo, sin dueño); el
  `[Verificar]` necesita lectura de la BD remota (Samir).

### P0.2 · Barrido de casts `as unknown` que ocultan drift tipos↔BD
**[Seguro]** Las dos bombas que se arreglaron en `5a1cac5` (`ratings.ts` apellidos, `soporte_tickets`) **no
eran casos aislados**: el patrón `resultado_de_query as unknown as {...}` está repartido y **anula el
typecheck de nombres de columna y de relaciones**. Grep confirma ~10 casts de resultado de query:
`ratings.ts:75,268`, `publish.ts:131`, `portfolio/actions.ts:74,83,97`, `dashboard.ts:113`,
`admin/queries.ts:471,685`. (Distinto de los ~6 `as unknown as Json` para columnas `jsonb`, que son el
patrón **aceptado** de Supabase — **esos no se tocan**.)

- **Por qué es de Barry:** es una evasión de tipos sistémica; cada cast es una bomba latente como las dos que
  ya explotaron. Distinguir el cast legítimo (jsonb) del peligroso (resultado de query con shape a mano)
  requiere criterio.
- **Qué dejar montado:** por cada cast de resultado de query, revalidar contra los tipos ya regenerados y
  **quitar el cast usando el embed tipado**, hinteando el FK donde haya ambigüedad — el patrón
  `empresarios!empresarios_id_usuario_fkey` documentado en `5a1cac5` se repite: **toda tabla con 2 FK a otra**
  necesita el hint. `ratings.ts:268` quedó con su cast aunque se corrigieron los nombres → primer candidato.
- **Acompaña:** una regla de PR/lint que marque `as unknown as` sobre el cliente Supabase como *smell* a
  revisar (no prohibir: `jsonb` lo necesita).
- **Dependencias / coordinación:** **toca archivos de ≥4 dueños [Probable]** — `publish.ts`/`dashboard.ts`
  (Errol), `portfolio/actions.ts` (Rachel), `admin/queries.ts` (María del Sol), `ratings.ts`/`company` (Rony).
  No toca BD. Por la regla del equipo ("no merge sin revisión colectiva"), hacerlo como **PRs chicos por módulo,
  revisados por su dueño**, no un PR monolítico.

### P0.3 · No existe CI/CD — el DoD no se puede garantizar
**[Seguro]** `Glob '.github/**'` = sin archivos. `package.json` define `lint`/`typecheck`/`test` pero
**ningún workflow los corre**. Husky pre-commit existe pero no sustituye un gate server-side.

- **Por qué es de Barry:** sin CI, los drifts de tipos, los `catch`-swallow (P2.1) y cualquier regresión
  **llegan a `dev` sin freno**. El DoD (`reglas.md §11`, brief §6.5) exige "TS compila + ESLint pasa + tests"
  por feature; hoy eso depende de revisión manual. **Esta es la pieza que vuelve verificable todo lo demás.**
- **Acción de raíz:** workflow de GitHub Actions (`typecheck` + `lint` + `vitest run` + `next build`) como
  **required check** sobre PRs a `dev`. Incluir el chequeo de paridad de migraciones (P0.1) y un check de
  drift de `gen types` (que `database.ts` no diverja del esquema vivo).
- **Atar aquí:** quitar `--passWithNoTests` de `package.json:16` (ya hay 13 archivos de test / ~123 casos; el CI
  no debe pasar en verde si los tests desaparecen) y agregar `coverage` con thresholds en `lib/` (reglas piden
  50% deseado en `lib/`). `vitest.config.ts` hoy no tiene bloque `coverage` ni `thresholds`.
- **Dependencias / coordinación:** la **más independiente** — el workflow son archivos nuevos en
  `.github/workflows/` (sin dueño). Compartidos de baja fricción: `package.json` y `vitest.config.ts`. Pero un
  *required check* **bloquea los PRs de todos** → **acordarlo con el equipo**; puede arrancar como check
  **no-bloqueante** y endurecerse luego. El step de paridad/`gen types` necesita que Samir confirme el comando.

---

## P1 — Decisiones transversales (una decisión destraba varios RF)

> Estas son el **mayor apalancamiento de Barry**: no son "implementá X", son "decidí el contrato y el resto del
> equipo lo cablea". Mientras no se decidan, cada módulo improvisa el suyo y choca.

### P1.1 · Mecanismo de escritura en `notificaciones` — destraba RF-33, RF-35, RF-39, ADM-4 y la etapa 2.8
**[Seguro]** La tabla `notificaciones` tiene índice (`20260608000005:28`) y RLS, pero **solo policies SELECT y
UPDATE — no INSERT** (`20260610212418:458-465`). **Cero productores en todo el repo:** grep de `insert into
notificaciones` en `supabase/` = 0; `.from('notificaciones').insert`/`.rpc(...notif)` en `src/` = 0; no existe
`supabase/functions/`. Hoy `adjudicarParticipacion` marca `no_seleccionada` **sin notificar**
(`project-detail.ts:459-474`); el Bell del Navbar es un punto estático hardcodeado (`Navbar.tsx:253`).

- **La decisión (una sola):** trigger `SECURITY DEFINER` que inserta en cada transición de estado **vs.**
  inserts vía `service_role` desde server actions (más controlable y testeable) **vs.** `pg_cron`/Edge.
  Recomendación del barrido: **`service_role` desde las actions** para los eventos (adjudicación, respuesta de
  entregable), y `pg_cron`/Edge **solo** para avisos por tiempo (P1.2). **No** abrir una policy INSERT.
- **Congelar el contrato de la fila `notificaciones` antes** de que cada módulo improvise. `DEPENDENCIAS-SAMIR.md`
  ya lo marca como decisión §13.4 pendiente de todo el equipo.
- **Dependencias / coordinación:** **decisión de TODO el equipo** (es el contrato que cada módulo consume) +
  **Samir** (BD: trigger/`service_role`). El *core* (un `lib/notifications/` productor) es greenfield que Barry
  escribe; los consumidores (adjudicación, RF-33/39, ADM-4) lo cablean después.

### P1.2 · Scheduler temporal (cierre/vencimiento automático) — RF-33 y RF-35
**[Seguro]** No hay productor temporal: `supabase/functions/` vacío, `grep pg_cron|cron.schedule` = 0, no existe
`vercel.json`. El vencimiento **solo se chequea de forma reactiva** al postular (`applications/actions.ts:137`,
rechaza `plazo_vencido`). El cierre de estado al vencer (RF-35) hoy es **derivación perezosa en lectura**
(`project-detail-logic.ts:14-21` deriva `en_evaluacion`; la columna sigue `'abierto'`).

- **Por qué es de Barry:** sin scheduler, un proyecto vencido **queda `'abierto'` indefinidamente en BD** aunque
  la UI lo oculte → rompe la consistencia de la máquina de estados (RF-25) y las stats del admin.
- **Atado a P1.4:** el estado destino "recepción cerrada" **no existe en el enum** (ver P1.4). No meter cron sin
  decidir antes el estado destino.
- **Acción:** habilitar `pg_cron` en Supabase y agendar una función que transicione proyectos vencidos e inserte
  la notificación de vencimiento (vía P1.1). Para RF-33: job diario que avise a egresados con postulación
  `enviada`/`en_revision` en proyectos con `fecha_cierre` dentro de 24h.
- **Dependencias / coordinación:** **Samir** (habilitar `pg_cron`/función en BD) + la decisión de estado-destino
  del enum (atada a **P1.4**, con Fressia). Archivos **nuevos** (migración/función) — no toca módulos de otros.

### P1.3 · Atomicidad de la adjudicación — el nodo que sostiene media plataforma
**[Seguro]** `adjudicarParticipacion` (`project-detail.ts:393-490`) hace **3 UPDATEs secuenciales sin
transacción**: ganador→`contratada` (dispara `trg_crear_contratacion`), batch resto→`no_seleccionada`,
proyecto→`adjudicado`. Si falla un paso intermedio, devuelve `'adjudicacion_parcial'` **sin mecanismo de
reconciliación** (el "admin recupera" del JSDoc no existe).

- **Por qué es de Barry:** es la **costura que desbloquea toda la cadena** adjudicación→contratación→entregables
  →evaluación→reputación. Una adjudicación a medias bloquea entregables (`deliverables/queries.ts:139` filtra
  `estado='contratada'`) y deja participaciones huérfanas. El flujo *funciona* en el camino feliz y respeta la
  máquina de estados (pasa por `en_revision`), pero la no-atomicidad es una bomba de consistencia.
- **Acción de raíz:** mover los 3 UPDATEs a un **RPC `SECURITY DEFINER` transaccional** (una función Postgres,
  todo-o-nada). Elimina el estado `'adjudicacion_parcial'`. Requiere migración → coordinar con Samir.
- **Dependencias / coordinación:** **Samir** (la migración del RPC) + **Errol** (el refactor cae en su
  `project-detail.ts`). No independiente: toca BD y un archivo con dueño.

### P1.4 · Máquina de estados del proyecto sin red dura en BD — RF-24 y RF-25
**[Seguro]** El guard de transiciones del proyecto vive **solo en TS** (`project-detail-logic.ts:37-63`
`canAdvanceProject` + `setProjectEstado` en `project-detail.ts:124-186`). La BD **no valida**: el único trigger
de transiciones es `validar_transicion_participacion` (sobre `participaciones`, `20260611161414:33-65`);
**ninguno sobre `proyectos`**. El propio código lo admite (`project-detail-logic.ts:25-26`: "La BD NO valida
transiciones de proyecto").

- **Consecuencia:** cualquier `service_role` (p. ej. `admin/project-actions.ts` cancela vía adminClient) o
  cualquier UPDATE que no pase por `setProjectEstado` **se salta la máquina**. Mismo agujero ya conocido del
  lado participaciones, pero acá sin la mitad de BD.
- **RF-24 (editar solo no adjudicados) está ABIERTO de cero:** no existe ruta de edición ni action
  `editarProyecto` (verificado por grep); la policy `proyectos_update_own` no condiciona por estado.
- **Acción de raíz:** trigger `validar_transicion_proyecto BEFORE UPDATE OF estado ON proyectos` (espejo del de
  participaciones, errcode 23514), cubriendo `borrador→abierto→(en_recepcion)→adjudicado→en_desarrollo→
  finalizado` y `cancelado` terminal. Mantener el guard TS para UX. Para RF-24: action `editarProyecto` que
  valide `estado IN ('borrador','abierto','en_recepcion')` **en action Y en BD**.
- **Decisión enlazada:** el enum tiene 7 estados y **no** incluye `listo_para_revision` (RF-41) ni un estado de
  "recepción cerrada" (RF-35). **[Seguro]** Ningún código en HEAD consume `listo_para_revision` (solo aparece en
  docs), así que **no hay bomba de runtime hoy** — es un gap enum-vs-SRS, no un crash. Decidir si el flujo
  entregable→revisión necesita el estado intermedio (entonces `ALTER TYPE ... ADD VALUE` en su propia migración)
  o si `en_desarrollo→finalizado` ya cubre. No agregar "por si acaso".
- **Nota (post-`3f97a28`):** la derivación-en-lectura ya no es solo del proyecto — Errol agregó
  `computeEstadoParticipacionEfectivo` (`project-detail-logic.ts:124-156`) que deriva el estado de la
  **participación** (oferta viva sobre proyecto terminal → `no_seleccionada`/`cancelada`) sin mutar la columna.
  Refuerza el mismo riesgo: el estado real en BD diverge de lo mostrado. Si entra el scheduler de P1.2,
  materializar **proyecto Y participación** de forma consistente.
- **Dependencias / coordinación:** **Samir** (trigger en BD) + **Errol** (módulo de proyectos:
  `project-detail*.ts` y la ruta de edición de RF-24) + **Fressia** (decisión del estado-destino del enum, RF-35/41).

### P1.5 · Trazabilidad: `auditoria` sin escritor + motivo de suspensión/cancelación — ADM-3 y ADM-4
**[Seguro]** La tabla `auditoria` **no tiene un solo escritor** (`from('auditoria')` en `src` = 0; en
migraciones solo índices y un comentario "se escribe del lado servidor" que nunca se materializó). En paralelo:
`deactivateUser` **no recibe ni persiste motivo** (`admin/actions.ts:122,147-150`; la UI captura el motivo en
`AccountStatusActions.tsx:53` y se descarta); `cancelProjectAsAdmin` **recibe motivo pero solo lo loguea**
(`project-actions.ts:61-79`, no escribe `motivo_cancelacion` ni notifica).

- **Por qué es de Barry:** ADM-3, ADM-4 y "la capa de auditoría" son **una sola decisión de diseño**: dónde vive
  el registro inmutable de acciones admin (actor + target + acción + motivo).
- **Acción:** usar `auditoria` como **bitácora central** escrita por trigger `AFTER`/`service_role` en acciones
  admin (suspensión, cancelación, cambios de config). **Ojo:** el sistema de **strikes** ya tiene su propio
  historial con motivo (`strike-actions.ts:108` + `listStrikeAudit` en `queries.ts:801`) — no duplicar; dejar
  strikes como está y usar `auditoria` para el resto. Cerrar ADM-4 requiere además persistir
  `motivo_cancelacion` (la columna existe, `database.ts:229`) + notificar (depende de P1.1).
- **Dependencias / coordinación:** **Samir** (trigger/migración de `auditoria`) + **María del Sol** (cablear en
  sus acciones admin: `deactivateUser`, `cancelProjectAsAdmin`). Atado a **P1.1** para la notificación de ADM-4.

---

## P2 — Riesgos técnicos y de seguridad

### P2.1 · `catch`-swallow sistémico (DYNAMIC_SERVER_USAGE) — 25 catches sin `unstable_rethrow`
**[Seguro]** `grep unstable_rethrow` en `src` = **0**. El patrón `catch (e) { logger.error(...); return err(...) }`
que **se traga las señales de framework** vive en 25 sitios: `marketplace.ts:95,130,174`;
`company/actions.ts` (6); `projects/actions.ts` (4); `projects/dashboard.ts` (2); `projects/publish.ts` (1);
`proposal-ai/{proposal,chat}.ts` (solo special-casan `AI_NOT_CONFIGURED`, no el digest); y se **replicó a
`portfolio/actions.ts` (6)** — deuda nueva post-auditoría.

- **El que explota hoy:** los 3 de `marketplace.ts` corren durante el prerender de `/marketplace`,
  `/junior/projects` y `/junior` → tragan `DYNAMIC_SERVER_USAGE` y **probablemente sirven el marketplace vacío
  en producción** (`result.ok ? data : []` enmascara el fallo). **[Verificar]** con `next start` + abrir las 3
  páginas. El resto son latentes (server actions) hasta que alguien meta un `redirect()`/`notFound()` en un `try`.
- **Acción de raíz:** definir **convención de `catch` en server actions** (`unstable_rethrow(e)` como primera
  línea → mapear error real → log → `return err`) y aplicarla de una vez a los 25, no archivo por archivo cuando
  explote. `unstable_rethrow` es nativo de Next (`next/navigation`), no roza el stack §1. No usar
  `force-dynamic` en solitario (deja el `catch` frágil).
- **Dependencias / coordinación:** los 25 catches viven en módulos de **varios dueños** (Errol en `projects/*` y
  `proposal-ai/*`, Rachel en `portfolio`, `company`/Rony) → acordar el **patrón común** con el equipo y luego PRs
  por módulo. No toca BD. El `[Verificar]` del marketplace vacío necesita `next start` (runtime).

### P2.2 · Seguridad de BD (advisors) — auditar `SECURITY DEFINER` y activar protección de contraseñas
**[Seguro, vía MCP]** `get_advisors(security)`: 0 ERROR; **6 WARN** (5 funciones `SECURITY DEFINER` ejecutables
por `authenticated`: `assign_my_role`, `get_my_account_status`, `get_my_role`, `get_participaciones_de_proyecto`,
`mis_proyectos_como_empresario`, `mis_proyectos_como_estudiante` + `leaked_password_protection` **desactivada**);
2 INFO (RLS sin policy en `auditoria` y `mensajes`).

- **Acción de criterio senior:** auditar cada `SECURITY DEFINER` para que filtre por `(select auth.uid())`
  interno y no exponga terceros — **en especial `assign_my_role`** (confirmar que no permita auto-escalar a
  `'administrador'`). Activar `leaked-password protection` en Auth (toggle del dashboard, sin migración).
  `auditoria`/`mensajes` deny-all es correcto por ahora.
- **Performance (menor):** la policy `evaluaciones_empresarios_insert_estudiante` (tabla del 17-jun) quedó con
  `auth.uid()` **crudo**, no `(select auth.uid())` → re-evaluación por-fila. El patrón correcto ya está aplicado
  en el resto (`20260610212418`); a esta se le pasó. Fix de una línea en su WITH CHECK.
- **Dependencias / coordinación:** **Samir** casi todo (auditar funciones `SECURITY DEFINER`, toggle de
  `leaked-password` en el dashboard de Auth, migración del `initplan`). No toca módulos de app.

### P2.3 · Reputación: trigger `avg()` que no reacciona a DELETE (en AMBOS triggers)
**[Seguro]** `recalcular_reputacion` (`20260608000005:147-153`, estudiante) y `recalcular_reputacion_empresario`
(`20260617000000:43-58`, empresario) son `AFTER INSERT OR UPDATE OF puntuacion` **sin `DELETE`** y usan `NEW`
directo. **Borrar una evaluación nunca recalcula el promedio.** El trigger nuevo del empresario (17-jun)
**duplicó literalmente el bug**.

- **Agravante de regla de negocio:** `rateCompany` permite calificar con `estado_periodo` `'finalizado'` **O
  `'vigente'`** (`ratings.ts:86-91`) → contamina el promedio antes de que el contrato termine.
- **Acción:** una sola migración para ambos triggers: añadir `OR DELETE` y usar
  `COALESCE(NEW.id_estudiante, OLD.id_estudiante)` / `COALESCE(NEW.id_empresario, OLD.id_empresario)`. Decidir la
  regla "¿se califica sobre vigente o solo finalizado?" y alinear `ratings.ts`. Cierra la cadena
  evaluación→reputación que ve el egresado al postular (RF-14, RF-51).
- **Dependencias / coordinación:** **Samir** (migración de ambos triggers) + dueño de `ratings.ts` (la regla
  "vigente vs finalizado" es decisión de negocio). Toca BD.

### P2.4 · Resiliencia y gobernanza del proveedor IA
- **Punto único de fallo [Seguro]:** el generador de propuestas (RF-54, **entrada de TODO el marketplace**)
  tiene un solo proveedor/key vía OpenRouter, 5 reintentos al mismo modelo, timeout 60s
  (`proposal-ai/provider.ts:23,35`). Si OpenRouter cae, **ningún empresario publica** y el fallo es silencioso
  para el producto. Decidir: camino de publicación **manual** (sin IA) como degradación, o documentar que la IA
  es dependencia dura.
- **Sin evals [Seguro]:** no hay test automatizado del agente; la única red es el banco de casos manual
  (`docs/agente-casos-conversacion.md`, con una regresión conocida del 15-jun). Para producto vivo, un set
  mínimo de evals deterministas evita "arreglar un caso y romper otros".
- **Gobernanza de dependencia [Seguro]:** `openai ^6.42.0` (`package.json`) **no está en la lista canónica del
  brief §8.2**. El código la justifica en comentario como "cliente OpenAI-compatible vía OpenRouter" pero **no
  hay registro en README** (reglas.md §1 exige justificar y documentar). Además hay **drift de docs**:
  `README.md:38-39` y `.env.local.example:31` citan el path viejo `src/lib/ai/` y vars `OPENAI_*`, cuando el
  código real vive en `src/lib/proposal-ai/` con vars `PROPOSAL_AI_*`. Decidir (mantener documentado vs `fetch`
  directo) y alinear las docs.
- **Dependencias / coordinación:** **Errol** (dueño del agente IA: `proposal-ai/*`, provider) + **equipo**
  (justificar/aceptar la dep `openai` fuera del brief §8.2). Toca docs compartidos (`README`, `.env.local.example`).

### P2.5 · RLS de visibilidad del portafolio (RF-10) — "Solo Empresas" es hoy una promesa falsa
**[Seguro]** La policy `portafolio_select_own_or_public` (`20260610212418:536-547`) gatea por `is_active` y
consentimiento, **nunca por `portafolio_visible_publicamente`**. El toggle solo se persiste sobre `estudiantes`
(`PortfolioManager.tsx:194`), no sobre `proyectos_portafolio`. El egresado cree controlar la privacidad y no la
controla.

- **Acción (decisión senior):** (a) migración que agregue `AND portafolio_visible_publicamente` (vía join a
  `estudiantes`) al brazo público de la policy, **o** (b) enforcement explícito en la query de lectura de
  empresa. Elegir y documentar. **No** dejar solo el toggle de UI.
- **Dependencias / coordinación:** **Samir** si se hace por migración de policy, **o** **Rachel** (portafolio) /
  dueño de la lectura de empresa si es enforcement en la query. Decidir la vía primero.

### P2.6 · `DemoDataProvider` montado sin consumidores — wiring muerto sobre el motor mock
**[Seguro]** `(app)/layout.tsx:46-51` aún envuelve en `<DemoDataProvider>`, pero `grep useDemoData` en `src` solo
halla la definición y el shim deprecado `StateContext.tsx`. **Ningún componente lo consume.**

- **Por qué Barry:** es transversal (toca el motor mock que las auditorías marcaban como raíz del problema) y
  desbloquea **borrar `DemoDataContext.tsx` + `StateContext.tsx` + `mockData.ts`** del repo. Confirmar 0
  consumidores en `(company)`/`(admin)` (el grep ya sugiere 0) y quitar el provider.
- **Dependencias / coordinación:** de las más independientes — infra mock **compartida sin dueño claro**
  (`DemoDataContext`/`StateContext`/`mockData`) + el layout `(app)`. No toca BD. Solo **confirmar 0 consumidores**
  en `(company)`/`(admin)` antes de borrar (aviso al equipo, no bloqueo).

### P2.7 · Auditoría de duplicación y code-health — el copy-paste como bomba de tiempo
El audit de este doc fue por **RF/feature**; **falta un barrido dedicado de duplicación / código muerto /
implementaciones divergentes del mismo concepto**. Es criterio senior y transversal: un dev de módulo no ve
el patrón que cruza módulos. (Ojo: "limpiar todo el código" sin criterio se vuelve un pozo sin fondo — esta
tarea se acota a **duplicación + bombas de tiempo**, con herramienta y atada a CI.)

- **Evidencia (punto de partida, no re-descubrir):**
  - `catch`-swallow **copiado 25×** (P2.1); bug del trigger de reputación **literalmente duplicado** (P2.3,
    `DELETE` incluido); casts `as unknown` repetidos que ocultan drift (P0.2).
  - **[Seguro]** `src/lib/supabase/projects.ts` (CRUD de portafolio: `getProjects`/`createProject`/`updateProject`)
    **no tiene importadores** → duplicado **muerto** de `lib/portfolio/actions.ts`.
  - `StateContext.tsx` = re-export deprecado de `DemoDataContext` + `_orphans/*` (P2.6/P4); magic numbers
    500/800 duplicados; "Marketplace FWD" ≥3 veces (un solo `BRAND_NAME`); toasts/strings hardcoded (P4).
- **Qué dejar montado (Barry hace el audit + los fixes):**
  1. Barrido con herramienta: `knip`/`ts-prune` (exports/archivos sin uso) + `jscpd` (copy-paste). **Son deps
     fuera del brief §8.2** → justificar, o correrlas one-shot vía `npx` sin agregarlas a `package.json`.
  2. Por cada duplicación: **extraer a una única fuente** (constante/util/módulo) y borrar las copias. Por
     cada bomba latente, neutralizarla (CHECK, `unstable_rethrow`, atomicidad).
  3. **Atar a CI lo automatizable** (P0.3): `knip`, un threshold de `jscpd`, `no-console`, smell de
     `as unknown` — para que la duplicación no vuelva a crecer.
- **Dependencias / coordinación:** **transversal — toca casi todos los módulos** → acordar el método con el
  equipo y hacer PRs por módulo revisados por su dueño; la dedup cross-módulo y de triggers puede tocar BD →
  **Samir**. Las herramientas (`knip`/`jscpd`) requieren visto bueno de dependencia (brief §8.2). No independiente.

### P2.8 · Rename de ruta `/junior` → `/egresado` (coordinado, no unilateral)
**[Seguro]** El rol ya es `egresado` en BD desde el 09-jun (`20260609000005:16`); lo único "junior" que
sobrevive es la **ruta** — la URL no espeja el rol. Verificado el 18-jun: la carpeta `(app)/junior/` existe y
hay **28 referencias `/junior`** en `src`. **No requiere migración ni gate de BD** — es puro routing.

- **Por qué es de Barry:** routing trivial pero con **alto costo de coordinación**. Todas las ramas
  referencian `/junior` (al 16-jun: errol/rachell/fressia=27, sol/ronny=26, santiago=15, dev=16), así que un
  rename unilateral en `samir` **traslada el conflicto a todos al rebasar**. El **timing / punto de sync** es
  decisión de PM, no de módulo. Y **escala**: cuanto más se posterga, más código lo referencia.
- **Alcance (codemod determinista):**
  - `git mv` `src/app/[locale]/(app)/junior/` → `(app)/egresado/`.
  - `middleware.ts`: `PROTECTED_PREFIXES` (`:11`) + el regex de `getRouteRole` (`:36`).
  - hrefs restantes: Navbar, Footer, LandingHeroCtas, ProjectCard, `applications/page.tsx`.
  - `MOCK_JUNIOR_NAME` → `MOCK_EGRESADO_NAME` (def + usos) + comentario `roles.ts:8`.
  - **NO tocar** el "junior" de **nivel de experiencia** (`es/en.json` companyDesc/missionText, mocks, prompt
    IA `provider.ts:107`) ni los comentarios históricos de migraciones / `roles.test.ts:30`. El codemod es
    seguro porque esos **no** llevan `/` adelante.
- **DoD específico:** `grep /junior` = **0**, las 4 rutas resuelven, el middleware guarda `/egresado`; +
  typecheck/lint/build verdes.
- **Ya hecho (continuidad):** el fix de 2 links rotos a `/applications` está commiteado (`7210ff1` en samir);
  la carpeta duplicada `Portafolio/` ya **no existe** (limpiada en un merge).
- **Dependencias / coordinación:** **NO independiente — el bloqueo es de TIMING, no técnico.** Hacerlo en un
  punto donde **fressia/santiago/sol** puedan rebasar sin pelea (ellas todavía referencian `/junior`). Toca el
  layout `(app)`, `middleware.ts` y hrefs de varios módulos. No toca BD.

---

## P3 — Features que requieren criterio senior antes de codear

### P3.1 · RNF-30 — cotejo de egresados sin fuente de verdad
**[Seguro]** Hoy `verificarEgresado` aprueba contra **juicio manual del admin + consentimiento** (RNF-38, que
**sí** está implementado y testeado: `auth/actions.ts:138`, `admin/actions.ts:54-65`,
`actions.test.ts:106`). Pero **no existe la tabla padrón `egresados_fwd`** (verificado en `information_schema`:
no existe en remoto; grep solo en `docs/pedido-RNF30-cotejo-egresados.md`). El propio código lo admite
(`GraduateVerificationActions.tsx:30`: "El cotejo automático contra la base FWD (RNF-30) sigue pendiente").

- **Riesgo de identidad:** cualquier persona aprobada manualmente pasa como egresado FWD. Define la confianza de
  toda la plataforma.
- **Decisión de producto+datos (no mecánica):** definir la **fuente** (tabla local `egresados_fwd` sembrada por
  FWD vs API de `jobs.fwdcostarica.com`), crearla con RLS (solo admin/`service_role` lee, por PII — RNF-35),
  índice por correo/cédula, y cotejo determinista server-side (match correo+título). **O** documentar
  explícitamente que el MVP usa verificación manual asistida como **riesgo aceptado firmado**. No dejarlo
  implícito. `docs/pedido-RNF30-cotejo-egresados.md` ya especifica la tabla y el padrón para Errol/FWD.
- **Dependencias / coordinación:** **externa a desarrollo** — el padrón lo tiene **FWD** (dato real) y la
  tabla/datos los monta **Errol/Samir** (ver `pedido-RNF30`). Es decisión de **producto + datos**, no solo código.

### P3.2 · RF-61/RF-62 — recomendación y score de matching
**[Seguro]** Sin implementar (grep de `recomendar|matching|afinidad|score` = 0 algoritmo; `lib/marketplace/`
vacía). RF-61 (recomendar egresados verificados por habilidades) es **solo SQL**: cruzar
`proyecto_tecnologias` × `habilidades_tecnicas` de estudiantes con `estado_verificacion='verificado'`, ordenar
por nº de coincidencias. RF-62 (**score explicable**) es lo de criterio:

- **Decisión senior antes de codear:** ¿el score es solo intersección de tecnologías, o pondera nivel de
  habilidad / reputación / `proyectos_completados`? ¿cómo se le explica al empresario? El SRS pide
  "EXPLICABLE". Implementar como **función pura en `lib/` con tests Vitest** (reglas §10). RF-62 depende de
  RF-61 para el conjunto candidato.
- **Dependencias / coordinación:** de las más independientes — función pura **nueva en `lib/`** (greenfield +
  Vitest) sobre tablas existentes (sin migración). Solo coordina al **mostrar** el resultado en la UI del
  empresario (Errol). El algoritmo es criterio propio de Barry.

### P3.3 · RNF-35/37 — datos personales y derecho de supresión sin dueño
**[Seguro]** No hay self-service de borrado/exportación para el titular del dato; solo `deleteUser`
administrativo. RNF de cumplimiento (protección de datos CR / Ley 8968) **sin responsable**.

- **Decisión senior (toca retención legal vs integridad referencial):** no se puede borrar a secas una
  contratación cerrada. Definir alcance MVP: server action de auto-supresión que **anonimice** `usuarios` con
  cascada controlada respetando FKs (`contrataciones`/`evaluaciones`), + exportación del propio perfil.
- **Dependencias / coordinación:** **Samir** (la anonimización en cascada toca FKs de todo el modelo) +
  decisión **legal/producto** (retención vs supresión). La action es greenfield, pero su alcance no es independiente.

### P3.4 · RF-14 — historial del egresado con calificación
**[Seguro]** `getStudentProfile` no lee `evaluaciones`/`reputacion` (grep en `lib/portfolio` = 0). **Trampa
verificada:** la migración nueva `20260617000000_evaluaciones_empresarios.sql` es la **dirección inversa** (el
egresado califica al empresario); **no** satisface RF-14 (empresa califica al egresado, tabla `evaluaciones` /
`estudiantes.reputacion`).

- **Acción:** definir el contrato de lectura del portafolio (promedio `estudiantes.reputacion` + proyectos
  contratados con su nota de `evaluaciones.puntuacion`) y **stubbear con seed** para no bloquearse esperando el
  flujo de calificación de Fressia/Santiago. Depende de P2.3.
- **Dependencias / coordinación:** **Rachel** (es su `getStudentProfile`/portafolio) + depende del flujo que
  puebla `evaluaciones` (**Fressia/Santiago**). Stub con seed para no bloquearse.

### P3.5 · Decisiones menores con criterio (delegables con guía)
- **RF-15 CV/portafolio a PDF (prioridad C):** **no** meter `jspdf`/`react-pdf` a la ligera (brief §8.2). Camino
  sin dependencia: vista print-only + `@media print` + `window.print()`. Si se quiere PDF server-side, justificar
  por escrito antes.
- **RF-26 búsqueda/filtrado (<1s):** la fuente **ya es Supabase real**, pero el **filtrado sigue 100% en cliente**
  (`MarketplaceClient.tsx:54-101`), con dimensiones equivocadas (`duration` opera sobre el literal `'1 mes'`
  hardcodeado de `marketplace.ts:53`) y un `setTimeout(400)` de loading falso. Reescribir como filtros
  server-side (params a `getMarketplaceProjects` con joins + índices ya creados). Es retrabajo, no ajuste.
- **Mensajería (`mensajes`):** RLS habilitado **sin policies** = deny-all (estado seguro). Confirmar si es V2 o
  entra al MVP antes de tocar.
- **Dependencias / coordinación:** cada sub-ítem es de su dueño — RF-15 PDF → **Rachel** (portafolio), RF-26
  filtros → **Errol** (`MarketplaceClient`/`marketplace.ts`); **Mensajería** es decisión de alcance del **equipo**
  (V2 vs MVP). De Barry, sobre todo el criterio de la dependencia PDF.

---

## P4 — Higiene mecánica (NO es de Barry; delegar al responsable del módulo)

Se lista para que no se pierda. Cada item es trabajo de un dev de módulo, no senior:

| Item | Evidencia | Regla |
|---|---|---|
| **RF-28/30 upload de prototipo (sigue roto tras `3f97a28`)** | Errol movió el upload a la action `subirArchivoPostulacion` (`applications/actions.ts:36-79`) — arregla el cuelgue de sesión pero **no** los 3 defectos: (1) `ApplyProjectClient.tsx:101-129` sube **antes** del INSERT (`postularse()` inserta en `actions.ts:140`); (2) `actions.ts:62` arma path plano `${id_proyecto}-${ts}-${tipo}.${ext}` sin carpeta `{id_participacion}`; (3) `actions.ts:74-76` usa `getPublicUrl` en bucket privado (`20260611084638:35`) en vez de `createSignedUrl`. La RLS `prototipos_insert_estudiante` (`20260611084638:145-156`) exige `id_participacion` en el path → rechaza. **Bloquea RF-30, degrada RF-34** | (funcional, media) |
| RF-27 manejo de errcode roto | `applications/actions.ts:152` filtra por `'P0001'`/`includes('cupo')`; el trigger lanza `23514` + `'Cupo'` (mayúscula). No captura `23505`/`23514`/`42501`. (Ojo: `project-detail.ts:24` solo maneja `23514`, tampoco es patrón completo.) | (funcional) |
| `CreateStrikeButton.tsx` | `:61` `t` sin usar **+ destapa ~10 strings hardcoded en español** (`'Aplicar Strike'`, etc.) | §4 i18n |
| Landing stats inventadas | `page.tsx:108,116,124` pinta `+500`/`+1,200`/`+150` desde i18n como reales | §13 / portada pública |
| `/showcase` sin gatear | `showcase/page.tsx` con datos sample, alcanzable por URL en producción | datos falsos a revisor |
| Navbar | `:253` punto de notificación falso siempre encendido; `:288` avatar enlaza a `/empresario/perfil` para **todos** los roles | bug nav |
| `console.log` en `PortfolioManager` | `:159-160` loguea `fullName`+`id_usuario`; el `useEffect` `:156-162` no hace nada más | §8 |
| TODO sin ticket | `marketplace.ts:53` `// TODO:` no conforme + `'1 mes'` magic string | §8 |
| `calificacion_prototipo` sin CHECK | `participaciones` sin constraint 1-5 (verificado en `pg_constraint`); migración `ADD CONSTRAINT ... BETWEEN 1 AND 5` | defensa en profundidad |
| Strings de toast hardcoded | `PortfolioManager.tsx` ~9 toasts en español sin claves i18n | §4 |
| Zod en frontera (portafolio) | `saveStudentProfile`/`savePortfolioProject` no re-validan con Zod server-side (solo el form) | §5 |
| `lib/marketplace/` vacía | solo `.gitkeep`; la lógica vive en `lib/projects/marketplace.ts` — borrar o documentar | confusión de naming |
| `reset-password` `getSession()` en montaje | `:50-55` auth en cliente; **no se cuelga** (sesión ya en cookie vía PKCE), pero viola §1/§8 → migrar a `onAuthStateChange` (patrón B1, flujo confirmado PKCE) | §1/§8 |
| Archivos 0 bytes | `SkillPicker.tsx`, `PortfolioCard.tsx` (resueltos con SkillForm inline) — borrar | §8 |
| RF-04 sesión recovery | `reset-password` no distingue sesión `recovery` de sesión normal; el callback no propaga un flag de un solo uso | criterio seguridad bajo |

---

## 5. Lista consolidada de decisiones que Barry debe tomar

Estas no son código — son acuerdos que destraban al equipo. En orden de impacto:

1. **Disciplina de migraciones** (P0.1): quién aplica y cómo, + chequeo de paridad en CI. *(La migración fantasma `20260617180000` que disparó esto ya se resolvió en `5a1cac5`.)*
2. **Barrido de casts `as unknown`** (P0.2) + **atar `gen types` al CI** (P0.3): convierte el drift tipos↔BD en error de compilación. *(El regen inicial de `database.ts` ya se hizo en `5a1cac5`.)*
3. **Mecanismo de `notificaciones`** (P1.1): una decisión destraba RF-33/35/39/ADM-4/2.8.
4. **Scheduler `pg_cron`** (P1.2): cierre/vencimiento automático; atado al estado destino del enum.
5. **RPC transaccional de adjudicación** (P1.3): atomicidad de la costura central.
6. **Trigger de transición de `proyectos`** (P1.4) + estado destino del enum (`listo_para_revision`/cierre).
7. **`auditoria` como bitácora central + dónde vive el motivo** (P1.5): ADM-3/ADM-4.
8. **Convención de `catch` con `unstable_rethrow`** (P2.1): aplicar a los 25 sitios.
9. **Fuente del padrón de egresados** (P3.1): tabla local vs API, o riesgo aceptado firmado.
10. **Algoritmo de score de matching** (P3.2) y **alcance de supresión de datos** (P3.3).
11. **Resiliencia + gobernanza de la IA** (P2.4): degradación manual, evals, documentar la dep `openai`.

---

## 6. Verificación al cerrar (DoD)

Para cualquier item que Barry cierre: `npm run typecheck` exit 0 · `npm run lint` sin errores · `vitest run`
verde · textos en `es.json` + `en.json` · si tocó BD, migración versionada en `supabase/migrations/` con RLS +
policies y aprobación de Samir (protocolo `CLAUDE.md`). Para P0.1 (paridad de migraciones), P1.1, P1.2, P2.2 hace falta **confirmar en la
BD remota** (solo lectura primero). Para P2.1 hace falta **`next start` + abrir las 3 páginas del marketplace**.

---

## 7. Apéndice — lo verificado como YA RESUELTO (no rehacer)

| Área | Estado en HEAD `a6646d2` |
|---|---|
| **P0.1 orig — migración fantasma `20260617180000`** | **Resuelto (`5a1cac5`).** Recreada verbatim desde `schema_migrations` (era la v2 "sobre cerrado"); repo en paridad con la BD sin tocarla. **La UI del sobre ya quedó cableada** (`3f97a28`): `ParticipationsPanel` pinta la tapa con los 3 booleanos para `enviada` y revela el contenido al abrir (`revisar`→`en_revision`); el sello es real a nivel de RPC. **Ojo:** el merge `3f97a28`+`5a1cac5` duplicó el tipo del RPC (14 `TS2300`) — corregido en `a6646d2` (`a6646d2`). |
| **P0.2 orig — drift de tipos** (`ratings.ts`, `soporte_tickets`, RPC v2) | **Resuelto (`5a1cac5`).** `database.ts` regenerado contra la BD; embed `empresarios` ambiguo hinteado; +2 errores `tsc` pre-existentes; `tsc` exit 0. |
| Postulación egresado (RF-27/29/31/32) | **Real.** `lib/applications/{actions,queries}.ts`: INSERT en `participaciones`, `retirarPostulacion`, `getMisPostulaciones` por `id_estudiante`, 7 estados mapeados e i18n. **+ estado efectivo** derivado en lectura (`computeEstadoParticipacionEfectivo`, `project-detail-logic.ts:136-156`) consumido por `getMisPostulaciones/Stats` y `PostulacionCard`; la columna real no se muta (`3f97a28`, RF-32). |
| Cuelgue `getUser()` cliente | **Resuelto.** `junior/applications` es Server Component; `getMisPostulaciones` server-side. |
| Perfil + verificación de empresa (RF-16/17, ADM-1 empresas) | **Real.** `saveCompanyProfile` upsert, upload de logo a bucket, `verificarEmpresa`/`rechazarEmpresa` con `service_role`, `admin/companies` redirige a flujo real. |
| Publicar proyecto (RF-19/20/21/22/23) | **Real.** RPC `publicar_proyecto` atómico (INSERT proyecto + 2 puentes N:M); plazo derivado de fechas; catálogos reales. |
| Agente IA (RF-54/55/56/57/58/59/60) | **Real.** Chat + 3 actions + LLM vía OpenRouter; gate de tokens por verificación; persistencia append-only. |
| Entregables (RF-40/41/42/43/44) | **Real.** Subir hito/final, versionado `max+1`, descarga con signed URL + ownership, aprobar/cambios. |
| Adjudicación camino feliz (RF-37) | **Funciona** (respeta máquina de estados); pendiente solo atomicidad (P1.3). |
| Verificación de egresados (productor `estado_verificacion`) | **Real.** `setGraduateVerification` con `service_role` + consentimiento RNF-38. |
| `env.ts`/`env.server.ts` con Zod | **Real y adoptado.** 0 `process.env.X!` crudos; `service_role` por `serverEnv` + `server-only`. |
| Bug `getPendingUsers` | **Resuelto.** 10 queries admin usan `requireRole('administrador')` vía `normalizeRole`. |
| `comentario_empresario` (bomba runtime) | **Resuelto.** Migración `ADD COLUMN IF NOT EXISTS` commiteada; `database.ts` coincide. |
| Rename `cedula_juridica → cedula` | **Resuelto.** Migración `20260614000006` aplicada; código alineado. |
| RF-03 lockout atómico | **Resuelto.** RPC `register_failed_login` (UPDATE de una sentencia) + REVOKE a `authenticated`. |
| Higiene TS | **Limpia.** Sin `any` real, sin `@ts-ignore`; `console.log` solo en `lib/logger`. |

---

## 8. Límites de esta auditoría (honestidad)

- Todo lo `[Seguro]` tiene evidencia `archivo:línea`, **re-anclada a HEAD `a6646d2`** (18-jun) tras el merge de
  `3f97a28`; la auditoría original fue contra `5029e23`, contraverificada adversarialmente.
- La BD remota se consultó **solo lectura** vía MCP el 2026-06-17 (autorizado por el dueño). No se ejecutó
  ninguna escritura ni migración.
- **No se levantó la app:** las afirmaciones de runtime (marketplace vacío en prod P2.1, funnel tardío sin datos)
  están marcadas `[Verificar]` / `[Probable]`. El cierre de cada una exige `next start` o un E2E manual.
- `tsc --noEmit` **se corrió y pasa (exit 0)** en `a6646d2`: el merge `3f97a28`+`5a1cac5` había duplicado el
  tipo del RPC (14 errores `TS2300`), ya corregido. Higiene TS confirmada por `tsc`, no solo por ausencia de
  `any`/`@ts-ignore`. Pendiente runtime: P2.1 (`next start`) y el funnel tardío.
- La priorización P0–P4 es criterio de esta auditoría; ajústenla según qué penaliza el jurado y qué bloquea la
  demo.
