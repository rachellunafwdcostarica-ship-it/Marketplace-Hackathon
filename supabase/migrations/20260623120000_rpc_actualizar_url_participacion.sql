-- Permite al egresado actualizar url_repositorio_proyecto en su propia
-- participacion sin necesidad de una policy UPDATE broad en la tabla.
-- SECURITY DEFINER limita la escritura a esa columna especifica y valida
-- propiedad antes de ejecutar el UPDATE.

create or replace function public.actualizar_url_participacion(
  p_id_participacion uuid,
  p_url             text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id_estudiante uuid;
begin
  if p_url is not null and p_url !~ '^https?://' then
    raise exception 'URL invalida: debe comenzar con http:// o https://'
      using errcode = 'P0001';
  end if;

  if p_url is not null and length(p_url) > 150 then
    raise exception 'URL demasiado larga (max 150 caracteres)'
      using errcode = 'P0002';
  end if;

  select e.id_estudiante into v_id_estudiante
  from public.estudiantes e
  where e.id_usuario = auth.uid();

  if v_id_estudiante is null then
    raise exception 'No autorizado'
      using errcode = 'P0003';
  end if;

  update public.participaciones
  set
    url_repositorio_proyecto = p_url,
    updated_at               = now()
  where id_participacion = p_id_participacion
    and id_estudiante    = v_id_estudiante;

  if not found then
    raise exception 'Participacion no encontrada o no autorizada'
      using errcode = 'P0004';
  end if;
end;
$$;

revoke all on function public.actualizar_url_participacion(uuid, text) from public;
grant execute on function public.actualizar_url_participacion(uuid, text) to authenticated;
