# Banco de casos — conversación del agente IA (Fase 0)

> **Para qué es esto.** Es la red de seguridad antes de tocar los prompts del agente (`src/lib/ai/provider.ts`). El modelo está **fijo** (`gpt-oss-120b`) y no hay test automatizado del agente, así que la única forma de saber si un cambio de prompt **mejora o empeora** es re-correr a mano un set fijo de casos y comparar contra "qué debe pasar / qué NO debe pasar". Tunear el prompt por una sola anécdota arregla un caso y rompe otros sin que te enteres.
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

**No debe pasar nunca:**
- Preguntarle al empresario por **decisiones técnicas**: tecnologías, arquitectura, ni "artefactos" técnicos (código fuente, documentación de API, Docker, pruebas automatizadas, CI/CD).
- Usar **jerga sin explicar**, o términos ambiguos (ej. "pruebas" a secas, que se confunde con "ver cómo se verá").
- Inventar datos del negocio que el empresario no dio.

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
**Contexto inicial:** "Necesito una app para mi negocio."

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

## Plantilla para anotar resultados

| Caso | Idioma OK | Registro de negocio | No preguntó lo técnico | Rondas ≤ 3 | `completo` correcto | Descripción específica | Veredicto |
|------|-----------|---------------------|------------------------|------------|---------------------|------------------------|-----------|
| 1 |  |  |  |  |  |  |  |
| 2 |  |  |  |  |  |  |  |
| 3 |  |  |  |  |  |  |  |
| 4 |  |  |  |  |  |  |  |
| 5 |  |  |  |  |  |  |  |
| 6 |  |  |  |  |  |  |  |

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
Necesito una app para mi negocio.
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
