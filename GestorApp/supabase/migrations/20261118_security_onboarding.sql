-- GestorApp 2026-11: endurecimiento de permisos y revisión de registros.
-- Ejecutar en Supabase SQL Editor DESPUÉS de los scripts ya instalados.
-- Probar primero en un proyecto de staging con copia anonimizada.
-- Reejecutable; no modifica solicitudes ni datos históricos.
begin;

-- El rol de un registro nunca se puede elegir mediante metadatos de Auth.
-- El rol solicitado se guarda exclusivamente en solicitudes_registro.
create or replace function public.crear_perfil_nuevo_usuario()
returns trigger language plpgsql security definer
set search_path = '' as $$
begin
  insert into public.perfiles(id,nombre,rol,activo,telefono,zona,numero_colegiado)
  values (
    new.id, coalesce(nullif(left(new.raw_user_meta_data->>'nombre',160),''),new.email,'Gestor'),
    'verificador'::public.rol_app, false,
    left(new.raw_user_meta_data->>'telefono',40),
    left(new.raw_user_meta_data->>'zona',300),
    left(new.raw_user_meta_data->>'numero_colegiado',80)
  );
  return new;
end;
$$;

create or replace function public.rol_de(p_uid uuid)
returns public.rol_app language sql stable security definer set search_path = ''
as $$
  select rol from public.perfiles
  where id = p_uid and activo = true and p_uid = auth.uid();
$$;

create or replace function public.es_admin()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.perfiles
    where id = auth.uid() and rol = 'admin' and activo = true
  );
$$;

-- RLS y privilegios se complementan: nunca dar UPDATE general sobre perfiles.
alter table public.perfiles enable row level security;
revoke update on public.perfiles from anon, authenticated;
grant update (nombre,telefono,zona,avatar_iniciales,numero_colegiado)
  on public.perfiles to authenticated;
drop policy if exists "perfil propio update" on public.perfiles;
create policy "perfil propio update" on public.perfiles
  for update to authenticated using (id = auth.uid() and activo = true)
  with check (id = auth.uid() and activo = true);
drop policy if exists "admin actualiza perfiles" on public.perfiles;
-- Cambios privilegiados se hacen con RPC auditada y transaccional.

-- Empleados pendientes nunca reciben acceso a información interna.
-- Restrictive se suma a las políticas permisivas de scripts anteriores.
alter table public.servicios enable row level security;
drop policy if exists "solo personal activo" on public.servicios;
create policy "solo personal activo" on public.servicios as restrictive
  for all to authenticated using (public.rol_de(auth.uid()) is not null)
  with check (public.rol_de(auth.uid()) is not null);

-- Crear servicios y datos de clientes es facultad del administrador.
drop policy if exists "crear servicio" on public.servicios;
create policy "crear servicio" on public.servicios
  for insert to authenticated with check (public.es_admin() and gestor_id is null);
drop policy if exists "staff crea clientes" on public.clientes;
create policy "staff crea clientes" on public.clientes
  for insert to authenticated with check (public.es_admin());
drop policy if exists "staff crea referencias" on public.referencias_cliente;
create policy "staff crea referencias" on public.referencias_cliente
  for insert to authenticated with check (public.es_admin());
drop policy if exists "staff crea creditos" on public.creditos_cliente;
create policy "staff crea creditos" on public.creditos_cliente
  for insert to authenticated with check (public.es_admin());

-- Los gestores solo leen datos de los clientes de sus servicios asignados.
drop policy if exists "staff lee clientes" on public.clientes;
create policy "staff lee clientes" on public.clientes
  for select to authenticated using (
    public.es_admin() or exists (
      select 1 from public.servicios s where s.cliente_id = clientes.id
        and s.gestor_id = auth.uid() and s.estado <> 'pendiente'
    )
  );
drop policy if exists "staff lee referencias" on public.referencias_cliente;
create policy "staff lee referencias" on public.referencias_cliente
  for select to authenticated using (
    public.es_admin() or exists (
      select 1 from public.servicios s
      where s.cliente_id = referencias_cliente.cliente_id and s.gestor_id = auth.uid()
    )
  );
drop policy if exists "staff lee creditos" on public.creditos_cliente;
create policy "staff lee creditos" on public.creditos_cliente
  for select to authenticated using (
    public.es_admin() or exists (
      select 1 from public.servicios s
      where s.id = creditos_cliente.servicio_id and s.gestor_id = auth.uid()
    )
  );

-- Para evitar que una aplicación modificada cambie montos, propietario y estado
-- arbitrariamente, solo el administrador puede hacer UPDATE directo.
-- La toma de servicios se realiza mediante RPC atómica.
drop policy if exists "actualizar servicio, reclamar o escalar" on public.servicios;
create policy "actualizar servicio, reclamar o escalar" on public.servicios
  for update to authenticated using (public.es_admin()) with check (public.es_admin());
-- UPDATE de servicios por gestor no está permitido, salvo RPC explícitas.
-- NOTA: los módulos de fases/completar/escalar necesitan RPC propias ANTES
-- de activar esta política en producción. No aplicar esta migración parcialmente.

-- Escritura de estadísticas financieras y métricas reservada al servidor.
alter table public.gestores_stats enable row level security;
revoke insert, update, delete on public.gestores_stats from anon, authenticated;
drop policy if exists "estadisticas propias" on public.gestores_stats;
create policy "estadisticas propias" on public.gestores_stats for select
  to authenticated using (perfil_id=auth.uid() or public.es_admin());

-- Solicitudes: el candidato solo ve su propio estado; no puede autoaprobarse.
alter table public.solicitudes_registro enable row level security;
drop policy if exists "crear mi solicitud" on public.solicitudes_registro;
create policy "crear mi solicitud" on public.solicitudes_registro
  for insert to authenticated with check (
    perfil_id=auth.uid() and rol <> 'admin'
    and lower(correo)=lower(coalesce(auth.jwt()->>'email',''))
    and estado='pendiente' and revisado_por is null and revisado_en is null
  );
drop policy if exists "leer estado propio de solicitud" on public.solicitudes_registro;
create policy "leer estado propio de solicitud" on public.solicitudes_registro
  for select to authenticated using (perfil_id = auth.uid());
revoke update on public.solicitudes_registro from anon, authenticated;
drop policy if exists "admin revisa solicitudes" on public.solicitudes_registro;

-- Revisión: una sola transacción (perfil + solicitud + estadísticas).
create or replace function public.resolver_solicitud_registro(
  p_solicitud uuid, p_aprobar boolean, p_motivo text default null
) returns void language plpgsql security definer set search_path = ''
as $$
declare s public.solicitudes_registro%rowtype;
begin
  if not public.es_admin() then raise exception 'No autorizado'; end if;
  select * into s from public.solicitudes_registro where id=p_solicitud for update;
  if not found or s.estado <> 'pendiente' then
    raise exception 'La solicitud ya fue resuelta o no existe';
  end if;
  if s.perfil_id is null then raise exception 'Falta el perfil'; end if;
  if p_aprobar then
    if s.rol='admin' then raise exception 'No se admiten altas administrativas'; end if;
    update public.perfiles set rol=s.rol, activo=true, telefono=s.telefono,
      numero_colegiado=s.numero_colegiado
    where id=s.perfil_id;
    if not found then raise exception 'No se encontró el perfil'; end if;
    insert into public.gestores_stats(perfil_id) values(s.perfil_id)
    on conflict (perfil_id) do nothing;
  elsif length(trim(coalesce(p_motivo,''))) < 8 then
    raise exception 'Es necesario explicar qué debe corregirse (mínimo 8 caracteres)';
  end if;
  update public.solicitudes_registro
  set estado=case when p_aprobar then 'aprobado'::public.estado_solicitud
    else 'rechazado'::public.estado_solicitud end,
    motivo_rechazo=case when p_aprobar then null else left(trim(p_motivo),1000) end,
    revisado_por=auth.uid(), revisado_en=now()
  where id=p_solicitud;
end;
$$;
revoke all on function public.resolver_solicitud_registro(uuid,boolean,text) from public, anon;
grant execute on function public.resolver_solicitud_registro(uuid,boolean,text) to authenticated;

-- El candidato corrige papelería tras rechazo sin cambiar rol, DPI ni estado
-- a aprobado. Rutas exclusivamente dentro de su carpeta privada en Storage.
create or replace function public.reenviar_papeleria(
  p_solicitud uuid, p_documentos jsonb
) returns void language plpgsql security definer set search_path = ''
as $$
declare s public.solicitudes_registro%rowtype; k text; v text;
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;
  select * into s from public.solicitudes_registro
  where id=p_solicitud and perfil_id=auth.uid() for update;
  if not found or s.estado <> 'rechazado' then
    raise exception 'Solo se corrigen solicitudes rechazadas';
  end if;
  if p_documentos is null or jsonb_typeof(p_documentos) <> 'object'
     or p_documentos = '{}'::jsonb then
    raise exception 'Indica al menos un documento';
  end if;
  for k,v in select key,value from jsonb_each_text(p_documentos) loop
    if k not in ('doc_foto_perfil','doc_dpi_frente','doc_dpi_reverso',
      'doc_antecedentes_penales','doc_licencia','doc_tarjeta_circulacion',
      'doc_foto_vehiculo','doc_carne_colegiado') then
      raise exception 'Campo de documento no permitido';
    end if;
    if v !~ ('^'||auth.uid()::text||'/[a-zA-Z0-9_/-]+\\.(jpg|jpeg|png|pdf)$')
       or length(v)>240 then
      raise exception 'Ruta de documento inválida';
    end if;
    if not exists(select 1 from storage.objects
      where bucket_id='documentos' and name=v) then
      raise exception 'Documento no encontrado en Storage';
    end if;
  end loop;
  update public.solicitudes_registro set
    doc_foto_perfil=coalesce(p_documentos->>'doc_foto_perfil',doc_foto_perfil),
    doc_dpi_frente=coalesce(p_documentos->>'doc_dpi_frente',doc_dpi_frente),
    doc_dpi_reverso=coalesce(p_documentos->>'doc_dpi_reverso',doc_dpi_reverso),
    doc_antecedentes_penales=coalesce(p_documentos->>'doc_antecedentes_penales',doc_antecedentes_penales),
    doc_licencia=coalesce(p_documentos->>'doc_licencia',doc_licencia),
    doc_tarjeta_circulacion=coalesce(p_documentos->>'doc_tarjeta_circulacion',doc_tarjeta_circulacion),
    doc_foto_vehiculo=coalesce(p_documentos->>'doc_foto_vehiculo',doc_foto_vehiculo),
    doc_carne_colegiado=coalesce(p_documentos->>'doc_carne_colegiado',doc_carne_colegiado),
    estado='pendiente', motivo_rechazo=null, revisado_en=null, revisado_por=null
  where id=p_solicitud;
end;
$$;
revoke all on function public.reenviar_papeleria(uuid,jsonb) from public, anon;
grant execute on function public.reenviar_papeleria(uuid,jsonb) to authenticated;

-- Permitir reemplazar archivos propios (upsert), sin tocar archivos ajenos.
drop policy if exists "actualizar mis documentos" on storage.objects;
create policy "actualizar mis documentos" on storage.objects
  for update to authenticated
  using (bucket_id='documentos' and (storage.foldername(name))[1]=auth.uid()::text)
  with check (bucket_id='documentos' and (storage.foldername(name))[1]=auth.uid()::text);

-- El cliente ya no puede inyectar notificaciones arbitrarias para otros usuarios.
drop policy if exists "staff crea notificaciones" on public.notificaciones;
create policy "admin crea notificaciones" on public.notificaciones
  for insert to authenticated with check (public.es_admin());
-- No permitir que un empleado marque como leída la broadcast compartida.
drop policy if exists "actualizar mis notificaciones" on public.notificaciones;
create policy "actualizar mis notificaciones" on public.notificaciones
  for update to authenticated using (perfil_id=auth.uid())
  with check (perfil_id=auth.uid());
commit;
