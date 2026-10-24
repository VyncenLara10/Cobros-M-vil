-- ============================================================================
-- FASE 5 · fix-fase5.sql
-- Qué agrega:
--   1. public.eventos_servicio  → historial de hora + ubicación por acción
--      (aceptar, rechazar, intento, pago, en sitio, completar, escalar…).
--   2. public.evidencias_servicio → registro de las fotos/evidencias que los
--      gestores suben (los archivos van al bucket privado "documentos").
--   3. Notificaciones: políticas de UPDATE (marcar como leída) y SELECT para
--      que el admin vea todas.
--
-- CÓMO SE CORRE: Supabase → SQL Editor → New query → pegar todo → Run.
-- (Idempotente: se puede correr más de una vez sin romper nada.)
-- ============================================================================

-- ─── 1. Eventos del servicio (hora + GPS por acción) ────────────────────────
create table if not exists public.eventos_servicio (
  id uuid primary key default gen_random_uuid(),
  servicio_id uuid not null references public.servicios(id) on delete cascade,
  perfil_id uuid references public.perfiles(id) on delete set null default auth.uid(),
  accion text not null,                 -- 'aceptado' | 'rechazado' | 'intento_fallido' | 'pago' | ...
  lat double precision,
  lng double precision,
  creado_en timestamptz not null default now()
);

create index if not exists eventos_servicio_servicio_idx
  on public.eventos_servicio (servicio_id, creado_en desc);

alter table public.eventos_servicio enable row level security;

-- Ver: admin siempre; el gestor asignado al servicio.
drop policy if exists "ver eventos de mis servicios" on public.eventos_servicio;
create policy "ver eventos de mis servicios" on public.eventos_servicio
  for select to authenticated
  using (
    public.es_admin()
    or exists (
      select 1 from public.servicios s
      where s.id = eventos_servicio.servicio_id and s.gestor_id = auth.uid()
    )
  );

-- Insertar: siempre a nombre propio, y solo si es admin, si el servicio está
-- asignado a uno, o si sigue pendiente (el gestor acaba de rechazarlo).
drop policy if exists "registrar mis eventos" on public.eventos_servicio;
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

-- ─── 2. Evidencias (fotos) por servicio ─────────────────────────────────────
create table if not exists public.evidencias_servicio (
  id uuid primary key default gen_random_uuid(),
  servicio_id uuid not null references public.servicios(id) on delete cascade,
  clave text not null,                  -- 'frente' | 'contador' | 'evidencia' | ...
  ruta_storage text not null,           -- ruta dentro del bucket documentos
  subido_por uuid references public.perfiles(id) on delete set null default auth.uid(),
  creado_en timestamptz not null default now()
);

create index if not exists evidencias_servicio_servicio_idx
  on public.evidencias_servicio (servicio_id);

alter table public.evidencias_servicio enable row level security;

drop policy if exists "ver evidencias de mis servicios" on public.evidencias_servicio;
create policy "ver evidencias de mis servicios" on public.evidencias_servicio
  for select to authenticated
  using (
    public.es_admin()
    or exists (
      select 1 from public.servicios s
      where s.id = evidencias_servicio.servicio_id and s.gestor_id = auth.uid()
    )
  );

drop policy if exists "subir mis evidencias" on public.evidencias_servicio;
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

-- ─── 3. Notificaciones: marcar leídas + admin ve todo ───────────────────────
-- Marcar como leída las propias y las broadcast de mi rol.
drop policy if exists "actualizar mis notificaciones" on public.notificaciones;
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

-- El admin ve la campana completa.
drop policy if exists "admin ve todas las notificaciones" on public.notificaciones;
create policy "admin ve todas las notificaciones" on public.notificaciones
  for select to authenticated
  using (public.es_admin());
