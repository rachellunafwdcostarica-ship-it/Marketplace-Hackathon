-- ============================================================
-- MIGRACIÓN 0006 — Datos semilla (config + catálogos)
-- Modelo FWD Talent (XXI). Los roles se siembran en 0002.
-- ============================================================

-- 1. CONFIGURACIÓN DEL SISTEMA (tipo_dato debe ser un valor de tipo_dato_enum)
insert into configuracion_sistema (clave, valor, tipo_dato, descripcion) values
  ('cupo_max_participaciones', '3',  'integer', 'Máximo de participaciones activas (enviada+en_revision+contratada) por estudiante.'),
  ('strikes_para_suspension',  '3',  'integer', 'Strikes activos que disparan suspensión automática.'),
  ('plazo_min_dias_proyecto',  '5',  'integer', 'Plazo mínimo (días) de ventana abierta de un proyecto.'),
  ('plazo_max_dias_proyecto',  '15', 'integer', 'Plazo máximo (días) de ventana abierta de un proyecto.'),
  ('intentos_login_max',       '5',  'integer', 'Intentos fallidos antes de bloqueo temporal.'),
  ('tiempo_bloqueo_minutos',   '30', 'integer', 'Minutos de bloqueo tras intentos fallidos.'),
  ('foto_perfil_max_mb',       '5',  'integer', 'Tamaño máximo de foto de perfil (MB).'),
  ('pdf_propuesta_max_mb',     '10', 'integer', 'Tamaño máximo de PDF de brief al agente IA (MB).')
on conflict (clave) do nothing;

-- 2. ÁREAS DE NEGOCIO (RF-20)
insert into areas_negocio (nombre, descripcion) values
  ('Tecnologías de la Información', 'Software, hardware, servicios técnicos.'),
  ('Mercadeo',                      'Marketing, publicidad, branding.'),
  ('Finanzas',                      'Contabilidad, fintech, banca, seguros.'),
  ('Recursos Humanos',              'Gestión de personal, reclutamiento, capacitación.'),
  ('Operaciones',                   'Logística, supply chain, operación interna.'),
  ('Ventas',                        'CRM, comercial, atención al cliente.'),
  ('Salud',                         'Salud, bienestar, sector médico.'),
  ('Educación',                     'Edtech, capacitación, plataformas educativas.'),
  ('Retail',                        'Comercio minorista, e-commerce, tiendas físicas.'),
  ('Turismo',                       'Hotelería, viajes, hospitalidad.')
on conflict (nombre) do nothing;

-- 3. CATEGORÍAS DE PROYECTO (RF-19) — mi tabla categorias solo tiene 'nombre'
insert into categorias (nombre) values
  ('Sitio web'), ('Aplicación web'), ('Aplicación móvil'), ('API / Backend'),
  ('Análisis de datos'), ('Automatización'), ('E-commerce'),
  ('IA / Machine Learning'), ('DevOps / Infraestructura'), ('QA / Testing')
on conflict (nombre) do nothing;

-- 4. TECNOLOGÍAS — mi tabla tecnologias solo tiene 'nombre' (sin columna categoria)
insert into tecnologias (nombre) values
  ('React'), ('Next.js'), ('Vue'), ('Angular'), ('Svelte'), ('TypeScript'),
  ('JavaScript'), ('Tailwind CSS'), ('HTML'), ('CSS'),
  ('Node.js'), ('Python'), ('Django'), ('FastAPI'), ('Java'), ('Spring Boot'),
  ('C#'), ('.NET'), ('PHP'), ('Laravel'), ('Ruby on Rails'), ('Go'),
  ('PostgreSQL'), ('MySQL'), ('MongoDB'), ('Redis'), ('Supabase'), ('Firebase'),
  ('React Native'), ('Flutter'), ('Swift'), ('Kotlin'),
  ('Docker'), ('Kubernetes'), ('AWS'), ('Azure'), ('Google Cloud'), ('Vercel'),
  ('Git'), ('GitHub Actions'),
  ('Pandas'), ('NumPy'), ('TensorFlow'), ('PyTorch'),
  ('Anthropic API'), ('OpenAI API'), ('LangChain'),
  ('Vitest'), ('Jest'), ('Cypress'), ('Playwright'), ('Selenium')
on conflict (nombre) do nothing;
