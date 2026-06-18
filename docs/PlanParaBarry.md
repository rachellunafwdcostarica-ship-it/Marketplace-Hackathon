# Plan para Barry — tareas técnicas duras del Marketplace FWD

> **Para:** Barry (Project Manager técnico). **De:** auditoría re-verificada contra el código vivo.
> **Fecha:** 2026-06-18 (re-anclado a HEAD `e62c6f9`) · **Rama:** `samir`. Base original `5029e23`.
> Entre el ancla anterior (`a6646d2`) y hoy entraron **21 commits**, entre ellos: `d143c59` (postulación
> rehecha: el **prototipo ahora son enlaces URL**, no upload de archivo), `74ccf18` + migraciones
> `20260618000000`/`20260618120000` (integridad de `evaluaciones_empresarios` restaurada + topes/CHECKs en
> `participaciones`), `e39ee65` (correo de aprobación vía Gmail SMTP, deps `nodemailer`+`resend`) y merges de
> fressia/errol (onboarding empresario, registro sin verificación de correo). Todas las citas `archivo:línea`
> de esta versión están **re-ancladas a `e62c6f9`** y re-verificadas el 18-jun (12 agentes + BD remota por MCP
> solo lectura).
> **Propósito:** que Barry tome **lo difícil de verdad** — deuda de infraestructura, bombas de runtime y
> decisiones de arquitectura transversales — y deje el wiring de módulo a cada responsable.

---

## Glosario rápido (para un PM externo)

- **Quién es quién (dueños de módulo):** **Samir** = dueño de BD/Auth (toda migración pasa por él) · **Errol** =
  proyectos, agente IA, marketplace · **Rachel** = portafolio del egresado · **María del Sol** = admin ·
  **Rony** = company/ratings · **Fressia / Santiago** = flujo de calificación.
- **Códigos `RF-XX` / `ADM-X` / `RNF-XX`:** requisitos del `SRS_Plataforma_Talento_FWD` (fuente funcional). Si
  necesitás priorizar por requisito, abrí el SRS en paralelo.
- **Hashes (`e62c6f9`, `d143c59`…):** commits de git; sirven para ubicar cuándo entró cada cambio.
- **Etiquetas de confianza:** **[Seguro]** = verificado archivo:línea en HEAD `e62c6f9` · **[Probable]** =
  inferencia sólida · **[Verificar]** = requiere confirmar en runtime/SQL.

---

## 0. La verdad incómoda primero

**Las cinco auditorías de `docs/auditorias/` describen un repo que ya no existe.** Están fechadas entre el
12 y el 17 de junio sobre ramas anteriores (`samir@7fc3818`, `errol@a60b8e1`). Desde entonces se mergeó casi
todo el trabajo de producto. Si alguien le entrega a Barry esas auditorías tal cual, le da **una lista con
tareas ya hechas**.

Por eso este documento **no copia** las auditorías: re-verifica hallazgo por hallazgo contra el código actual
(`e62c6f9`) con verificación adversarial — cada item marcado "abierto" se intentó refutar buscando si ya se
había resuelto en alguna rama. Método: 12 agentes de re-verificación por área + contraverificación adversarial
+ consulta a la **BD remota por MCP (solo lectura)** + re-corrida de `tsc`.

**Números del barrido (orientativos, del audit original):** 119 hallazgos evaluados · 62 confirmados abiertos ·
31 de nivel "Barry" + 11 huecos nuevos. *(Nota honesta: estos totales no mapean 1:1 con los ~25 ítems P0–P4
listados abajo; tómalos como magnitud, no como índice.)*

### Lo que YA está resuelto (no lo toquen — detalle en §7)
Postulación real (`lib/applications`, ahora con **prototipo por enlaces URL**), perfil + verificación de
empresa, agente IA con LLM + gate de tokens, publicación de proyecto por RPC atómico, entregables
(subir/versionar/firmar/aprobar), verificación de egresados (productor `estado_verificacion`),
`env.ts`/`env.server.ts` con Zod adoptados, bug `getPendingUsers` (`'admin'` vs `'administrador'`), cuelgue de
`getUser()` en `junior/applications`, `comentario_empresario` (columna materializada), rename
`cedula_juridica → cedula`. **Sin `any` real, sin `@ts-ignore`** (la afirmación "console.log solo en logger"
del audit viejo **ya no es cierta** — ver P4 y §7).
**+ (commit `5a1cac5`):** migración fantasma `20260617180000` reconciliada y `database.ts` regenerado — cierra
los **P0.1 y P0.2 originales** (detalle en §7).
**+ (merge `3f97a28`, Errol):** ofertas en **sobre cerrado** + **estado efectivo** de participación derivado en
lectura (RF-34/RF-32).
**+ (`d143c59`, 18-jun):** el **prototipo de postulación pasó a ser enlaces URL** (1..4), documentación técnica
como URL; respaldado por CHECK en BD (`20260618000000`). **Esto invalida por completo el viejo item de "upload
de prototipo roto"** (ver P4).
**+ (`74ccf18` + `20260618120000`, 18-jun):** integridad de `evaluaciones_empresarios` restaurada
(`id_contratacion` vuelve a `NOT NULL`, RLS exige `estado_periodo='finalizado'`); `ratings.ts` ahora rechaza
calificar sobre `vigente`. **Cierra el "agravante" de P2.3** (queda solo el bug del trigger).

### Cómo leer las prioridades
- **P0 — Infra que sangra ya.** Bloquea el flujo de trabajo del equipo o revienta en producción con datos reales.
- **P1 — Decisiones transversales.** *Una* decisión de Barry destraba 3–5 RF a la vez. El mayor apalancamiento.
- **P2 — Riesgos técnicos y de seguridad.** No bloquean hoy, pero son trampas que escalan.
- **P3 — Features con criterio senior.** Requieren decidir antes de codear (algoritmo, fuente de datos, alcance).
- **P4 — Higiene mecánica.** No es de Barry; se lista para que no se pierda y se delegue.

> **Sobre "independencia":** este documento está diseñado para que Barry tome **lo transversal**, que es
> coordinación por definición. **Casi ninguna tarea es 100% independiente.** Si lo que se busca es un set que
> Barry haga **sin coordinar con nadie**, ese subconjunto (pequeño) vive en el documento aparte
> **`docs/Barry-Tareas-Independientes.md`**. Aquí cada item lleva su línea honesta de "Dependencias /
> coordinación".

---

## P0 — Infraestructura que sangra ya

> **Los P0.1 y P0.2 originales (drift inverso de migraciones + drift de tipos) ya están RESUELTOS** en el
> commit `5a1cac5` (ver §7). Se reconcilió el repo con la BD (sin tocarla) y se regeneró `database.ts`.
> **Esos dos slots se reemplazan abajo por tareas que siguen abiertas.**

### P0.1 · Blindar el flujo de migraciones — que la "migración fantasma" no se repita
**[Seguro]** La causa raíz de la migración huérfana `20260617180000` fue **aplicar DDL al remoto sin
commitear el `.sql`**. El síntoma se arregló (`5a1cac5`), pero **el hábito sigue vivo**: nada impide que mañana
alguien vuelva a desincronizar git↔BD. De hecho la deriva ya creció: hoy hay **37 migraciones** (no 35), con
`20260617120000`, `20260617130000`, `20260618000000` y `20260618120000` agregadas tras el ancla anterior.

- **Por qué es de Barry:** es disciplina de infraestructura del equipo, no un bug de módulo. Una sola
  migración aplicada "a mano" al remoto vuelve a bloquear `db push`/`reset` de todos.
- **Qué dejar montado:**
  1. **Regla escrita** (en `CLAUDE.md`/`README`): ninguna migración se aplica al remoto sin su `.sql`
     commiteado primero; `apply_migration` por MCP queda **prohibido** sobre el proyecto remoto compartido.
  2. **Chequeo de paridad en CI** (se engancha con P0.3): un step que corra el equivalente a
     `supabase migration list` y **falle si hay versiones remote-only**.
  3. **Un solo dueño de BD** (Samir) y un flujo explícito PR → merge → apply.
- **Acción `[Verificar]`:** diff completo `migration list` (remoto) vs `supabase/migrations/` (local).
  Verificado el 18-jun por MCP: **local = remoto = 37**, sin remote-only. Pero nada lo vigila.
- **Dependencias / coordinación:** **NO independiente.** Es una convención que obliga a todos → hay que
  **acordarla con el equipo**, en especial **Samir**. Toca archivos **compartidos** (`CLAUDE.md`/`README`); el
  step de CI vive en `.github/` (nuevo); el `[Verificar]` necesita lectura de la BD remota (Samir). *(El script
  greenfield de paridad sí es recortable a tarea independiente — ver doc aparte.)*

### P0.2 · Barrido de casts `as unknown` que ocultan drift tipos↔BD
**[Seguro]** El patrón `resultado_de_query as unknown as {...}` **anula el typecheck de nombres de columna y de
relaciones**. Grep de `as unknown as` en `src` = **18** matches, de tres familias:
- **9 casts de resultado de query (peligrosos):** `ratings.ts:74,263`, `publish.ts:131`,
  `portfolio/actions.ts:74,83,97`, `dashboard.ts:113`, `admin/queries.ts:471,685`.
- **6 `as unknown as Json`** para columnas `jsonb` (`proposal.ts:184,185,187,237`, `chat.ts:127`,
  `projects/actions.ts:287`) — patrón **aceptado** de Supabase, **no se tocan**.
- **3 en `persistence.ts:7,13,20`** (`jsonb` a shape tipado **tras** un `Array.isArray`/`typeof` guard) —
  también aceptables.

- **Por qué es de Barry:** distinguir el cast legítimo (`jsonb`) del peligroso (resultado de query con shape a
  mano) requiere criterio. `ratings.ts:263` quedó con su cast aunque se corrigieron los nombres → primer candidato.
- **Qué dejar montado:** por cada cast de resultado de query, revalidar contra los tipos regenerados y
  **quitar el cast usando el embed tipado**, hinteando el FK donde haya ambigüedad
  (`empresarios!empresarios_id_usuario_fkey`): **toda tabla con 2 FK a otra** necesita el hint.
- **Acompaña:** una regla de PR/lint que marque `as unknown as` **sobre el cliente Supabase** como *smell* a
  revisar (no prohibir: `jsonb` lo necesita).
- **Dependencias / coordinación:** **toca archivos de ≥4 dueños [Probable]** — `publish.ts`/`dashboard.ts`
  (Errol), `portfolio/actions.ts` (Rachel), `admin/queries.ts` (María del Sol), `ratings.ts` (Rony). No toca
  BD. Hacerlo como **PRs chicos por módulo, revisados por su dueño**.

### P0.3 · No existe CI/CD — el DoD no se puede garantizar
**[Seguro]** `Glob '.github/**'` = sin archivos. `package.json` define `lint`/`typecheck`/`test` pero
**ningún workflow los corre**. Husky pre-commit existe (`.husky/pre-commit → npx lint-staged`) pero no
sustituye un gate server-side. **Evidencia de que hace falta:** `tsc --noEmit` en un checkout sin `npm install`
hoy **falla** con 2 errores `TS2307` (`nodemailer`/`resend` en lockfile pero sin instalar) — un CI con
`npm ci` lo habría atrapado.

- **Por qué es de Barry:** sin CI, los drifts de tipos, los `catch`-swallow (P2.1) y cualquier regresión
  **llegan a `dev` sin freno**. El DoD (`reglas.md §11`, brief §6.5) exige "TS compila + ESLint pasa + tests"
  por feature; hoy depende de revisión manual. **Es la pieza que vuelve verificable todo lo demás.**
- **Acción de raíz:** workflow de GitHub Actions (`typecheck` + `lint` + `vitest run` + `next build`) como
  **required check** sobre PRs a `dev`. Incluir el chequeo de paridad de migraciones (P0.1) y un check de
  drift de `gen types`.
- **Atar aquí:** quitar `--passWithNoTests` de `package.json:16` (ya hay **13 archivos de test / ~134 casos**)
  y agregar `coverage` con thresholds en `lib/` (reglas piden 50% deseado). `vitest.config.ts` hoy no tiene
  bloque `coverage` ni `thresholds`.
- **Dependencias / coordinación:** el **núcleo carvable** (un workflow **no-bloqueante**) es de las pocas tareas
  independientes (ver doc aparte). Pero **volverlo *required* bloquea los PRs de todos** → **acordarlo con el
  equipo**; el step de paridad/`gen types` necesita que Samir confirme el comando. **No lo llamamos "la más
  independiente" — un required-check no lo es.**

---

## P1 — Decisiones transversales (una decisión destraba varios RF)

> Estas son el **mayor apalancamiento de Barry**: no son "implementá X", son "decidí el contrato y el resto del
> equipo lo cablea". Mientras no se decidan, cada módulo improvisa el suyo y choca. **Ninguna es independiente.**

### P1.1 · Mecanismo de escritura en `notificaciones` — destraba RF-33, RF-35, RF-39, ADM-4 y la etapa 2.8
**[Seguro]** La tabla `notificaciones` tiene índice (`20260608000005:28`) y RLS, pero **solo policies SELECT y
UPDATE — no INSERT** (`20260610212418:458-467`; confirmado en BD remota: 0 policies INSERT). **Cero productores
en todo el repo:** grep de `insert into notificaciones` en `supabase/` = 0; `.from('notificaciones').insert`/
`.rpc(...notif)` en `src/` = 0; no existe `supabase/functions/`. Hoy `adjudicarParticipacion` marca
`no_seleccionada` **sin notificar** (`project-detail.ts:459-474`); el Bell del Navbar es un punto estático
hardcodeado (`Navbar.tsx:253`).

- **La decisión (una sola):** trigger `SECURITY DEFINER` que inserta en cada transición de estado **vs.**
  inserts vía `service_role` desde server actions **vs.** `pg_cron`/Edge. Recomendación del barrido:
  **`service_role` desde las actions** para los eventos, y `pg_cron`/Edge **solo** para avisos por tiempo
  (P1.2). **No** abrir una policy INSERT.
- **Congelar el contrato de la fila `notificaciones` antes** de que cada módulo improvise. `DEPENDENCIAS-SAMIR.md`
  ya lo marca como decisión §13.4 pendiente de todo el equipo.
- **Dependencias / coordinación:** **decisión de TODO el equipo** (es el contrato que cada módulo consume) +
  **Samir** (BD). El *core* (un `lib/notifications/` productor) es greenfield que Barry escribe; los consumidores
  lo cablean después.

### P1.2 · Scheduler temporal (cierre/vencimiento automático) — RF-33 y RF-35
**[Seguro]** No hay productor temporal: `supabase/functions/` no existe, grep `pg_cron|cron.schedule` = 0, no
existe `vercel.json`. El vencimiento **solo se chequea de forma reactiva** al postular
(`applications/actions.ts:87-88`, rechaza `plazo_vencido` dentro de `postularse`). El cierre de estado al vencer
(RF-35) hoy es **derivación perezosa en lectura** (`project-detail-logic.ts:14-21` deriva `en_evaluacion`; la
columna sigue `'abierto'`).

- **Por qué es de Barry:** sin scheduler, un proyecto vencido **queda `'abierto'` indefinidamente en BD** aunque
  la UI lo oculte → rompe la consistencia de la máquina de estados (RF-25) y las stats del admin.
- **Atado a P1.4:** el estado destino "recepción cerrada" **no existe en el enum** (ver P1.4). No meter cron sin
  decidir antes el estado destino.
- **Acción:** habilitar `pg_cron` y agendar una función que transicione proyectos vencidos e inserte la
  notificación de vencimiento (vía P1.1). Para RF-33: job diario que avise a egresados con postulación
  `enviada`/`en_revision` en proyectos con `fecha_cierre` dentro de 24h.
- **Dependencias / coordinación:** **Samir** (habilitar `pg_cron`/función en BD) + la decisión de estado-destino
  del enum (atada a **P1.4**, con Fressia). Archivos **nuevos**, pero **no carvable**: sin estado-destino y sin
  `pg_cron` no se puede validar ni mergear solo.

### P1.3 · Atomicidad de la adjudicación — el nodo que sostiene media plataforma
**[Seguro]** `adjudicarParticipacion` (`project-detail.ts:393-490`) hace **3 UPDATEs secuenciales sin
transacción**: ganador→`contratada` (`446-449`, dispara `trg_crear_contratacion`), batch resto→`no_seleccionada`
(`459-464`), proyecto→`adjudicado` (`476-479`). Si falla un paso intermedio, devuelve `'adjudicacion_parcial'`
(`473`/`486`) **sin mecanismo de reconciliación** (el "admin recupera" del JSDoc no existe).

- **Por qué es de Barry:** es la **costura que desbloquea toda la cadena** adjudicación→contratación→entregables
  →evaluación→reputación. Una adjudicación a medias bloquea entregables (`deliverables/queries.ts:139` filtra
  `estado='contratada'`) y deja participaciones huérfanas. El flujo *funciona* en el camino feliz, pero la
  no-atomicidad es una bomba de consistencia.
- **Acción de raíz:** mover los 3 UPDATEs a un **RPC `SECURITY DEFINER` transaccional** (una función Postgres,
  todo-o-nada). Elimina el estado `'adjudicacion_parcial'`. Requiere migración → coordinar con Samir.
- **Dependencias / coordinación:** **Samir** (la migración del RPC) + **Errol** (el refactor cae en su
  `project-detail.ts`). No independiente: el RPC y el call-site son una sola unidad atómica.

### P1.4 · Máquina de estados del proyecto sin red dura en BD — RF-24 y RF-25
**[Seguro]** El guard de transiciones del proyecto vive **solo en TS**: la tabla `PROJECT_FORWARD_TRANSITIONS`
(`project-detail-logic.ts:37`) + `canAdvanceProject` (`:57-63`) + `setProjectEstado`
(`project-detail.ts:124-186`). La BD **no valida**: el único trigger de transiciones es
`validar_transicion_participacion` (sobre `participaciones`, `20260611161414:33-65`); **ninguno sobre
`proyectos`**. El propio código lo admite (`project-detail-logic.ts:25-26`: "La BD NO valida transiciones de
proyecto").

- **Consecuencia:** cualquier `service_role` (p. ej. `admin/project-actions.ts`) o cualquier UPDATE que no pase
  por `setProjectEstado` **se salta la máquina**.
- **RF-24 (editar solo no adjudicados) está ABIERTO de cero:** no existe ruta de edición ni action
  `editarProyecto` (verificado por grep); la policy `proyectos_update_own` (`20260610212418:159-173`) no
  condiciona por estado.
- **Acción de raíz:** trigger `validar_transicion_proyecto BEFORE UPDATE OF estado ON proyectos` (espejo del de
  participaciones, errcode 23514), cubriendo `borrador→abierto→(en_recepcion)→adjudicado→en_desarrollo→
  finalizado` y `cancelado` terminal. Mantener el guard TS para UX. Para RF-24: action `editarProyecto` que
  valide `estado IN ('borrador','abierto','en_recepcion')` **en action Y en BD**.
- **Decisión enlazada:** el enum tiene 7 estados (`20260608000001:89`) y **no** incluye `listo_para_revision`
  (RF-41) ni un estado de "recepción cerrada" (RF-35). **[Seguro]** Ningún código en HEAD consume
  `listo_para_revision` (solo aparece en docs), así que **no hay bomba de runtime hoy** — es un gap enum-vs-SRS.
  Decidir si el flujo entregable→revisión necesita el estado intermedio (`ALTER TYPE ... ADD VALUE`) o si
  `en_desarrollo→finalizado` ya cubre. No agregar "por si acaso".
- **Nota (post-`3f97a28`):** `computeEstadoParticipacionEfectivo` (`project-detail-logic.ts:136-156`) deriva el
  estado de la **participación** en lectura sin mutar la columna. Refuerza el mismo riesgo: el estado real en BD
  diverge de lo mostrado. Si entra el scheduler de P1.2, materializar **proyecto Y participación** consistentes.
- **Dependencias / coordinación:** **Samir** (trigger en BD) + **Errol** (`project-detail*.ts` y la ruta de
  edición de RF-24) + **Fressia** (decisión del estado-destino del enum, RF-35/41).

### P1.5 · Trazabilidad: `auditoria` sin escritor + motivo de suspensión/cancelación — ADM-3 y ADM-4
**[Seguro]** La tabla `auditoria` **no tiene un solo escritor** (`from('auditoria')` en `src` = 0; RLS sin
policy = deny-all, confirmado en BD remota). En paralelo: `deactivateUser` **no recibe ni persiste motivo**
(`admin/actions.ts:122,147-150`); **corrección al audit viejo:** la UI **ni siquiera captura** un motivo —
`AccountStatusActions.tsx:52-53` llama `deactivateUser(userId)` directo (grep `motivo|reason` = 0 en ese
componente). `cancelProjectAsAdmin` **recibe motivo pero solo lo loguea** (`project-actions.ts:61-79`, no
escribe `motivo_cancelacion` ni notifica).

- **Por qué es de Barry:** ADM-3, ADM-4 y "la capa de auditoría" son **una sola decisión de diseño**: dónde vive
  el registro inmutable de acciones admin (actor + target + acción + motivo).
- **Acción:** usar `auditoria` como **bitácora central** escrita por trigger `AFTER`/`service_role` en acciones
  admin. **Ojo:** el sistema de **strikes** ya tiene su propio historial con motivo (`strike-actions.ts:108` +
  `listStrikeAudit` en `queries.ts:801`) — no duplicar. Cerrar ADM-4 requiere además persistir
  `motivo_cancelacion` (la columna existe, `src/types/database.ts:229`) + notificar (depende de P1.1).
- **Dependencias / coordinación:** **Samir** (trigger/migración de `auditoria`) + **María del Sol** (cablear en
  sus acciones admin). Atado a **P1.1** para la notificación de ADM-4.

---

## P2 — Riesgos técnicos y de seguridad

### P2.1 · `catch`-swallow sistémico (DYNAMIC_SERVER_USAGE) — 25 catches sin `unstable_rethrow`
**[Seguro]** `grep unstable_rethrow` en `src` = **0**. El patrón `catch (e) { logger.error(...); return err(...) }`
que **se traga las señales de framework** vive en ~25 sitios: `marketplace.ts:95,130,174`;
`company/actions.ts` (6: `103,177,281,316,360,407`); `projects/actions.ts` (4); `projects/dashboard.ts` (2);
`projects/publish.ts` (1); `proposal-ai/{proposal,chat}.ts` (special-casan solo `AI_NOT_CONFIGURED`, no el
digest); y se **replicó a `portfolio/actions.ts` (6)** — deuda nueva post-auditoría.

- **El que potencialmente explota `[Verificar]`:** los 3 de `marketplace.ts` corren durante el prerender de
  `/marketplace`, `/junior/projects` y `/junior`. **Hipótesis (no probada):** podrían tragar
  `DYNAMIC_SERVER_USAGE` y servir el marketplace vacío en producción (`result.ok ? data : []` enmascara el
  fallo). **Esto NO está confirmado** — exige `next start` + abrir las 3 páginas. El resto son latentes hasta
  que alguien meta un `redirect()`/`notFound()` en un `try`.
- **Acción de raíz:** definir **convención de `catch` en server actions** (`unstable_rethrow(e)` como primera
  línea → mapear error real → log → `return err`) y aplicarla a los 25. `unstable_rethrow` es nativo de Next
  (`next/navigation`), no roza el stack §1. No usar `force-dynamic` en solitario.
- **Dependencias / coordinación:** los 25 catches viven en módulos de **varios dueños** → acordar el **patrón
  común** con el equipo y luego PRs por módulo. *(Definir la convención sí es greenfield independiente; aplicarla
  a los 25 no.)*

### P2.2 · Seguridad de BD (advisors) — auditar `SECURITY DEFINER` y activar protección de contraseñas
**[Seguro, vía MCP]** `get_advisors(security)`: **0 ERROR; 7 WARN** — las **6 funciones** `SECURITY DEFINER`
ejecutables por `authenticated` (`assign_my_role`, `get_my_account_status`, `get_my_role`,
`get_participaciones_de_proyecto`, `mis_proyectos_como_empresario`, `mis_proyectos_como_estudiante`) **+
`leaked_password_protection` desactivada**; 2 INFO (RLS sin policy en `auditoria` y `mensajes`). *(El audit viejo
decía "6 WARN / 5 funciones" — se contradecía; el conteo real es 7 WARN / 6 funciones.)*

- **Acción de criterio senior:** auditar cada `SECURITY DEFINER` para que filtre por `(select auth.uid())`
  interno — **en especial `assign_my_role`** (confirmar que no permita auto-escalar a `'administrador'`).
  Activar `leaked-password protection` en Auth (toggle del dashboard, sin migración). `auditoria`/`mensajes`
  deny-all es correcto por ahora.
- **Performance (menor):** la policy `evaluaciones_empresarios_insert_estudiante` quedó con `auth.uid()`
  **crudo**, no `(select auth.uid())` → re-evaluación por-fila (WARN `auth_rls_initplan` confirmado en remoto).
  **Corrección de procedencia:** la versión vigente fue **recreada por `20260618120000`** (revert, líneas 21 y
  27-28), no por la migración del 17-jun como decía el audit viejo. Fix de una línea en su `WITH CHECK`.
- **Dependencias / coordinación:** **Samir** casi todo (auditar funciones, toggle de Auth, migración del
  `initplan`). No toca módulos de app. *(El `.sql` del fix de initplan sí es greenfield que Barry escribe.)*

### P2.3 · Reputación: trigger `avg()` que no reacciona a DELETE (en AMBOS triggers)
**[Seguro]** `recalcular_reputacion` (`20260608000005:147-153`, estudiante) y `recalcular_reputacion_empresario`
(`20260617000000:43-58`, empresario) son `AFTER INSERT OR UPDATE OF puntuacion` **sin `DELETE`** y usan `NEW`
directo (confirmado en BD remota: `trg_reputacion` y `trg_reputacion_empresario`). **Borrar una evaluación nunca
recalcula el promedio.** El trigger nuevo del empresario (17-jun) **duplicó literalmente el bug**.

- **Corrección (lo que el audit viejo veía mal):** el "agravante de regla de negocio" (que `rateCompany`
  permitía calificar sobre `vigente`) **YA NO aplica**: `ratings.ts:85-86` exige `estado_periodo==='finalizado'`
  e `idContratacion` obligatorio (`74ccf18`), y la RLS fue revertida a `'finalizado'`
  (`20260618120000:29`). **Código y BD ya están alineados en `finalizado`** — la decisión "vigente vs finalizado"
  ya se cerró. **Lo único abierto de P2.3 es el bug del trigger.**
- **Acción:** una sola migración para ambos triggers: añadir `OR DELETE` y usar
  `COALESCE(NEW.id_estudiante, OLD.id_estudiante)` / `COALESCE(NEW.id_empresario, OLD.id_empresario)`. Cierra la
  cadena evaluación→reputación que ve el egresado al postular (RF-14, RF-51).
- **Dependencias / coordinación:** **Samir** (migración de ambos triggers). Toca BD. *(El `.sql` del fix es
  greenfield que Barry deja listo.)*

### P2.4 · Resiliencia y gobernanza del proveedor IA — y de las dependencias fuera del brief
- **Punto único de fallo [Seguro]:** el generador de propuestas (RF-54, **entrada de TODO el marketplace**)
  tiene un solo proveedor/key vía OpenRouter, 5 reintentos al mismo modelo, timeout 60s
  (`proposal-ai/provider.ts:23,35`). Si OpenRouter cae, **ningún empresario publica** y el fallo es silencioso.
  Decidir: camino de publicación **manual** (sin IA) como degradación, o documentar que la IA es dependencia dura.
- **Sin evals [Seguro]:** no hay test del agente; la única red es el banco manual
  (`docs/agente-casos-conversacion.md`, con una regresión conocida del 15-jun). Un set mínimo de evals
  deterministas evita "arreglar un caso y romper otros".
- **Gobernanza de dependencias [Seguro]:** **tres** deps fuera de la lista canónica del brief §8.2 sin registro
  en README: `openai ^6.42.0`, y **las nuevas `nodemailer ^9.0.1` + `resend ^6.14.0`** (`package.json:33`, feature
  de correo `e39ee65`). Reglas.md §1 exige justificar y documentar cada una. Además **drift de docs**:
  `README.md:39` cita el path viejo `src/lib/ai/` y vars `OPENAI_*` (el código vive en `src/lib/proposal-ai/`
  con vars `PROPOSAL_AI_*`); `.env.local.example:31` solo tiene drift de **path** (sus vars ya son
  `PROPOSAL_AI_*`). Alinear las docs.
- **Dependencias / coordinación:** **Errol** (dueño del agente IA) + **equipo** (aceptar/justificar las deps
  fuera del brief). Toca docs compartidos. *(Los evals como tests nuevos en `tests/` sí son greenfield.)*

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
halla la definición y el shim deprecado `StateContext.tsx`. **Ningún componente lo consume** (confirmado 0 en
`(company)`/`(admin)`).

- **Por qué Barry:** es transversal y desbloquea **borrar `DemoDataContext.tsx` + `StateContext.tsx` +
  `mockData.ts`** del repo, junto con el duplicado muerto `src/lib/supabase/projects.ts` (0 importadores).
- **Dependencias / coordinación:** de las **más independientes** (ver doc aparte). Solo tocar el layout `(app)`
  compartido pide una ventana sin conflicto de merge; el resto es aviso, no bloqueo.

### P2.7 · Auditoría de duplicación y code-health — el copy-paste como bomba de tiempo
El audit de este doc fue por **RF/feature**; **falta un barrido dedicado de duplicación / código muerto /
implementaciones divergentes**. Es criterio senior y transversal. (Ojo: "limpiar todo el código" sin criterio es
un pozo sin fondo — esta tarea se acota a **duplicación + bombas de tiempo**, con herramienta y atada a CI.)

- **Evidencia (punto de partida):**
  - `catch`-swallow **copiado 25×** (P2.1); bug del trigger de reputación **literalmente duplicado** (P2.3);
    casts `as unknown` repetidos (P0.2).
  - **[Seguro]** `src/lib/supabase/projects.ts` (`getProjects`/`createProject`/`updateProject`) **no tiene
    importadores** → duplicado **muerto** de `lib/portfolio/actions.ts`.
  - `StateContext.tsx` = re-export deprecado de `DemoDataContext` (0 consumidores); magic numbers 500/800
    duplicados (`MarketplaceClient.tsx:81-84` vs `ProjectFilters.tsx:133-135`); `"Marketplace FWD"` **2 veces**
    (`Navbar:184`, `Footer:18`) sin un `BRAND_NAME`; toasts/strings hardcoded (P4). *(El `_orphans/*` que citaba
    el audit viejo **ya no existe**; queda solo un comentario stale en `(admin)/admin/companies/page.tsx:7`.)*
- **Qué dejar montado (Barry hace el audit + los fixes):**
  1. Barrido con herramienta: `knip`/`ts-prune` + `jscpd`. **Son deps fuera del brief §8.2** → correrlas
     one-shot vía `npx` sin agregarlas a `package.json`.
  2. Por cada duplicación: **extraer a una única fuente** y borrar las copias. Por cada bomba latente,
     neutralizarla.
  3. **Atar a CI lo automatizable** (P0.3): `knip`, threshold de `jscpd`, `no-console`, smell de `as unknown`.
- **Dependencias / coordinación:** **transversal — toca casi todos los módulos** → PRs por módulo revisados por
  su dueño; la dedup de triggers puede tocar BD → **Samir**. *(El AUDIT de lectura — correr `knip`/`jscpd`
  one-shot — y borrar `projects.ts` muerto sí son independientes; los fixes por módulo no.)*

### P2.8 · Rename de ruta `/junior` → `/egresado` (coordinado, no unilateral)
**[Seguro]** El rol ya es `egresado` en BD desde el 09-jun (`20260609000005:16`); lo único "junior" que
sobrevive es la **ruta**. Verificado el 18-jun: la carpeta `(app)/junior/` existe y hay **28 referencias
`/junior`** en 15 archivos. **No requiere migración** — es puro routing.

- **Por qué es de Barry:** routing trivial pero con **alto costo de coordinación**. Todas las ramas referencian
  `/junior`, así que un rename unilateral en `samir` **traslada el conflicto a todos al rebasar**. El **timing**
  es decisión de PM.
- **Alcance (codemod determinista):**
  - `git mv` `src/app/[locale]/(app)/junior/` → `(app)/egresado/`.
  - `middleware.ts`: `PROTECTED_PREFIXES` (`:11`) + el regex de `getRouteRole` (`:47`).
  - hrefs restantes: Navbar, Footer, LandingHeroCtas, ProjectCard, `applications/page.tsx`.
  - `MOCK_JUNIOR_NAME` → `MOCK_EGRESADO_NAME` (`mockData.ts:9`) + comentario `roles.ts:8`.
  - **NO tocar** el "junior" de **nivel de experiencia** (`es/en.json`, prompt IA `provider.ts:104,115`) ni los
    comentarios históricos de migraciones. El codemod es seguro porque esos **no** llevan `/` adelante.
- **DoD específico:** `grep /junior` = **0**, las 4 rutas resuelven, el middleware guarda `/egresado`; +
  typecheck/lint/build verdes.
- **Dependencias / coordinación:** **NO independiente — el bloqueo es de TIMING.** Hacerlo en un punto donde
  **fressia/santiago/sol** puedan rebasar sin pelea. No toca BD.

---

## P3 — Features que requieren criterio senior antes de codear

### P3.1 · RNF-30 — cotejo de egresados sin fuente de verdad
**[Seguro]** Hoy `verificarEgresado` (`admin/actions.ts:98`) aprueba contra **juicio manual del admin +
consentimiento** (RNF-38, implementado y testeado: gate en `admin/actions.ts:54-65`, consentimiento del usuario
en `auth/actions.ts:146` `registrarConsentimientoCotejo`, `actions.test.ts:106`). Pero **no existe la tabla
padrón `egresados_fwd`** (verificado en BD remota: no existe; grep solo en
`docs/pedido-RNF30-cotejo-egresados.md`). El propio código lo admite (`GraduateVerificationActions.tsx:30`).

- **Riesgo de identidad:** cualquier persona aprobada manualmente pasa como egresado FWD. Define la confianza de
  toda la plataforma.
- **Decisión de producto+datos:** definir la **fuente** (tabla local `egresados_fwd` sembrada por FWD vs API de
  `jobs.fwdcostarica.com`), crearla con RLS (solo admin/`service_role`, por PII — RNF-35), índice por
  correo/cédula, y cotejo determinista server-side. **O** documentar que el MVP usa verificación manual asistida
  como **riesgo aceptado firmado**. No dejarlo implícito.
- **Dependencias / coordinación:** **externa a desarrollo** — el padrón lo tiene **FWD** y la tabla/datos los
  montan **Errol/Samir**. *(El ADR de la decisión sí es trabajo independiente de Barry.)*

### P3.2 · RF-61/RF-62 — recomendación y score de matching
**[Seguro]** Sin implementar (grep de `recomendar|matching|afinidad|score` = 0 algoritmo; `lib/marketplace/`
solo `.gitkeep`; el único "recomendados" es `junior/page.tsx:11-13`, un `slice(0,2)` sin lógica). RF-61
(recomendar egresados verificados por habilidades) es **solo SQL**: cruzar `proyecto_tecnologias` ×
`habilidades_tecnicas` de estudiantes con `estado_verificacion='verificado'`, ordenar por nº de coincidencias.
RF-62 (**score explicable**) es lo de criterio:

- **Decisión senior antes de codear:** ¿el score es solo intersección de tecnologías, o pondera nivel de
  habilidad / reputación / `proyectos_completados`? El SRS pide "EXPLICABLE". Implementar como **función pura en
  `lib/marketplace/` con tests Vitest** (reglas §10). RF-62 depende de RF-61 para el conjunto candidato.
- **Dependencias / coordinación:** de las **más independientes** — función pura **nueva en `lib/`** (greenfield +
  Vitest) sobre tablas existentes (sin migración). Solo coordina al **mostrar** el resultado (Errol). **El
  algoritmo + tests es el entregable independiente de Barry** (ver doc aparte).

### P3.3 · RNF-35/37 — datos personales y derecho de supresión sin dueño
**[Seguro]** No hay self-service de borrado/exportación para el titular. **Corrección:** no existe `deleteUser`
en el repo (grep = 0); lo único administrativo es `deactivateUser` (soft-delete `is_active→false`,
`admin/actions.ts:122`) + suspensión por strikes. RNF de cumplimiento (Ley 8968) **sin responsable**.

- **Decisión senior (retención legal vs integridad referencial):** no se puede borrar a secas una contratación
  cerrada. Definir alcance MVP: server action de auto-supresión que **anonimice** `usuarios` con cascada
  controlada respetando FKs (`contrataciones`/`evaluaciones`), + exportación del propio perfil.
- **Dependencias / coordinación:** **Samir** (la anonimización toca FKs de todo el modelo) + decisión
  **legal/producto**. *(La exportación read-only del propio perfil sí es carvable a greenfield.)*

### P3.4 · RF-14 — historial del egresado con calificación
**[Seguro]** `getStudentProfile` (`portfolio/actions.ts:30`) no lee `evaluaciones`/`reputacion` (grep en
`lib/portfolio` = 0). **Trampa verificada:** la migración `20260617000000_evaluaciones_empresarios.sql` es la
**dirección inversa** (el egresado califica al empresario); **no** satisface RF-14 (empresa califica al egresado,
tabla `evaluaciones` / `estudiantes.reputacion`).

- **Acción:** definir el contrato de lectura del portafolio (promedio `estudiantes.reputacion` + proyectos
  contratados con su nota de `evaluaciones.puntuacion`) y **stubbear con seed** para no bloquearse esperando el
  flujo de calificación. Depende de P2.3.
- **Dependencias / coordinación:** **Rachel** (es su `getStudentProfile`) + depende del flujo que puebla
  `evaluaciones` (**Fressia/Santiago**).

### P3.5 · Decisiones menores con criterio (delegables con guía)
- **RF-15 CV/portafolio a PDF (prioridad C):** **no** meter `jspdf`/`react-pdf` a la ligera (brief §8.2). Camino
  sin dependencia: vista print-only + `@media print` + `window.print()`. Si se quiere PDF server-side, justificar
  por escrito antes.
- **RF-26 búsqueda/filtrado (<1s):** la fuente **ya es Supabase real**, pero el **filtrado sigue 100% en cliente**
  (`MarketplaceClient.tsx:54-101`), con dimensiones equivocadas (`duration` opera sobre el literal `'1 mes'`
  hardcodeado de `marketplace.ts:53`) y un `setTimeout(400)` de loading falso. Reescribir como filtros
  server-side. Es retrabajo, no ajuste.
- **Mensajería (`mensajes`):** RLS habilitado **sin policies** = deny-all (confirmado en BD remota). Confirmar si
  es V2 o entra al MVP antes de tocar.
- **Dependencias / coordinación:** cada sub-ítem es de su dueño — RF-15 → **Rachel**, RF-26 → **Errol**;
  **Mensajería** es decisión de alcance del **equipo**. De Barry, sobre todo el criterio de la dependencia PDF.

---

## P4 — Higiene mecánica (NO es de Barry; delegar al responsable del módulo)

Se lista para que no se pierda. Cada item es trabajo de un dev de módulo, no senior:

| Item | Evidencia | Regla |
|---|---|---|
| **RF-28/30 prototipo — RESUELTO por rediseño (`d143c59`)** | El upload a Storage **ya no existe**. El prototipo ahora son **enlaces URL** (`prototipo_enlaces: string[]`, validado en `applications/actions.ts:20-23,97`; el form arma el array en `ApplyProjectClient.tsx:120-127`) y la documentación es una URL opcional. Respaldado por CHECK `cardinality 1..4` en BD (`20260618000000:49-50`). **Los 3 defectos del audit viejo (subir antes del INSERT, path plano, `getPublicUrl` en bucket privado) ya no aplican.** *Residual menor:* el bucket `prototipos` y su RLS quedan **sin uso en este flujo** → verificar si otro flujo los usa o documentarlos como no usados. | (resuelto / verificar bucket huérfano) |
| RF-27 manejo de errcode roto | `applications/actions.ts:103` filtra por `'P0001'`/`includes('cupo')`; el trigger lanza `23514` + `'Cupo'` (mayúscula). No captura `23505`/`23514`/`42501`. (`project-detail.ts:24` solo maneja `23514`.) | (funcional) |
| `CreateStrikeButton.tsx` | `:61` `t` sin usar **+ ~10 strings hardcoded en español** (`:96,109,113,116,129,137,140,153,171,237`) | §4 i18n |
| Landing stats inventadas | `page.tsx:107-129` pinta `+500`/`+1,200`/`+150` desde i18n (`es.json:69,71,73`) como reales | §13 / portada pública |
| `/showcase` sin gatear | `showcase/page.tsx` con datos sample, alcanzable por URL en producción | datos falsos a revisor |
| Navbar | `:253` punto de notificación falso siempre encendido; `:288` avatar enlaza a `/empresario/perfil` para **todos** los roles | bug nav |
| `console.log` en `PortfolioManager` | `:159-160` loguea `fullName`+`id_usuario`; el `useEffect` `:156-162` no hace nada más. **Contradice la afirmación "console.log solo en logger".** | §8 |
| TODO sin ticket | `marketplace.ts:53` `// TODO:` no conforme + `'1 mes'` magic string | §8 |
| `calificacion_prototipo` sin CHECK | `participaciones` ganó 4 CHECKs en `20260618000000` pero **ninguno** sobre `calificacion_prototipo` (verificado en BD remota); falta `ADD CONSTRAINT ... BETWEEN 1 AND 5` | defensa en profundidad |
| Strings de toast hardcoded | `PortfolioManager.tsx` ~9 toasts en español sin claves i18n | §4 |
| Zod en frontera (portafolio) | `saveStudentProfile` (`portfolio/actions.ts:150`)/`savePortfolioProject` (`:289`) no re-validan con Zod server-side (solo el form) | §5 |
| `lib/marketplace/` vacía | solo `.gitkeep`; la lógica vive en `lib/projects/marketplace.ts` — borrar o documentar | confusión de naming |
| `reset-password` `getSession()` en montaje | `:50-55` auth en cliente; **no se cuelga** (sesión ya en cookie vía PKCE), pero viola §1/§8 → migrar a `onAuthStateChange` | §1/§8 |
| Archivos 0 bytes | `SkillPicker.tsx`, `PortfolioCard.tsx` (resueltos con SkillForm inline) — borrar | §8 |
| RF-04 sesión recovery | `reset-password` no distingue sesión `recovery` de sesión normal; el callback no propaga un flag de un solo uso | criterio seguridad bajo |

---

## 5. Lista consolidada de decisiones que Barry debe tomar

Estas no son código — son acuerdos que destraban al equipo. En orden de impacto:

1. **Disciplina de migraciones** (P0.1): quién aplica y cómo, + chequeo de paridad en CI. Hoy hay **37**
   migraciones (local = remoto), pero nada lo vigila.
2. **Barrido de casts `as unknown`** (P0.2) + **atar `gen types` al CI** (P0.3): convierte el drift tipos↔BD en
   error de compilación.
3. **Mecanismo de `notificaciones`** (P1.1): una decisión destraba RF-33/35/39/ADM-4/2.8.
4. **Scheduler `pg_cron`** (P1.2): cierre/vencimiento automático; atado al estado destino del enum.
5. **RPC transaccional de adjudicación** (P1.3): atomicidad de la costura central.
6. **Trigger de transición de `proyectos`** (P1.4) + estado destino del enum.
7. **`auditoria` como bitácora central + dónde vive el motivo** (P1.5): ADM-3/ADM-4.
8. **Convención de `catch` con `unstable_rethrow`** (P2.1): aplicar a los 25 sitios.
9. **Fuente del padrón de egresados** (P3.1): tabla local vs API, o riesgo aceptado firmado.
10. **Algoritmo de score de matching** (P3.2) y **alcance de supresión de datos** (P3.3).
11. **Resiliencia + gobernanza de la IA y las deps fuera del brief** (P2.4): degradación manual, evals,
    documentar `openai` + `nodemailer` + `resend`.

---

## 6. Verificación al cerrar (DoD)

Para cualquier item que Barry cierre: `npm run typecheck` exit 0 (tras `npm ci` — ver §8) · `npm run lint` sin
errores · `vitest run` verde · textos en `es.json` + `en.json` · si tocó BD, migración versionada en
`supabase/migrations/` con RLS + policies y aprobación de Samir (protocolo `CLAUDE.md`). Para P0.1 (paridad), P1.1,
P1.2, P2.2 hace falta **confirmar en la BD remota**. Para P2.1 hace falta **`next start` + abrir las 3 páginas del
marketplace**.

---

## 7. Apéndice — lo verificado como YA RESUELTO (no rehacer)

| Área | Estado en HEAD `e62c6f9` |
|---|---|
| **P0.1 orig — migración fantasma `20260617180000`** | **Resuelto (`5a1cac5`).** Recreada verbatim desde `schema_migrations`; repo en paridad con la BD (37 = 37, verificado por MCP). La UI del sobre quedó cableada (`3f97a28`). |
| **P0.2 orig — drift de tipos** | **Resuelto (`5a1cac5`).** `database.ts` regenerado; embed `empresarios` ambiguo hinteado. *(Quedan los casts de P0.2 como deuda aparte.)* |
| **Postulación egresado (RF-27/29/31/32)** | **Real.** `lib/applications/{actions,queries}.ts`: INSERT en `participaciones`, `retirarPostulacion`, `getMisPostulaciones`. **+ prototipo por enlaces URL** (`d143c59`) + **estado efectivo** derivado (`3f97a28`). |
| Cuelgue `getUser()` cliente | **Resuelto.** `junior/applications` es Server Component. |
| Perfil + verificación de empresa (RF-16/17, ADM-1) | **Real.** `saveCompanyProfile` upsert, upload de logo, `verificarEmpresa`/`rechazarEmpresa` con `service_role`. *(`[Probable]`: no re-leído línea por línea en e62c6f9.)* |
| Publicar proyecto (RF-19/20/21/22/23) | **Real.** RPC `publicar_proyecto` atómico. *(`[Probable]`: RPC asumido vigente; verificar en BD si se duda.)* |
| Agente IA (RF-54..60) | **Real.** Chat + 3 actions + LLM vía OpenRouter; gate de tokens. *(Deuda de gobernanza/resiliencia en P2.4.)* |
| Entregables (RF-40..44) | **Real.** Subir hito/final, versionado `max+1`, signed URL + ownership. *(`[Probable]`: no re-leído en detalle.)* |
| Adjudicación camino feliz (RF-37) | **Funciona**; pendiente solo atomicidad (P1.3). |
| Verificación de egresados (`estado_verificacion`) | **Real.** `setGraduateVerification` con `service_role` + consentimiento RNF-38. |
| `env.ts`/`env.server.ts` con Zod | **Real y adoptado.** 0 `process.env.X!` crudos; `service_role` por `serverEnv` + `server-only`. |
| Bug `getPendingUsers` | **Resuelto.** Queries admin usan `requireRole('administrador')` vía `normalizeRole`. |
| `comentario_empresario` | **Resuelto.** Migración `ADD COLUMN IF NOT EXISTS` commiteada. |
| Rename `cedula_juridica → cedula` | **Resuelto.** Migración `20260614000006`. |
| RF-03 lockout atómico | **Resuelto.** RPC `register_failed_login`. |
| **Integridad `evaluaciones_empresarios`** | **Restaurada (`74ccf18` + `20260618120000`).** `id_contratacion` vuelve a `NOT NULL`, RLS exige `'finalizado'`; `ratings.ts:85` rechaza `vigente`. |
| Higiene TS | **Sin `any` real, sin `@ts-ignore`.** **OJO:** la afirmación "console.log solo en `lib/logger`" **es FALSA** — hay `console.log` en `PortfolioManager.tsx:159-160` (ver P4). |

---

## 8. Límites de esta auditoría (honestidad)

- Todo lo `[Seguro]` tiene evidencia `archivo:línea`, **re-anclada a HEAD `e62c6f9`** (18-jun), contraverificada
  adversarialmente. El audit original fue contra `5029e23`/`a6646d2`.
- La BD remota se consultó **solo lectura** vía MCP el 2026-06-18 (autorizado por Samir, dueño de BD). No se
  ejecutó ninguna escritura ni migración.
- **No se levantó la app:** las afirmaciones de runtime (marketplace vacío en prod P2.1) están marcadas
  `[Verificar]`. El cierre de cada una exige `next start` o un E2E manual.
- **`tsc --noEmit`:** el **código fuente no tiene errores de tipo propios** (sin `any`/`@ts-ignore`, verificado),
  pero en un working tree **sin `npm install`** `tsc` falla con 2 `TS2307` (`nodemailer`/`resend`, en el lockfile
  pero no instalados localmente). **No se puede afirmar "exit 0" sin correr `npm ci` primero.** Esto refuerza
  P0.3 (un CI lo atraparía).
- Algunas filas del Apéndice 7 marcadas `[Probable]` no se re-leyeron línea por línea en `e62c6f9` (perfil-empresa,
  entregables, RPC `publicar_proyecto`); el agente que cubría ese slice cayó por error de red y se recuperó
  manualmente lo crítico.
- La priorización P0–P4 es criterio de esta auditoría; ajústenla según qué penaliza el jurado y qué bloquea la
  demo.
