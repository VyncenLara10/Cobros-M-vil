-- ============================================================================
-- Fase 6 · Informe PDF + archivado de evidencias
-- ============================================================================
-- Problema: al cerrar una verificación no queda un documento final; las fotos
-- de evidencia se quedan mezcladas con la carpeta "activa" para siempre.
--
-- Diseño:
--   * el cliente genera el PDF (expo-print) con las fotos embebidas en base64,
--     VERIFICA en el propio archivo que se incrustaron todas las imágenes
--     (/Subtype /Image >= nº de fotos) y lo sube al bucket documentos;
--   * el cliente COPIA cada evidencia a
--     `<dueno>/archivo_evidencias/<servicioId>/<archivo>` (no se mueve nada
--     todavía) y llama a la RPC de abajo;
--   * la RPC (security definer) valida permisos y que origen+destino existan
--     en storage con tamaño > 0, crea el registro del informe y marca las
--     evidencias como 'archivada'; recién entonces el cliente borra los
--     originales (best effort);
--   * `restaurar_evidencias` revierte el archivado (el cliente primero copia
--     los archivos de vuelta);
--   * `cargarEvidencias` en el cliente ya filtra estado='activa'. No hay
--     purga automática: nada se borra solo.
--
-- Aplicar en el SQL Editor de Supabase. Es idempotente.
-- ============================================================================

-- 1) Registro de informes generados (una fila por PDF).
create table if not exists public.informes_servicio (
  id uuid primary key default gen_random_uuid(),
  servicio_id uuid not null references public.servicios(id) on delete cascade,
  generado_por uuid references public.perfiles(id) on delete set null default auth.uid(),
  ruta_pdf text not null,
  creado_en timestamptz not null default now()
);

alter table public.informes_servicio enable row level security;

-- Solo lectura para quien ya ve el servicio (insert/update/delete quedan
-- reservados a las funciones security definer de este archivo).
drop policy if exists "ver informes de mis servicios" on public.informes_servicio;
create policy "ver informes de mis servicios" on public.informes_servicio
  for select to authenticated
  using (
    public.es_admin()
    or exists (
      select 1 from public.servicios s
      where s.id = informes_servicio.servicio_id and s.gestor_id = auth.uid()
    )
  );

-- 2) Estado del archivado por evidencia. `ruta_storage` NUNCA se toca (es la
--    ubicación "activa" canónica); `ruta_archivo` apunta a la copia de
--    archivo, de modo que restaurar es simétrico.
alter table public.evidencias_servicio
  add column if not exists estado text not null default 'activa';

do $$ begin
  alter table public.evidencias_servicio
    add constraint evidencias_estado_chk check (estado in ('activa', 'archivada'));
exception when duplicate_object then null; end $$;

alter table public.evidencias_servicio
  add column if not exists ruta_archivo text;
alter table public.evidencias_servicio
  add column if not exists archivada_en timestamptz;
alter table public.evidencias_servicio
  add column if not exists informe_id uuid references public.informes_servicio(id) on delete set null;

create index if not exists evidencias_servicio_estado_idx
  on public.evidencias_servicio (servicio_id, estado);

-- 3) Políticas de storage.
--
-- a) La RPC (owner = postgres) debe poder leer storage.objects para validar
--    origen/destino/PDF: RLS está habilitado en esa tabla y las políticas
--    existentes son `to authenticated`, así que el owner de las funciones
--    necesita la suya. Solo SELECT, solo al bucket documentos.
drop policy if exists "lectura de archivado para postgres" on storage.objects;
create policy "lectura de archivado para postgres" on storage.objects
  for select to postgres
  using (bucket_id = 'documentos');

-- b) El cliente copia/borra con su propio JWT. Cualquiera que suba evidencias
--    puede borrar de SU carpeta (necesario para quitar el original tras
--    archivar); el admin puede subir/borrar en cualquier carpeta del bucket
--    (archiva casos de cualquier gestor).
drop policy if exists "borro mis documentos" on storage.objects;
create policy "borro mis documentos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'documentos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "admin sube a cualquier carpeta" on storage.objects;
create policy "admin sube a cualquier carpeta" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'documentos' and public.es_admin());

drop policy if exists "admin borra documentos" on storage.objects;
create policy "admin borra documentos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'documentos' and public.es_admin());

-- El SELECT de storage para el rol que ejecuta las funciones (si el proyecto
-- aún no lo tiene concedido, esto lo asegura; si no se puede conceder, se
-- omite: la política de arriba ya cubre el caso normal).
do $$ begin
  grant select on storage.objects to postgres;
exception when others then null; end $$;

-- 4) Confirmar el informe y archivar todas las evidencias del servicio.
--    p_archivos: [{"original": "<ruta_storage>", "archivo": "<ruta_archivo>"}]
--    Devuelve el id del informe creado. Lanza excepción (código explicativo)
--    si algo no cuadra: la transacción se revierte completa.
create or replace function public.confirmar_informe_y_archivar(
  p_servicio uuid,
  p_ruta_pdf text,
  p_archivos jsonb
) returns uuid
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  v_uid uuid := auth.uid();
  v_gestor uuid;
  v_informe uuid;
  v_activas int;
  v_mapeadas int;
  v_orig text;
  v_dest text;
begin
  if v_uid is null then
    raise exception 'no autenticado';
  end if;

  select gestor_id into v_gestor from public.servicios where id = p_servicio;
  if not found then
    raise exception 'servicio no existe';
  end if;
  if not (public.es_admin() or v_gestor = v_uid) then
    raise exception 'sin permiso para archivar este servicio';
  end if;

  if p_ruta_pdf is null or p_ruta_pdf !~* '\.pdf$' then
    raise exception 'falta el PDF del informe';
  end if;
  perform 1 from storage.objects
   where bucket_id = 'documentos' and name = p_ruta_pdf
     and coalesce((metadata ->> 'size')::bigint, 0) > 0;
  if not found then
    raise exception 'el PDF no está en storage: %', p_ruta_pdf;
  end if;

  select count(*) into v_activas
    from public.evidencias_servicio
   where servicio_id = p_servicio and estado = 'activa';
  if v_activas = 0 then
    raise exception 'no hay evidencias activas que archivar';
  end if;

  v_mapeadas := coalesce(jsonb_array_length(p_archivos), 0);
  if v_mapeadas <> v_activas then
    raise exception 'mapeo incompleto: % evidencias activas, % mapeadas', v_activas, v_mapeadas;
  end if;

  for i in 0 .. v_mapeadas - 1 loop
    v_orig := p_archivos -> i ->> 'original';
    v_dest := p_archivos -> i ->> 'archivo';

    perform 1 from public.evidencias_servicio
     where servicio_id = p_servicio and estado = 'activa' and ruta_storage = v_orig;
    if not found then
      raise exception 'la evidencia no pertenece al servicio: %', coalesce(v_orig, '(null)');
    end if;

    perform 1 from storage.objects
     where bucket_id = 'documentos' and name = v_orig
       and coalesce((metadata ->> 'size')::bigint, 0) > 0;
    if not found then
      raise exception 'origen ilegible en storage: %', coalesce(v_orig, '(null)');
    end if;

    perform 1 from storage.objects
     where bucket_id = 'documentos' and name = v_dest
       and coalesce((metadata ->> 'size')::bigint, 0) > 0;
    if not found then
      raise exception 'destino ilegible en storage: %', coalesce(v_dest, '(null)');
    end if;

    if position('/archivo_evidencias/' in coalesce(v_dest, '')) = 0 then
      raise exception 'destino fuera de archivo_evidencias: %', v_dest;
    end if;
  end loop;

  insert into public.informes_servicio (servicio_id, generado_por, ruta_pdf)
  values (p_servicio, v_uid, p_ruta_pdf)
  returning id into v_informe;

  for i in 0 .. v_mapeadas - 1 loop
    update public.evidencias_servicio
       set estado = 'archivada',
           ruta_archivo = p_archivos -> i ->> 'archivo',
           archivada_en = now(),
           informe_id = v_informe
     where servicio_id = p_servicio
       and estado = 'activa'
       and ruta_storage = p_archivos -> i ->> 'original';
  end loop;

  return v_informe;
end;
$$;

-- 5) Restaurar evidencias archivadas (el cliente ya copió los archivos de
--    vuelta a ruta_storage). Devuelve cuántas filas volvieron a 'activa'.
create or replace function public.restaurar_evidencias(p_servicio uuid)
returns int
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  v_uid uuid := auth.uid();
  v_gestor uuid;
  v_ok int;
  r record;
begin
  if v_uid is null then
    raise exception 'no autenticado';
  end if;

  select gestor_id into v_gestor from public.servicios where id = p_servicio;
  if not found then
    raise exception 'servicio no existe';
  end if;
  if not (public.es_admin() or v_gestor = v_uid) then
    raise exception 'sin permiso para restaurar este servicio';
  end if;

  for r in
    select id, ruta_storage from public.evidencias_servicio
     where servicio_id = p_servicio and estado = 'archivada'
  loop
    perform 1 from storage.objects
     where bucket_id = 'documentos' and name = r.ruta_storage
       and coalesce((metadata ->> 'size')::bigint, 0) > 0;
    if not found then
      raise exception 'falta restaurar el archivo original: %', r.ruta_storage;
    end if;
  end loop;

  update public.evidencias_servicio
     set estado = 'activa',
         ruta_archivo = null,
         archivada_en = null,
         informe_id = null
   where servicio_id = p_servicio and estado = 'archivada';
  get diagnostics v_ok = row_count;
  return v_ok;
end;
$$;
