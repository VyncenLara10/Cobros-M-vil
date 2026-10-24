-- ============================================================================
-- Fix: módulos de roles — pagos, notificaciones broadcast y Realtime
-- ============================================================================
-- Problema 1: "Registrar pago" del detalle/cobro no persistía (no existía
--             tabla de pagos; el monto recuperado por banco se perdía).
-- Problema 2: las notificaciones broadcast (perfil_id null + rol_destino)
--             no eran legibles por los gestores (RLS solo permitía leer las
--             propias), así que un servicio nuevo no podía notificarse.
-- Problema 3: el canal Realtime de admin (ubicaciones/servicios) y el nuevo
--             canal de gestores (servicios) no recibían eventos porque las
--             tablas no estaban en la publicación supabase_realtime.
--
-- Cómo usarlo:
--   Supabase Dashboard → SQL Editor → pega este archivo → Run.
--   Idempotente: se puede correr más de una vez sin romper nada.
-- ============================================================================

-- ─── 1. Pagos (recuperación por banco, capturados por el gestor) ────────────

create table if not exists public.pagos (
  id uuid primary key default gen_random_uuid(),
  servicio_id uuid not null references public.servicios(id) on delete cascade,
  banco text not null,
  monto numeric(12,2) not null,
  referencia text,
  capturado_por uuid references public.perfiles(id),
  creado_en timestamptz not null default now()
);

alter table public.pagos enable row level security;

drop policy if exists "gestor o admin ven pagos" on public.pagos;
create policy "gestor o admin ven pagos" on public.pagos
  for select to authenticated
  using (
    public.es_admin()
    or exists (
      select 1 from public.servicios s
      where s.id = pagos.servicio_id and s.gestor_id = auth.uid()
    )
  );

drop policy if exists "gestor registra pagos" on public.pagos;
create policy "gestor registra pagos" on public.pagos
  for insert to authenticated
  with check (
    capturado_por = auth.uid()
    and exists (
      select 1 from public.servicios s
      where s.id = pagos.servicio_id and s.gestor_id = auth.uid()
    )
  );

-- ─── 2. Notificaciones broadcast por rol ────────────────────────────────────
-- crearServicio inserta una fila con perfil_id=null y rol_destino=cada rol
-- elegible; el gestor de ese rol debe poder leerla para mostrarse el aviso.

drop policy if exists "notificaciones broadcast por rol" on public.notificaciones;
create policy "notificaciones broadcast por rol" on public.notificaciones
  for select using (perfil_id is null and rol_destino = public.rol_de(auth.uid()));

-- crearServicio (cualquier staff autenticado) inserta las filas broadcast.
drop policy if exists "staff crea notificaciones" on public.notificaciones;
create policy "staff crea notificaciones" on public.notificaciones
  for insert to authenticated with check (true);

-- ─── 3. Realtime: ubicaciones_gestor + servicios ────────────────────────────
-- Sin esto, el canal del panel de admin y el canal de gestores (servicios
-- nuevos) no emiten eventos; solo funcionaba el polling de 20s.

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
