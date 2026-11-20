-- Recupera registros incompletos: Auth tiene usuario, pero perfiles no tiene fila.
-- Ejecutar en Supabase SQL Editor (rol postgres), DESPUES del esquema base y
-- 20261118_security_onboarding.sql. No requiere una nueva APK.
-- Idempotente: NO modifica los perfiles existentes, NO aprueba cuentas y
-- NO toma roles privilegiados desde raw_user_meta_data.
begin;

-- Reinstalar la función de alta segura. La función por sí sola NO crea
-- automáticamente el trigger: se debe asegurar explícitamente en auth.users.
create or replace function public.crear_perfil_nuevo_usuario()
returns trigger language plpgsql security definer
set search_path = '' as $$
begin
  insert into public.perfiles
    (id, nombre, rol, activo, telefono, zona, numero_colegiado)
  values (
    new.id,
    coalesce(nullif(left(new.raw_user_meta_data->>'nombre',160),''),nullif(left(new.email,160),''),'Gestor'),
    'verificador'::public.rol_app,
    false,
    left(new.raw_user_meta_data->>'telefono',40),
    left(new.raw_user_meta_data->>'zona',300),
    left(new.raw_user_meta_data->>'numero_colegiado',80)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.crear_perfil_nuevo_usuario();

-- Reparar únicamente las referencias ausentes de cuentas Auth ya existentes.
-- No reactivar ninguna cuenta; todas las recuperadas quedan pendientes.
insert into public.perfiles
  (id, nombre, rol, activo, telefono, zona, numero_colegiado)
select
  u.id,
  coalesce(nullif(left(u.raw_user_meta_data->>'nombre',160),''),nullif(left(u.email,160),''),'Gestor'),
  'verificador'::public.rol_app,
  false,
  left(u.raw_user_meta_data->>'telefono',40),
  left(u.raw_user_meta_data->>'zona',300),
  left(u.raw_user_meta_data->>'numero_colegiado',80)
from auth.users u
where not exists (select 1 from public.perfiles p where p.id = u.id)
on conflict (id) do nothing;

commit;

-- Debe devolver 0; no divulga emails ni documentos.
select count(*) as usuarios_sin_perfil
from auth.users u
left join public.perfiles p on p.id = u.id
where p.id is null;

-- Debe devolver una fila con tgenabled = O (enabled).
select tgname, tgenabled
from pg_trigger
where tgrelid = 'auth.users'::regclass
  and tgname = 'on_auth_user_created'
  and not tgisinternal;
