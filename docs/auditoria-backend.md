# Auditoría backend — 2026-06-12 (v2, contra la distribución Grupo 7 v3)

**Rama auditada:** `samir`, tras el pull de `dev` (HEAD `7fc3818`). Reemplaza la auditoría del 11-jun de este mismo archivo.
**Fuente de distribución:** `Grupo7_Tareas_Pendientes_v3.md` (raíz del repo; reemplaza a `distribucion_propuesta.md` §8). Fuente funcional: SRS v1.0.
**Método:** auditoría multi-agente (16 agentes): un auditor por integrante (7), un auditor de la BD remota de Supabase (proyecto `mgowuyflhiavquztxpqh`, vía MCP, solo lectura) y un auditor transversal de calidad. Cada dominio fue contra-verificado adversarialmente por un segundo agente que abrió cada cita `archivo:línea`.

Etiquetas de confianza: **[Seguro]** = evidencia verificada en archivo y línea; **[Probable]** = inferencia sólida pendiente de confirmación humana.

---

## 1. Resumen ejecutivo

**Nada del backend de producto se movió desde el 11-jun; el único avance real es el fix del logout (commit `891f585`).** Auth y BD siguen sólidos; todo lo demás sigue siendo frontend mock. [Seguro]

- El único `'use server'` del repo sigue siendo `src/lib/auth/actions.ts`. `src/lib/marketplace/` y `src/lib/applications/` solo contienen `.gitkeep`. 18 archivos dependen de `StateContext`/`mockData`/`localStorage`; la postulación se sigue simulando con `setTimeout` (`apply/page.tsx:91-107`).
- La BD remota sigue cerrada y sin drift (20/20 migraciones, RLS 26/26, advisors idénticos al 11-jun). Novedad: `usuarios=13` y `empresarios=1` — alguien ya está probando contra la BD real; el resto de tablas de negocio sigue en 0.
- **El documento v3 contiene ~19 afirmaciones incorrectas o incompletas sobre el repo (§11).** Quien lo siga al pie de la letra escribirá código que falla en runtime: columnas que no existen (`carta_presentacion`, `plazo_dias`, `calificacion`), un estado de proyecto inexistente (`listo_para_revision`), componentes "existentes" que son archivos de 0 bytes (`ApplyForm`, `PortfolioCard`, `SkillPicker`), y un "fix de 1 línea" que no desbloquea lo que promete (§2).

| Integrante | Módulo | RF | Hecho | Parcial | Falta |
|---|---|---|---|---|---|
| Samir | 2.1 Usuarios y cuentas | 8 + bug | 3 | 3 | 2 |
| Rony | 2.3 Empresarios + apoyo RF-27/28 | 3 + apoyo | 0 | 4 | 0 |
| Rachel | 2.2 Perfil y portafolio estudiante | 7 | 0 | 6 | 1 |
| Errol | 2.4 Proyectos + 2.10 Agente IA | 17 | 0 | 9 | 8 |
| Santiago | 2.5 Ofertas y prototipos | 7 + apoyo | 0 | 7 | 1 |
| María del Sol | 2.11 Admin + apoyo diseño | 6 + 2 diseño | 0 | 7 | 1 |
| Fressia | 2.6 Adjudicación + 2.7 Entregables | 11 | 0 | 8 | 3 |

Lectura de "parcial": casi siempre significa "la BD ya lo soporta (tablas, RLS, triggers, buckets — migraciones de Samir) pero ninguna línea de la app lo usa". El aporte de código de producto fuera de auth sigue siendo aproximadamente cero. [Seguro]

---

## 2. Críticos vigentes

1. **`getPendingUsers` sigue roto Y el "fix de 1 línea" del v3 es insuficiente.** El bug está vigente: `src/lib/admin/queries.ts:26` compara el rol crudo de BD (`'administrador'`) contra `'admin'`; todo admin real recibe `err('forbidden')` y `/admin/validations` lo enmascara como lista vacía (`validations/page.tsx:13-14`). El fix con `requireRole('admin')` sigue siendo válido. **Pero la cadena que promete el v3 ("fix → admin valida → postulaciones desbloqueadas") es incompleta**: la policy de postulación (`20260611091025:53`) exige `estudiantes.estado_verificacion='verificado'` y **nada en todo el repo escribe esa columna** — `approveUser` solo pone `usuarios.estado_cuenta='activa'` (otra columna, en otra tabla; `actions.ts:118-121`), y un guard-trigger congela `estado_verificacion` ante clientes (`20260610000006:135`): solo `service_role` puede cambiarla. Sin extender `approveUser` (o crear la action de verificación de egresados), nadie podrá postular contra la BD real aunque se aplique el fix de 1 línea. [Seguro]
2. **Producto entero sobre mocks, sin cambios desde el 11-jun.** 18 archivos consumen `StateContext` + `mockData` + `localStorage`; el filtro de "mis postulaciones" sigue comparando contra `MOCK_JUNIOR_NAME` (un usuario real ve lista vacía); cero queries Supabase a `proyectos`, `participaciones`, `empresarios`, `estudiantes` o catálogos en `src/`. [Seguro]
3. **Bomba de runtime latente en `entregables.comentario_empresario`.** `src/types/database.ts:416,427,438` tipa una columna que físicamente NO existe en el remoto (la propia migración `20260609204156:15-19` lo documenta). Cualquier SELECT/INSERT que la use compila en TS y revienta en runtime. Materializarla (el SQL es idempotente) o sacarla del tipo antes de que Fressia toque RF-44. [Seguro]

---

## 3. Samir — 2.1 Gestión de Usuarios y Cuentas

| RF | Requerimiento | Estado | Qué falta |
|---|---|---|---|
| RF-01 | Registro con tres roles | **Hecho** | Flujo junior/empresa end-to-end (server action → Auth → `handle_new_user` → `assign_my_role`). El servidor rechaza 'admin' (`actions.ts:143` + BD), pero el `RoleSelector` público SÍ muestra la tarjeta Admin (`RoleSelector.tsx:31-36`) y al enviarla el error sale crudo. Quitarla del form público; unificar password mín. 6 (registro) vs 8 (reset) |
| RF-02 | Verificación por correo (24 h) | Parcial | El enlace funciona (`emailRedirectTo` → callback → `exchangeCodeForSession`), pero confirmar el correo NO activa la cuenta: nada toca `estado_cuenta` en función de `email_confirmed_at`; la única vía a `'activa'` es `approveUser`. La caducidad de 24 h no es verificable en el repo (sin `supabase/config.toml`; vive en el dashboard) |
| RF-03 | Lockout tras 5 intentos | **Hecho** | End-to-end con desbloqueo temporal y reset al éxito. Deudas vigentes: contador no atómico (`actions.ts:252-274`, carrera entre requests) y solo cubre login con contraseña |
| RF-04 | Recuperación de contraseña | Parcial | Flujo completo (forgot → email → callback → `updatePassword` con pwned-check), pero `forgot-password` usa el browser client sin `Result<T,E>` ni rate limit; expiración 1 h / un-solo-uso no verificables en repo; `reset-password` solo exige sesión, no que sea de tipo recovery |
| RF-05 | Edición de perfil persistente | **Falta** | Todo: cero UPDATEs a `estudiantes`/`empresarios` en `src/` (grep = 0); las pantallas de perfil son mock; `revalidatePath` solo existe en las 4 actions de auth |
| RF-06 | Foto de perfil 5 MB | Parcial | Storage completo (bucket `fotos-perfil` 5 MB jpeg/png + 4 policies por carpeta del dueño); cero código de upload en `src/` (ningún `.upload`/`getPublicUrl`) |
| RF-07 | Cierre de sesión | **Hecho** | Navbar usa la server action `signOut` (`Navbar.tsx:286-289`) — la línea base del 11-jun ("usa browser client") quedó obsoleta tras `891f585`. Pulir: `resetAll()` repite el `signOut` con el browser client (redundante, inofensivo) |
| RF-08 | 2FA opcional (C) | **Falta** | Nada (grep mfa/totp/factor = 0). Depende además de que exista la página de configuración de perfil (RF-05) |
| BUG | `getPendingUsers` | **Vigente** | Ver §2.1. Fix: `requireRole('admin')` como ya hace `approveUser` (`actions.ts:111`) **+ productor de `estado_verificacion`** |

**Extras:** strings hardcoded en `register/page.tsx:43,101-103,136,153,265`, `forgot-password/page.tsx:83,125,136`, `RoleSelector.tsx:21-35`, `OnboardingRoleForm.tsx:54`; código muerto `src/lib/supabase/middleware.ts` (cero importadores); errores crudos a la UI (`register:97-98,118`, `reset-password:84-85`, `forgot-password:60`); `register:81` escribe el rol elegido en localStorage antes de validar en servidor (impacto solo cosmético).

---

## 4. Rony — 2.3 Gestión de Empresarios (+ apoyo a Santiago en RF-27/28)

| RF | Requerimiento | Estado | Qué falta |
|---|---|---|---|
| RF-16 | Perfil del empresario | Parcial | `CompanyProfileForm` es UI completa con Zod pero 100 % mock (`useAppState` + `setTimeout` 900 ms + localStorage). Crear `src/lib/company/actions.ts` con **INSERT/upsert** (la fila de `empresarios` NO existe tras el onboarding — `20260609000005:26-29`; un UPDATE afectaría 0 filas en silencio); upload real al bucket `logos` (hoy el logo es `Input type=url`, `CompanyProfileForm.tsx:244-250`); leer el perfil desde Supabase |
| RF-17 | Tipo de empresario | Parcial | Mapear `'formal'` → `'empresa_formal'` (el schema Zod `schemas.ts:19-21` y `CompanyType` usan un valor que el enum real rechaza); el form no captura `pais_sede`/`ciudad_sede`/`alcance_operativo` (columnas existentes) |
| RF-18 | Publicación de problemas | Parcial | El empresario sí describe su problema (Zod min 10/30), pero muere en StateContext; el INSERT real es RF-19 (Errol) — coordinar, no duplicar |
| Apoyo | RF-27/28 con Santiago | Parcial | Nada en `src/lib` (solo `.gitkeep`). Ojo: la "validación del estado del proyecto" que el v3 pide analizar en conjunto **ya está resuelta en BD** (policy INSERT + UNIQUE + máquina de estados, migraciones 0013/0014): el análisis conjunto es solo capa app (server action + upload + manejo del errcode 23514) |

**Extras:** riesgo `empresarios.logo varchar(150)` — guardar el path del objeto, no la URL pública completa (esto es aproximado, verifíquenlo); `CompanyProfileDetails.tsx:309-314` con 'Formal'/'Individual' y cédulas hardcoded; `StateContext.tsx:277` crea empresas con status 'approved' saltándose la verificación; interfaz `Company` (`types/index.ts:46-61`) no modela las columnas reales.

---

## 5. Rachel — 2.2 Perfil y Portafolio de Estudiantes

| RF | Requerimiento | Estado | Qué falta |
|---|---|---|---|
| RF-09 | Habilidades con nivel | Parcial | Todo el lado app: no existe ninguna ruta de perfil junior; `SkillPicker.tsx` es un archivo de **0 bytes** (no hay componente que "usar"); server action de upsert/delete en `habilidades_tecnicas` + lectura del catálogo `tecnologias` |
| RF-10 | Portafolio público/privado | Parcial | Página `/junior/portfolio` (no existe), toggle de visibilidad y `PortfolioCard` real (**0 bytes**). OJO contra-verificado: la policy `portafolio_select_own_or_public` **NO usa** `portafolio_visible_publicamente` (filtra por `is_active` + consentimiento, `20260610212418:536-547`); el flag solo gobierna `estudiantes` y `habilidades_tecnicas`. El toggle requiere migración de policy o enforcement en app, no solo UI |
| RF-11 | Proyectos de portafolio | Parcial | Form de alta/edición + actions sobre `proyectos_portafolio` (el v3 la llama mal `portafolio_proyectos`) y la puente `portafolio_tecnologias`; el INSERT exige el campo `origen` (enum NOT NULL) que el v3 no menciona — usar `'independiente'` para proyectos propios |
| RF-12 | Link Git validado (S) | Parcial | Solo falta app: la columna `url_repositorio` YA existe (`initial_schema.sql:366`) — sin migración; campo + Zod `.url()` (patrón en `apply/page.tsx:34-35`) |
| RF-13 | Link demo validado (S) | Parcial | Ídem: `url_demo` ya existe (`:367`); solo formulario + validación |
| RF-14 | Historial con calificación | Parcial | `ApplicationCard` existe pero 100 % mock (filtro por `MOCK_JUNIOR_NAME`); falta query a `evaluaciones.puntuacion` (CHECK 1–5 ya en BD) y a `estudiantes.reputacion/proyectos_completados` (denormalizados). Riesgo: poblar `evaluaciones` depende del flujo de Fressia/Santiago |
| RF-15 | CV PDF (C) | **Falta** | Sin librería PDF en `package.json`; cualquier dependencia hay que justificarla (reglas.md / brief §8.2); alternativa sin dependencia: vista imprimible + CSS print |

**Extras:** `Navbar.tsx:275-281` — el avatar enlaza a `/empresa/perfil` para TODOS los roles (un junior cae en la ruta de empresa); `estudiantes.url_portafolio` existe y nadie decide si la página lo edita; el commit `be56f9f` prometió componentes ("gridCard components") y entregó 5 archivos vacíos.

---

## 6. Errol — 2.4 Publicación y Gestión de Proyectos + 2.10 Agente IA

| RF | Requerimiento | Estado | Qué falta |
|---|---|---|---|
| RF-19 | Publicar proyectos | Parcial | Server action con INSERT en `proyectos` + `proyecto_categorias` + `revalidatePath`; el form mock ni tiene categoría; la BD ya exige empresario verificado en la policy de INSERT |
| RF-20 | Área de negocio | Parcial | Select leyendo `areas_negocio` (10 áreas YA sembradas — no hardcodear) → `proyectos.id_area_negocio` (FK; el nombre `area_negocio` del v3 viene del SRS) |
| RF-21 | Plazo 5–15 días | Parcial | Input numérico 5–15 → calcular `fecha_publicacion=now()` y `fecha_cierre=now()+N`. **`plazo_dias` no existe en BD** (divergencia BD↔SRS, ver §12); el CHECK `chk_proyectos_plazo` es NOT VALID y permite nulls: la action debe setear ambas fechas siempre |
| RF-22 | Tecnologías de catálogo | Parcial | Selector multi desde `tecnologias` (52 sembradas) + INSERT en `proyecto_tecnologias`; `SkillPicker.tsx` está **vacío** — escribirlo desde cero |
| RF-23 | Flag `usa_ia` (S) | Parcial | Solo el checkbox: la columna existe con default false |
| RF-24 | Editar solo no adjudicados | **Falta** | Todo: no hay ruta de edición, no hay action, y el enforcement no existe en ningún nivel (`proyectos_update_own` solo valida ownership, sin condición de estado; ningún trigger de transiciones sobre `proyectos`) |
| RF-25 | Máquina de estados del proyecto | Parcial | El enum real tiene **7 estados** (el v3 omite `cancelado`, que además tiene `motivo_cancelacion`); el trigger de transiciones existe SOLO para `participaciones`; la app maneja un `ProjectStatus` mock en inglés. Falta trigger o validación en actions + migrar pantallas |
| RF-26 | Búsqueda y filtrado (<1 s) | Parcial | Migrar a queries Supabase con joins; los filtros mock (stack/modalidad/duración/presupuesto) NO son los del RF (tecnología/área/fecha/categoría): hay retrabajo. Índices ya creados (`idx_proyectos_estado_fecha`, `idx_proyectos_area`) |
| RF-54 | Agente conversacional | Parcial | La tabla `conversaciones_ia` **SÍ existe** con RLS e índice (la auditoría del 11-jun la omitió del listado; el v3 acierta). Falta todo lo demás: página de chat, server actions, SDK LLM (no hay ninguno en `package.json` — justificar dependencia antes, brief §8.2) |
| RF-55–58 | Entrevista adaptativa → publicar | **Falta** | Cero código; la BD ya trae soporte (historial jsonb, `nivel_tecnico_empresario`, `propuesta_generada/aprobada`, estado). Depende de RF-54 |
| RF-59 | Guardar/reanudar historial (S) | Parcial | BD íntegra (jsonb + enum + policies); cero queries desde `src` |
| RF-60–62 | Sugerencias, recomendación, matching | **Falta** | Nada en app ni en BD específico de score; RF-61 es viable solo con query (habilidades × proyecto_tecnologias × verificados); RF-62 requiere definir el algoritmo desde cero |

**Extras:** el schema Zod de new-project valida campos que no existen en BD (budget único vs `presupuesto_min/max`, duration string); `updateProjectStatus` mock se usa también en las pantallas admin de María del Sol — migrar RF-25 las rompe si no se coordina; strings hardcoded en `ProjectFilters.tsx:111-113,133-135`.

---

## 7. Santiago — 2.5 Gestión de Ofertas y Prototipos

| RF | Requerimiento | Estado | Qué falta |
|---|---|---|---|
| RF-27 | Enviar oferta | Parcial | Server action `postularse()` con INSERT (estado default `'enviada'` ✓) capturando 23505 (duplicado), 23514 (cupo/transición), 42501 (RLS); conectar el form real — **`ApplyForm.tsx` tiene 0 bytes**, el form vivo es `apply/page.tsx:91-107` con `setTimeout` |
| RF-28 | Subir prototipo | Parcial | Input file + upload al bucket `prototipos` + persistir `prototipo_enlaces`/`fecha_entrega_prototipo`. **El orden del v3 está invertido**: la RLS del bucket exige que la participación exista ANTES del upload (INSERT → upload, no al revés) |
| RF-29 | Carta + planteamiento | Parcial | La columna es **`carta_postulacion`** (no `carta_presentacion`); `planteamiento_solucion` sí existe; el form real no tiene campo de planteamiento. La BD ya congela ambas contra edición del empresario |
| RF-30 | Documentación PDF (S) | Parcial | El bucket acepta PDF (10 MB) ✓; falta input + upload + guardar en `documentacion_tecnica` (varchar(150): cuidado con paths largos) |
| RF-31 | Retirar oferta | Parcial | Action `retirarPostulacion()` (UPDATE a `'retirada'` ✓ existe en el enum) + botón en applications; la RLS y la máquina de estados ya validan todo (solo desde `enviada`/`en_revision`) |
| RF-32 | Estado de ofertas propias | Parcial | Query `getMisPostulaciones()` — `participaciones` no tiene `id_usuario` (es `id_estudiante` vía join); mapear los **7** estados reales a la UI (hoy `ApplicationStatus` mock de 5 en inglés); el filtro actual contra `MOCK_JUNIOR_NAME` da lista vacía a usuarios reales |
| RF-33 | Aviso de vencimiento (S) | **Falta** | Todo: sin `supabase/functions/`, sin pg_cron, nada inserta en `notificaciones` (que además NO tiene policy INSERT — el insert debe venir de trigger definer, cron o service_role: decisión de equipo, §13) |
| Apoyo | Análisis con Rony | Parcial | No existe documento de análisis Santiago–Rony; lo que existe es `coordinacion-santiago-13.md` (con Samir), que YA especifica las 3 actions + 2 queries de `lib/applications/` y cubre lo que el v3 pide analizar — reutilizarlo como base |

**Extras:** navegación rota post-postular: `apply/page.tsx:105` hace `router.push('/junior/applications')` y esa ruta NO existe (la página vive en `/applications`) — 404 tras enviar; botón muerto en `applications/page.tsx:41`; `StatusBadge.tsx` también vacío; el form mock exige `portfolioUrl`/`cvUrl` obligatorios, contrario a "postular sin prototipo"; el tipo correcto `estado_participacion_enum` ya está generado en `database.ts:1338-1345` y nadie lo consume.

---

## 8. María del Sol — Panel de Administración (2.11) + apoyo en diseño

| RF | Requerimiento | Estado | Qué falta |
|---|---|---|---|
| ADM-1 | Gestión de usuarios | Parcial | Fix del bug §2 (la pantalla además enmascara el error como "no hay pendientes" — distinguir error de lista vacía, `validations/page.tsx:28-33`); búsqueda por nombre/correo, filtro por rol, detalle `/admin/users/[id]` y edición de estado: nada de eso existe |
| ADM-2 | Validación de egresados FWD | Parcial | **No existe ninguna fuente de egresados** en repo ni BD (único rastro: el valor `'cotejo_fwd'` de un enum). Y lo crítico: la aprobación debe escribir `estudiantes.estado_verificacion='verificado'` vía service_role (ver §2.1) — hoy nadie lo hace |
| ADM-3 | Suspender/reactivar con motivo | Parcial | El gate de suspensión en middleware es real ✓; falta UI + actions con service_role; **no hay columna de motivo** (solo `suspendido_at`) — decidir columna nueva vs `auditoria` (§13); `suspendida_severa` sigue sin productor |
| ADM-4 | Eliminar proyectos + notificación | Parcial | **`updateProjectStatus` es un método mock de StateContext** (estados 'closed'/'active' inexistentes en BD) — no hay base sobre la cual "agregar" motivo: el flujo real (soft delete `is_active=false` + `motivo_cancelacion` + notificación) se construye desde cero. La BD ya está (soft delete + visibilidad RLS corregida) |
| ADM-5 | Reportes CSV/PDF (S) | **Falta** | Todo: no existe `/admin/reports` ni referencia alguna a CSV/exportación |
| ADM-6 | Gestión de catálogos (S) | Parcial | CRUD para `tecnologias` + `categorias` + **`areas_negocio`** (el v3 lista "habilidades", pero `habilidades_tecnicas` es la relación estudiante-tecnología, no un catálogo; administrarla como catálogo borraría datos de estudiantes) |
| DIS-1 | Estilización vistas empresa | Parcial | Las vistas existen y usan tokens (sin hex hardcoded salvo marca Google en `OAuthButtons`); el apoyo real llega cuando Rony las conecte a Supabase |
| DIS-2 | Estilización vistas estudiante | Parcial | La mayoría de las vistas a revisar NO existen aún (sin `/junior/portfolio` ni página de habilidades; PortfolioCard/SkillPicker/ProjectDetail vacíos) — sin objetivo concreto hasta RF-09/10/11 de Rachel |

**Extras:** carpetas huérfanas `(admin)/companies|dashboard|moderation` con solo `.gitkeep` junto a las rutas reales; `admin/projects` y `admin/companies` moderan datos 100 % mock; `empresarios.estado_verificacion` tampoco tiene productor; la tabla `auditoria` sigue sin un solo escritor.

---

## 9. Fressia — 2.6 Revisión/Calificación/Adjudicación + 2.7 Desarrollo y Entregables

| RF | Requerimiento | Estado | Qué falta |
|---|---|---|---|
| RF-34 | Revisar ofertas completas | Parcial | Query real a `participaciones` (planteamiento, prototipo_enlaces, documentación) + `estudiantes.reputacion`; extender `ApplicationCard` (hoy solo carta y links mock) |
| RF-35 | Cierre automático al vencer | **Falta** | **La mecánica del v3 está invertida**: poner el proyecto EN `en_recepcion` al vencer lo deja postulable (todas las policies tratan `en_recepcion` como estado vigente). Al vencer debería SALIR de abierto/en_recepción — y el enum no tiene estado de "recepción cerrada" (§13). Luego: pg_cron/Edge Function, o cierre perezoso en la query como MVP |
| RF-36 | Calificar 1–5 | **Falta** | La columna es **`calificacion_prototipo`** (no `calificacion`) y NO tiene CHECK 1–5 (acepta 0, -3, 99): validar en Zod + pedir migración del CHECK. Sin UI de estrellas ni action |
| RF-37 | Adjudicar | Parcial | **El trigger no se "llama"** (y su EXECUTE está revocado, `20260610000007:81`): la mecánica real es UPDATE participación a `'contratada'` — pasando por `'en_revision'` (el salto directo lo rechaza el trigger con 23514) — y `trg_crear_contratacion` inserta en `contrataciones` solo. El UPDATE del proyecto a `'adjudicado'` es un paso aparte que ningún trigger hace. Nota: el estado se llama `contratada`, no "adjudicada" |
| RF-38 | Contacto post-adjudicación | Parcial | El mailto temporal funciona pero sobre el email del mock; al conectar, obtener el correo real. La mensajería (RF-45) está diferida a etapa final por acuerdo; `mensajes` existe en BD sin consumidores y con 0 policies (deny-by-default intencional) |
| RF-39 | Notificar no seleccionados | **Falta** | El marcado masivo del v3 fallaría: `enviada→no_seleccionada` está **prohibido** por la máquina de estados (solo `en_revision→no_seleccionada`); orquestar las transiciones o relajar el trigger. La notificación depende del mecanismo de §13 |
| RF-40 | Entregables parciales | Parcial | BD completa (tabla + trigger guardia de estado + bucket 50 MB + policies); cero UI/action — falta `subirEntregable` (INSERT + upload por `id_contratacion`) |
| RF-41 | Entregable final → "listo" | Parcial | **`listo_para_revision` no existe** en `estado_proyecto_enum`: el UPDATE del v3 fallaría. Decidir: migrar el enum o derivar "listo" de `entregables` (tipo `'final'` + estado). La BD ya distingue parcial/final |
| RF-42 | Versionado (S) | Parcial | Nada incrementa `version` (solo default 1); falta `max(version)+1` por contratación/tipo + listado. La inmutabilidad del bucket (sin UPDATE/DELETE) ya está diseñada a propósito para conservar versiones |
| RF-43 | Descarga por empresario | Parcial | La RLS de lectura ya existe ✓; el bucket es privado → falta action con signed URL + botón (cero `createSignedUrl` en `src/`) |
| RF-44 | Aprobar/solicitar cambios (S) | Parcial | La RLS ya permite al empresario asignar `en_revision/aprobado/con_cambios`; falta UI + action + INSERT en `comentarios_entregables`. Antes: resolver `comentario_empresario` (§2.3) |

**Extras:** `"Cerrar Proyecto"` hardcoded sigue en `empresa/page.tsx:252` y el mailto con subject en `:124-126`; la máquina de estados solo valida a `authenticated` — una action que use el admin client se la salta y debe validar por su cuenta; las transiciones encadenadas de adjudicar (en_revision → contratada + proyecto adjudicado + resto no_seleccionada) son orquestación multi-paso que el v3 describe como pasos sueltos.

---

## 10. BD remota (verificada vía MCP, solo lectura)

- **Drift: cero.** 20 migraciones locales = 20 remotas; ninguna nueva desde el 11-jun. [Seguro]
- **`conversaciones_ia` SÍ existe** (RLS + 3 policies + índice, desde la migración inicial). El conteo de 26 tablas del 11-jun era correcto pero su listado la omitió — corrección a la auditoría anterior, el v3 acierta. [Seguro]
- Nombres reales que el v3 equivoca: `proyectos_portafolio` (no `portafolio_proyectos`), `carta_postulacion` (no `carta_presentacion`), `calificacion_prototipo` sin CHECK (no `calificacion`), sin `plazo_dias` (es `fecha_publicacion`/`fecha_cierre`).
- Enums: `estado_proyecto_enum` = borrador, abierto, en_recepcion, adjudicado, en_desarrollo, finalizado, **cancelado** (sin `listo_para_revision`). `estado_participacion_enum` = enviada, en_revision, **contratada**, no_seleccionada, retirada, finalizada, cancelada. `tipo_empresario_enum` = empresa_formal, emprendedor.
- `trg_crear_contratacion`: AFTER UPDATE OF estado, dispara con `new.estado='contratada'`, inserta en `contrataciones` con ON CONFLICT DO NOTHING. **Ningún trigger marca las demás participaciones como no_seleccionada** — responsabilidad de la app.
- Storage: 4 buckets / 14 policies. `prototipos` acepta PDF (10 MB) ✓. `entregables` sigue sin MIME (50 MB) y sin UPDATE/DELETE (inmutabilidad intencional para RF-42). `notificaciones` sin policy INSERT; `mensajes` y `auditoria` con 0 policies (deny-by-default documentado).
- Advisors idénticos al 11-jun: 4 WARN (leaked password protection + 3 SECURITY DEFINER expuestas, mitigación documentada) y 2 INFO.
- **Datos: `usuarios=13`, `empresarios=1`** (ya no todo en 0); el resto de tablas de negocio en 0; seeds intactos (3 roles, 10 categorías, 10 áreas, 52 tecnologías, 8 claves de config).

---

## 11. Errores verificados del documento v3

Los que **romperían código** si se siguen literalmente [Seguro, todos contra-verificados]:

| # | Dónde | El v3 dice | La realidad |
|---|---|---|---|
| 1 | Bug crítico (pág. 2-3) | "Fix de 1 línea" desbloquea postulaciones | Incompleto: falta el productor de `estado_verificacion='verificado'` (§2.1) |
| 2 | RF-27/28/29/30 | "ApplyForm.tsx existe pero guarda en StateContext" | `ApplyForm.tsx` tiene **0 bytes**; el form real está en `apply/page.tsx` |
| 3 | RF-29 | columnas `carta_presentacion` y `planteamiento_solucion` | `carta_postulacion` (el otro sí existe) |
| 4 | RF-28 | "upload a storage antes del INSERT" | Imposible: la RLS del bucket exige que la participación exista primero |
| 5 | RF-36 | `UPDATE participaciones SET calificacion=N` | La columna es `calificacion_prototipo` y no tiene CHECK 1–5 |
| 6 | RF-37 | "server action que llame a `crear_contratacion_al_adjudicar`" | Es un trigger (no se llama) con EXECUTE revocado; la vía es UPDATE a `'contratada'` vía `'en_revision'` |
| 7 | RF-39 | "marcar resto como no_seleccionada" al adjudicar | `enviada→no_seleccionada` está prohibido por la máquina de estados |
| 8 | RF-41 | estado `'listo_para_revision'` | No existe en el enum: el UPDATE fallaría |
| 9 | RF-35 | `SET estado='en_recepcion'` al vencer el plazo | Semántica invertida: `en_recepcion` es estado postulable según todas las policies |
| 10 | RF-21 | "guardar en `plazo_dias`" | La columna no existe en BD (sí en el SRS → divergencia a decidir, §13) |
| 11 | RF-11 | tabla `portafolio_proyectos` | Es `proyectos_portafolio` |
| 12 | RF-10 | "PortfolioCard.tsx existe como componente" | 0 bytes (igual que SkillPicker.tsx, StatusBadge.tsx y ProjectDetail.tsx) |
| 13 | ADM-4 | "updateProjectStatus en admin dashboard existe" | Es un método mock de StateContext con estados inexistentes en BD |
| 14 | ADM-6 | catálogo de "habilidades" | `habilidades_tecnicas` es relación estudiante-tecnología; el tercer catálogo es `areas_negocio` |
| 15 | RF-02 | la cuenta queda pendiente "hasta confirmar el enlace" | Confirmar el correo NO activa: solo `approveUser` |
| 16 | RF-32 | "query filtrado por id_usuario" | `participaciones` usa `id_estudiante` (join con `estudiantes`) |
| 17 | RF-25 | enum de 6 estados | Son 7 (omite `cancelado`) |
| 18 | RF-20 | columna `area_negocio` | Es `id_area_negocio` (FK al catálogo ya sembrado; heredado del SRS) |
| 19 | Apoyo Rony–Santiago | análisis pendiente de validación de estado | Ya resuelto en BD (0013/0014); el análisis documentado existente es con Samir (`coordinacion-santiago-13.md`) |

**Aciertos del v3 que corrigen la auditoría del 11-jun:** RF-07 (el Navbar SÍ usa la server action de logout — fix `891f585`) y RF-54/59 (`conversaciones_ia` sí existe).

---

## 12. Huecos de la distribución v3 (tareas sin dueño)

Pendientes de la auditoría del 11-jun que el v3 no asigna a nadie:

1. **Respaldos / política de retención** (antes Samir #17) — sin dueño.
2. **RNF-37 eliminación de datos** (borrado/anonimización + registro) — sin dueño.
3. **`lib/env.ts` con Zod** — 18 usos de `process.env.X!` en 8 archivos (incluido el service role key); los RNF "de responsabilidad continua" no se ejecutan solos.
4. **Capa de auditoría** — nadie escribe en la tabla `auditoria`; ADM-3/ADM-4 piden "registro de motivo" pero ningún RF asigna construir el mecanismo.
5. **Listado/detalle del marketplace para el junior** — RF-26 (búsqueda) es de Errol, pero `marketplace/page.tsx` y `junior/projects/[id]` (la lectura base que alimenta el flujo de Santiago) no tienen dueño explícito.
6. **Rate limiting** fuera del lockout de login — mencionado en el contexto de Samir, sin RF concreto.
7. **Tensión 2.8 diferida vs RF que la necesitan ya**: RF-33 (Santiago) y RF-39 (Fressia) requieren insertar en `notificaciones` antes de la "etapa final"; además la tabla no tiene policy INSERT (decisión §13.4).
8. **Reputación ponderada (RF-51)** — el trigger usa `avg()` simple y no reacciona a DELETE; quedó para 2.9 en equipo, que nadie hereda hasta etapa final.

---

## 13. Decisiones de equipo pendientes (bloquean código)

1. **Productor de `estado_verificacion='verificado'`** (Samir + María del Sol): extender `approveUser` o crear action de verificación con service_role. Sin esto no hay postulaciones reales. **La más urgente.**
2. **Estados faltantes del proyecto** (Fressia + Samir): el enum de 7 no tiene "recepción cerrada" (RF-35) ni "listo para revisión" (RF-41). Migrar el enum o derivar ambos de datos (fecha vencida / entregable final). Decide también la mecánica del cierre automático (pg_cron vs Edge Function vs cierre perezoso).
3. **`plazo_dias` BD↔SRS** (Errol + Samir): el SRS lo define como columna; la BD lo deriva de fechas. Alinear BD al SRS o documentar la derivación como decisión.
4. **Mecanismo de INSERT en `notificaciones`** (todos): la tabla no tiene policy INSERT — trigger SECURITY DEFINER, pg_cron o service_role. Una sola decisión para RF-33, RF-39 y toda la etapa 2.8.
5. **`comentario_empresario`** (Fressia + Samir): materializar la columna (SQL idempotente ya escrito) o quitarla de `database.ts`. Hoy es un error de runtime esperando a ocurrir (§2.3).
6. **SDK LLM para RF-54** (Errol): dependencia fuera del brief §8.2 — justificar y elegir antes de codificar.
7. **CHECK 1–5 en `calificacion_prototipo`** (Fressia pide, Samir migra): hoy la BD acepta cualquier entero.
8. **Registro de motivo de suspensión** (María del Sol + Samir): columna nueva en `usuarios` vs fila en `auditoria`.
9. **`pendiente→activa`** (equipo): confirmar correo no activa la cuenta (solo admin); coherente con RF-64, contradice la letra de RF-02. Documentarlo o cambiarlo.

---

## 14. Transversal

- **Sin `env.ts`**: 18 `process.env.X!` en 8 archivos, cero validación Zod.
- **Nada escribe `auditoria`; cero rate limiting** fuera del lockout (contador no atómico).
- **Tests:** 2 archivos / 11 tests, todos pasan; `vitest.config.ts` sin coverage ni umbral; el script conserva `--passWithNoTests` (CI verde sin tests).
- **`npx tsc --noEmit` exit 0.** Higiene impecable: sin `any`, sin `@ts-ignore`, `console.*` solo en el logger, sin TODOs. [Seguro]
- **Tipos front vs BD desalineados** (`ProjectStatus` 4 estados en inglés vs 7 en español; `ApplicationStatus` 5 vs 7): toda migración a Supabase implica remapear, no "conectar".
- **Errores crudos en inglés fugan a la UI** (`register:97-98,118`, `reset-password:84-85`, `forgot-password:60`).
- **`docs/pendientes-samir.md` y `distribucion_propuesta.md` borrados del working tree** (sin commitear): decidir si commitear el borrado; esta auditoría ya no los referencia.

---

## 15. Orden recomendado

1. **Hoy (Samir):** fix `getPendingUsers` (1 línea) **+ extender `approveUser` para escribir `estudiantes.estado_verificacion='verificado'`** — sin las dos cosas no existe el flujo real de punta a punta. De paso: quitar `--passWithNoTests` y configurar coverage.
2. **Ruta crítica del producto real (en este orden):** Rony RF-16/17 (INSERT en `empresarios` — primer server action de producto del repo) → Errol RF-19/20/21/22/23 (publicar proyecto real) → Santiago RF-27/29/31/32 (postulación) → Fressia RF-37/34 (adjudicación). Sin empresario persistido no hay proyecto; sin proyecto no hay postulación; sin postulación no hay adjudicación.
3. **En paralelo:** Rachel RF-09/10/11 (no bloquea la cadena, pero RF-34 de Fressia necesita la reputación visible); Samir RF-05/06 — su server action de perfil + upload será la **plantilla** de Storage que copiarán logo (Rony), prototipos (Santiago) y entregables (Fressia).
4. **Reunión corta** para las 9 decisiones de §13 antes de repartir RF-35/37/39/41 y el agente IA.

El riesgo a decir en voz alta: el v3 es ahora la fuente de distribución, pero describe un repo que no existe (componentes vacíos presentados como existentes, columnas renombradas, mecánicas imposibles contra la RLS real). Este documento es el mapa corregido contra el código y la BD reales al 12-jun; sin él, cada integrante va a perder días depurando errores que ya están localizados aquí con archivo y línea.
