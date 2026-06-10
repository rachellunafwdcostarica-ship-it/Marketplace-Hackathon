-- ============================================================
-- SEEDS — Catálogos base para datos de prueba
-- Marketplace FWD
-- ============================================================

-- Áreas de negocio
insert into public.areas_negocio (nombre, descripcion) values
  ('Tecnología y Software',      'Desarrollo de productos y servicios de software'),
  ('Diseño y UX',                'Diseño de interfaces y experiencia de usuario'),
  ('Marketing Digital',          'Marketing digital, SEO, redes sociales y e-commerce'),
  ('Fintech',                    'Tecnología aplicada a servicios financieros'),
  ('Educación y E-learning',     'Plataformas y herramientas educativas'),
  ('Salud y Biotecnología',      'Software para el sector salud y ciencias de la vida'),
  ('Logística y Supply Chain',   'Optimización de cadenas de suministro y logística'),
  ('Gobierno y Sector Público',  'Sistemas y soluciones para organismos públicos')
on conflict (nombre) do nothing;


-- Tecnologías
insert into public.tecnologias (nombre) values
  -- Frontend
  ('React'), ('Next.js'), ('Vue.js'), ('Angular'), ('TypeScript'), ('JavaScript'),
  ('Tailwind CSS'), ('SASS'), ('HTML5'), ('CSS3'),
  -- Backend
  ('Node.js'), ('Python'), ('FastAPI'), ('Django'), ('Go'), ('Rust'),
  ('Java'), ('Spring Boot'), ('PHP'), ('Laravel'), ('Ruby on Rails'),
  -- Mobile
  ('React Native'), ('Flutter'), ('Swift'), ('Kotlin'),
  -- Bases de datos
  ('PostgreSQL'), ('MySQL'), ('MongoDB'), ('Redis'), ('Supabase'), ('Firebase'),
  -- Cloud y DevOps
  ('AWS'), ('Google Cloud'), ('Azure'), ('Vercel'), ('Docker'), ('Kubernetes'), ('CI/CD'),
  -- IA y ML
  ('TensorFlow'), ('PyTorch'), ('OpenAI API'), ('LangChain'),
  -- Otros
  ('GraphQL'), ('REST API'), ('WebSockets'), ('Git'), ('Linux')
on conflict (nombre) do nothing;


-- Categorías de proyecto
insert into public.categorias_proyecto (nombre) values
  ('Desarrollo Web Frontend'),
  ('Desarrollo Web Backend'),
  ('Desarrollo Fullstack'),
  ('Aplicación Móvil'),
  ('API e Integraciones'),
  ('Diseño UI/UX'),
  ('Data Science y Analytics'),
  ('Inteligencia Artificial / ML'),
  ('DevOps y Cloud'),
  ('E-commerce'),
  ('CMS y Sitio Web'),
  ('Automatización y Scripting')
on conflict (nombre) do nothing;
