PLATAFORMA DE
CONEXIÓN DE
TALENTO TECNOLÓGICO
Ecosistema digital que conecta a empresarios con estudiantes de áreas tecnológicas mediante proyectos
reales de desarrollo web.
Versión 1.0 · 03/06/2026
Documento técnico · Confidencial

Plataforma de Conexión de Talento Tecnológico SRS · v1.0
Contenido
1. Introducción
1.1 Naturaleza del Proyecto y Libertad Tecnológica
1.2 Propósito del documento
1.3 Alcance
1.4 Convención de prioridad (MoSCoW)
2. Requerimientos Funcionales
2.1 Gestión de Usuarios y Cuentas
2.2 Perfil y Portafolio Profesional
2.3 Gestión de Empresarios + Validación de Estudiantes FWD
2.4 Publicación y Gestión de Proyectos
2.5 Ofertas y Prototipos
2.6 Revisión, Calificación y Adjudicación
2.7 Desarrollo y Entregables
2.8 Comunicación y Notificaciones
2.9 Evaluación de Talento y Reputación
2.10 Agente Conversacional e Inteligencia Artificial
2.11 Administración
3. Requerimientos No Funcionales
3.1 – 3.9 Seguridad, Rendimiento, Disponibilidad, Escalabilidad, Usabilidad, Mantenibilidad,
Integración, IA, Privacidad
4. Modelo de Datos Sugerido
4.1 Entidades y Atributos
4.2 Relaciones entre Entidades
5. Stacks Tecnológicos Sugeridos
Documento confidencial Página 2

Plataforma de Conexión de Talento Tecnológico SRS · v1.0
1. Introducción
1.1 Naturaleza del Proyecto y Libertad Tecnológica
Este es un proyecto completamente nuevo (greenfield), desarrollado desde cero, sin depender de sistemas,
código base ni infraestructura heredada. No existe ninguna solución previa que deba mantenerse o sobre la que
haya que construir.
Existe total libertad de desarrollo: el equipo puede elegir cualquier stack tecnológico para la creación de la
plataforma —lenguajes de programación, frameworks, bases de datos, servicios en la nube, proveedores de
inteligencia artificial y herramientas de soporte— siempre que se satisfagan los requerimientos funcionales y no
funcionales definidos en este documento. Las tecnologías mencionadas a modo de ejemplo son ilustrativas y no
prescriptivas; la decisión final del stack queda a criterio del equipo de desarrollo.
1.2 Propósito del documento
Este documento define los requerimientos funcionales y no funcionales de la plataforma, estableciendo de forma
precisa y verificable las capacidades que el sistema debe ofrecer. Sirve como referencia común para los equipos
de diseño, desarrollo, pruebas y gestión del proyecto.
1.3 Alcance
La plataforma conecta a empresarios (empresas formales y emprendedores) con estudiantes de áreas
tecnológicas mediante proyectos reales de desarrollo. A través de la plataforma, las organizaciones pueden
solicitar soluciones tecnológicas orientadas a diferentes áreas de negocio, como mercadeo, tecnología de la
información (TI), recursos humanos (RH), finanzas, operaciones, servicio al cliente, logística, ventas y análisis de
datos, entre otras. Estas soluciones pueden incluir aplicaciones web y móviles, automatizaciones de procesos,
herramientas basadas en inteligencia artificial, dashboards, integraciones de sistemas y plataformas
personalizadas que contribuyan a mejorar la eficiencia y la productividad de las empresas.
El sistema contempla tres roles: Administrador, Estudiante y Empresario. Un agente conversacional acompaña al
empresario sin conocimientos técnicos para transformar su idea en requerimientos; estos se publican como una
oferta a la que los estudiantes responden, dentro de un plazo elegido por el empresario (entre 5 y 15 días),
enviando un prototipo y una propuesta. El empresario revisa y califica las ofertas y adjudica el proyecto a la que
elija. Solo los estudiantes verificados como egresados de FWD Costa Rica pueden participar.
1.4 Convención de prioridad (MoSCoW)
Cada requerimiento se clasifica según su prioridad de implementación:
M Must — Crítico para el MVP. Imprescindible.
S Should — Importante, pero no bloquea el lanzamiento.
C Could — Deseable; se incluye si hay capacidad.
W Won't now — Fuera del alcance inicial; futuro.
Documento confidencial Página 3

Plataforma de Conexión de Talento Tecnológico SRS · v1.0
2. Requerimientos Funcionales
2.1 Gestión de Usuarios y Cuentas
ID Requerimiento Pri. Criterio de aceptación
Registro de usuarios con uno de tres El usuario elige rol; el sistema crea la cuenta con los permisos
roles: Administrador, Estudiante o correspondientes y envía correo de verificación. El rol Empresario
RF-01 M
Empresario, seleccionado durante el engloba tanto a empresas formales como a emprendedores
alta. individuales.
Verificación de cuenta mediante enlace La cuenta permanece «pendiente» hasta confirmar el enlace, que
RF-02 M
enviado al correo registrado. expira en 24 horas.
Inicio de sesión con correo electrónico y Credenciales válidas inician sesión; tras 5 intentos fallidos la cuenta se
RF-03 M
contraseña. bloquea temporalmente.
Recuperación de contraseña vía correo
RF-04 M El enlace de restablecimiento es de un solo uso y expira en 1 hora.
electrónico.
RF-05 Edición de la información del perfil. M Los cambios se persisten y se reflejan de inmediato.
RF-06 Carga de fotografía de perfil. S Acepta JPG/PNG de hasta 5 MB; valida formato y tamaño.
Cierre de sesión y gestión de sesiones
RF-07 M El usuario puede cerrar sesión y el token se invalida.
activas.
Autenticación de dos factores (2FA)
RF-08 C El usuario puede activar 2FA por correo o aplicación autenticadora.
opcional.
2.2 Perfil y Portafolio Profesional (Estudiante)
ID Requerimiento Pri. Criterio de aceptación
Registro de habilidades técnicas con
RF-09 M Selección desde un catálogo con nivel básico, intermedio o avanzado.
nivel de dominio.
Visible públicamente o solo para empresas, según preferencia del
RF-10 Creación de un portafolio profesional. M
usuario.
Agregar proyectos realizados al
RF-11 M Cada proyecto incluye título, descripción, tecnologías y fecha.
portafolio.
RF-12 Adjuntar enlaces a repositorios Git. S El sistema valida que la URL sea un repositorio accesible.
Adjuntar enlaces de demostración (demo
RF-13 S Valida el formato de la URL.
en vivo).
Mostrar el historial de proyectos
RF-14 M Se listan automáticamente los proyectos finalizados con su calificación.
completados en la plataforma.
RF-15 Exportación del perfil como CV en PDF. C El usuario descarga un PDF con sus datos, habilidades y proyectos.
2.3 Gestión de Empresarios (Empresas y Emprendedores)
ID Requerimiento Pri. Criterio de aceptación
El empresario registra nombre o razón social, sector, descripción y
Creación y administración del perfil del
RF-16 M logo. El perfil admite tanto empresas formales como emprendedores
empresario.
individuales.
Documento confidencial Página 4

Plataforma de Conexión de Talento Tecnológico SRS · v1.0
| ID  | Requerimiento | Pri. | Criterio de aceptación |
| --- | ------------- | ---- | ---------------------- |
El empresario indica si actúa como empresa formal o como
Identificación del tipo de empresario:
RF-17 M emprendedor individual; la validación de identidad se adapta a cada
empresa o emprendedor.
caso.
Publicación de problemas o necesidades El empresario describe un problema o idea de negocio que origina un
| RF-18 |     | M   |     |
| ----- | --- | --- | --- |
por parte del empresario. proyecto, incluso sin conocimientos técnicos.
2.4  Publicación y Gestión de Proyectos
| ID  | Requerimiento | Pri. | Criterio de aceptación |
| --- | ------------- | ---- | ---------------------- |
Publicar proyectos con título, descripción
RF-19 M El proyecto se publica solo si los campos obligatorios están completos.
y categoría.
Indicar el área de negocio a la que se Selección entre áreas como mercadeo, TI, RH, finanzas, operaciones,
| RF-20 |     | M   |     |
| ----- | --- | --- | --- |
orienta la solución. servicio al cliente, logística, ventas o análisis de datos, entre otras.
Definir el plazo de recepción de ofertas, El empresario elige la duración (mínimo 5, máximo 15 días); el sistema
| RF-21                           |     | M                                   |     |
| ------------------------------- | --- | ----------------------------------- | --- |
| configurable entre 5 y 15 días. |     | rechaza valores fuera de ese rango. |     |
RF-22 Indicar tecnologías requeridas. M Selección desde el catálogo de tecnologías.
Indicar si el proyecto involucra
| RF-23 |     | S Campo booleano visible en el detalle del proyecto. |     |
| ----- | --- | ---------------------------------------------------- | --- |
inteligencia artificial.
Editable solo mientras no haya ofertas adjudicadas; los cambios
| RF-24 Editar proyectos publicados. |     | M   |     |
| ---------------------------------- | --- | --- | --- |
notifican a los oferentes.
Cambiar el estado del proyecto (abierto,
El estado refleja el ciclo de vida y restringe las acciones según
| RF-25 en recepción de ofertas, adjudicado, en |     | M   |     |
| --------------------------------------------- | --- | --- | --- |
corresponda.
desarrollo, cerrado, cancelado).
Búsqueda y filtrado de proyectos por
RF-26 tecnología, área de negocio, fecha y M Los resultados se filtran y devuelven en menos de 1 segundo.
categoría.
2.5  Ofertas y Prototipos (Estudiante)
| ID  | Requerimiento | Pri. | Criterio de aceptación |
| --- | ------------- | ---- | ---------------------- |
Enviar una oferta a un proyecto abierto No se permite ofertar dos veces al mismo proyecto ni en proyectos
| RF-27 |     | M   |     |
| ----- | --- | --- | --- |
dentro del plazo definido. cuyo plazo ha vencido o que están cerrados.
Desarrollar y subir un prototipo como La oferta incluye un prototipo funcional o demostrativo (archivo y/o
| RF-28               |     | M                                        |     |
| ------------------- | --- | ---------------------------------------- | --- |
| parte de la oferta. |     | enlace) que el empresario podrá revisar. |     |
Incluir en la oferta una propuesta de El estudiante describe cómo resolverá el problema (enfoque, alcance
| RF-29 |     | M   |     |
| ----- | --- | --- | --- |
solución y su planteamiento. del prototipo y plan); esta propuesta se muestra al empresario.
Adjuntar propuesta técnica y
RF-30 S Acepta texto y archivos (PDF u otros) hasta un límite definido.
documentación complementaria.
Retirar una oferta enviada. M Solo si la oferta aún no ha sido adjudicada y el plazo no ha vencido.
RF-31
Consultar el estado de las ofertas
RF-32 M Muestra el estado: enviada, en revisión, adjudicada o no seleccionada.
propias.
Notificar al estudiante la proximidad del
RF-33 S El sistema avisa antes de que cierre la ventana de ofertas.
vencimiento del plazo.
2.6  Revisión, Calificación y Adjudicación (Empresario)
Documento confidencial Página 5

Plataforma de Conexión de Talento Tecnológico SRS · v1.0
| ID  | Requerimiento | Pri. | Criterio de aceptación |
| --- | ------------- | ---- | ---------------------- |
Revisar las ofertas recibidas con su Lista las ofertas con el perfil del estudiante, su reputación, el prototipo y
| RF-34                  |     | M                               |     |
| ---------------------- | --- | ------------------------------- | --- |
| prototipo y propuesta. |     | la propuesta, para compararlas. |     |
Cierre automático de la recepción de Al cumplirse los días definidos (5 a 15), el proyecto deja de aceptar
| RF-35                       |     | M               |     |
| --------------------------- | --- | --------------- | --- |
| ofertas al vencer el plazo. |     | nuevas ofertas. |     |
El empresario asigna una calificación a cada oferta (p. ej. 1 a 5
Calificar las ofertas y prototipos
RF-36 M estrellas) y puede dejar comentarios; la calificación apoya la
presentados por los estudiantes.
comparación y la decisión.
El empresario selecciona una oferta; el sistema registra la adjudicación
| RF-37 Adjudicar el proyecto a la oferta elegida. |     | M   |     |
| ------------------------------------------------ | --- | --- | --- |
y notifica a los involucrados.
Habilitar el contacto entre empresario y Tras la adjudicación, ambos pueden comunicarse para coordinar la
| RF-38                  |     | M                                   |     |
| ---------------------- | --- | ----------------------------------- | --- |
| estudiante adjudicado. |     | entrega y los detalles del trabajo. |     |
Descartar las ofertas no seleccionadas
RF-39 M Los estudiantes no elegidos reciben notificación del resultado.
con notificación.
Documento confidencial Página 6

Plataforma de Conexión de Talento Tecnológico SRS · v1.0
2.7 Desarrollo y Entregables
ID Requerimiento Pri. Criterio de aceptación
RF-40 Subir entregables parciales (hitos). M Asociados a un proyecto adjudicado; registra fecha y autor.
RF-41 Subir el entregable final. M Marca el proyecto como listo para revisión del empresario.
RF-42 Versionado de entregables. S Cada nueva carga conserva las versiones previas con su historial.
Descarga de entregables por parte del
RF-43 M Accesible solo para el empresario propietario del proyecto.
empresario.
Aprobación o solicitud de cambios sobre
RF-44 S El empresario aprueba o devuelve con comentarios; queda registrado.
un entregable.
2.8 Comunicación y Notificaciones
ID Requerimiento Pri. Criterio de aceptación
Mensajería interna entre estudiante y
RF-45 M Hilo de conversación por proyecto; no editable tras enviar.
empresario.
Enviadas ante eventos clave: adjudicación, vencimiento de plazo,
RF-46 Notificaciones por correo electrónico. M
mensaje y entregable.
RF-47 Notificaciones dentro de la plataforma. M Centro de notificaciones con estado leído / no leído.
Preferencias de notificación
RF-48 C El usuario activa o desactiva los tipos de notificación.
configurables.
2.9 Evaluación de Talento y Reputación
ID Requerimiento Pri. Criterio de aceptación
Calificar al estudiante al cierre del Solo el empresario contratante puede calificar y únicamente tras
RF-49 M
proyecto (1 a 5 estrellas). finalizar el proyecto.
Registrar comentarios sobre el
RF-50 M El comentario se asocia a la calificación y al proyecto.
desempeño.
Calcular la reputación acumulada del
RF-51 M Promedio ponderado de calificaciones, visible en el perfil.
estudiante.
RF-52 Generar rankings de estudiantes. S Ranking por reputación, filtrable por tecnología o categoría.
Permitir réplica del estudiante a una
RF-53 C El estudiante puede responder una vez a un comentario recibido.
calificación.
Documento confidencial Página 7

Plataforma de Conexión de Talento Tecnológico SRS · v1.0
2.10  Agente Conversacional e Inteligencia Artificial
| ID  | Requerimiento | Pri. | Criterio de aceptación |
| --- | ------------- | ---- | ---------------------- |
Agente conversacional que guía al El empresario envía su idea o problema y el agente lo acompaña paso
| RF-54                                  |     | M                                |     |
| -------------------------------------- | --- | -------------------------------- | --- |
| empresario sin conocimientos técnicos. |     | a paso para definir el proyecto. |     |
Realizar preguntas sucesivas El agente formula muchas preguntas de seguimiento según las
RF-55 (entrevista) para reunir los M respuestas previas, cubriendo objetivo, alcance, usuarios, tecnologías
| requerimientos. |     | y plazo. |     |
| --------------- | --- | -------- | --- |
Detectar cuándo la información es El agente identifica que ya reunió lo necesario y propone finalizar para
| RF-56                              |     | M                    |     |
| ---------------------------------- | --- | -------------------- | --- |
| suficiente y cerrar la entrevista. |     | generar el proyecto. |     |
Traducir el lenguaje no técnico del
La conversación se convierte en una lista de requerimientos
| RF-57 empresario en requerimientos técnicos |     | M   |     |
| ------------------------------------------- | --- | --- | --- |
funcionales lista para publicar.
estructurados.
Permitir revisar, editar y aprobar los Nada generado por el agente se publica sin la confirmación del
M
RF-58
| requerimientos antes de publicarlos. |     | empresario. |     |
| ------------------------------------ | --- | ----------- | --- |
Guardar y reanudar el historial de la
RF-59 S El empresario puede retomar la entrevista donde la dejó.
conversación con el agente.
Sugerir tecnologías apropiadas mediante
RF-60 S Devuelve un stack sugerido y justificado para el proyecto.
IA.
Recomendar estudiantes verificados Lista priorizada de candidatos con porcentaje de coincidencia, solo
| RF-61                            |     | M                              |     |
| -------------------------------- | --- | ------------------------------ | --- |
| según habilidades y experiencia. |     | entre estudiantes verificados. |     |
Analizar coincidencias entre perfiles y
| RF-62 |     | S Calcula un score de afinidad explicable. |     |
| ----- | --- | ------------------------------------------ | --- |
proyectos (matching).
2.11  Administración
| ID  | Requerimiento | Pri. | Criterio de aceptación |
| --- | ------------- | ---- | ---------------------- |
Gestión de usuarios por parte del Buscar, ver y editar los estados de las cuentas (administrador,
| RF-63          |     | M                        |     |
| -------------- | --- | ------------------------ | --- |
| administrador. |     | estudiante, empresario). |     |
Validación de estudiantes como Mediante el agente validador, el administrador aprueba o rechaza
M
RF-64
egresados de FWD Costa Rica. estudiantes cotejando el título contra la base de datos de egresados.
RF-65 Suspender o reactivar cuentas. M La cuenta suspendida no puede iniciar sesión; se registra el motivo.
Eliminar proyectos que incumplan
| RF-66 |     | M Requiere motivo y notifica al empresario. |     |
| ----- | --- | ------------------------------------------- | --- |
políticas.
Generar reportes administrativos de
| RF-67 |     | S Exportables a CSV/PDF con filtros de fecha. |     |
| ----- | --- | --------------------------------------------- | --- |
usuarios, proyectos y actividad.
Gestión de catálogos (tecnologías,
S El administrador agrega, edita o desactiva ítems del catálogo.
RF-68
categorías y habilidades).
Moderación de reportes de usuarios por
| RF-69 |     | C Cola de reportes con acciones de resolución. |     |
| ----- | --- | ---------------------------------------------- | --- |
contenido o conducta.
Documento confidencial Página 8

| Plataforma de Conexión de Talento Tecnológico |     | SRS · v1.0 |
| --------------------------------------------- | --- | ---------- |
3.  Requerimientos No Funcionales
3.1  Seguridad
| ID  | Requerimiento | Pri. |
| --- | ------------- | ---- |
RNF-01 Las contraseñas se almacenan con funciones de hash adaptativas (bcrypt / Argon2), nunca en texto plano. M
RNF-02 Toda la comunicación se realiza sobre HTTPS / TLS 1.2 o superior. M
RNF-03 Autenticación basada en tokens (JWT o equivalente) con expiración y refresco. M
| RNF-04 Control de acceso basado en roles (RBAC). |     | M   |
| ------------------------------------------------ | --- | --- |
RNF-05 Registro de eventos de auditoría para acciones sensibles. S
RNF-06 Validación y sanitización de entradas para prevenir inyección y XSS. M
RNF-07 Límite de tasa (rate limiting) en los endpoints críticos. S
| RNF-08 Análisis antivirus de los archivos subidos. |     | C   |
| -------------------------------------------------- | --- | --- |
3.2  Rendimiento
| ID  | Requerimiento | Pri. |
| --- | ------------- | ---- |
RNF-09 Tiempo de respuesta promedio menor o igual a 2 segundos bajo carga normal. M
| RNF-10 Soporte de al menos 5.000 usuarios concurrentes. |     | S   |
| ------------------------------------------------------- | --- | --- |
| RNF-11 Búsquedas resueltas en menos de 1 segundo.       |     | M   |
3.3  Disponibilidad y Continuidad
| ID                                               | Requerimiento | Pri. |
| ------------------------------------------------ | ------------- | ---- |
| RNF-12 Disponibilidad mínima del 99,5 % mensual. |               | S    |
RNF-13 Respaldos automáticos diarios con retención definida. M
RNF-14 Plan de recuperación ante desastres con RPO y RTO documentados. C
3.4  Escalabilidad
| ID                                                       | Requerimiento | Pri. |
| -------------------------------------------------------- | ------------- | ---- |
| RNF-15 Arquitectura que permita escalamiento horizontal. |               | M    |
RNF-16 Soporte de crecimiento hasta 100.000 usuarios registrados. S
| Documento confidencial |     | Página 9 |
| ---------------------- | --- | -------- |

| Plataforma de Conexión de Talento Tecnológico |     | SRS · v1.0 |
| --------------------------------------------- | --- | ---------- |
3.5  Usabilidad y Accesibilidad
| ID                                                    | Requerimiento | Pri. |
| ----------------------------------------------------- | ------------- | ---- |
| RNF-17 Interfaz responsive para dispositivos móviles. |               | M    |
RNF-18 Compatibilidad con los principales navegadores modernos. M
| RNF-19 Registro completable en menos de 5 minutos. |     | S   |
| -------------------------------------------------- | --- | --- |
RNF-20 Cumplimiento de las pautas de accesibilidad WCAG 2.1 nivel AA. C
RNF-21 Interfaz en español, preparada para internacionalización (i18n). S
| Documento confidencial |     | Página 10 |
| ---------------------- | --- | --------- |

| Plataforma de Conexión de Talento Tecnológico |     | SRS · v1.0 |
| --------------------------------------------- | --- | ---------- |
3.6  Mantenibilidad
| ID  | Requerimiento | Pri. |
| --- | ------------- | ---- |
RNF-22 Código conforme a los estándares de desarrollo de la organización. M
| RNF-23 Arquitectura modular.                         |     | M   |
| ---------------------------------------------------- | --- | --- |
| RNF-24 Documentación técnica mantenida y versionada. |     | S   |
Cobertura de pruebas automatizadas mínima definida (p. ej. ‡ 70 %).
| RNF-25 |     | S   |
| ------ | --- | --- |
3.7  Integración
| ID                                               | Requerimiento | Pri. |
| ------------------------------------------------ | ------------- | ---- |
| API REST documentada para integraciones futuras. |               | M    |
RNF-26
| RNF-27 Integración con servicios de IA externos.        |     | M   |
| ------------------------------------------------------- | --- | --- |
| RNF-28 Integración con GitHub.                          |     | S   |
| RNF-29 Integración con servicios de correo electrónico. |     | M   |
RNF-30 Integración con la base de datos de egresados de FWD Costa Rica para la validación de estudiantes. M
3.8  Inteligencia Artificial
| ID  | Requerimiento | Pri. |
| --- | ------------- | ---- |
S
RNF-31 Recomendaciones de IA generadas en menos de 10 segundos.
RNF-32 Registro de las solicitudes procesadas por IA para auditoría. M
RNF-33 Modelos de IA reemplazables sin afectar el resto de la plataforma (capa de abstracción). M
RNF-34 Mecanismo de respaldo (fallback) ante fallo o indisponibilidad del proveedor de IA. S
3.9  Cumplimiento y Privacidad
| ID  | Requerimiento | Pri. |
| --- | ------------- | ---- |
RNF-35 Cumplimiento de la normativa de protección de datos aplicable. M
RNF-36 Aceptación de términos y condiciones antes del uso de la plataforma. M
RNF-37 Eliminación de datos personales bajo solicitud del usuario. M
RNF-38 Consentimiento explícito para el procesamiento de datos por IA y para el cotejo con la base de egresados FWD. S
| Documento confidencial |     | Página 11 |
| ---------------------- | --- | --------- |

| Plataforma de Conexión de Talento Tecnológico   |               | SRS · v1.0 |
| ----------------------------------------------- | ------------- | ---------- |
| ID                                              | Requerimiento | Pri.       |
| RNF-39 Política de retención de datos definida. |               | C          |
| Documento confidencial                          |               | Página 12  |

Plataforma de Conexión de Talento Tecnológico SRS · v1.0
4.  Modelo de Datos Sugerido
Importante: esta es una propuesta orientativa, no definitiva.
El modelo de datos que se presenta a continuación es una sugerencia inicial pensada como punto de partida. Es muy
probable que cambie a medida que el proyecto avanza: aparecerán nuevos atributos, se ajustarán relaciones, se
normalizarán o desnormalizarán tablas y surgirán entidades que hoy no se contemplan.
Por ello, el análisis propio del modelo durante el diseño y la construcción es fundamental. El equipo debe validar,
cuestionar y adaptar esta estructura a las decisiones técnicas, al stack elegido y a los requerimientos que se vayan
refinando. Tómese como una base de trabajo, no como un esquema cerrado.
A continuación se describen las entidades principales con sus atributos y tipos aproximados, seguidas de las
relaciones entre ellas. PK indica clave primaria y FK clave foránea.
4.1  Entidades y Atributos
Usuario
| Atributo   | Tipo          | Llave                               | Descripción |
| ---------- | ------------- | ----------------------------------- | ----------- |
| id_usuario | UUID / BIGINT | PK Identificador único del usuario. |             |
| nombre     | VARCHAR       | Nombre completo o razón social.     |             |
| correo     | VARCHAR       | Correo electrónico, único.          |             |
contrasena_hash VARCHAR Contraseña almacenada con hash (bcrypt / Argon2).
| rol            | ENUM      | Administrador, Estudiante o Empresario. |     |
| -------------- | --------- | --------------------------------------- | --- |
| foto_perfil    | VARCHAR   | Ruta o URL de la fotografía.            |     |
| estado_cuenta  | ENUM      | Activa, pendiente, suspendida.          |     |
| fecha_registro | TIMESTAMP | Fecha de creación de la cuenta.         |     |
Estudiante
| Atributo | Tipo | Llave | Descripción |
| -------- | ---- | ----- | ----------- |
id_estudiante UUID / BIGINT PK Identificador del perfil de estudiante.
| id_usuario | UUID / BIGINT | FK Referencia a Usuario. |     |
| ---------- | ------------- | ------------------------ | --- |
titulo_fwd VARCHAR Título o identificador de egresado de FWD Costa Rica.
| estado_verificacion | ENUM | Pendiente, verificado o rechazado. |     |
| ------------------- | ---- | ---------------------------------- | --- |
reputacion DECIMAL Reputación acumulada (promedio ponderado).
| descripcion | TEXT | Resumen profesional del estudiante. |     |
| ----------- | ---- | ----------------------------------- | --- |
Documento confidencial Página 13

Plataforma de Conexión de Talento Tecnológico SRS · v1.0
Empresario
| Atributo | Tipo | Llave | Descripción |
| -------- | ---- | ----- | ----------- |
id_empresario UUID / BIGINT PK Identificador del perfil de empresario.
| id_usuario | UUID / BIGINT | FK Referencia a Usuario.                 |     |
| ---------- | ------------- | ---------------------------------------- | --- |
| tipo       | ENUM          | Empresa formal o emprendedor individual. |     |
| sector     | VARCHAR       | Sector o industria.                      |     |
descripcion TEXT Descripción de la empresa o el emprendimiento.
| logo | VARCHAR | Ruta o URL del logo. |     |
| ---- | ------- | -------------------- | --- |
Habilidad
| Atributo | Tipo | Llave | Descripción |
| -------- | ---- | ----- | ----------- |
id_habilidad UUID / BIGINT PK Identificador de la habilidad técnica.
| nombre    | VARCHAR | Nombre de la habilidad (ej. React, Python). |     |
| --------- | ------- | ------------------------------------------- | --- |
| categoria | VARCHAR | Categoría o área técnica.                   |     |
Estudiante_Habilidad
| Atributo      | Tipo          | Llave                          | Descripción |
| ------------- | ------------- | ------------------------------ | ----------- |
| id_estudiante | UUID / BIGINT | PK·FK Referencia a Estudiante. |             |
UUID / BIGINT Referencia a Habilidad.
| id_habilidad |      | PK·FK                          |     |
| ------------ | ---- | ------------------------------ | --- |
| nivel        | ENUM | Básico, intermedio o avanzado. |     |
Proyecto
| Atributo      | Tipo          | Llave                                        | Descripción |
| ------------- | ------------- | -------------------------------------------- | ----------- |
| id_proyecto   | UUID / BIGINT | PK Identificador del proyecto.               |             |
| id_empresario | UUID / BIGINT | FK Empresario que lo publica.                |             |
| titulo        | VARCHAR       | Título del proyecto.                         |             |
| descripcion   | TEXT          | Descripción del problema o necesidad.        |             |
| area_negocio  | VARCHAR       | Mercadeo, TI, RH, finanzas, etc.             |             |
| usa_ia        | BOOLEAN       | Indica si involucra inteligencia artificial. |             |
| plazo_dias    | INTEGER       | Días de recepción de ofertas (5 a 15).       |             |
Abierto, en recepción, adjudicado, en desarrollo, cerrado,
| estado | ENUM |     |     |
| ------ | ---- | --- | --- |
cancelado.
| fecha_publicacion | TIMESTAMP | Fecha de publicación.       |     |
| ----------------- | --------- | --------------------------- | --- |
| fecha_cierre      | TIMESTAMP | Fecha de cierre de ofertas. |     |
Tecnologia
| Atributo | Tipo | Llave | Descripción |
| -------- | ---- | ----- | ----------- |
id_tecnologia UUID / BIGINT PK Identificador de la tecnología.
| nombre | VARCHAR | Nombre de la tecnología requerida. |     |
| ------ | ------- | ---------------------------------- | --- |
Documento confidencial Página 14

Plataforma de Conexión de Talento Tecnológico SRS · v1.0
Proyecto_Tecnologia
| Atributo      | Tipo          | Llave                          | Descripción |
| ------------- | ------------- | ------------------------------ | ----------- |
| id_proyecto   | UUID / BIGINT | PK·FK Referencia a Proyecto.   |             |
| id_tecnologia | UUID / BIGINT | PK·FK Referencia a Tecnología. |             |
Oferta
| Atributo    | Tipo          | Llave                          | Descripción |
| ----------- | ------------- | ------------------------------ | ----------- |
| id_oferta   | UUID / BIGINT | PK Identificador de la oferta. |             |
| id_proyecto | UUID / BIGINT | FK Proyecto al que se oferta.  |             |
UUID / BIGINT Estudiante que oferta.
| id_estudiante |         | FK                            |     |
| ------------- | ------- | ----------------------------- | --- |
| propuesta     | TEXT    | Planteamiento de la solución. |     |
| prototipo_url | VARCHAR | Enlace o ruta del prototipo.  |     |
calificacion INTEGER Calificación del empresario a la oferta (1 a 5).
estado ENUM Enviada, en revisión, adjudicada, no seleccionada.
TIMESTAMP Fecha de envío de la oferta.
fecha_envio
Entregable
| Atributo | Tipo | Llave | Descripción |
| -------- | ---- | ----- | ----------- |
UUID / BIGINT Identificador del entregable.
| id_entregable |               | PK                                          |     |
| ------------- | ------------- | ------------------------------------------- | --- |
| id_proyecto   | UUID / BIGINT | FK Proyecto asociado.                       |     |
| id_estudiante | UUID / BIGINT | FK Autor del entregable.                    |     |
| tipo          | ENUM          | Parcial o final.                            |     |
| version       | INTEGER       | Número de versión.                          |     |
| archivo_url   | VARCHAR       | Ruta o URL del archivo.                     |     |
| estado        | ENUM          | Enviado, aprobado, con cambios solicitados. |     |
| fecha         | TIMESTAMP     | Fecha de carga.                             |     |
Evaluacion
| Atributo | Tipo | Llave | Descripción |
| -------- | ---- | ----- | ----------- |
id_evaluacion UUID / BIGINT PK Identificador de la evaluación final.
| id_proyecto | UUID / BIGINT | Proyecto evaluado. |     |
| ----------- | ------------- | ------------------ | --- |
FK
| id_estudiante | UUID / BIGINT | FK Estudiante evaluado.        |     |
| ------------- | ------------- | ------------------------------ | --- |
| id_empresario | UUID / BIGINT | FK Empresario que evalúa.      |     |
| puntuacion    | INTEGER       | Puntuación de 1 a 5 estrellas. |     |
| comentario    | TEXT          | Comentario sobre el desempeño. |     |
TIMESTAMP Fecha de la evaluación.
fecha
Documento confidencial Página 15

Plataforma de Conexión de Talento Tecnológico SRS · v1.0
Mensaje
| Atributo   | Tipo          | Llave                         | Descripción |
| ---------- | ------------- | ----------------------------- | ----------- |
| id_mensaje | UUID / BIGINT | PK Identificador del mensaje. |             |
id_proyecto UUID / BIGINT FK Hilo de conversación del proyecto.
| id_remitente | UUID / BIGINT | FK Usuario que envía.  |     |
| ------------ | ------------- | ---------------------- | --- |
| contenido    | TEXT          | Texto del mensaje.     |     |
| fecha_envio  | TIMESTAMP     | Fecha y hora de envío. |     |
Conversacion_IA
| Atributo | Tipo | Llave | Descripción |
| -------- | ---- | ----- | ----------- |
id_conversacion UUID / BIGINT PK Sesión con el agente conversacional.
| id_empresario | UUID / BIGINT | FK Empresario que interactúa.     |     |
| ------------- | ------------- | --------------------------------- | --- |
| id_proyecto   | UUID / BIGINT | FK Proyecto generado (si aplica). |     |
historial JSON / TEXT Preguntas y respuestas de la entrevista.
|     | ENUM | En curso o finalizada. |     |
| --- | ---- | ---------------------- | --- |
estado
| fecha | TIMESTAMP | Fecha de la sesión. |     |
| ----- | --------- | ------------------- | --- |
Notificacion
| Atributo | Tipo | Llave | Descripción |
| -------- | ---- | ----- | ----------- |
id_notificacion UUID / BIGINT PK Identificador de la notificación.
| id_usuario | UUID / BIGINT | FK Destinatario.           |     |
| ---------- | ------------- | -------------------------- | --- |
| tipo       | VARCHAR       | Tipo de evento notificado. |     |
| mensaje    | VARCHAR       | Texto de la notificación.  |     |
| leida      | BOOLEAN       | Estado leído / no leído.   |     |
| fecha      | TIMESTAMP     | Fecha de generación.       |     |
Documento confidencial Página 16

Plataforma de Conexión de Talento Tecnológico SRS · v1.0
4.2  Relaciones entre Entidades
| Entidad A | Cardinalidad | Entidad B |     | Descripción de la relación |
| --------- | ------------ | --------- | --- | -------------------------- |
Usuario 1 : 1 Estudiante Un usuario con rol Estudiante tiene un perfil de estudiante.
Usuario 1 : 1 Empresario Un usuario con rol Empresario tiene un perfil de empresario.
Mediante Estudiante_Habilidad, con nivel de dominio.
| Estudiante | N : M Habilidad |     |     |     |
| ---------- | --------------- | --- | --- | --- |
Empresario 1 : N Proyecto Un empresario publica muchos proyectos.
| Proyecto   | N : M Tecnologia |     | Mediante Proyecto_Tecnologia.       |     |
| ---------- | ---------------- | --- | ----------------------------------- | --- |
| Proyecto   | 1 : N Oferta     |     | Un proyecto recibe muchas ofertas.  |     |
| Estudiante | 1 : N Oferta     |     | Un estudiante envía muchas ofertas. |     |
Proyecto 1 : N Entregable Un proyecto tiene múltiples entregables y versiones.
Proyecto 1 : 1 Evaluacion Al cierre, el empresario evalúa al estudiante adjudicado.
Proyecto 1 : N Mensaje Cada proyecto mantiene un hilo de mensajes.
Empresario 1 : N Conversacion_IA Un empresario tiene varias sesiones con el agente.
Usuario 1 : N Notificacion Un usuario recibe muchas notificaciones.
Nota: las tablas Estudiante_Habilidad y Proyecto_Tecnologia son tablas intermedias (de unión) que resuelven las
relaciones de muchos a muchos. Según el stack y los motores elegidos, algunas entidades podrían fusionarse,
separarse o representarse de otra forma; conviene revisar la normalización durante el diseño definitivo.
Documento confidencial Página 17

Plataforma de Conexión de Talento Tecnológico SRS · v1.0
5. Stacks Tecnológicos Sugeridos
Estas son sugerencias, no una obligación.
Los stacks descritos a continuación son propuestas de referencia. El equipo tiene total libertad para utilizar cualquier
otra combinación de tecnologías que prefiera —lenguajes, frameworks, bases de datos o servicios— siempre que se
cumplan los requerimientos funcionales y no funcionales de este documento.
En todos los casos el frontend (React/Next.js) se comunica con el backend a través de una API REST, por lo que el
backend se organiza en capas (controlador, servicio y acceso a datos) sirviendo datos en formato JSON, en lugar de
un MVC tradicional con vistas renderizadas en el servidor.
Stack 1 — React + Django (Python) RECOMENDADO
Frontend React (Vite) + TailwindCSS, consumo de API vía Axios/fetch.
Backend Python con Django + Django REST Framework (DRF).
Base de datos PostgreSQL (Supabase) o MySQL.
Patrón API REST en capas; estructura por apps, modelos, serializers y vistas.
Notas Python es la mejor base para el agente conversacional y el matching por IA (SDKs y librerías
maduras). DRF aporta autenticación JWT, permisos por rol y serialización casi listos, alineados con
el RBAC y la seguridad del documento. Trade-off: convivencia de dos lenguajes (Python y
JavaScript).
Stack 2 — React + Node.js RECOMENDADO
Frontend React (Vite) + TailwindCSS.
Backend Node.js con NestJS (preferible) o Express, en TypeScript.
Base de datos PostgreSQL (Supabase) o MySQL, con ORM Prisma.
Patrón API REST en capas; NestJS impone módulos, controladores y servicios.
Notas Un solo lenguaje (JavaScript/TypeScript) en todo el proyecto reduce el costo de aprendizaje y
favorece la reutilización. Se recomienda NestJS sobre Express puro por su arquitectura modular y
validación integrada, y Prisma como ORM para migrar entre MySQL y PostgreSQL sin reescribir
consultas. El soporte de IA es bueno, aunque algo menos rico que en Python.
Stack 3 — React o Next.js + Python RECOMENDADO
Frontend Next.js (recomendado) o React.
Backend Python con FastAPI o Django REST Framework.
Base de datos PostgreSQL (Supabase) o MySQL.
Patrón API REST en capas; FastAPI genera documentación OpenAPI automática.
Notas Next.js mejora el SEO y el rendimiento de las páginas públicas (perfiles y proyectos) gracias al
renderizado del lado del servidor. FastAPI conviene cuando el peso está en la API y la IA (asíncrono
y muy rápido); Django conviene si se desea el panel de administración y el ORM incluidos. Combina
el mejor frontend con la fortaleza de Python en IA.
Documento confidencial Página 18

Plataforma de Conexión de Talento Tecnológico SRS · v1.0
Stack 4 — PHP con consultas SQL directas NO RECOMENDADO
Frontend React / Next.js como aplicación separada.
Backend PHP puro ejecutando consultas SQL directas.
Base de datos MySQL.
Patrón Sin ORM ni capa de abstracción; acceso a datos directo desde el código.
Notas No recomendado para este proyecto por usar consultas SQL directas en PHP puro: expone a
inyección SQL, carece de ORM, migraciones y separación de capas, y dificulta la mantenibilidad y la
modularidad exigidas en los requerimientos no funcionales. Además, el ecosistema de IA en PHP es
más limitado que en Python o Node, lo que penaliza la pieza central del proyecto. Si se optara por
PHP, la alternativa defendible sería Laravel (MVC real, Eloquent ORM y validación), nunca PHP puro
con SQL a mano.
Documento confidencial Página 19