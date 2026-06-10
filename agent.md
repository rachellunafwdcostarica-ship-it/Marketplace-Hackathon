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
Revisa los archivos de manera amplia y detallada. Quiero que detectes los archivos marcados con cambios y haz lo siguiente: Usa conventional commit y cuando termines de revisar los cambios haz git add. - git commit -m
  "(descripcion correspondiente del cambio)" y me avisas para hacerle el git push. no te menciones como autor en el commit. quiero que salga yo solo de propietario,
  mi nombre, no salgas tu. revisa cada archivo correspondiente a sus cambios y haz los commits correspondientes.
para describir el problema usa el español, lo que son los "fix, feat, docs y etc" eso si mantenlos en ingles, pero para los problemas usa el lenguaje español. un ejemplo de la respuesta esperada: git commit -m "fix: arreglo en middleware.ts, variables mal declaradas.
asegurate de estar en mi rama correspondiente, no quiero hacer git push directo al dev. asegurate de que este en mi rama de trabajo. No permitas push al dev. solo pull del mismo.