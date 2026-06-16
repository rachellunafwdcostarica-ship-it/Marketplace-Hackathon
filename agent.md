# Bitácora de Desarrollo - Marketplace FWD

## 🎯 Objetivo Actual
Desarrollar el MVP de la plataforma de proyectos de corta duración para egresados de FWD Talent (Fecha límite: 28 de junio).

## 🚀 Estado del Proyecto
Actualmente la aplicación está en fase de **Prototipo Frontend (Mock State)**. 
- La base de datos aún no está conectada (Supabase está inicializado en código pero sin migraciones).
- Los datos se simulan en memoria y se persisten en el `localStorage` mediante `StateProvider`.

---

## 🛠️ Checklist del MVP (Progreso Activo)

### 👤 Rol: Junior Egresado
- [ ] Login con Google (OAuth)
- [ ] Listado de proyectos (con filtros de stack, duración, modalidad y salario)
- [ ] Vista de detalle del proyecto
- [ ] Formulario de postulación (carta corta + link a CV/portfolio)
- [ ] Panel "Mis Postulaciones" con estados de seguimiento

### 🏢 Rol: Empresa Contratante
- [ ] Formulario de Onboarding (cédula jurídica, datos de la empresa)
- [ ] Publicar nuevo proyecto (formulario con stack, presupuesto, etc.)
- [ ] Panel de visualización de postulaciones recibidas

### 🛡️ Rol: Administrador FWD
- [ ] Dashboard mínimo con estadísticas de proyectos activos
- [ ] Flujo de aprobación de empresas
- [ ] Moderación de proyectos (ocultar no permitidos)

---

## ⚠️ Recordatorios Críticos para el Agente (IA)
*Antes de sugerirme código, asegúrate de cumplir con:*
1. **Cero texto directo en código**: Cualquier palabra nueva debe ir en `messages/es.json` o `messages/en.json`.
2. **Cero colores directos en CSS/Tailwind**: Usa siempre las variables globales fijadas (`text-primary`, `bg-secondary`, etc.).
3. **Cero imports o código muerto**: Mantén el código limpio y sin comentar.
4. **Tratamiento directo**: No me halagues ni uses comentarios vacíos. Sé crítico, directo y busca huecos en mi lógica antes de darme la solución (según `CLAUDE.md`).
5. **No inventes**: Si no estás seguro de si una API o herramienta existe, adviérteme.

Recuerda seguir estrictamente las reglas de `reglas.md`

Cuando te pida hacer un cambio, primero analiza el proyecto y dime si estás de acuerdo con el cambio. Si estás de acuerdo, dime cómo lo harás y luego hazlo. Si no estás de acuerdo, dime por qué no estás de acuerdo y qué cambio sugieres. (Si me corriges ten en cuenta las reglas de `CLAUDE.md` y `reglas.md`)

## Github 
Revisa los archivos de manera amplia y detallada. Quiero que detectes los archivos marcados con cambios y haz lo siguiente: Cuando veas archivos con cambios, lo que haras es hacer un antes y un despues de la modificacion. Lo que quiero lograr con esto es ver que se cambió, ver que tocaste y si esta correcta la modificacion (ACLARO: esto solo con archivos modificados no con todos.) Cuando el archivo sea una modificacion, lo que haras es comentar el cambio realizado (en la consola de la sesion de Claude, no dentro del archivo, dejalo limpio) con un """ ANTES """ y """ DESPUES """ (si el cambio es grande, resúmelo). Luego usa conventional commit y cuando termines de revisar los cambios avisame si estoy de acuerdo en realizar los comandos:

- git add .
- git commit -m "(descripcion correspondiente del cambio)"

y me avisas para hacerle el git push. no te menciones como autor en el commit. quiero que salga yo solo de propietario,
mi nombre, no salgas tu. revisa cada archivo correspondiente a sus cambios y haz los commits correspondientes.
para describir el problema usa el español, lo que son los "fix, feat, docs y etc" eso si mantenlos en ingles, pero para los problemas usa el lenguaje español. un ejemplo de la respuesta esperada: git commit -m "fix: arreglo en middleware.ts, variables mal declaradas.
asegurate de estar en mi rama correspondiente, no quiero hacer git push directo al dev. asegurate de que este en mi rama de trabajo. No permitas push al dev. solo pull del mismo.

Ejemplo del flujo esperado:

Agent: Hola,detecté archivos marcados con cambios. quiero saber si ya estas preparado para hacer el commit.
Agent: git add.
Agent: git commit -m "feat: Se agregan las variables globales del sistema."
Agent: He terminado de revisar los cambios y he realizado el commit.

## migraciones supabase
A la hora de realizar migracioes, no se enviaran directamente. Tendrás que comunicarte con el dueño de la base de datos [Samir] y pedirle que te de permiso para enviar las migraciones y hacer pruebas locales. una vez que te de permiso, puedes hacer las migraciones y pruebas locales. luego tendras que comunicarte de nuevo con [Samir] y pedirle que te de permiso para enviar las migraciones a la base de datos remota. no hagas push directo al dev. Solo después de que Samir apruebe, haras el push al dev. Asimismo, no haras migraciones a la base de datos local sin antes haber hecho las pruebas locales y recibido la aprobacion de Samir. 