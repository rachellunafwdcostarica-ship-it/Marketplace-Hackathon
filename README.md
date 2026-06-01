# Hackathon



## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Backend | Node.js + Express |
| Backend libs | mysql2 |
| Frontend | React + TailwindCSS |
| Base de datos | MySQL Server nativo (Windows) |
| Cliente BD | MySQL Workbench |
| Autenticación | JWT |
| IA | Gemini (Google AI Studio) |
| Automatización | n8n (vía `npx`, sin Docker) |

### Exclusiones explícitas
PHP · Java · phpMyAdmin · Docker · contenedores · cualquier IA distinta de Gemini · cualquier BD distinta de MySQL · PDF como entregable principal.

---

## Estructura del proyecto

```
hackathon/
├── backend/                  Node.js + Express + MySQL
│   ├── src/
│   │   ├── config/           Configuración (env, DB, app)
│   │   ├── controllers/      Manejo de requests/responses
│   │   ├── services/         Lógica de negocio (scoring, Gemini, pptx)
│   │   ├── repositories/     Acceso a datos
│   │   │   ├── interfaces/
│   │   │   └── implementations/
│   │   ├── models/           Modelos / esquemas
│   │   ├── routes/           Definición de rutas API
│   │   ├── middlewares/      Auth JWT, errores, logger
│   │   ├── validators/       Esquemas de validación
│   │   ├── utils/            Funciones utilitarias
│   │   ├── helpers/          Helpers (hash de filas, normalización)
│   │   ├── constants/        Enums (polaridad, semáforo, estados)
│   │   ├── events/           Emitters y handlers
│   │   └── jobs/             Snapshots mensuales, refresh alertas
│   ├── database/
│   │   ├── seeds/            Catálogo de escalas y preguntas
│   │   └── migrations/       Migraciones MySQL
│   ├── storage/
│   │   ├── uploads/          Subidas (Multer)
│   │   └── pptx/             Presentaciones generadas
│   ├── tests/
│   ├── .env                  Variables locales (no se sube a git)
│   ├── .env.example          Plantilla de variables
│   └── .gitignore
│
└── frontend/                 React + Tailwind + Recharts
    ├── public/
    ├── src/
    │   ├── api/              Conexión con backend
    │   ├── assets/           Imágenes, fuentes, estilos
    │   ├── components/
    │   │   ├── layout/       Headers, sidebars, shells
    │   │   └── ui/           Botones, cards, badges, semáforo
    │   ├── context/          Estado global (auth, sesión)
    │   ├── data/             Contenido estático
    │   ├── hooks/            Custom hooks
    │   ├── pages/            Login · Comparador · Semáforo ·
    │   │                     Asistente · Tendencias · Catálogo · Pptx
    │   ├── redux/            Estado avanzado (filtros, comparativas)
    │   ├── services/         Lógica frontend
    │   ├── utils/            Utilidades
    │   └── App.jsx
    ├── .env                  Variables locales (no se sube a git)
    ├── .env.example          Plantilla de variables
    └── .gitignore
```

> Las carpetas vacías incluyen un archivo `.gitkeep` para que git las preserve.

---

## Variables de entorno

Antes de ejecutar, copia las plantillas y completa los valores:

```bash
# Backend
cp backend/.env.example backend/.env

# Frontend
cp frontend/.env.example frontend/.env
```

---

## Ejecución

```bash
# Backend Node.js
cd backend
npm install
npm run dev

# Frontend React + Tailwind
cd frontend
npm install
npm run dev
```

