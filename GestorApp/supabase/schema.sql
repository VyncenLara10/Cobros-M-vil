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
  creado_en timestamptz not null default now()
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
  fecha_asignacion timestamptz not null default now(),
  fecha_limite timestamptz,
  subtipos_verificacion text[],                  -- ['domiciliar','laboral']
  tipo_gestion_legal text,
  tarifa_legal numeric(12,2),
  notas text,
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
  insert into public.perfiles (id, nombre, rol, activo)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nombre', new.email),
    coalesce((new.raw_user_meta_data ->> 'rol')::rol_app, 'verificador'),
    false  -- inactivo hasta que se aprueba la solicitud de registro
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.crear_perfil_nuevo_usuario();

-- ============================================================================
-- Row Level Security (RLS) — ESQUELETO, ajustar antes de ir a producción
-- ============================================================================
-- Por defecto Supabase bloquea todo si RLS está activo y no hay políticas.
-- Estas son de partida; revísalas con calma antes de usarlas en real.

alter table public.perfiles enable row level security;
alter table public.servicios enable row level security;
alter table public.solicitudes_registro enable row level security;
alter table public.notificaciones enable row level security;
alter table public.push_tokens enable row level security;

-- Cada quien lee/edita su propio perfil.
create policy "perfil propio" on public.perfiles
  for select using (auth.uid() = id);
create policy "perfil propio update" on public.perfiles
  for update using (auth.uid() = id);

-- Un gestor ve sus servicios asignados o los pendientes sin asignar;
-- el admin ve todo (ajustar el chequeo de rol admin vía una función helper).
create policy "servicios del gestor" on public.servicios
  for select using (gestor_id = auth.uid() or gestor_id is null);

-- Solo el propio candidato inserta su solicitud; solo un admin la revisa
-- (falta agregar el check de rol admin con una función is_admin()).
create policy "crear mi solicitud" on public.solicitudes_registro
  for insert with check (correo = auth.jwt() ->> 'email');

-- Cada quien ve sus propias notificaciones.
create policy "mis notificaciones" on public.notificaciones
  for select using (perfil_id = auth.uid());

create policy "mis push tokens" on public.push_tokens
  for all using (perfil_id = auth.uid());
