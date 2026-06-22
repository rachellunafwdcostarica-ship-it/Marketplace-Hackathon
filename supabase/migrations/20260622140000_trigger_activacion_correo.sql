-- M1: Activación de cuenta al confirmar el correo (RF-02).
--
-- Cuando un usuario confirma su correo (auth.users.email_confirmed_at pasa de
-- NULL a un timestamp), su cuenta pasa de 'pendiente' a 'activa'. Cubre las dos
-- vías de alta:
--   - Camino A (correo + contraseña): el correo se confirma con un UPDATE.
--   - Camino B (OAuth Google/GitHub): el correo llega confirmado en el INSERT.
-- Por eso corre AFTER INSERT OR UPDATE OF email_confirmed_at.
--
-- Orden de triggers: PostgreSQL dispara los AFTER triggers por orden alfabético
-- de nombre. 'on_email_confirmed_activate' ordena DESPUÉS de
-- 'on_auth_user_created' (que ejecuta handle_new_user y crea la fila en
-- public.usuarios). Así, en el INSERT de OAuth, la fila ya existe cuando este
-- trigger corre. El filtro estado_cuenta='pendiente' lo hace idempotente y evita
-- pisar cuentas suspendidas o ya activas.

create or replace function public.activar_cuenta_al_confirmar_correo()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if new.email_confirmed_at is not null
     and (tg_op = 'INSERT' or old.email_confirmed_at is null) then
    update public.usuarios
       set estado_cuenta = 'activa'
     where id_usuario = new.id
       and estado_cuenta = 'pendiente';
  end if;
  return new;
end;
$$;

drop trigger if exists on_email_confirmed_activate on auth.users;

create trigger on_email_confirmed_activate
  after insert or update of email_confirmed_at on auth.users
  for each row
  execute function public.activar_cuenta_al_confirmar_correo();
