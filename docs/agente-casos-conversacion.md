# Banco de casos — conversación del agente IA (Fase 0)

> **Para qué es esto.** Es la red de seguridad antes de tocar los prompts del agente (`src/lib/proposal-ai/provider.ts`). El modelo está **fijo** (`gpt-oss-120b`) y no hay test automatizado del agente, así que la única forma de saber si un cambio de prompt **mejora o empeora** es re-correr a mano un set fijo de casos y comparar contra "qué debe pasar / qué NO debe pasar". Tunear el prompt por una sola anécdota arregla un caso y rompe otros sin que te enteres.
>
> **Cómo se corre (prueba manual).** En la app, con un empresario **verificado** (el gate de costo bloquea a los no verificados): `/empresario/new-project` → llená la logística del Caso → "Continuar con la IA" → seguí el guion de mensajes → mirá la respuesta del agente y, al final, "Armar propuesta" para revisar la `descripcion`. Anotá PASA/FALLA por criterio.
>
> **Relación con el SRS / errolpendiente.** Cubre §5.1 "Registro conversacional" (lenguaje de negocio, la IA decide lo técnico) y la `descripcion` no genérica (§1 paso 4). RF-54/55/56/57.
>
> **Origen.** Caso 1 es la conversación real fallida del 2026-06-15. El resto son escenarios representativos derivados del flujo.

---

## Reglas transversales (aplican a TODOS los casos)

**Debe pasar siempre:**
- Las preguntas al empresario son en **lenguaje de negocio**: problema, para quién, qué debe lograr, qué queda fuera, prioridades.
- La IA responde en el **idioma del empresario** (locale de la app: `es`/`en`).
- Máximo **2–3 rondas** de preguntas; si el contexto ya alcanza, anuncia que puede armar la propuesta sin interrogar más.
- No re-pregunta presupuesto ni plazo (ya van en la logística).
- La propuesta **incluye como funcionalidad solo lo que el empresario pidió o aceptó**. Puede documentar como fuera de alcance lo que el empresario **decidió explícitamente** dejar afuera (ej.: "los pagos los maneja el dueño"), pero **no inventa exclusiones ni menciones de temas que el empresario nunca tocó** (canales, integraciones o controles que nadie nombró) (P2/P8).
- Ante un pedido que **no es software** (objeto físico, hardware a fabricar, servicio no-software), lo dice en lenguaje de negocio y **no marca `completo=true`**; si hay una parte de software, la ofrece y solo la arma si el empresario la acepta (P5).
- Ante un pedido de software **desproporcionado** para el plazo/presupuesto/un junior, lo **acota en la conversación** y, si el empresario insiste, genera con el recorte **declarado explícitamente** en la propuesta (P5).

**No debe pasar nunca:**
- Preguntarle al empresario por **decisiones técnicas**: tecnologías, arquitectura, ni "artefactos" técnicos (código fuente, documentación de API, Docker, pruebas automatizadas, CI/CD).
- Usar **jerga sin explicar**, o términos ambiguos (ej. "pruebas" a secas, que se confunde con "ver cómo se verá").
- Inventar datos del negocio que el empresario no dio.
- **Reemplazar el pedido** del empresario por algo que no pidió (ej. sustituir un objeto físico por una app inventada con módulos/roles/reportes) (P5/P5b).
- **Aceptar en silencio** una escala inviable y recortarla recién en la generación sin habérselo dicho al empresario (P5).

---

## Caso 1 — El real del 2026-06-15 (regresión)

**Logística:** modalidad remoto · moneda USD · presupuesto 500–1500 · plazo 10 días.
**Contexto inicial:** "Tengo una clínica dental y quiero un sistema para que los pacientes pidan turnos en línea y me llegue un aviso cuando alguien reserva."
**Guion del empresario:** responder con normalidad 1–2 preguntas de negocio; si la IA pregunta algo técnico, observar (no corregir).

**Debe pasar:**
- Pregunta (si pregunta) en negocio: a quién atiende, si hoy cómo gestiona los turnos, qué pasa si dos piden el mismo horario, etc.
- Marca `completo=true` con detalle concreto de la clínica (no "una app para un negocio").
- La `descripcion` final menciona **clínica dental, turnos en línea y el aviso de reserva** — específica, no molde.

**No debe pasar (lo que falló):**
- Preguntar "¿querés código fuente, documentación de la API, scripts Docker, pruebas automatizadas, CI/CD?".
- Decir "pruebas" sin aclarar si son tests o mockups.
- Descripción genérica que serviría para cualquier proyecto.

---

## Caso 2 — Brief de una línea ya completo (no interrogar)

**Logística:** modalidad híbrido · CRC · 800–2000 · plazo 7 días · país Costa Rica / ciudad San José.
**Contexto inicial:** "Quiero una página web para mi panadería 'La Espiga' que muestre el catálogo de productos con fotos y precios, y un formulario para que los clientes hagan pedidos por WhatsApp."

**Debe pasar:**
- Reconoce que el brief alcanza y **va directo** a anunciar que puede armar la propuesta (cero o una sola pregunta de confirmación).
- `completo=true`.
- `descripcion` específica: panadería, catálogo con fotos/precios, pedidos por WhatsApp.

**No debe pasar:**
- Tres rondas de preguntas re-pidiendo lo que ya está claro.

---

## Caso 3 — Brief vago (preguntar en negocio, acotado)

**Logística:** modalidad remoto · USD · 300–800 · plazo 5 días.
**Contexto inicial:** "Necesito una app para mi negocio, algo moderno y práctico que se vea profesional. Todavía no tengo claros los detalles, ya iremos viendo."

> **Por qué tan largo y tan vacío.** El mínimo de caracteres del cuadro de contexto frena el "Necesito una app para mi negocio" original (33 chars). El texto se estiró solo para cruzar ese piso, **sin** agregar info concreta del negocio: sigue sin decir qué hace, para quién ni qué problema resuelve. No lo recortes "para que sea más corto": perdería el sentido del caso.

**Debe pasar:**
- Pregunta en negocio qué hace el negocio, qué problema resolver, para quién — máximo 2–3 rondas.
- Mientras falte el qué/para quién, `completo=false` y `faltan` lo dice en términos de negocio.
- Tras 2–3 rondas, arma propuesta con lo que haya o avisa qué falta; **no** interroga sin fin.

**No debe pasar:**
- Marcar `completo=true` con generalidades.
- Saltar a tecnologías para "destrabar".

---

## Caso 4 — Área deducible (no re-preguntar)

**Logística:** modalidad presencial · CRC · 1000–3000 · plazo 12 días · país Costa Rica / ciudad Heredia.
**Contexto inicial:** "Soy contador y quiero un sistema para llevar la contabilidad y las facturas de mis clientes pyme."

**Debe pasar:**
- **No** pregunta el rubro/área: se deduce (finanzas/contabilidad). Si pregunta algo, es sobre el alcance, no sobre el área.
- La propuesta cae en el área de negocio correcta del catálogo.

**No debe pasar:**
- "¿En qué área o rubro está tu proyecto?" cuando el contexto ya lo dice.

---

## Caso 5 — Empresario que pegó buzzwords (mantener registro llano)

**Logística:** modalidad remoto · USD · 2000–5000 · plazo 15 días.
**Contexto inicial:** "Quiero una plataforma SaaS multi-tenant con dashboard de analytics en tiempo real y un pipeline de ML para predecir el churn de mis suscriptores."

**Debe pasar:**
- Aunque el empresario suene técnico, las preguntas siguen siendo de negocio (qué decisión toma con esa predicción, qué datos tiene hoy, etc.). La IA puede **espejar** los términos que él usó, pero no le exige elegir stack/arquitectura.
- `involucra_ia = true` (el producto usa ML como tecnología — RF-23), inferido, no preguntado.

**No debe pasar:**
- Devolverle una lista de tecnologías para que elija "porque parece técnico".

---

## Caso 6 — Brief en inglés (bilingüe)

**App en locale `en`. Logística:** modalidad remoto · USD · 500–1500 · plazo 8 días.
**Contexto inicial (en inglés):** "I run a small gym and I want an app where members can book classes and see their attendance history."

**Debe pasar:**
- La IA responde **en inglés** durante toda la conversación.
- La `descripcion` final se redacta **en inglés** y es específica (gym, class booking, attendance history).

**No debe pasar:**
- Responder en español.

> **Nota (consecuencia conocida del bilingüe):** los chips de categorías/tecnologías saldrán con los nombres del catálogo, que están en español. Es esperado en esta etapa; no cuenta como falla del Caso 6.

---

## Caso 7 — Pedido no-software / hardware (fuera de alcance) · deriva del Caso 11 de pulidoIA.md

**Logística:** presencial · CRC · 200.000–1.000.000 · 7 días · Costa Rica / San José.
**Contexto inicial:** "Quiero que me diseñen y me fabriquen una máquina expendedora física para vender snacks en mi edificio."
**Guion del empresario:** si la IA ofrece una app de gestión, responder que lo principal es la **máquina física**, que la fabriquen; insistir una vez más en el objeto físico.

**Debe pasar:**
- La IA avisa, en lenguaje de negocio, que **fabricar hardware físico está fuera de alcance** de la plataforma (solo software).
- Si ofrece una parte de software (ej. una app para gestionar la máquina), la plantea como **oferta** y solo seguiría si el empresario la **acepta**.
- Mientras el empresario insista en el objeto físico, **`completo=false`** (el botón "Armar propuesta" no se habilita).

**No debe pasar:**
- Reemplazar el pedido por una **app que el empresario no pidió**, inventando módulos (usuarios, catálogo, inventario, órdenes, reportes), roles o reglas.
- Marcar `completo=true` y armar una propuesta sustituta.
- Si por reintento llegara a generarse una propuesta sustituta, **Validar debe rechazarla** porque no corresponde al pedido (P5b).

---

## Caso 8 — Pedido de software desproporcionado · deriva del Caso 12 de pulidoIA.md

**Logística:** remoto · USD · 2000–5000 · 20 días.
**Contexto inicial:** "Quiero un clon completo de Netflix: streaming para millones de usuarios, apps nativas iOS y Android, recomendaciones con IA y CDN propia."
**Guion del empresario:** ante la propuesta de acotar, insistir: "La escala no la negocio: millones de usuarios y CDN propia desde el lanzamiento."

**Debe pasar:**
- La IA **refleja en la conversación** que la escala (millones de usuarios, CDN propia desde el día uno) excede lo realista para el plazo/presupuesto/un junior, y propone un **alcance acotado (MVP)**.
- Si el empresario insiste, **genera la propuesta con el recorte** y lo declara **explícitamente** en "Supuestos y exclusiones" (qué se recortó y por qué).

**No debe pasar:**
- Aceptar la escala masiva **en silencio** durante la conversación y recortarla recién en la generación, sin habérselo dicho.
- Prometer en la descripción la escala completa (CDN propia, millones de usuarios, IA avanzada) como si fuera construible en el plazo/presupuesto.

---

## Caso 9 — La propuesta no inventa lo no aceptado · deriva de los Casos 10 y 16 de pulidoIA.md

**Logística:** presencial · CRC · 300.000–1.500.000 · 7 días · Costa Rica / San José.
**Contexto inicial:** "Quiero un sistema de reservas para mi cancha de fútbol 5, para que los clientes aparten horarios sin tener que llamar por teléfono."
**Guion del empresario:** cuando la IA sugiera funcionalidades, rechazar **explícitamente** los pagos y las notificaciones ("nada de pagos ni notificaciones, eso lo manejo yo") y confirmar **solo** reservas y control de disponibilidad.

**Debe pasar:**
- La `descripcion` incluye, **como funcionalidad del sistema**, solo reservas y control de disponibilidad (lo que el empresario pidió).
- Si documenta que los pagos/notificaciones quedan **fuera de alcance**, es aceptable: el empresario los descartó explícitamente. No es obligatorio mencionarlos, pero hacerlo no es falla.

**No debe pasar:**
- Incluir pagos o notificaciones **como funcionalidad** del sistema (el empresario no las pidió) (P2).
- Inventar exclusiones o menciones de temas que **nadie tocó** (ej. **WhatsApp**, **control de acceso físico**, **integración con sistemas externos**) (P8).

---

## Caso 10 — Soda / problema de cobro real (regresión) · deriva del Caso 9 de pulidoIA.md

**Logística:** presencial · CRC · 100.000–20.000.000 · 10 días · Costa Rica / San José.
**Contexto inicial:** "Tengo una soda y los cajeros se equivocan dando el vuelto. Quiero un sistema para tomar las órdenes y que ayude en la caja."
**Guion del empresario:** "Solo efectivo. El cajero suma de cabeza y a veces da mal el vuelto. Quiero que tome la orden, calcule el total y diga el vuelto. Usuarios: cajeros. Sin inventario."

**Debe pasar:**
- La IA hace **una** pregunta de negocio sobre el cobro (cómo cobran hoy) porque hay un **problema de dinero concreto** (el vuelto mal dado): acá la pregunta de cobro **sí corresponde**.
- Cierra en 1–2 rondas; la `descripcion` menciona el **cálculo de total/vuelto** y deja el **cobro en efectivo fuera del sistema** en "Supuestos".

**No debe pasar:**
- **Dejar de preguntar** por el cobro pese al problema concreto del vuelto: si el arreglo de alcance (Casos 7–8) apaga esta pregunta legítima, es una **regresión**.
- Inventar inventario u otros módulos que el empresario excluyó.

---

## Caso 11 — Veterinaria / brief rico (regresión) · deriva del Caso 14 de pulidoIA.md

**Logística:** híbrido · CRC · 500.000–3.000.000 · 18 días · Costa Rica / San José.
**Contexto inicial:** "Sistema para veterinaria. Tres usuarios: recepción, veterinario, dueño. Fichas de mascotas (especie, raza, vacunas), citas, historial clínico. Regla: una mascota no puede tener dos citas el mismo día. Fase 1 solo recepción y citas; historial clínico en fase 2."
**Guion del empresario:** "Hoy llevan la agenda en cuaderno, anotan dos citas en el mismo horario o pierden la ficha. En fase 1, recepción crea/modifica/cancela citas y consulta horarios libres. Avisar al cliente no hace falta."

**Debe pasar:**
- **No re-pregunta** lo ya dado (roles, entidades, fases); profundiza en el dolor de hoy y en las acciones de la fase 1. Cierra en 1 ronda.
- La `descripcion` integra roles, fichas, la regla "una cita por día" y las dos fases **en prosa, sin tablas ni listas crudas**; no inventa módulos; "Supuestos" deja el historial clínico y los otros roles en fase 2.

**No debe pasar:**
- Re-preguntar lo que el empresario ya detalló.
- Inventar módulos no pedidos, o reproducir lo dado como **tabla/lista cruda** o con Markdown.
- Meter el historial clínico (fase 2) dentro del alcance de la fase 1.

---

## Plantilla para anotar resultados

| Caso | Idioma OK | Registro de negocio | No preguntó lo técnico | Rondas ≤ 3 | `completo` correcto | Descripción específica | Veredicto |
|------|-----------|---------------------|------------------------|------------|---------------------|------------------------|-----------|
| 1 |  |  |  |  |  |  |  |
| 2 |  |  |  |  |  |  |  |
| 3 |  |  |  |  |  |  |  |
| 4 |  |  |  |  |  |  |  |
| 5 |  |  |  |  |  |  |  |
| 6 |  |  |  |  |  |  |  |
| 7 |  |  |  |  |  |  |  |
| 8 |  |  |  |  |  |  |  |
| 9 |  |  |  |  |  |  |  |
| 10 |  |  |  |  |  |  |  |
| 11 |  |  |  |  |  |  |  |

> Casos 10–11 son **regresión** (hoy pasan): vigilan que el arreglo de alcance no apague la pregunta de cobro legítima (10) ni el manejo de brief rico sin re-preguntar (11).
> Para los Casos 7–9, las columnas **`completo` correcto** y **Descripción específica** cargan los criterios de alcance/no-inventar: Caso 7 → `completo=false` y sin app sustituta; Caso 8 → acotado en la charla + recorte explícito en la propuesta; Caso 9 → sin pagos/WhatsApp no pedidos.

---

## Contextos para copiar/pegar (setup rápido)

> Pegá cada bloque en el **cuadro de contexto** de la Pantalla 1, con la logística indicada al lado. El Caso 6 se corre con la app en **inglés** (locale `en`).

**Caso 1** — logística: remoto · USD · 500–1500 · 10 días
```text
Tengo una clínica dental y quiero un sistema para que los pacientes pidan turnos en línea y me llegue un aviso cuando alguien reserva.
```

**Caso 2** — logística: híbrido · CRC · 800–2000 · 7 días · Costa Rica / San José
```text
Quiero una página web para mi panadería 'La Espiga' que muestre el catálogo de productos con fotos y precios, y un formulario para que los clientes hagan pedidos por WhatsApp.
```

**Caso 3** — logística: remoto · USD · 300–800 · 5 días
```text
Necesito una app para mi negocio, algo moderno y práctico que se vea profesional. Todavía no tengo claros los detalles, ya iremos viendo.
```

**Caso 4** — logística: presencial · CRC · 1000–3000 · 12 días · Costa Rica / Heredia
```text
Soy contador y quiero un sistema para llevar la contabilidad y las facturas de mis clientes pyme.
```

**Caso 5** — logística: remoto · USD · 2000–5000 · 15 días
```text
Quiero una plataforma SaaS multi-tenant con dashboard de analytics en tiempo real y un pipeline de ML para predecir el churn de mis suscriptores.
```

**Caso 6** (app en inglés) — logística: remoto · USD · 500–1500 · 8 días
```text
I run a small gym and I want an app where members can book classes and see their attendance history.
```

**Caso 7** — logística: presencial · CRC · 200.000–1.000.000 · 7 días · Costa Rica / San José
```text
Quiero que me diseñen y me fabriquen una máquina expendedora física para vender snacks en mi edificio.
```

**Caso 8** — logística: remoto · USD · 2000–5000 · 20 días
```text
Quiero un clon completo de Netflix: streaming para millones de usuarios, apps nativas iOS y Android, recomendaciones con IA y CDN propia.
```

**Caso 9** — logística: presencial · CRC · 300.000–1.500.000 · 7 días · Costa Rica / San José
```text
Quiero un sistema de reservas para mi cancha de fútbol 5, para que los clientes aparten horarios sin tener que llamar por teléfono.
```

**Caso 10** — logística: presencial · CRC · 100.000–20.000.000 · 10 días · Costa Rica / San José
```text
Tengo una soda y los cajeros se equivocan dando el vuelto. Quiero un sistema para tomar las órdenes y que ayude en la caja.
```

**Caso 11** — logística: híbrido · CRC · 500.000–3.000.000 · 18 días · Costa Rica / San José
```text
Sistema para veterinaria. Tres usuarios: recepción, veterinario, dueño. Fichas de mascotas (especie, raza, vacunas), citas, historial clínico. Regla: una mascota no puede tener dos citas el mismo día. Fase 1 solo recepción y citas; historial clínico en fase 2.
```
