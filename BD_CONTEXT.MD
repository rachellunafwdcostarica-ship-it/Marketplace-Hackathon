[
  {
    "table_name": "areas_negocio",
    "column_name": "id_area",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()",
    "primary_key": "PRIMARY KEY",
    "foreign_table_name": null,
    "foreign_column_name": null
  },
  {
    "table_name": "areas_negocio",
    "column_name": "nombre",
    "data_type": "character varying",
    "is_nullable": "NO",
    "column_default": null,
    "primary_key": "",
    "foreign_table_name": null,
    "foreign_column_name": null
  },
  {
    "table_name": "areas_negocio",
    "column_name": "descripcion",
    "data_type": "character varying",
    "is_nullable": "YES",
    "column_default": null,
    "primary_key": "",
    "foreign_table_name": null,
    "foreign_column_name": null
  },
  {
    "table_name": "areas_negocio",
    "column_name": "is_active",
    "data_type": "boolean",
    "is_nullable": "NO",
    "column_default": "true",
    "primary_key": "",
    "foreign_table_name": null,
    "foreign_column_name": null
  },
  {
    "table_name": "auditoria",
    "column_name": "id_auditoria",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()",
    "primary_key": "PRIMARY KEY",
    "foreign_table_name": null,
    "foreign_column_name": null
  },
  {
    "table_name": "auditoria",
    "column_name": "id_actor",
    "data_type": "uuid",
    "is_nullable": "YES",
    "column_default": null,
    "primary_key": "",
    "foreign_table_name": "usuarios",
    "foreign_column_name": "id_usuario"
  },
  {
    "table_name": "auditoria",
    "column_name": "accion",
    "data_type": "character varying",
    "is_nullable": "NO",
    "column_default": null,
    "primary_key": "",
    "foreign_table_name": null,
    "foreign_column_name": null
  },
  {
    "table_name": "auditoria",
    "column_name": "entidad",
    "data_type": "character varying",
    "is_nullable": "NO",
    "column_default": null,
    "primary_key": "",
    "foreign_table_name": null,
    "foreign_column_name": null
  },
  {
    "table_name": "auditoria",
    "column_name": "id_entidad",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": null,
    "primary_key": "",
    "foreign_table_name": null,
    "foreign_column_name": null
  },
  {
    "table_name": "auditoria",
    "column_name": "valores_antes",
    "data_type": "jsonb",
    "is_nullable": "YES",
    "column_default": null,
    "primary_key": "",
    "foreign_table_name": null,
    "foreign_column_name": null
  },
  {
    "table_name": "auditoria",
    "column_name": "valores_despues",
    "data_type": "jsonb",
    "is_nullable": "YES",
    "column_default": null,
    "primary_key": "",
    "foreign_table_name": null,
    "foreign_column_name": null
  },
  {
    "table_name": "auditoria",
    "column_name": "ip_origen",
    "data_type": "character varying",
    "is_nullable": "YES",
    "column_default": null,
    "primary_key": "",
    "foreign_table_name": null,
    "foreign_column_name": null
  },
  {
    "table_name": "auditoria",
    "column_name": "ocurrida_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "NO",
    "column_default": "now()",
    "primary_key": "",
    "foreign_table_name": null,
    "foreign_column_name": null
  },
  {
    "table_name": "categorias",
    "column_name": "id_categoria",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()",
    "primary_key": "PRIMARY KEY",
    "foreign_table_name": null,
    "foreign_column_name": null
  },
  {
    "table_name": "categorias",
    "column_name": "nombre",
    "data_type": "character varying",
    "is_nullable": "NO",
    "column_default": null,
    "primary_key": "",
    "foreign_table_name": null,
    "foreign_column_name": null
  },
  {
    "table_name": "categorias",
    "column_name": "is_active",
    "data_type": "boolean",
    "is_nullable": "NO",
    "column_default": "true",
    "primary_key": "",
    "foreign_table_name": null,
    "foreign_column_name": null
  },
  {
    "table_name": "comentarios_entregables",
    "column_name": "id_comentario_entregable",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()",
    "primary_key": "PRIMARY KEY",
    "foreign_table_name": null,
    "foreign_column_name": null
  },
  {
    "table_name": "comentarios_entregables",
    "column_name": "id_entregable",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": null,
    "primary_key": "",
    "foreign_table_name": "entregables",
    "foreign_column_name": "id_entregable"
  },
  {
    "table_name": "comentarios_entregables",
    "column_name": "id_autor",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": null,
    "primary_key": "",
    "foreign_table_name": "usuarios",
    "foreign_column_name": "id_usuario"
  },
  {
    "table_name": "comentarios_entregables",
    "column_name": "contenido",
    "data_type": "text",
    "is_nullable": "NO",
    "column_default": null,
    "primary_key": "",
    "foreign_table_name": null,
    "foreign_column_name": null
  },
  {
    "table_name": "comentarios_entregables",
    "column_name": "tipo_comentario",
    "data_type": "USER-DEFINED",
    "is_nullable": "NO",
    "column_default": null,
    "primary_key": "",
    "foreign_table_name": null,
    "foreign_column_name": null
  },
  {
    "table_name": "comentarios_entregables",
    "column_name": "comentado_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "NO",
    "column_default": "now()",
    "primary_key": "",
    "foreign_table_name": null,
    "foreign_column_name": null
  },
  {
    "table_name": "configuracion_sistema",
    "column_name": "clave",
    "data_type": "character varying",
    "is_nullable": "NO",
    "column_default": null,
    "primary_key": "PRIMARY KEY",
    "foreign_table_name": null,
    "foreign_column_name": null
  },
  {
    "table_name": "configuracion_sistema",
    "column_name": "valor",
    "data_type": "text",
    "is_nullable": "NO",
    "column_default": null,
    "primary_key": "",
    "foreign_table_name": null,
    "foreign_column_name": null
  },
  {
    "table_name": "configuracion_sistema",
    "column_name": "tipo_dato",
    "data_type": "USER-DEFINED",
    "is_nullable": "NO",
    "column_default": null,
    "primary_key": "",
    "foreign_table_name": null,
    "foreign_column_name": null
  },
  {
    "table_name": "configuracion_sistema",
    "column_name": "descripcion",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null,
    "primary_key": "",
    "foreign_table_name": null,
    "foreign_column_name": null
  },
  {
    "table_name": "configuracion_sistema",
    "column_name": "modificado_por",
    "data_type": "uuid",
    "is_nullable": "YES",
    "column_default": null,
    "primary_key": "",
    "foreign_table_name": "usuarios",
    "foreign_column_name": "id_usuario"
  },
  {
    "table_name": "configuracion_sistema",
    "column_name": "modificado_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "NO",
    "column_default": "now()",
    "primary_key": "",
    "foreign_table_name": null,
    "foreign_column_name": null
  },
  {
    "table_name": "consentimientos",
    "column_name": "id_consentimiento",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()",
    "primary_key": "PRIMARY KEY",
    "foreign_table_name": null,
    "foreign_column_name": null
  },
  {
    "table_name": "consentimientos",
    "column_name": "id_usuario",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": null,
    "primary_key": "",
    "foreign_table_name": "usuarios",
    "foreign_column_name": "id_usuario"
  },
  {
    "table_name": "consentimientos",
    "column_name": "tipo_consentimiento",
    "data_type": "USER-DEFINED",
    "is_nullable": "NO",
    "column_default": null,
    "primary_key": "",
    "foreign_table_name": null,
    "foreign_column_name": null
  },
  {
    "table_name": "consentimientos",
    "column_name": "otorgado",
    "data_type": "boolean",
    "is_nullable": "NO",
    "column_default": null,
    "primary_key": "",
    "foreign_table_name": null,
    "foreign_column_name": null
  },
  {
    "table_name": "consentimientos",
    "column_name": "version_documento",
    "data_type": "character varying",
    "is_nullable": "YES",
    "column_default": null,
    "primary_key": "",
    "foreign_table_name": null,
    "foreign_column_name": null
  },
  {
    "table_name": "consentimientos",
    "column_name": "ip_origen",
    "data_type": "character varying",
    "is_nullable": "YES",
    "column_default": null,
    "primary_key": "",
    "foreign_table_name": null,
    "foreign_column_name": null
  },
  {
    "table_name": "consentimientos",
    "column_name": "user_agent",
    "data_type": "character varying",
    "is_nullable": "YES",
    "column_default": null,
    "primary_key": "",
    "foreign_table_name": null,
    "foreign_column_name": null
  },
  {
    "table_name": "consentimientos",
    "column_name": "consentimiento_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "NO",
    "column_default": "now()",
    "primary_key": "",
    "foreign_table_name": null,
    "foreign_column_name": null
  },
  {
    "table_name": "contrataciones",
    "column_name": "id_contratacion",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()",
    "primary_key": "PRIMARY KEY",
    "foreign_table_name": null,
    "foreign_column_name": null
  },
  {
    "table_name": "contrataciones",
    "column_name": "id_participacion",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": null,
    "primary_key": "",
    "foreign_table_name": "participaciones",
    "foreign_column_name": "id_participacion"
  },
  {
    "table_name": "contrataciones",
    "column_name": "fecha_inicio",
    "data_type": "date",
    "is_nullable": "YES",
    "column_default": null,
    "primary_key": "",
    "foreign_table_name": null,
    "foreign_column_name": null
  },
  {
    "table_name": "contrataciones",
    "column_name": "fecha_fin_estimada",
    "data_type": "date",
    "is_nullable": "YES",
    "column_default": null,
    "primary_key": "",
    "foreign_table_name": null,
    "foreign_column_name": null
  },
  {
    "table_name": "contrataciones",
    "column_name": "fecha_fin_real",
    "data_type": "date",
    "is_nullable": "YES",
    "column_default": null,
    "primary_key": "",
    "foreign_table_name": null,
    "foreign_column_name": null
  },
  {
    "table_name": "contrataciones",
    "column_name": "monto_acordado",
    "data_type": "numeric",
    "is_nullable": "YES",
    "column_default": null,
    "primary_key": "",
    "foreign_table_name": null,
    "foreign_column_name": null
  },
  {
    "table_name": "contrataciones",
    "column_name": "moneda",
    "data_type": "USER-DEFINED",
    "is_nullable": "NO",
    "column_default": "'USD'::moneda_enum",
    "primary_key": "",
    "foreign_table_name": null,
    "foreign_column_name": null
  },
  {
    "table_name": "contrataciones",
    "column_name": "condiciones_especiales",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null,
    "primary_key": "",
    "foreign_table_name": null,
    "foreign_column_name": null
  },
  {
    "table_name": "contrataciones",
    "column_name": "estado_periodo",
    "data_type": "USER-DEFINED",
    "is_nullable": "NO",
    "column_default": "'vigente'::estado_periodo_enum",
    "primary_key": "",
    "foreign_table_name": null,
    "foreign_column_name": null
  },
  {
    "table_name": "contrataciones",
    "column_name": "motivo_cancelacion",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null,
    "primary_key": "",
    "foreign_table_name": null,
    "foreign_column_name": null
  },
  {
    "table_name": "contrataciones",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "NO",
    "column_default": "now()",
    "primary_key": "",
    "foreign_table_name": null,
    "foreign_column_name": null
  },
  {
    "table_name": "conversaciones_ia",
    "column_name": "id_conversacion",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()",
    "primary_key": "PRIMARY KEY",
    "foreign_table_name": null,
    "foreign_column_name": null
  },
  {
    "table_name": "conversaciones_ia",
    "column_name": "id_empresario",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": null,
    "primary_key": "",
    "foreign_table_name": "empresarios",
    "foreign_column_name": "id_empresario"
  },
  {
    "table_name": "conversaciones_ia",
    "column_name": "id_proyecto",
    "data_type": "uuid",
    "is_nullable": "YES",
    "column_default": null,
    "primary_key": "",
    "foreign_table_name": "proyectos",
    "foreign_column_name": "id_proyecto"
  },
  {
    "table_name": "conversaciones_ia",
    "column_name": "contexto_inicial",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null,
    "primary_key": "",
    "foreign_table_name": null,
    "foreign_column_name": null
  },
  {
    "table_name": "conversaciones_ia",
    "column_name": "contexto_inicial_pdf_url",
    "data_type": "character varying",
    "is_nullable": "YES",
    "column_default": null,
    "primary_key": "",
    "foreign_table_name": null,
    "foreign_column_name": null
  },
  {
    "table_name": "conversaciones_ia",
    "column_name": "historial",
    "data_type": "jsonb",
    "is_nullable": "YES",
    "column_default": null,
    "primary_key": "",
    "foreign_table_name": null,
    "foreign_column_name": null
  },
  {
    "table_name": "conversaciones_ia",
    "column_name": "nivel_tecnico_empresario",
    "data_type": "USER-DEFINED",
    "is_nullable": "YES",
    "column_default": null,
    "primary_key": "",
    "foreign_table_name": null,
    "foreign_column_name": null
  },
  {
    "table_name": "conversaciones_ia",
    "column_name": "stack_sugerido",
    "data_type": "jsonb",
    "is_nullable": "YES",
    "column_default": null,
    "primary_key": "",
    "foreign_table_name": null,
    "foreign_column_name": null
  },
  {
    "table_name": "conversaciones_ia",
    "column_name": "propuesta_generada",
    "data_type": "jsonb",
    "is_nullable": "YES",
    "column_default": null,
    "primary_key": "",
    "foreign_table_name": null,
    "foreign_column_name": null
  },
  {
    "table_name": "conversaciones_ia",
    "column_name": "propuesta_aprobada",
    "data_type": "jsonb",
    "is_nullable": "YES",
    "column_default": null,
    "primary_key": "",
    "foreign_table_name": null,
    "foreign_column_name": null
  },
  {
    "table_name": "conversaciones_ia",
    "column_name": "estado",
    "data_type": "USER-DEFINED",
    "is_nullable": "NO",
    "column_default": "'en_curso'::estado_conv_ia_enum",
    "primary_key": "",
    "foreign_table_name": null,
    "foreign_column_name": null
  },
  {
    "table_name": "conversaciones_ia",
    "column_name": "modelo_ia",
    "data_type": "character varying",
    "is_nullable": "YES",
    "column_default": null,
    "primary_key": "",
    "foreign_table_name": null,
    "foreign_column_name": null
  },
  {
    "table_name": "conversaciones_ia",
    "column_name": "fecha_inicio",
    "data_type": "timestamp with time zone",
    "is_nullable": "NO",
    "column_default": "now()",
    "primary_key": "",
    "foreign_table_name": null,
    "foreign_column_name": null
  },
  {
    "table_name": "conversaciones_ia",
    "column_name": "fecha_fin",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": null,
    "primary_key": "",
    "foreign_table_name": null,
    "foreign_column_name": null
  },
  {
    "table_name": "conversaciones_ia",
    "column_name": "logistica",
    "data_type": "jsonb",
    "is_nullable": "YES",
    "column_default": null,
    "primary_key": "",
    "foreign_table_name": null,
    "foreign_column_name": null
  },
  {
    "table_name": "empresarios",
    "column_name": "id_empresario",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()",
    "primary_key": "PRIMARY KEY",
    "foreign_table_name": null,
    "foreign_column_name": null
  },
  {
    "table_name": "empresarios",
    "column_name": "id_usuario",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": null,
    "primary_key": "",
    "foreign_table_name": "usuarios",
    "foreign_column_name": "id_usuario"
  },
  {
    "table_name": "empresarios",
    "column_name": "tipo_empresario",
    "data_type": "USER-DEFINED",
    "is_nullable": "NO",
    "column_default": null,
    "primary_key": "",
    "foreign_table_name": null,
    "foreign_column_name": null
  },
  {
    "table_name": "empresarios",
    "column_name": "nombre_empresa",
    "data_type": "character varying",
    "is_nullable": "YES",
    "column_default": null,
    "primary_key": "",
    "foreign_table_name": null,
    "foreign_column_name": null
  },
  {
    "table_name": "empresarios",
    "column_name": "sector",
    "data_type": "character varying",
    "is_nullable": "YES",
    "column_default": null,
    "primary_key": "",
    "foreign_table_name": null,
    "foreign_column_name": null
  },
  {
    "table_name": "empresarios",
    "column_name": "descripcion",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null,
    "primary_key": "",
    "foreign_table_name": null,
    "foreign_column_name": null
  },
  {
    "table_name": "empresarios",
    "column_name": "logo",
    "data_type": "character varying",
    "is_nullable": "YES",
    "column_default": null,
    "primary_key": "",
    "foreign_table_name": null,
    "foreign_column_name": null
  },
  {
    "table_name": "empresarios",
    "column_name": "sitio_web",
    "data_type": "character varying",
    "is_nullable": "YES",
    "column_default": null,
    "primary_key": "",
    "foreign_table_name": null,
    "foreign_column_name": null
  },
  {
    "table_name": "empresarios",
    "column_name": "cedula",
    "data_type": "character varying",
    "is_nullable": "YES",
    "column_default": null,
    "primary_key": "",
    "foreign_table_name": null,
    "foreign_column_name": null
  },
  {
    "table_name": "empresarios",
    "column_name": "alcance_operativo",
    "data_type": "USER-DEFINED",
    "is_nullable": "YES",
    "column_default": null,
    "primary_key": "",
    "foreign_table_name": null,
    "foreign_column_name": null
  },
  {
    "table_name": "empresarios",
    "column_name": "pais_sede",
    "data_type": "character varying",
    "is_nullable": "YES",
    "column_default": null,
    "primary_key": "",
    "foreign_table_name": null,
    "foreign_column_name": null
  },
  {
    "table_name": "empresarios",
    "column_name": "ciudad_sede",
    "data_type": "character varying",
    "is_nullable": "YES",
    "column_default": null,
    "primary_key": "",
    "foreign_table_name": null,
    "foreign_column_name": null
  },
  {
    "table_name": "empresarios",
    "column_name": "estado_verificacion",
    "data_type": "USER-DEFINED",
    "is_nullable": "NO",
    "column_default": "'pendiente'::estado_verif_enum",
    "primary_key": "",
    "foreign_table_name": null,
    "foreign_column_name": null
  },
  {
    "table_name": "empresarios",
    "column_name": "verificado_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": null,
    "primary_key": "",
    "foreign_table_name": null,
    "foreign_column_name": null
  },
  {
    "table_name": "empresarios",
    "column_name": "verificado_por",
    "data_type": "uuid",
    "is_nullable": "YES",
    "column_default": null,
    "primary_key": "",
    "foreign_table_name": "usuarios",
    "foreign_column_name": "id_usuario"
  },
  {
    "table_name": "empresarios",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "NO",
    "column_default": "now()",
    "primary_key": "",
    "foreign_table_name": null,
    "foreign_column_name": null
  },
  {
    "table_name": "entregables",
    "column_name": "id_entregable",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()",
    "primary_key": "PRIMARY KEY",
    "foreign_table_name": null,
    "foreign_column_name": null
  },
  {
    "table_name": "entregables",
    "column_name": "id_contratacion",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": null,
    "primary_key": "",
    "foreign_table_name": "contrataciones",
    "foreign_column_name": "id_contratacion"
  },
  {
    "table_name": "entregables",
    "column_name": "tipo_entregable",
    "data_type": "USER-DEFINED",
    "is_nullable": "NO",
    "column_default": null,
    "primary_key": "",
    "foreign_table_name": null,
    "foreign_column_name": null
  },
  {
    "table_name": "entregables",
    "column_name": "version",
    "data_type": "integer",
    "is_nullable": "NO",
    "column_default": "1",
    "primary_key": "",
    "foreign_table_name": null,
    "foreign_column_name": null
  },
  {
    "table_name": "entregables",
    "column_name": "archivo_url",
    "data_type": "character varying",
    "is_nullable": "YES",
    "column_default": null,
    "primary_key": "",
    "foreign_table_name": null,
    "foreign_column_name": null
  },
  {
    "table_name": "entregables",
    "column_name": "estado",
    "data_type": "USER-DEFINED",
    "is_nullable": "NO",
    "column_default": "'enviado'::estado_entregable_enum",
    "primary_key": "",
    "foreign_table_name": null,
    "foreign_column_name": null
  },
  {
    "table_name": "entregables",
    "column_name": "cargado_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "NO",
    "column_default": "now()",
    "primary_key": "",
    "foreign_table_name": null,
    "foreign_column_name": null
  },
  {
    "table_name": "entregables",
    "column_name": "updated_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "NO",
    "column_default": "now()",
    "primary_key": "",
    "foreign_table_name": null,
    "foreign_column_name": null
  },
  {
    "table_name": "entregables",
    "column_name": "comentario_empresario",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null,
    "primary_key": "",
    "foreign_table_name": null,
    "foreign_column_name": null
  },
  {
    "table_name": "estudiantes",
    "column_name": "id_estudiante",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": "gen_random_uuid()",
    "primary_key": "PRIMARY KEY",
    "foreign_table_name": null,
    "foreign_column_name": null
  },
  {
    "table_name": "estudiantes",
    "column_name": "id_usuario",
    "data_type": "uuid",
    "is_nullable": "NO",
    "column_default": null,
    "primary_key": "",
    "foreign_table_name": "usuarios",
    "foreign_column_name": "id_usuario"
  },
  {
    "table_name": "estudiantes",
    "column_name": "titulo_fwd",
    "data_type": "USER-DEFINED",
    "is_nullable": "YES",
    "column_default": null,
    "primary_key": "",
    "foreign_table_name": null,
    "foreign_column_name": null
  },
  {
    "table_name": "estudiantes",
    "column_name": "estado_verificacion",
    "data_type": "USER-DEFINED",
    "is_nullable": "NO",
    "column_default": "'pendiente'::estado_verif_enum",
    "primary_key": "",
    "foreign_table_name": null,
    "foreign_column_name": null
  },
  {
    "table_name": "estudiantes",
    "column_name": "verificado_at",
    "data_type": "timestamp with time zone",
    "is_nullable": "YES",
    "column_default": null,
    "primary_key": "",
    "foreign_table_name": null,
    "foreign_column_name": null
  },
  {
    "table_name": "estudiantes",
    "column_name": "verificado_por",
    "data_type": "uuid",
    "is_nullable": "YES",
    "column_default": null,
    "primary_key": "",
    "foreign_table_name": "usuarios",
    "foreign_column_name": "id_usuario"
  },
  {
    "table_name": "estudiantes",
    "column_name": "reputacion",
    "data_type": "numeric",
    "is_nullable": "YES",
    "column_default": null,
    "primary_key": "",
    "foreign_table_name": null,
    "foreign_column_name": null
  },
  {
    "table_name": "estudiantes",
    "column_name": "proyectos_completados",
    "data_type": "integer",
    "is_nullable": "NO",
    "column_default": "0",
    "primary_key": "",
    "foreign_table_name": null,
    "foreign_column_name": null
  },
  {
    "table_name": "estudiantes",
    "column_name": "participaciones_activas",
    "data_type": "integer",
    "is_nullable": "NO",
    "column_default": "0",
    "primary_key": "",
    "foreign_table_name": null,
    "foreign_column_name": null
  },
  {
    "table_name": "estudiantes",
    "column_name": "descripcion",
    "data_type": "text",
    "is_nullable": "YES",
    "column_default": null,
    "primary_key": "",
    "foreign_table_name": null,
    "foreign_column_name": null
  },
  {
    "table_name": "estudiantes",
    "column_name": "modalidad_preferida",
    "data_type": "USER-DEFINED",
    "is_nullable": "YES",
    "column_default": null,
    "primary_key": "",
    "foreign_table_name": null,
    "foreign_column_name": null
  },
  {
    "table_name": "estudiantes",
    "column_name": "url_portafolio",
    "data_type": "character varying",
    "is_nullable": "YES",
    "column_default": null,
    "primary_key": "",
    "foreign_table_name": null,
    "foreign_column_name": null
  },
  {
    "table_name": "estudiantes",
    "column_name": "portafolio_visible_publicamente",
    "data_type": "boolean",
    "is_nullable": "NO",
    "column_default": "true",
    "primary_key": "",
    "foreign_table_name": null,
    "foreign_column_name": null
  }
]