-- Roles iniciales del sistema
insert into roles (nombre_rol, descripcion) values
  ('administrador', 'Personal de FWD con permisos elevados; nivel_admin define superadmin/admin/moderador.'),
  ('egresado',      'Egresado de FWD que ofrece sus servicios tecnicos.'),
  ('empresario',    'Empresa o emprendedor que publica proyectos.');
