-- ============================================================================
-- fix-perfil-registro.sql
-- Los perfiles nuevos no heredaban teléfono/zona/colegiado del registro.
-- Este script:
--   1. Recrea el trigger `crear_perfil_nuevo_usuario` para que copie esos
--      campos desde raw_user_meta_data (la app ya los envía en signUp).
--   2. Backfill: copia los datos de solicitudes_registro a perfiles donde
--      estén en NULL (perfiles ya creados antes de este fix).
-- Idempotente: se puede correr varias veces. Ejecutar en el SQL Editor.
-- ============================================================================

create or replace function public.crear_perfil_nuevo_usuario()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.perfiles (id, nombre, rol, activo, telefono, zona, numero_colegiado)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nombre', new.email),
    coalesce((new.raw_user_meta_data ->> 'rol')::rol_app, 'verificador'),
    false,  -- inactivo hasta que se apruebe la solicitud de registro
    new.raw_user_meta_data ->> 'telefono',
    new.raw_user_meta_data ->> 'zona',
    new.raw_user_meta_data ->> 'numero_colegiado'
  );
  return new;
end;
$$;

-- ─── Backfill desde solicitudes_registro (perfiles ya existentes) ───────────

-- Teléfono
update public.perfiles p
set telefono = s.telefono
from public.solicitudes_registro s
where s.perfil_id = p.id
  and p.telefono is null
  and s.telefono is not null;

-- Número de colegiado
update public.perfiles p
set numero_colegiado = s.numero_colegiado
from public.solicitudes_registro s
where s.perfil_id = p.id
  and p.numero_colegiado is null
  and s.numero_colegiado is not null;

-- Zona (aplanada como en domain/aprobaciones/aprobaciones.ts: "Municipio (Z1, Z2)")
update public.perfiles p
set zona = (
  select string_agg(
    case
      when jsonb_array_length(coalesce(a.value -> 'zonas', '[]'::jsonb)) > 0
        then (a.value ->> 'municipio') || ' (' || (
          select string_agg(z.value #>> '{}', ', ')
          from jsonb_array_elements(a.value -> 'zonas') z
        ) || ')'
      else (a.value ->> 'municipio')
    end,
    ' · '
  )
  from jsonb_array_elements(s.zona_cobertura) a
)
from public.solicitudes_registro s
where s.perfil_id = p.id
  and p.zona is null
  and s.zona_cobertura is not null
  and jsonb_typeof(s.zona_cobertura) = 'array';
