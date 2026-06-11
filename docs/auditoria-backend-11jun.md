# Auditoría backend — 2026-06-11

**Rama auditada:** `samir` (la más actualizada al momento de la auditoría).
**Método:** auditoría multi-agente (70 agentes): un auditor por dominio del equipo APP (A1–A4), un auditor de la BD remota de Supabase (proyecto `mgowuyflhiavquztxpqh`, vía MCP, solo lectura) y un auditor transversal de calidad. Cada tarjeta y cada hallazgo fue contra-verificado adversarialmente por un segundo agente con evidencia `archivo:línea`. Referencia funcional: `distribucion_propuesta.md` §8 (v6.1) y el SRS.

Etiquetas de confianza: **[Seguro]** = evidencia verificada en archivo y línea; **[Probable]** = inferencia sólida pendiente de decisión humana.

---

## 1. Resumen ejecutivo

**Fuera de auth y de la base de datos, el backend de producto no ha empezado.** [Seguro]

- `src/lib/marketplace/` y `src/lib/applications/` contienen solo `.gitkeep`. `src/lib/admin/` tiene una única query (rota, ver §2). El único archivo `'use server'` de todo el repo es `src/lib/auth/actions.ts`.
- Las pantallas de producto (marketplace, junior, applications, empresa, admin dashboard/projects/companies — 14 archivos) consumen `StateContext` + `mockData` + `localStorage`. No persisten nada en Supabase.
- La contracara: **el lado BD está cerrado y sólido**. Cero drift (20/20 migraciones locales = remotas), RLS en las 26 tablas, máquina de estados del flujo B aplicada, cupo ≤ 3, strikes, contratación automática al adjudicar, 4 buckets con 14 políticas, catálogos sembrados (52 tecnologías, 10 categorías, 10 áreas). Todas las tablas de negocio están en 0 filas: la BD espera a una app que nadie ha conectado.

| Persona | Tarjetas | Hecho | Parcial | Falta | Fase 2 |
|---|---|---|---|---|---|
| Samir (A1) | 17 | 6 | 6 | 4 | 1 |
| Fressia (A2) | 13 | 0 | 6 | 6 | 1 |
| Santiago (A3) | 11 | 0 | 11 | 0 | 0 |
| Errol (A4) | 16 | 0 | 14 | 1 | 1 |

Advertencia sobre la lectura de "parcial": en A2/A3/A4 significa casi siempre "la tabla/trigger/política ya existe en BD (trabajo de Samir), pero ninguna línea de la app la usa". El aporte de código propio de esos tres dominios es hoy aproximadamente cero. [Seguro]

---

## 2. Críticos vigentes

1. **`getPendingUsers` roto y silencioso.** `src/lib/admin/queries.ts:26` compara el rol crudo de BD contra `'admin'`, pero `get_my_role()` devuelve `'administrador'` (seed `20260608000002`). Resultado: `err('forbidden')` para todo admin real, y `/admin/validations` lo traga con `result.ok ? result.data : []` mostrando lista vacía. Es la primera ficha del dominó: sin validar estudiantes, la política de postulación (`20260611091025:50-54`) exige `verificado`, así que nadie puede postular contra la BD real. Fix de una línea: usar `requireRole('admin')` como ya hace `approveUser` (`src/lib/auth/actions.ts:111`). [Seguro]
2. **Producto entero sobre mocks.** `src/lib/StateContext.tsx` se siembra desde `src/lib/constants/mockData.ts` (`MOCK_JUNIOR_NAME='Juan Perez'`, `MOCK_COMPANY_ID='comp-1'`) y persiste en `localStorage` (`fwd_projects`, `fwd_applications`, `fwd_companies`, `fwd_role`). 14 archivos lo consumen. Casos extremos: el envío de postulación se simula con `setTimeout` (`junior/projects/[id]/apply/page.tsx:91-107`) y el filtro de "mis postulaciones" compara contra `MOCK_JUNIOR_NAME`, por lo que un usuario real siempre vería lista vacía. [Seguro]

---

## 3. Estado por tarjeta — Samir (A1)

| # | Tarjeta | Estado | Qué falta |
|---|---|---|---|
| #9 | Schema + migraciones | **Hecho** | — (26 tablas en `0001`, tipos en `src/types/database.ts`, aplicada al remoto) |
| #10 | RLS + clientes + middleware | **Hecho** | — (RLS 26/26 + event trigger de red de seguridad; políticas por rol en `0004` endurecidas en `0010/0012/0014/0016/0018`; clientes server/client/admin con `server-only`; sesión en `src/middleware.ts:51-73`) |
| #11 | Auth completo | Parcial | Expiración 24 h del enlace no fijada ni documentada (config de dashboard); no existe transición `pendiente→activa` al confirmar correo (solo `approveUser` admin) — documentar la decisión; contador de intentos no atómico (`actions.ts:242-263`); lockout solo cubre login con contraseña |
| #12 | Recuperación de contraseña | Parcial | "Un solo uso + 1 h" descansa en config de dashboard sin documentar; la solicitud usa browser client (sin `Result<T,E>`) y sin rate limit; strings hardcoded en `forgot-password/page.tsx:84,125` |
| #15 | RBAC helpers + guards | Parcial | Migrar `getPendingUsers` a `requireRole('admin')` (bug crítico §2) |
| #21 | Edición de perfil + Storage | Parcial | Buckets y RLS listos; **cero** server actions de `UPDATE` a `estudiantes`/`empresarios` y cero `storage.upload` en `src/` |
| #16 | Auditoría + rate limiting | Parcial | Solo existe la tabla; nadie escribe en `auditoria` (ni `approveUser` ni el lockout); cero rate limiting en endpoints críticos |
| #17 | Respaldos / retención | **Falta** | Verificar/activar respaldos en Supabase y documentar política de retención |
| #97 | 2FA opcional | **Falta** | Todo (Could; al final) |
| #19 | Integración egresados FWD | **Falta** | No hay fuente de datos ni cotejo. **Bloquea RF-64 (Errol #52)** |
| #79 | Esquema flujo B | **Hecho** | — (enum 7 estados, contador + trigger, cupo ≤ 3) |
| #80 | Esquema strikes | **Hecho** | — (tabla completa, trigger `actualizar_strikes`, umbral configurable) |
| #81 | Esquema ubicación | **Hecho** | — (sede empresario, modalidad + CHECK, `modalidad_preferida`) |
| #82 | Trazabilidad + consentimientos | Parcial | El "doble timestamp" no está materializado (modelo event-sourcing con un `consentimiento_at` por fila): documentar la decisión o agregar columna; nada en `src` escribe `consentimientos` todavía |
| #83 | Enforcement suspensión en login | **Hecho** | — (gate en `src/middleware.ts:88-119` vía RPC, cubre password/OTP/OAuth, mensaje i18n) |
| RNF-37 | Eliminación de datos | **Falta** | Todo el flujo (solicitud, borrado/anonimización respetando FKs, registro en `auditoria`) |
| — | Capa IA (split #19) | Fase 2 | — |

**Extras de su dominio:** strings hardcoded en `register/page.tsx:43,100`; código muerto `src/lib/supabase/middleware.ts` (nadie lo importa); env vars sin Zod (8 archivos con `process.env.X!` — falta `lib/env.ts`); password mínimo 6 en registro vs 8 en reset; `suspendida_severa` sin ningún productor; logout dual (Navbar usa browser client en vez de la server action).

---

## 4. Estado por tarjeta — Fressia (A2)

`src/lib/marketplace/` y `supabase/seeds/` solo contienen `.gitkeep`. Lo que existe de su dominio en BD (schema, RLS, seeds, trigger de reputación, bucket de fotos) es todo de migraciones de Samir. [Seguro]

| # | Tarjeta | Estado | Qué falta |
|---|---|---|---|
| #22 | Catálogos: seeds + lectura | Parcial | Seeds cargados (vía migración `0006`, no `supabase/seeds`); falta toda la capa de lectura (cero `from('tecnologias'/'categorias'/'areas_negocio')` en `src`); los forms usan listas hardcoded |
| #23 | Perfil / portafolio estudiante | Parcial | El 100 % de la lógica: no hay `lib/profile`, no hay página de perfil de estudiante, nada lee `estudiantes`/`habilidades_tecnicas`/`proyectos_portafolio` |
| #24 | Listado + detalle | Parcial | Reescribir lectura contra Supabase con Zod + `Result<T,E>`; hoy `marketplace/page.tsx` y `junior/projects/[id]` usan `useAppState()` mock |
| #26 | Búsqueda y filtrado | Parcial | Los filtros mock (stack/modalidad/duración/presupuesto) **no son** los del RF-26 (tecnología, área, fecha, categoría): hay retrabajo, no solo conexión; RNF-11 (<1 s) no es medible sin query real |
| #28 | Validación links Git/demo | **Falta** | Todo (schema Zod + verificación de repo accesible) |
| #29 | Reputación acumulada | Parcial | El trigger usa `avg()` simple y RF-51 exige **ponderado**; no se dispara en DELETE de evaluaciones; "visible en perfil" no se cumple (no hay perfil) |
| #18 | Foto de perfil | Parcial | Bucket `fotos-perfil` listo (5 MB, jpeg/png); falta server action de upload + validación + persistir URL en `usuarios.foto_perfil` |
| #30 | Rankings backend | **Falta** | Todo (`grep -i rank` = 0 resultados) |
| #31 | CV PDF | **Falta** | Todo; la librería de PDF hay que justificarla (reglas.md, deps fuera del brief §8.2) |
| #33 | Recomendación + matching | Fase 2 | — |
| #84 | Orden por `modalidad_preferida` | **Falta** | Toda la lógica; depende de que #24 deje de ser mock |
| #54 | Gestión de catálogos admin | **Falta** | Todo el CRUD; nota: `habilidades_tecnicas` no es un catálogo sino relación estudiante-tecnología — aclarar alcance |
| RNF-25 | Cobertura de pruebas | **Falta** | `vitest.config.ts` sin coverage/umbral; `--passWithNoTests` en el script enmascara la ausencia total de tests; `tests/unit` y `tests/e2e` vacíos |

---

## 5. Estado por tarjeta — Santiago (A3)

El lado BD de su dominio está cerrado (`coordinacion-santiago-13.md` v3, verificado: migraciones 0013/0014 aplicadas). `src/lib/applications/` está vacío. Las 11 tarjetas quedan en parcial. [Seguro]

| # | Tarjeta | Estado | Qué falta |
|---|---|---|---|
| #25 | Enviar oferta | Parcial | `postularse()` con Zod + `Result<T,E>` capturando los errores que la BD ya emite (23505 duplicado, 23514 cupo, 42501 RLS); conectar el form (hoy mock con `setTimeout`) |
| #34 | Prototipo + propuesta | Parcial | Columnas y bucket `prototipos` listos; cero código de subida ni query para que la empresa lo vea |
| #36 | Retirar oferta + estado | Parcial | `retirarPostulacion()` + `getMisPostulaciones()`/`getPostulacionesDeProyecto()`; mapear los estados del SRS a la UI (hoy lee `ApplicationStatus` mock) |
| #37 | Cierre automático al vencer | Parcial | **Todo el entregable**: no existe `supabase/functions/` ni pg_cron; hoy solo defensa pasiva (la policy rechaza INSERT tras `fecha_cierre`), nada mueve el estado del proyecto |
| #38 | Propuesta técnica + aviso | Parcial | Subida con límite y el aviso de vencimiento: nada genera la notificación `plazo_vence` |
| #39 | Entregables parcial/final | Parcial | Lógica de subida (tabla + Storage) con Zod + Result; el "autor" explícito; el efecto "final marca listo para revisión" (ningún trigger ni código lo hace) |
| #40 | Versionado + aprobar/cambios | Parcial | Nada incrementa `version` ni conserva historial de filas; faltan actions de aprobar/devolver; resolver discrepancia `comentario_empresario` (ver §8.3) |
| #41 | Mensajería por proyecto | Parcial | **Bloqueada por decisión de producto**: `mensajes` sin policies a propósito y la migración 0001 marca el chat realtime fuera del MVP (brief §3.4). No codificar antes de decidir |
| #35 | Flujo B en lib | Parcial | Las 3 server actions + 2 queries de `coordinacion-santiago-13.md:102-117`; ojo: el form mock exige `portfolioUrl`/`cvUrl` obligatorios, contrario a "postular sin prototipo" |
| #85 | Hilo `comentarios_entregable` | Parcial | Tabla + policies listas para ambas partes; nadie la consume |
| #20 | Notificaciones in-app + email | Parcial | **Todo el motor**: nada inserta en `notificaciones` en los 4 eventos clave; sin Resend; el centro no lee de BD. Cuatro tarjetas de Errol dependen de esto |

**Extras de su dominio:** tipos front desalineados con BD (`ApplicationStatus` de 5 estados vs enum real de 7; `ProjectStatus` igual) — todo su dominio hereda este mapeo roto; `participaciones_update_empresario` no congela columnas del estudiante (pendiente con Samir, anotado en `20260610000006:53-55`); `ApplyForm.tsx`/`StatusBadge.tsx` commiteados vacíos; botón muerto en `applications/page.tsx:41`.

---

## 6. Estado por tarjeta — Errol (A4)

Toda la superficie `(company)` y `(admin)` corre sobre mocks, salvo los guards reales de los layouts y `/admin/validations` (rota por el bug de §2). [Seguro]

| # | Tarjeta | Estado | Qué falta |
|---|---|---|---|
| #32 | Perfil de empresario | Parcial | Server action real; su `lib/company/schemas.ts` no mapea al schema (`'formal'` vs enum `'empresa_formal'`, sin `pais_sede`/`ciudad_sede`); subida de logo al bucket `logos` |
| #43 | Publicar proyecto | Parcial | `createProject` (insert en `proyectos` + puentes); el form mock ni tiene área/categoría/plazo/usa_ia; la BD ya valida plazo 5–15 y empresario verificado |
| #44 | Editar + ciclo de vida | Parcial | "Editable solo sin adjudicación" no existe en ningún nivel (la RLS deja al dueño editar siempre); notificación a oferentes; `updateProject`; transiciones de estado del proyecto |
| #46 | Revisar ofertas | Parcial | Query de `participaciones` + perfil/reputación del estudiante y la página real; la RLS de lectura ya existe |
| #47 | Calificar/adjudicar/descartar | Parcial | Las server actions (la BD ya crea `contrataciones` sola al adjudicar); notificar involucrados; RF-38 "habilitar contacto" sin mecanismo (ver §8.1); `calificacion_prototipo` sin CHECK 1–5 (pedir migración a Samir) |
| #48 | Descarga de entregables | Parcial | Action de descarga (signed URL) con `Result<T,E>` + UI; el enforcement ya está en Storage RLS |
| #49 | Evaluación final | Parcial | `submitFinalEvaluation` con Zod; la BD ya exige contratante + período finalizado y recalcula reputación |
| #50 | Flag `usa_ia` | Parcial | Persistirlo desde el form (no tiene el campo) y mostrarlo en el detalle |
| #51 | Suspender/reactivar | Parcial | Actions vía service_role; búsqueda/listado general (solo hay pendientes); registro del motivo (no hay columna ni escritura en `auditoria`); fix del bug §2 |
| #52 | Validación egresados | Parcial | Actions aprobar/rechazar (pueden hacerse ya); el cotejo está **bloqueado por Samir #19** |
| #53 | Eliminar proyectos | Parcial | Action admin con motivo (Zod) + notificación; el soft delete con `is_active` y la visibilidad ya están en BD |
| #54 | Reportes CSV/PDF | **Falta** | Todo (queries agregadas, filtros de fecha, exportación) |
| #42 | Moderación + réplica + prefs | Fase 2 | — |
| #86 | Transiciones desde empresa | Parcial | Actions `markInReview`/`markCandidate`; **el estado `candidata` no existe en el enum real de 7 estados** (ver §8.2) |
| #87 | Strikes + máquina suspensión | Parcial | Actions aplicar/revocar con motivo; la distinción leve/severa no existe (nada produce `suspendida_severa`) |
| #88 | Sede + modalidad | Parcial | Persistencia desde los forms; los CHECK de BD nunca se ejercitan |

**Extras de su dominio:** strings hardcoded `"Cerrar Proyecto"` (`empresa/page.tsx:252`) y subject del mailto (`:124-126`); el schema Zod de new-project valida campos que no existen en `proyectos` (budget único, duration string vs `presupuesto_min/max`, fechas); nada en el código escribe `notificaciones` ni `auditoria` — todos sus "notifica a..." (RF-24/37/39/66) carecen de mecanismo.

---

## 7. BD remota (verificada vía MCP, solo lectura)

- **Drift: cero.** 20 migraciones locales = 20 remotas, mismos timestamps y nombres. [Seguro]
- 26 tablas en `public`, RLS habilitado en todas. `mensajes` y `auditoria` con 0 policies = deny-by-default **intencional y documentado** (`0004:648-662`).
- Naming vs documento: la BD tiene `categorias` (no `categorias_proyecto`) + puente `proyecto_categorias`, y `comentarios_entregables` (plural). Divergencia de nombre, no de funcionalidad.
- 19 triggers de negocio activos (máquina de estados, cupo, contadores, strikes, contratación, reputación, guards de columnas) + RPC de onboarding.
- Storage: 4 buckets, 14 policies. `entregables` sin restricción MIME (50 MB) y sin UPDATE/DELETE — la inmutabilidad parece intencional para el versionado RF-42, confirmar. [Probable]
- Advisors: WARN `auth_leaked_password_protection` deshabilitada (se activa en el dashboard, barato); 3 WARN por RPC `SECURITY DEFINER` expuestas (mitigación documentada en `20260609000005`); 16 FKs sin índice y ~27 índices sin uso, todo INFO (BD sin tráfico, no actuar aún).
- Seeds cargados: 52 tecnologías, 10 categorías, 10 áreas, 3 roles, 8 claves de configuración. **0 filas en todas las tablas de negocio**; 11 usuarios de prueba.

---

## 8. Decisiones de equipo pendientes (bloquean código)

1. **Mensajería (RF-45) y "habilitar contacto" (RF-38):** el brief §3.4 saca el chat realtime del MVP, pero el backlog lo tiene como Must de Santiago. Decidir modelo (simple sin realtime vs diferir y documentar) antes de que Santiago #41 y Errol #47 escriban código.
2. **Estado `candidata`:** no existe en el enum de 7 estados (`docs/pendientes-samir.md:98` documenta el mismatch). Mapear el vocabulario del backlog a los estados reales antes de Errol #86 y Rachel #91.
3. **`comentario_empresario`:** la migración `20260609204156` figura aplicada pero la columna no existe físicamente (nota en el propio archivo) y duplica semántica con `comentarios_entregables`. Decisión Santiago/Errol.
4. **`pendiente→activa`:** hoy solo el admin activa cuentas (coherente con RF-64, contradice la letra de RF-02). Documentar en README o cambiar.
5. **Reputación ponderada (RF-51):** el trigger usa promedio simple y no reacciona a DELETE. Definir la ponderación con Fressia y corregir el trigger con Samir.

---

## 9. Transversal

- **Sin validación Zod de env vars:** 8 archivos usan `process.env.X!`; falta `lib/env.ts` (pendiente conocido de A1).
- **Nada escribe `auditoria`; cero rate limiting** fuera del lockout de login (cuyo contador es no atómico).
- **Errores crudos en inglés fugan a la UI:** las ramas genéricas devuelven `err(error.message)` y los toasts lo muestran como fallback (`register/page.tsx:95`, `reset-password/page.tsx:84`).
- **Tests:** solo 2 archivos (auth), 11/11 en verde; sin umbral de cobertura; `--passWithNoTests` permite CI verde sin tests.
- **En verde:** `npx tsc --noEmit` exit 0; `Result<T,E>` + Zod cumplido en las 7 funciones de la única lib real; `SUPABASE_SERVICE_ROLE_KEY` aislado con `server-only` sin leaks; higiene limpia (sin `any`, sin `console.log` fuera del logger, sin TODOs).

---

## 10. Orden recomendado

1. **Hoy:** fix de `getPendingUsers` (1 línea) + quitar `--passWithNoTests` y configurar coverage en Vitest (Fressia RNF-25).
2. **Ruta crítica del producto real:** Fressia catálogos + listado (#22/#24) → Errol perfil empresario + publicar proyecto (#32/#43) → Santiago flujo B (#35/#25/#36). En ese orden: sin proyectos reales en BD no hay nada que listar ni a qué postular.
3. **En paralelo:** Santiago el helper de notificaciones (#20, lo esperan 4 tarjetas de Errol) y Samir #21 (perfil + upload), `lib/env.ts` y auditoría (#16).
4. **Reunión corta** para las 5 decisiones de §8 antes de repartir las tarjetas afectadas.

El riesgo a decir en voz alta: la BD está excelente y endurecida, pero el Demo Day hoy mostraría `localStorage`. La prioridad ya no es infra — es que A2/A3/A4 escriban su primera server action.
