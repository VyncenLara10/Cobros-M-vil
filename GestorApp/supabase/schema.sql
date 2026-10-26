-- ============================================================================
-- GestorApp — esquema base para Supabase (Postgres + Auth + Storage)
-- ============================================================================
-- Cómo usarlo:
--   1. Crea un proyecto en https://supabase.com (gratis).
--   2. SQL Editor → pega este archivo completo → Run.
--   3. Storage → crea un bucket "documentos" (privado) para DPI, licencias, etc.
--   4. Copia la URL del proyecto y la anon key a tu .env (EXPO_PUBLIC_SUPABASE_URL
--      / EXPO_PUBLIC_SUPABASE_ANON_KEY) cuando conectes la app con
--      @supabase/supabase-js. Mientras tanto la app sigue usando los mocks en
--      /data — este archivo no rompe nada de lo que ya funciona.
--
-- Mapeo con el código actual (para cuando migres los mocks a tablas reales):
--   types.ts Gestor              -> public.gestores
--   types.ts Servicio            -> public.servicios (+ creditos_cliente, intentos)
--   data/solicitudesRegistro.ts  -> public.solicitudes_registro
--   data/seguimiento.ts          -> public.paradas / ubicaciones_gestor
-- ============================================================================

create extension if not exists "pgcrypto";

-- ─── Perfiles (extiende auth.users de Supabase Auth) ───────────────────────
-- Supabase Auth ya maneja email/password, sesiones y tokens. Este perfil
-- guarda el resto (rol, zona, foto, etc.) y se crea automáticamente con el
-- trigger de más abajo cuando alguien se registra.

create type rol_app as enum ('admin', 'verificador', 'cobrador', 'abogado');
create type estado_solicitud as enum ('pendiente', 'aprobado', 'rechazado');
create type estado_servicio as enum ('activo', 'pendiente', 'completado', 'no_localizado', 'fallido');
create type tipo_servicio as enum ('cobro', 'notificacion', 'verificacion', 'legal');
create type fase_trabajo as enum ('aceptado', 'en_sitio');

create table public.perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null,
  rol rol_app not null,
  telefono text,
  zona text,
  avatar_iniciales text,
  numero_colegiado text,
  activo boolean not null default true,        -- false hasta que el admin aprueba
  creado_en timestamptz not null default now()
);

-- ─── Solicitudes de registro (cola de aprobación del admin) ────────────────
-- Un candidato manda su solicitud ANTES de tener acceso real. El admin la
-- aprueba (crea/activa el perfil) o la rechaza (con motivo). Coincide con
-- app/(tabs)/aprobaciones.tsx y data/solicitudesRegistro.ts.

create table public.solicitudes_registro (
  id uuid primary key default gen_random_uuid(),
  creado_en timestamptz not null default now(),
  estado estado_solicitud not null default 'pendiente',
  rol rol_app not null,
  nombre_completo text not null,
  correo text not null,
  telefono text not null,
  dpi_numero text not null,
  -- Referencia al perfil creado por el trigger on_auth_user_created. La app
  -- la necesita para activar perfiles.activo al aprobar (domain/aprobaciones).
  perfil_id uuid references public.perfiles(id),
  numero_colegiado text,
  tipo_vehiculo text,
  placa_vehiculo text,
  zona_cobertura jsonb,                          -- [{departamento, municipio, zonas: []}]
  banco text,
  numero_cuenta text,
  nombre_titular text,
  -- Rutas dentro del bucket de Storage "documentos" (no la URL pública).
  doc_foto_perfil text,
  doc_dpi_frente text,
  doc_dpi_reverso text,
  doc_antecedentes_penales text,
  doc_licencia text,
  doc_tarjeta_circulacion text,
  doc_foto_vehiculo text,
  doc_carne_colegiado text,
  motivo_rechazo text,
  revisado_por uuid references public.perfiles(id),
  revisado_en timestamptz
);

-- ─── Gestores (vista de trabajo sobre perfiles con rol distinto de admin) ──
-- Se separa de "perfiles" porque estadísticas (calificación, comisiones)
-- solo aplican a gestores, no al admin.

create table public.gestores_stats (
  perfil_id uuid primary key references public.perfiles(id) on delete cascade,
  calificacion numeric(2,1) not null default 5.0,
  servicios_completados integer not null default 0,
  comisiones_acumuladas numeric(12,2) not null default 0,
  disponible boolean not null default true
);

-- ─── Clientes y servicios ───────────────────────────────────────────────────

create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  telefono text,
  direccion text,
  zona text,
  dpi text,
  municipio text,
  departamento text,
  trabajo text,
  cargo text,
  salario numeric(10,2),
  direccion_laboral text,
  zona_laboral text,
  lat double precision,                          -- ubicación de la vivienda (para el mapa del admin)
  lng double precision,
  creado_en timestamptz not null default now()
);

-- Contactos de referencia del cliente (esposa, hermano, vecino...). Uno o
-- varios por cliente. Coincide con types.ts ReferenciaContacto.
create table public.referencias_cliente (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  nombre text not null,
  telefono text not null,
  parentesco text
);

create table public.servicios (
  id uuid primary key default gen_random_uuid(),
  tipo tipo_servicio not null,
  estado estado_servicio not null default 'pendiente',
  fase fase_trabajo,
  cliente_id uuid references public.clientes(id),
  deuda_total numeric(12,2) not null default 0,
  monto_gestion numeric(12,2) not null default 0,
  comision_pct numeric(5,2) not null default 0,
  comision_calculada numeric(12,2) not null default 0,
  gestor_id uuid references public.perfiles(id),
  -- Quién escaló el caso a gestión legal (historial de solo lectura).
  escalado_por uuid references public.perfiles(id) on delete set null,
  fecha_asignacion timestamptz not null default now(),
  fecha_limite timestamptz,
  subtipos_verificacion text[],                  -- ['domiciliar','laboral']
  tipo_gestion_legal text,
  tarifa_legal numeric(12,2),
  notas text,
  -- Progreso de cada parte de una verificación (domiciliar / laboral), porque
  -- la casa y el trabajo pueden estar en lugares distintos y se completan por
  -- separado. Forma: {"domiciliar": {"enSitio":true,"completado":true,"dictamen":"aprobado"}, ...}
  partes_estado jsonb not null default '{}'::jsonb,
  creado_en timestamptz not null default now()
);

create table public.creditos_cliente (
  id uuid primary key default gen_random_uuid(),
  servicio_id uuid not null references public.servicios(id) on delete cascade,
  banco text not null,
  numero_credito text,
  tipo_credito text,
  producto text,
  saldo_real numeric(12,2) not null,
  saldo_capital numeric(12,2),
  pago_minimo numeric(12,2),
  cuota numeric(12,2),
  dias_atraso integer,
  cuotas_atraso integer,
  mora numeric(12,2),
  fecha_vence date,
  estado_asignacion text,
  tipo_asignacion text,
  porcentaje_comision numeric(5,2) not null default 0
);

create table public.intentos_servicio (
  id uuid primary key default gen_random_uuid(),
  servicio_id uuid not null references public.servicios(id) on delete cascade,
  fecha timestamptz not null default now(),
  resultado text not null,
  nota text,
  geolocalizacion text
);

-- Pagos registrados por el gestor al recuperar dinero banco por banco.
-- Se alimentan desde el flujo de cobro (app/cobro/[id].tsx y el ModalPago
-- de app/servicio/[id].tsx) vía domain/servicios/servicios.ts:registrarPagos.
create table public.pagos (
  id uuid primary key default gen_random_uuid(),
  servicio_id uuid not null references public.servicios(id) on delete cascade,
  banco text not null,
  monto numeric(12,2) not null,
  referencia text,
  capturado_por uuid references public.perfiles(id),
  creado_en timestamptz not null default now()
);

-- ─── Fase 5: historial de acciones (hora + GPS) ────────────────────────────
-- Una fila por cada cosa que hace el gestor con el servicio (aceptar,
-- rechazar, intento, pago, en sitio, completar, escalar…), con la hora y la
-- ubicación del dispositivo en ese momento.
create table public.eventos_servicio (
  id uuid primary key default gen_random_uuid(),
  servicio_id uuid not null references public.servicios(id) on delete cascade,
  perfil_id uuid references public.perfiles(id) on delete set null default auth.uid(),
  accion text not null,
  lat double precision,
  lng double precision,
  creado_en timestamptz not null default now()
);
create index eventos_servicio_servicio_idx
  on public.eventos_servicio (servicio_id, creado_en desc);

-- ─── Fase 6: informe PDF del caso ────────────────────────────────────────────
-- Una fila por PDF generado (expo-print en el cliente); el archivo vive en el
-- bucket documentos. Insert/update/delete solo vía las funciones security
-- definer de más abajo.
create table public.informes_servicio (
  id uuid primary key default gen_random_uuid(),
  servicio_id uuid not null references public.servicios(id) on delete cascade,
  generado_por uuid references public.perfiles(id) on delete set null default auth.uid(),
  ruta_pdf text not null,
  creado_en timestamptz not null default now()
);

-- ─── Fase 5: evidencias (fotos) ─────────────────────────────────────────────
-- Registro de las fotos que el gestor sube al completar; el archivo en sí vive
-- en el bucket privado "documentos" (ver storage abajo). Al archivar (fase 6)
-- la fila queda en estado 'archivada' con la copia en ruta_archivo; la copia
-- de archivo se coloca en `<dueno>/archivo_evidencias/<servicioId>/…`.
create table public.evidencias_servicio (
  id uuid primary key default gen_random_uuid(),
  servicio_id uuid not null references public.servicios(id) on delete cascade,
  clave text not null,
  ruta_storage text not null,
  subido_por uuid references public.perfiles(id) on delete set null default auth.uid(),
  creado_en timestamptz not null default now(),
  estado text not null default 'activa'
    check (estado in ('activa', 'archivada')),
  ruta_archivo text,
  archivada_en timestamptz,
  informe_id uuid references public.informes_servicio(id) on delete set null
);
create index evidencias_servicio_servicio_idx
  on public.evidencias_servicio (servicio_id);
create index evidencias_servicio_estado_idx
  on public.evidencias_servicio (servicio_id, estado);

-- ─── Seguimiento en vivo (panel de admin) ───────────────────────────────────

create table public.ubicaciones_gestor (
  gestor_id uuid primary key references public.perfiles(id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  bateria integer,
  actualizado_en timestamptz not null default now()
);

-- ============================================================================
-- Notificaciones push (Expo)
-- ============================================================================
-- Cada dispositivo registra su Expo Push Token al iniciar sesión
-- (expo-notifications). Una función/Edge Function del backend llama a la
-- Expo Push API con estos tokens cuando: se aprueba una solicitud, hay un
-- servicio nuevo disponible para el rol/zona del gestor, o un servicio fue
-- aprobado/cerrado.

create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid not null references public.perfiles(id) on delete cascade,
  expo_push_token text not null unique,
  plataforma text,                                -- 'android' | 'ios'
  creado_en timestamptz not null default now()
);

create table public.notificaciones (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid references public.perfiles(id) on delete cascade,   -- null = broadcast por rol/zona
  rol_destino rol_app,
  titulo text not null,
  cuerpo text not null,
  tipo text not null,                              -- 'solicitud_aprobada' | 'servicio_nuevo' | 'servicio_aprobado' | ...
  referencia_id uuid,                              -- servicio_id o solicitud_id relacionado
  leida boolean not null default false,
  enviada_en timestamptz not null default now()
);

-- Push de negocio SERVER-SIDE: 1 fila de outbox por destinatario de cada
-- notificación (tickets, reintentos y recibos de Expo). Trigger + pg_net +
-- cron viven en supabase/fix-push-server.sql (aplicar una vez); RLS cerrado,
-- solo lo escriben las funciones security definer.
create table public.push_outbox (
  id uuid primary key default gen_random_uuid(),
  notificacion_id uuid not null references public.notificaciones(id) on delete cascade,
  perfil_id uuid not null references public.perfiles(id) on delete cascade,
  expo_push_token text not null,
  orden integer not null default 0,
  request_id bigint,
  recibo_request_id bigint,
  ticket_id text,
  estado text not null default 'pendiente'
    check (estado in ('pendiente','enviado','ticket_ok','error','entregado','error_recepcion')),
  mensaje text,
  intentos integer not null default 0,
  creado_en timestamptz not null default now(),
  enviado_en timestamptz,
  actualizado_en timestamptz not null default now()
);
create index push_outbox_estado_idx on public.push_outbox (estado, creado_en);
create index push_outbox_notif_idx on public.push_outbox (notificacion_id);

-- ============================================================================
-- Seguridad de acceso: intentos, bloqueo y códigos OTP
-- ============================================================================
-- Supabase Auth ya trae "email OTP" (código de un solo uso que expira) listo
-- para usar vía supabase.auth.signInWithOtp(). Estas tablas cubren lo que
-- Supabase NO hace por defecto: contar intentos fallidos de contraseña y
-- bloquear la cuenta tras N fallos.

create table public.intentos_acceso (
  id uuid primary key default gen_random_uuid(),
  correo text not null,
  exitoso boolean not null,
  ip text,
  creado_en timestamptz not null default now()
);

create table public.bloqueos_acceso (
  correo text primary key,
  intentos_fallidos integer not null default 0,
  bloqueado_hasta timestamptz,
  actualizado_en timestamptz not null default now()
);

-- Ejemplo de regla (se aplica desde una Edge Function antes de llamar a
-- signInWithPassword, no vía RLS): tras 5 fallos seguidos en 15 minutos,
-- bloquear la cuenta 15 minutos.
--
--   const { count } = await supabase.from('intentos_acceso')
--     .select('*', { count: 'exact', head: true })
--     .eq('correo', correo).eq('exitoso', false)
--     .gte('creado_en', new Date(Date.now() - 15 * 60_000).toISOString());
--   if (count >= 5) { /* rechazar y devolver "cuenta bloqueada, intenta en 15 min" */ }

-- ─── Trigger: crear perfil automáticamente al registrarse en auth.users ────

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

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.crear_perfil_nuevo_usuario();

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================
-- Por defecto Supabase bloquea todo si RLS está activo y no hay políticas.

-- ─── Funciones helper (security definer: leen perfiles saltando su propia
-- RLS, pero SOLO devuelven info derivada del usuario autenticado actual) ────

-- Rol del usuario autenticado (o el que se pase, pero en la práctica siempre
-- se llama con auth.uid()).
create or replace function public.rol_de(p_uid uuid)
returns rol_app
language sql
security definer
stable
set search_path = public
as $$
  select rol from public.perfiles where id = p_uid;
$$;

create or replace function public.es_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(public.rol_de(auth.uid()) = 'admin', false);
$$;

-- Espejo de types.ts ROLES_ELEGIBLES: qué rol puede tomar cada tipo de
-- servicio. Si cambias esa tabla en el código, cámbiala aquí también.
create or replace function public.rol_elegible(p_rol rol_app, p_tipo tipo_servicio)
returns boolean
language sql
immutable
as $$
  select case p_tipo
    when 'cobro' then p_rol = 'cobrador'
    when 'legal' then p_rol = 'abogado'
    when 'notificacion' then p_rol in ('verificador', 'cobrador', 'abogado')
    when 'verificacion' then p_rol in ('verificador', 'cobrador', 'abogado')
    else false
  end;
$$;

alter table public.perfiles enable row level security;
alter table public.clientes enable row level security;
alter table public.referencias_cliente enable row level security;
alter table public.creditos_cliente enable row level security;
alter table public.intentos_servicio enable row level security;
alter table public.servicios enable row level security;
alter table public.ubicaciones_gestor enable row level security;
alter table public.solicitudes_registro enable row level security;
alter table public.notificaciones enable row level security;
alter table public.push_tokens enable row level security;
alter table public.push_outbox enable row level security;
alter table public.pagos enable row level security;
alter table public.eventos_servicio enable row level security;
alter table public.evidencias_servicio enable row level security;

-- ── perfiles ──────────────────────────────────────────────────────────────
-- Cada quien lee/edita su propio perfil; el admin ve y aprueba a todos
-- (lo necesita para admin.tsx, gestores.tsx y aprobaciones.tsx).
create policy "perfil propio" on public.perfiles
  for select using (auth.uid() = id);
create policy "perfil propio update" on public.perfiles
  for update using (auth.uid() = id);
create policy "admin ve todos los perfiles" on public.perfiles
  for select using (public.es_admin());
create policy "admin actualiza perfiles" on public.perfiles
  for update using (public.es_admin());

-- ── clientes / referencias / créditos ────────────────────────────────────
-- Cualquier miembro del staff autenticado puede buscar y crear clientes (se
-- necesita al publicar una solicitud); solo el admin o el gestor asignado al
-- servicio de ese cliente puede corregir sus datos.
create policy "staff lee clientes" on public.clientes
  for select to authenticated using (true);
create policy "staff crea clientes" on public.clientes
  for insert to authenticated with check (true);
create policy "admin o gestor asignado actualiza cliente" on public.clientes
  for update to authenticated using (
    public.es_admin() or exists (
      select 1 from public.servicios s
      where s.cliente_id = clientes.id and s.gestor_id = auth.uid()
    )
  );

create policy "staff lee referencias" on public.referencias_cliente
  for select to authenticated using (true);
create policy "staff crea referencias" on public.referencias_cliente
  for insert to authenticated with check (true);

create policy "staff lee creditos" on public.creditos_cliente
  for select to authenticated using (true);
create policy "staff crea creditos" on public.creditos_cliente
  for insert to authenticated with check (true);

-- ── intentos_servicio ─────────────────────────────────────────────────────
create policy "ver intentos de mi servicio o admin" on public.intentos_servicio
  for select to authenticated using (
    public.es_admin() or exists (
      select 1 from public.servicios s where s.id = intentos_servicio.servicio_id and s.gestor_id = auth.uid()
    )
  );
create policy "crear intento en mi servicio" on public.intentos_servicio
  for insert to authenticated with check (
    exists (
      select 1 from public.servicios s where s.id = intentos_servicio.servicio_id and s.gestor_id = auth.uid()
    )
  );

-- ── servicios ─────────────────────────────────────────────────────────────
-- El admin ve/edita todo. Un gestor ve y edita SOLO lo suyo (gestor_id =
-- su uid) o lo pendiente sin asignar cuyo tipo le corresponde a su rol
-- (rol_elegible) — así puede "tomarlo" (UPDATE que le asigna gestor_id).
-- Escalado a legal: el escalador conserva SOLO LECTURA vía escalado_por, los
-- abogados ven todos los legales y pueden tomarlos/editarlos (fix-escalado-legal).
-- Cualquier miembro activo del staff puede publicar una solicitud nueva.
create policy "ver servicios propios, elegibles, escalados o admin" on public.servicios
  for select to authenticated using (
    public.es_admin()
    or gestor_id = auth.uid()
    or escalado_por = auth.uid()
    or (public.rol_de(auth.uid()) = 'abogado' and tipo = 'legal')
    or (gestor_id is null and estado = 'pendiente' and public.rol_elegible(public.rol_de(auth.uid()), tipo))
  );
create policy "crear servicio" on public.servicios
  for insert to authenticated with check (true);
create policy "actualizar servicio, reclamar o escalar" on public.servicios
  for update to authenticated
  using (
    public.es_admin()
    or gestor_id = auth.uid()
    or (public.rol_de(auth.uid()) = 'abogado' and tipo = 'legal')
    or (gestor_id is null and estado = 'pendiente' and public.rol_elegible(public.rol_de(auth.uid()), tipo))
  )
  with check (
    public.es_admin()
    or (gestor_id is not null and gestor_id = auth.uid())
    or (public.rol_de(auth.uid()) = 'abogado' and tipo = 'legal')
    or (gestor_id is null and estado = 'pendiente' and public.rol_elegible(public.rol_de(auth.uid()), tipo))
    or escalado_por = auth.uid()
  );

-- ── ubicaciones_gestor (seguimiento en vivo del panel de admin) ──────────
-- Cada gestor sube/actualiza SOLO su propia fila (lo hace su dispositivo
-- cada cierto tiempo); el admin lee las de todos para el mapa en vivo.
create policy "gestor administra su ubicacion" on public.ubicaciones_gestor
  for all to authenticated using (gestor_id = auth.uid()) with check (gestor_id = auth.uid());
create policy "admin ve todas las ubicaciones" on public.ubicaciones_gestor
  for select using (public.es_admin());

-- Solo el propio candidato inserta su solicitud; el admin la revisa/aprueba.
create policy "crear mi solicitud" on public.solicitudes_registro
  for insert with check (correo = auth.jwt() ->> 'email');
create policy "admin ve solicitudes" on public.solicitudes_registro
  for select using (public.es_admin());
create policy "admin revisa solicitudes" on public.solicitudes_registro
  for update using (public.es_admin());

-- Cada quien ve sus propias notificaciones, más las broadcast por rol
-- (perfil_id null, creadas por crearServicio cuando hay un servicio nuevo).
create policy "mis notificaciones" on public.notificaciones
  for select using (perfil_id = auth.uid());
create policy "notificaciones broadcast por rol" on public.notificaciones
  for select using (perfil_id is null and rol_destino = public.rol_de(auth.uid()));
create policy "staff crea notificaciones" on public.notificaciones
  for insert to authenticated with check (true);
-- Fase 5: marcar como leída (propias o broadcast de mi rol) y campana del admin.
create policy "actualizar mis notificaciones" on public.notificaciones
  for update to authenticated
  using (
    perfil_id = auth.uid()
    or (perfil_id is null and rol_destino = public.rol_de(auth.uid()))
    or public.es_admin()
  )
  with check (
    perfil_id = auth.uid()
    or (perfil_id is null and rol_destino = public.rol_de(auth.uid()))
    or public.es_admin()
  );
create policy "admin ve todas las notificaciones" on public.notificaciones
  for select to authenticated
  using (public.es_admin());

create policy "mis push tokens" on public.push_tokens
  for all using (perfil_id = auth.uid());

-- ── pagos ──────────────────────────────────────────────────────────────────
-- El gestor asignado al servicio ve y registra pagos; el admin ve todo.
create policy "gestor o admin ven pagos" on public.pagos
  for select to authenticated
  using (
    public.es_admin()
    or exists (
      select 1 from public.servicios s
      where s.id = pagos.servicio_id and s.gestor_id = auth.uid()
    )
  );
create policy "gestor registra pagos" on public.pagos
  for insert to authenticated
  with check (
    capturado_por = auth.uid()
    and exists (
      select 1 from public.servicios s
      where s.id = pagos.servicio_id and s.gestor_id = auth.uid()
    )
  );

-- ── eventos_servicio (fase 5) ────────────────────────────────────────────────
create policy "ver eventos de mis servicios" on public.eventos_servicio
  for select to authenticated
  using (
    public.es_admin()
    or exists (
      select 1 from public.servicios s
      where s.id = eventos_servicio.servicio_id and s.gestor_id = auth.uid()
    )
  );
create policy "registrar mis eventos" on public.eventos_servicio
  for insert to authenticated
  with check (
    perfil_id = auth.uid()
    and (
      public.es_admin()
      or exists (
        select 1 from public.servicios s
        where s.id = eventos_servicio.servicio_id
          and (s.gestor_id = auth.uid() or s.estado = 'pendiente')
      )
    )
  );

-- ── evidencias_servicio (fase 5) ─────────────────────────────────────────────
create policy "ver evidencias de mis servicios" on public.evidencias_servicio
  for select to authenticated
  using (
    public.es_admin()
    or exists (
      select 1 from public.servicios s
      where s.id = evidencias_servicio.servicio_id and s.gestor_id = auth.uid()
    )
  );
create policy "subir mis evidencias" on public.evidencias_servicio
  for insert to authenticated
  with check (
    subido_por = auth.uid()
    and (
      public.es_admin()
      or exists (
        select 1 from public.servicios s
        where s.id = evidencias_servicio.servicio_id and s.gestor_id = auth.uid()
      )
    )
  );

-- ── informes_servicio (fase 6) ──────────────────────────────────────────────
-- Escritura reservada a confirmar_informe_y_archivar / restaurar_evidencias.
create policy "ver informes de mis servicios" on public.informes_servicio
  for select to authenticated
  using (
    public.es_admin()
    or exists (
      select 1 from public.servicios s
      where s.id = informes_servicio.servicio_id and s.gestor_id = auth.uid()
    )
  );

-- ── Realtime ────────────────────────────────────────────────────────────────
-- Panel de admin (ubicaciones en vivo) y canales de gestores (servicios
-- nuevos) usan postgres_changes; las tablas deben estar en la publicación.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'ubicaciones_gestor'
  ) then
    alter publication supabase_realtime add table public.ubicaciones_gestor;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'servicios'
  ) then
    alter publication supabase_realtime add table public.servicios;
  end if;
end $$;

-- ============================================================================
-- Storage: bucket "documentos"
-- ============================================================================
-- 1. Crea el bucket manualmente: Storage → New bucket → nombre "documentos",
--    marcado como PRIVADO (no público).
-- 2. Corre las políticas de abajo (SQL Editor → Run) para que cada candidato
--    pueda subir y leer SOLO los archivos dentro de su propia carpeta
--    (documentos/<su-user-id>/...), que es como los sube domain/auth/registro.ts.

create policy "subir mis documentos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'documentos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "ver mis documentos" on storage.objects
  for select to authenticated
  using (bucket_id = 'documentos' and (storage.foldername(name))[1] = auth.uid()::text);

-- El admin también puede ver los documentos de cualquiera al revisar una
-- solicitud (app/(tabs)/aprobaciones.tsx).
create policy "admin ve todos los documentos" on storage.objects
  for select to authenticated
  using (bucket_id = 'documentos' and public.es_admin());

-- ── Fase 6: archivado de evidencias (storage) ───────────────────────────────

-- La RPC security definer (owner = postgres) lee storage.objects para validar
-- origen/destino/PDF antes de archivar.
create policy "lectura de archivado para postgres" on storage.objects
  for select to postgres
  using (bucket_id = 'documentos');

-- Tras archivar, el cliente quita el original de SU carpeta; el admin sube y
-- borra en cualquier carpeta (archiva casos de cualquier gestor).
create policy "borro mis documentos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'documentos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "admin sube a cualquier carpeta" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'documentos' and public.es_admin());

create policy "admin borra documentos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'documentos' and public.es_admin());

do $$ begin
  grant select on storage.objects to postgres;
exception when others then null; end $$;

-- ── Fase 6: informe PDF + archivado/restauración de evidencias ──────────────
-- El cliente genera el PDF con expo-print, verifica que todas las fotos quedaron
-- incrustadas, sube el PDF, copia las evidencias a
-- `<dueno>/archivo_evidencias/<servicioId>/…` y llama a la RPC; recién entonces
-- borra los originales. Ver supabase/fix-pdf-informes.sql (comentario detallado).

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
