GRUPO 7 — PLATAFORMA FWD MARKETPLACE
Tareas Pendientes
por Integrante
Basado en el analisis del repositorio Marketplace_FWD
cruzado con el SRS v1.0 y comentarios de coordinacion — Junio 2026
Samir Rony Rachel Errol Santiago Maria del Sol Fressia
2.1 2.3 2.2 2.4 + 2.10 2.5 Admin 2.6 + 2.7
Secciones 2.8 y 2.9 — Trabajo en equipo en etapa final del sistema: La seccion 2.8 (Comunicacion y Notificaciones,
RF-45 a RF-48) y la seccion 2.9 (Evaluacion de Talento y Reputacion, RF-49 a RF-53) seran abordadas por todo el
equipo en conjunto durante la etapa final del desarrollo, una vez que los modulos individuales esten funcionales y
conectados a Supabase.
Requerimientos No Funcionales (Seccion 3) — Responsabilidad continua: Los RNF no son una tarea separada al
final: cada integrante debe ir satisfaciendolos a medida que completa sus requerimientos funcionales. Ejemplos: al
implementar un formulario se valida y sanitiza la entrada (RNF-06); al subir archivos se respeta el limite de tamano
(RNF-09); al crear rutas se aplica RBAC (RNF-04); al conectar Supabase se confirma HTTPS (RNF-02). Revisar la
seccion 3 del SRS antes de cerrar cada feature.
Grupo 7 — FWD Marketplace | Tareas Pendientes por Integrante | Junio 2026 Pag. 1

Samir
Modulo asignado: 2.1 Gestion de Usuarios y Cuentas
Contexto / Comentario del coordinador: Samir es responsable de toda la capa de autenticacion y gestion de cuentas (RF-01 a RF-08).
Los flujos base existen en el repositorio pero tienen brechas en rutas protegidas, OAuth y rate limiting que deben cerrarse.
Flujo tecnico: frontend fi server action fi Supabase fi BD
RF Requerimiento Que falta / Evidencia del repo
RF-01 Registro con tres roles: Admin, Estudiante, register/page.tsx + signUpWithPassword existen. Verificar que el rol
Empresario Admin solo pueda crearse internamente, no desde el formulario
publico.
RF-02 Verificacion de cuenta por correo (enlace Supabase emailRedirectTo + verify-email/page.tsx funcionan.
caduca en 24h) Confirmar que la cuenta queda en estado "pendiente" hasta
confirmar el enlace.
RF-03 Login con bloqueo temporal tras 5 intentos signInWithPassword con contador en BD existe. Revisar que el
fallidos desbloqueo temporal funciona y el contador se resetea al exito.
RF-04 Recuperacion de contrasena (enlace un solo forgot-password y reset-password pages existen. Confirmar que el
uso, expira en 1h) enlace expira y no puede reutilizarse.
RF-05 Edicion de informacion del perfil con Los cambios deben persistir en Supabase y reflejarse de inmediato
persistencia inmediata en la UI. Verificar revalidatePath tras guardar.
RF-06 Carga de fotografia de perfil JPG/PNG hasta 5 Bucket fotos-perfil con RLS existe. Falta UI de upload: input file +
MB presigned URL a storage.objects en el formulario.
RF-07 Cierre de sesion e invalidacion del token Navbar usa signOut server action. Verificar limpieza completa de
cookies de Supabase en todas las rutas.
RF-08 Autenticacion 2FA opcional (prioridad C) No implementado. Supabase lo soporta nativamente. Exponer toggle
en configuracion de perfil si hay capacidad.
BUG CRITICO: getPendingUsers roto bloquea src/lib/admin/queries.ts:26 compara el rol contra "admin" pero
validacion de estudiantes get_my_role() devuelve "administrador" (seed 20260608000002).
Resultado: err("forbidden") para todo admin real y /admin/validations
muestra lista vacia. Es la primera ficha del domino: sin validar
estudiantes nadie puede postular contra la BD real (la policy exige
estado verificado). Fix de 1 linea: usar requireRole("admin") como ya
hace approveUser en actions.ts:111.
Grupo 7 — FWD Marketplace | Tareas Pendientes por Integrante | Junio 2026 Pag. 2

BUG CRITICO A RESOLVER PRIMERO — getPendingUsers
En src/lib/admin/queries.ts:26 el codigo compara el rol del usuario contra el texto "admin", pero la funcion get_my_role()
de la BD devuelve "administrador" (segun el seed 20260608000002). Por eso todo administrador real recibe un error "
forbidden" y la pantalla /admin/validations aparece vacia. Esto bloquea en cadena la validacion de estudiantes, y sin
estudiantes verificados nadie puede postular contra la BD real. El arreglo es de una sola linea: usar requireRole("admin")
tal como ya lo hace approveUser en actions.ts:111. Es la tarea de mayor prioridad de Samir.
Grupo 7 — FWD Marketplace | Tareas Pendientes por Integrante | Junio 2026 Pag. 3

Rony
Modulo asignado: 2.3 Gestion de Empresarios
Contexto / Comentario del coordinador: Rony construye el modulo completo de empresarios (RF-16 a RF-18). El perfil de empresa
actualmente guarda en StateContext/localStorage y debe conectarse a Supabase. Adicionalmente, Rony da apoyo a Santiago en la
creacion y logica de subir ofertas y prototipos (RF-27 y RF-28), modulo que requiere analisis conjunto antes de implementar. Coordinar con
Maria del Sol en estilizacion.
Flujo tecnico: frontend fi server action fi Supabase fi BD
RF Requerimiento Que falta / Evidencia del repo
RF-16 Perfil del empresario: razon social, sector, CompanyProfileForm.tsx existe pero guarda en
descripcion, logo StateContext/localStorage. Conectar con Supabase tabla
empresarios + bucket logos.
RF-17 Tipo de empresario: empresa formal o Campo companyType en formulario presente. Mapear a
emprendedor individual tipo_empresario_enum al persistir en Supabase.
RF-18 Publicacion de problemas o necesidades de Cubierto en parte por new-project/page.tsx. Verificar que el
negocio empresario puede describir su problema antes de que Errol conecte
el agente IA (RF-54).
Apoyo a Santiago — RF-27 y RF-28: Subida de Ofertas y Prototipos
Rony apoya a Santiago en la creacion y la logica de subir ofertas y prototipos. Este flujo debe analizarse en conjunto
antes de implementar: validacion del estado del proyecto, INSERT en la tabla participaciones, upload al bucket de
prototipos en Supabase Storage y manejo de errores. Coordinar con Santiago para definir claramente las
responsabilidades en el codigo y evitar duplicacion de trabajo.
Grupo 7 — FWD Marketplace | Tareas Pendientes por Integrante | Junio 2026 Pag. 4

Rachel
Modulo asignado: 2.2 Perfil y Portafolio de Estudiantes
Contexto / Comentario del coordinador: Rachel construye el perfil completo del estudiante: habilidades con nivel, portafolio de proyectos
e historial. Debe aplicar la estilizacion de marca de Fresia y coordinar con Maria del Sol para mantener consistencia visual.
Flujo tecnico: frontend fi server action fi Supabase fi BD
RF Requerimiento Que falta / Evidencia del repo
RF-09 Habilidades tecnicas con nivel de dominio Tabla habilidades_tecnicas en BD. Falta pagina de perfil del
(basico/intermedio/avanzado) estudiante con SkillPicker + selector de nivel conectado a Supabase.
RF-10 Portafolio profesional publico o privado segun PortfolioCard.tsx existe como componente. Falta pagina
preferencia /junior/portfolio con toggle de visibilidad y listado persistido.
RF-11 Proyectos en portafolio: titulo, descripcion, Modelo BD presente (portafolio_proyectos). Falta formulario de alta y
tecnologias, fecha server action INSERT/UPDATE conectado a Supabase.
RF-12 Enlace a repositorio Git validado (prioridad S) No implementado. Agregar campo URL en formulario de proyecto
con validacion de formato de repo accesible.
RF-13 Enlace de demo en vivo validado (prioridad S) No implementado. Agregar campo URL con validacion de formato.
RF-14 Historial de proyectos completados con ApplicationCard muestra postulaciones. Falta columna de puntuacion
calificacion desde tabla evaluaciones conectada a Supabase.
RF-15 Exportar perfil como CV en PDF (prioridad C) No implementado. Si hay capacidad: generar PDF desde los datos
del perfil y portafolio del estudiante.
Diseno Mantener estilizacion de marca (coordinacion Fressia envio marca y diseno. Rachel debe aplicar los tokens de
con Maria del Sol) diseno de Fresia/Maria del Sol en todas las vistas de estudiante para
mantener consistencia visual con las vistas de empresa.
Grupo 7 — FWD Marketplace | Tareas Pendientes por Integrante | Junio 2026 Pag. 5

Errol
Modulo asignado: 2.4 Publicacion y Gestion de Proyectos + 2.10 Agente IA
Contexto / Comentario del coordinador: Errol conecta el formulario de proyectos a Supabase con los campos correctos del SRS (area
de negocio, plazo 5-15 dias, catalogo de tecnologias) y construye desde cero el agente conversacional con integracion LLM.
Flujo tecnico: frontend fi server action fi Supabase fi BD
RF Requerimiento Que falta / Evidencia del repo
RF-19 Publicar proyectos con titulo, descripcion y new-project/page.tsx existe pero llama a addProject en StateContext.
categoria Conectar con Supabase: INSERT en tabla proyectos +
revalidatePath.
RF-20 Area de negocio: mercadeo, TI, RH, finanzas, area_negocio en BD pero no expuesto en formulario. Agregar campo
operaciones, etc. Select con categorias del SRS.
RF-21 Plazo de recepcion de ofertas configurable Formulario usa "duration" texto libre. Cambiar a campo numerico con
entre 5 y 15 dias validacion min=5, max=15 y guardar en plazo_dias.
RF-22 Tecnologias requeridas desde catalogo stackInput es texto libre. Reemplazar con SkillPicker que lea de tabla
tecnologias en Supabase.
RF-23 Flag "involucra IA" en proyecto (prioridad S) usa_ia BOOLEAN en BD. Agregar checkbox en formulario de
proyecto.
RF-24 Editar proyectos publicados solo si no estan Sin formulario de edicion. Crear pagina /empresa/projects/[id]/edit
adjudicados con validacion de estado antes de permitir cambios.
RF-25 Maquina de estados del proyecto estado_proyecto_enum en BD. Implementar transiciones: borrador ->
abierto -> en_recepcion -> adjudicado -> en_desarrollo -> finalizado.
RF-26 Busqueda y filtrado por tecnologia, area, fecha SearchBar + ProjectFilters sobre datos locales. Migrar queries a
y categoria Supabase con filtros reales y tiempo de respuesta < 1 segundo.
RF-54 Agente conversacional para empresario sin Tabla conversaciones_ia en BD pero sin UI ni LLM. Crear pagina
conocimientos tecnicos /empresa/new-project/agent con chat UI y llamada a API de IA que
guie al empresario paso a paso.
RF-55 Entrevista sucesiva: preguntas dinamicas El agente formula preguntas sobre objetivo, alcance, usuarios,
segun respuestas previas tecnologias y plazo de forma adaptativa.
RF-56 Detectar cuando la informacion es suficiente y El agente identifica que ya reunio lo necesario y propone finalizar
cerrar la entrevista para generar el proyecto.
Grupo 7 — FWD Marketplace | Tareas Pendientes por Integrante | Junio 2026 Pag. 6

| RF  | Requerimiento | Que falta / Evidencia del repo |
| --- | ------------- | ------------------------------ |
RF-57 Traducir lenguaje de negocio a requerimientos La conversacion se convierte en lista de requerimientos funcionales
lista para publicar.
tecnicos estructurados
RF-58 Revisar, editar y aprobar requerimientos antes Nada generado por el agente se publica sin confirmacion. Agregar
de publicar paso de revision/edicion antes del POST a proyectos.
RF-59 Guardar y reanudar historial con el agente estado en BD existe (conversaciones_ia). Implementar persistencia
|     | (prioridad S) | del historial y carga al retomar la sesion. |
| --- | ------------- | ------------------------------------------- |
RF-60 Sugerir tecnologias apropiadas mediante IA Devolver stack sugerido y justificado para el proyecto.
(prioridad S)
RF-61 Recomendar estudiantes verificados segun Query a Supabase que cruza habilidades del proyecto con
|     | habilidades | habilidades_tecnicas de estudiantes verificados. |
| --- | ----------- | ------------------------------------------------ |
RF-62 Matching de perfiles y proyectos con score Calcular score de afinidad explicable entre perfil y proyecto.
(prioridad S)
Grupo 7 — FWD Marketplace  |  Tareas Pendientes por Integrante  |  Junio 2026 Pag. 7

Santiago
Modulo asignado: 2.5 Gestion de Ofertas y Prototipos
Contexto / Comentario del coordinador: Santiago conecta el flujo completo de postulacion: envio de oferta con prototipo, retiro, consulta
de estado y notificacion al vencer el plazo. ApplyForm existe pero opera sobre mock data y debe migrarse a Supabase.
Flujo tecnico: frontend fi server action fi Supabase fi BD
RF Requerimiento Que falta / Evidencia del repo
APOYO APOYO DE RONY — Analisis conjunto Rony apoya a Santiago en la creacion y logica de subir ofertas y
requerido para RF-27 y RF-28 prototipos. Antes de implementar se debe analizar en conjunto:
validacion del estado del proyecto, INSERT en participaciones,
upload al bucket prototipos y manejo de errores. Coordinar con Rony
antes de escribir codigo en estos dos RF.
RF-27 Enviar oferta a proyecto abierto dentro del plazo ApplyForm.tsx existe pero guarda en StateContext. Conectar con
Supabase INSERT en participaciones estado="enviada". Validar que
el proyecto este abierto y dentro del plazo.
RF-28 Subir prototipo funcional como parte de la oferta Bucket prototipos con RLS existe. Falta UI de upload en ApplyForm:
input file + upload a storage antes del INSERT.
RF-29 Propuesta de solucion y planteamiento en la ApplyForm incluye carta y planteamiento. Confirmar que persiste en
oferta columnas carta_presentacion y planteamiento_solucion en BD.
RF-30 Propuesta tecnica y documentacion adjunta Bucket prototipos permite PDF. Agregar input de archivo adicional en
PDF (prioridad S) ApplyForm para documentacion complementaria.
RF-31 Retirar oferta enviada si no ha sido adjudicada No hay accion de retiro. Agregar boton en applications/page.tsx y
server action UPDATE participaciones SET estado="retirada" con
validacion de estado actual.
RF-32 Consultar estado de ofertas propias applications/page.tsx + ApplicationCard existen sobre StateContext.
Conectar con query Supabase filtrado por id_usuario actual.
RF-33 Notificar proximidad de vencimiento del plazo No implementado. Puede hacerse con una notificacion en plataforma
(prioridad S) generada por trigger o Edge Function cuando quedan menos de 24h.
Grupo 7 — FWD Marketplace | Tareas Pendientes por Integrante | Junio 2026 Pag. 8

Maria del Sol
Modulo asignado: Panel de Administracion (Seccion 2.11 del SRS) + Apoyo en Diseno
Contexto / Comentario del coordinador: La seccion 2.11 (RF-63 a RF-69) cubre la Administracion del sistema y se confirmo que SI esta
en el SRS v1.0. Maria del Sol implementa el panel admin y adicionalmente apoya a Rony y Rachel en que las vistas de empresa y
estudiante respeten la estilizacion de marca entregada por Fresia.
Flujo tecnico: frontend fi server action fi Supabase fi BD
RF Requerimiento Que falta / Evidencia del repo
Admin Panel de administracion: gestion de usuarios admin/validations/page.tsx lista pendientes + ApproveUserButton.
Ampliar con: busqueda por nombre/correo, filtro por rol, ver detalle de
cuenta y editar estado.
Admin Validacion de egresados FWD (cotejo base de approveUser server action existe pero aprueba sin verificar egreso
datos) real. Integrar con endpoint/tabla de egresados FWD CR.
Admin Suspender y reactivar cuentas con registro de Gate de suspension en middleware OK. Falta boton en panel admin
motivo con server action que use service_role y registre el motivo.
Admin Eliminar proyectos que incumplan politicas con updateProjectStatus en admin dashboard existe. Agregar campo de
notificacion motivo obligatorio y notificacion al empresario afectado.
Admin Reportes administrativos exportables CSV/PDF No implementado. Agregar pagina /admin/reports con filtros de fecha
(prioridad S) y exportacion de usuarios, proyectos y actividad.
Admin Gestion de catalogos: tecnologias, categorias, Sin UI de administracion de catalogos. Crear CRUD en el panel
habilidades (prioridad S) admin para que el administrador agregue, edite o desactive items.
Diseno Apoyo a Rony en estilizacion de vistas de Aplicar los tokens de marca entregados (colores, tipografia,
empresa espaciado) en las vistas de CompanyProfileForm y dashboards de
empresa asegurando consistencia con el resto del sistema.
Diseno Apoyo a Rachel en estilizacion de vistas de Revisar que las vistas de portafolio, habilidades y perfil de estudiante
estudiante apliquen la misma estilizacion de marca. Coordinar con Rachel antes
de merge para evitar inconsistencias.
Nota La seccion de Administracion no esta explicita Se verifico el documento SRS: la seccion 2.11 (RF-63 a RF-69)
en el SRS v1.0 cubre la Administracion del sistema. Maria del Sol es la responsable
de implementar esos requerimientos en el panel admin.
Grupo 7 — FWD Marketplace | Tareas Pendientes por Integrante | Junio 2026 Pag. 9

Fressia
Modulo asignado: 2.6 Revision, Calificacion y Adjudicacion + 2.7 Desarrollo y Entregables
Contexto / Comentario del coordinador: Fressia construye el flujo de adjudicacion completo: que el empresario pueda revisar, calificar y
adjudicar ofertas, y que el estudiante adjudicado pueda subir hitos y entregables finales con versionado. El RF-38 (contacto
post-adjudicacion) se conectara con la mensajeria interna en la etapa final (2.8).
Flujo tecnico: frontend fi server action fi Supabase fi BD
RF Requerimiento Que falta / Evidencia del repo
RF-34 Empresario revisa ofertas con prototipo, empresa/page.tsx muestra ApplicationCard con datos basicos. Falta:
propuesta y reputacion mostrar URL del prototipo, reputacion del estudiante y propuesta
completa para comparar ofertas.
RF-35 Cierre automatico de recepcion al vencer el Sin job de cierre. Implementar con Supabase Edge Function o cron
plazo que ejecute UPDATE proyectos SET estado="en_recepcion" cuando
fecha_cierre <= now().
RF-36 Calificar ofertas y prototipos presentados (1 a 5 Sin UI ni server action. Agregar componente de estrellas en vista del
estrellas) empresario + UPDATE participaciones SET calificacion=N.
RF-37 Adjudicar el proyecto a la oferta elegida Boton existe pero actualiza StateContext. Crear server action que
llame a crear_contratacion_al_adjudicar (trigger BD) y cambie estado
del proyecto a "adjudicado".
RF-38 Habilitar contacto entre empresario y handleContactCandidate abre mailto: como solucion temporal.
estudiante adjudicado Conectar con la mensajeria interna (RF-45) cuando este disponible
en la etapa final del sistema.
RF-39 Notificar a candidatos no seleccionados con Sin notificacion. Al adjudicar, marcar resto de participaciones como "
resultado no_seleccionada" y generar notificacion en plataforma.
RF-40 Subir entregables parciales (hitos) asociados al Tabla entregables en BD + bucket existe con RLS. Falta UI para que
proyecto el estudiante suba hitos desde su dashboard.
RF-41 Subir entregable final que marque el proyecto Mismo bucket entregables. Falta UI de upload y server action que
como listo cambie estado del proyecto a "listo_para_revision".
RF-42 Versionado de entregables con historial Campo version INTEGER en BD. Falta logica de incremento
(prioridad S) automatico y listado de versiones en UI.
RF-43 Descarga de entregables por el empresario RLS del bucket entregables permite lectura al empresario. Falta
propietario boton de descarga en la vista del empresario.
Grupo 7 — FWD Marketplace | Tareas Pendientes por Integrante | Junio 2026 Pag. 10

| RF  | Requerimiento | Que falta / Evidencia del repo |
| --- | ------------- | ------------------------------ |
RF-44 Aprobar entregable o solicitar cambios con comentarios_entregables en BD + tipo_comentario_enum existe.
Falta UI de aprobacion/rechazo y server action de respuesta.
comentarios (prioridad S)
Grupo 7 — FWD Marketplace  |  Tareas Pendientes por Integrante  |  Junio 2026 Pag. 11

Reglas del Equipo — Grupo 7
Acuerdos de trabajo y coordinacion
1 Reuniones en Pull Requests
Toda revision de PR debe realizarse con la mayoria del equipo presente. Si el cambio es critico o hay conflicto,
se convoca a todos los integrantes. No se hace merge sin revision colectiva.
2 Status diario al profesor via Slack
Al final de cada dia cada integrante reporta su avance al profesor a traves de Slack. El reporte debe indicar que
se hizo, que sigue pendiente y si hay algun bloqueo.
3 Reunion a convocatoria del profesor
El profesor puede convocar a reunion en cualquier momento. La asistencia es obligatoria. Lo que se busca es ver
el DEV principal corriendo, por lo que todos los integrantes del equipo de desarrollo deben tener siempre
disponible y corriendo la version final del proyecto al momento de ser solicitado.
4 Responsabilidad compartida sobre todas las tareas
Aunque cada modulo tiene un responsable asignado, todo el equipo debe estar al tanto del avance general. Si
algun integrante va atrasado o tiene un bloqueo, el resto del equipo debe apoyarlo. La division de
responsabilidades no es razon para ignorar lo que ocurre fuera del modulo propio: todos son responsables de
que el proyecto avance en conjunto.
5 Los errores se resuelven como equipo
Un error de codigo, un bug o algo mal en el repositorio NO es sinonimo de que el proyecto fallo. Si algo no
funciona o esta mal, se soluciona como equipo, independientemente de donde provenga el error. Ningun
integrante enfrenta un problema solo.
Documento generado a partir del analisis del repositorio github.com/ErrolFallas/Marketplace_FWD y el SRS v1.0 — Plataforma de Conexion
de Talento Tecnologico. Junio 2026.
Grupo 7 — FWD Marketplace | Tareas Pendientes por Integrante | Junio 2026 Pag. 12