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

-- Mantener el flujo existente, pero validar todas las transiciones en servidor.
-- Un trabajador no puede cambiar valores financieros, cliente o asignación ajena.
create or replace function public.validar_cambio_servicio()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare u uuid := auth.uid();
begin
  if public.es_admin() then return new; end if;
  if u is null or not exists(select 1 from public.perfiles
      where id=u and activo and rol<>'admin') then
    raise exception 'Cuenta sin autorización';
  end if;
  if (to_jsonb(new) - array['gestor_id','estado','fase','partes_estado','notas',
                                  'tipo','escalado_por','tipo_gestion_legal']::text[])
     is distinct from
     (to_jsonb(old) - array['gestor_id','estado','fase','partes_estado','notas',
                                  'tipo','escalado_por','tipo_gestion_legal']::text[]) then
    raise exception 'El gestor no puede modificar campos protegidos';
  end if;
  if old.estado='pendiente' and old.gestor_id is null
     and new.estado='activo' and new.gestor_id=u and new.fase='aceptado'
     and new.tipo=old.tipo and new.escalado_por is not distinct from old.escalado_por
     and public.rol_elegible(public.rol_de(u),old.tipo) then
    return new;
  end if;
  if old.gestor_id is distinct from u or old.estado <> 'activo' then
    raise exception 'El caso no está asignado al usuario en estado activo';
  end if;
  if new.tipo=old.tipo and new.escalado_por is not distinct from old.escalado_por then
    if new.gestor_id=u and new.estado in ('activo','completado','no_localizado','fallido') then
      return new;
    end if;
    if new.gestor_id is null and new.estado='pendiente' and new.fase is null then
      return new; -- devolver al pool
    end if;
  end if;
  if new.tipo='legal' and old.tipo<>'legal' and new.estado='pendiente'
     and new.gestor_id is null and new.escalado_por=u and new.fase is null then
    return new;
  end if;
  raise exception 'Transición de servicio inválida';
end;
$$;
drop trigger if exists validar_cambio_servicio on public.servicios;
create trigger validar_cambio_servicio before update on public.servicios
for each row execute function public.validar_cambio_servicio();

-- Mantener la política de UPDATE para las acciones ya existentes, mientras el
-- trigger valida que los cambios autorizados no afecten campos protegidos.
-- No abrir permisos adicionales aquí.

-- Escritura de estadísticas financieras y métricas reservada al servidor.
alter table public.gestores_stats enable row level security;
revoke insert, update, delete on public.gestores_stats from anon, authenticated;
drop policy if exists "estadisticas propias" on public.gestores_stats;
create policy "estadisticas propias" on public.gestores_stats for select
  to authenticated using (perfil_id=auth.uid() or public.es_admin());


-- Disponibilidad: un gestor puede cambiar exclusivamente su propia bandera,
-- sin poder escribir calificación ni comisiones.
create or replace function public.cambiar_mi_disponibilidad(p_disponible boolean)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null or public.rol_de(auth.uid()) not in
    ('verificador'::public.rol_app,'cobrador'::public.rol_app,'abogado'::public.rol_app)
  then raise exception 'No autorizado'; end if;
  update public.gestores_stats set disponible=p_disponible where perfil_id=auth.uid();
  if not found then
    insert into public.gestores_stats(perfil_id,disponible)
    values(auth.uid(),p_disponible);
  end if;
end;
$$;
revoke all on function public.cambiar_mi_disponibilidad(boolean) from public, anon;
grant execute on function public.cambiar_mi_disponibilidad(boolean) to authenticated;

-- El escalado a legal genera avisos en servidor: el gestor NO necesita
-- permiso para insertar mensajes arbitrarios en notificaciones.
create or replace function public.avisar_escalado_legal()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.tipo='legal' and old.tipo <> 'legal' and new.estado='pendiente' then
    insert into public.notificaciones(rol_destino,titulo,cuerpo,tipo,referencia_id)
    values('abogado','Nuevo servicio legal','Hay una gestión legal pendiente de asignación.',
      'servicio_escalado',new.id);
  end if;
  return new;
end;
$$;
drop trigger if exists avisar_escalado_legal on public.servicios;
create trigger avisar_escalado_legal after update on public.servicios
for each row execute function public.avisar_escalado_legal();

-- Una cuenta desactivada no debe seguir accediendo a información interna.
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
    if v !~ ('^'||auth.uid()::text||'/[a-zA-Z0-9_/-]+[.](jpg|jpeg|png|pdf)$')
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
