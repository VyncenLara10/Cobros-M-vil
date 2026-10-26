-- ============================================================================
-- Fase 6 · Push de negocio SERVER-SIDE (trigger + pg_net + outbox + cron)
-- ============================================================================
-- Principio: el cliente NUNCA envía notificaciones de negocio. El flujo es:
--
--   INSERT en public.notificaciones (cualquier flujo de la app)
--     → trigger push_disparar():
--         · resuelve destinatarios (perfil directo o por rol_destino)
--         · crea 1 fila en push_outbox POR DESTINATARIO (auditoría completa)
--         · envía un batch a Expo Push API con net.http_post
--     → cron push-tick (cada 1 min):
--         · escribe el TICKET de Expo por fila (ok/error + mensaje)
--         · reintenta errores hasta 3 veces (salvo DeviceNotRegistered)
--         · pide los RECIBOS (getReceipts) y marca 'entregado'/'error_recepcion'
--
-- Estados de push_outbox (auditoría por destinatario):
--   pendiente → enviado → ticket_ok → entregado
--                          ↘ error → (reintento) → ticket_ok | error (terminal)
--                          ↘ error_recepcion
--   Los recibos pueden no llegar nunca (Expo no los garantiza); la fila queda
--   en 'ticket_ok' con su ticket_id — NUNCA se borra.
--
-- Requiere: pg_net y pg_cron (en Supabase: Dashboard → Database → Extensions).
-- Idempotente: se puede re-ejecutar sin dañar datos.
-- ============================================================================

-- ── Extensiones ────────────────────────────────────────────────────────────
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

-- ── Outbox: 1 fila por destinatario de cada notificación ───────────────────
create table if not exists public.push_outbox (
  id uuid primary key default gen_random_uuid(),
  notificacion_id uuid not null references public.notificaciones(id) on delete cascade,
  perfil_id uuid not null references public.perfiles(id) on delete cascade,
  expo_push_token text not null,
  orden integer not null default 0,             -- índice dentro del batch enviado
  request_id bigint,                            -- id de net.http_post (envío)
  recibo_request_id bigint,                     -- id de net.http_post (getReceipts)
  ticket_id text,                               -- id del ticket Expo
  estado text not null default 'pendiente'
    check (estado in ('pendiente','enviado','ticket_ok','error','entregado','error_recepcion')),
  mensaje text,                                 -- mensaje de error de Expo, si aplica
  intentos integer not null default 0,
  creado_en timestamptz not null default now(),
  enviado_en timestamptz,
  actualizado_en timestamptz not null default now()
);

create index if not exists push_outbox_estado_idx on public.push_outbox (estado, creado_en);
create index if not exists push_outbox_notif_idx on public.push_outbox (notificacion_id);

-- Solo las funciones security definer tocan esta tabla (nada de cliente).
alter table public.push_outbox enable row level security;

-- ── Trigger: al insertar una notificación, armar y enviar el batch ─────────
create or replace function public.push_disparar()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  msgs jsonb;
  rid bigint;
  total integer;
begin
  if new.perfil_id is null and new.rol_destino is null then
    return new;  -- sin destino push
  end if;

  -- 1 fila por token del destinatario (perfil activo).
  insert into public.push_outbox (notificacion_id, perfil_id, expo_push_token, orden)
  select new.id, t.perfil_id, t.expo_push_token, (row_number() over ()) - 1
  from public.push_tokens t
  join public.perfiles p on p.id = t.perfil_id
  where p.activo
    and (
      (new.perfil_id is not null and t.perfil_id = new.perfil_id)
      or (new.perfil_id is null and p.rol = new.rol_destino)
    );

  select count(*) into total from public.push_outbox where notificacion_id = new.id;
  if total = 0 then return new; end if;  -- nadie con token registrado

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'to', o.expo_push_token,
      'title', new.titulo,
      'body', new.cuerpo,
      'sound', 'default',
      'priority', 'high',
      'channelId', 'default',
      'data', jsonb_build_object(
        'tipo', new.tipo,
        'referencia_id', coalesce(new.referencia_id::text, ''),
        'notificacion_id', new.id::text
      )
    ) order by o.orden
  ), '[]'::jsonb)
  into msgs
  from public.push_outbox o
    where o.notificacion_id = new.id;

  begin
    rid := net.http_post(
      url := 'https://exp.host/--/api/v2/push/send',
      headers := jsonb_build_object('Content-Type', 'application/json', 'Accept', 'application/json'),
      body := jsonb_build_object('messages', msgs),
      timeout_milliseconds := 10000
    );
    update public.push_outbox
    set request_id = rid, estado = 'enviado', intentos = 1,
        enviado_en = now(), actualizado_en = now()
    where notificacion_id = new.id;
  exception when others then
    -- El push es mejor esfuerzo: las filas quedan 'pendiente' y el cron
    -- (push_reintentar) las enviará. La notificación NUNCA falla por esto.
    raise warning '[push] no se pudo enviar a Expo: %', sqlerrm;
  end;

  return new;
end;
$$;

drop trigger if exists notificaciones_push on public.notificaciones;
create trigger notificaciones_push
  after insert on public.notificaciones
  for each row execute function public.push_disparar();

-- ── 1) Tickets: leer la respuesta de Expo y marcar cada fila ───────────────
create or replace function public.push_procesar_respuestas()
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  r record;
  elem jsonb;
begin
  for r in
    select o.id, o.orden, resp.content
    from public.push_outbox o
    join net._http_response resp on resp.request_id = o.request_id
    where o.estado = 'enviado' and o.request_id is not null
  loop
    -- Expo responde los tickets en el MISMO orden del batch.
    elem := r.content -> 'data' -> r.orden;
    if elem is null then
      continue;  -- respuesta aún incompleta: se reintenta al próximo tick
    end if;
    update public.push_outbox
    set ticket_id = elem->>'id',
        estado = case when elem->>'status' = 'ok' then 'ticket_ok' else 'error' end,
        mensaje = case when elem->>'status' = 'ok' then null
                  else left(coalesce(elem->>'message', 'error desconocido de Expo'), 300) end,
        actualizado_en = now()
    where id = r.id;
  end loop;

  -- Envíos sin respuesta de Expo a los 5 min → error (dispara reintentos).
  update public.push_outbox
  set estado = 'error', mensaje = 'sin respuesta de Expo (timeout)', actualizado_en = now()
  where estado = 'enviado' and enviado_en < now() - interval '5 minutes';
end;
$$;

-- ── 2) Reintentos: pendientes viejos + errores (máx. 3 intentos) ───────────
create or replace function public.push_reintentar()
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  f record;
  msgs jsonb := '[]'::jsonb;
  ids uuid[] := '{}';
  rid bigint;
begin
  for f in
    select o.id, o.notificacion_id, o.expo_push_token, n.titulo, n.cuerpo, n.tipo, n.referencia_id
    from public.push_outbox o
    join public.notificaciones n on n.id = o.notificacion_id
    where (
      (o.estado = 'pendiente' and o.creado_en < now() - interval '1 minute')
      or (o.estado = 'error' and o.intentos < 3)
    )
      and coalesce(o.mensaje, '') not like '%DeviceNotRegistered%'  -- token inválido: no reintentar
    order by o.creado_en
    limit 50
  loop
    msgs := msgs || jsonb_build_array(jsonb_build_object(
      'to', f.expo_push_token,
      'title', f.titulo,
      'body', f.cuerpo,
      'sound', 'default',
      'priority', 'high',
      'channelId', 'default',
      'data', jsonb_build_object(
        'tipo', f.tipo,
        'referencia_id', coalesce(f.referencia_id::text, ''),
        'notificacion_id', f.notificacion_id::text
      )
    ));
    ids := ids || f.id;
  end loop;

  if array_length(ids, 1) is null then return; end if;

  begin
    rid := net.http_post(
      url := 'https://exp.host/--/api/v2/push/send',
      headers := jsonb_build_object('Content-Type', 'application/json', 'Accept', 'application/json'),
      body := jsonb_build_object('messages', msgs),
      timeout_milliseconds := 10000
    );
    update public.push_outbox
    set request_id = rid,
        orden = (array_position(ids, id) - 1),
        estado = 'enviado',
        intentos = intentos + 1,
        enviado_en = now(),
        ticket_id = null,
        mensaje = null,
        actualizado_en = now()
    where id = any(ids);
  exception when others then
    raise warning '[push] reintento fallido: %', sqlerrm;
  end;
end;
$$;

-- ── 3) Recibos (fase A): pedir a Expo el estado de entrega de los tickets ──
create or replace function public.push_pedir_recibos()
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  ids jsonb;
  rid bigint;
begin
  select coalesce(jsonb_agg(to_jsonb(t.ticket_id)), '[]'::jsonb)
  into ids
  from (
    select ticket_id
    from public.push_outbox
    where estado = 'ticket_ok' and ticket_id is not null and recibo_request_id is null
    order by actualizado_en
    limit 200
  ) t;

  if ids = '[]'::jsonb then return; end if;

  begin
    rid := net.http_post(
      url := 'https://exp.host/--/api/v2/push/getReceipts',
      headers := jsonb_build_object('Content-Type', 'application/json', 'Accept', 'application/json'),
      body := jsonb_build_object('ids', ids),
      timeout_milliseconds := 10000
    );
    update public.push_outbox
    set recibo_request_id = rid, actualizado_en = now()
    where estado = 'ticket_ok' and recibo_request_id is null;
  exception when others then
    raise warning '[push] no se pudieron pedir recibos: %', sqlerrm;
  end;
end;
$$;

-- ── 4) Recibos (fase B): leer la respuesta y cerrar cada fila ──────────────
create or replace function public.push_procesar_recibos()
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  r record;
  par jsonb;
begin
  for r in
    select o.id, o.ticket_id, resp.content
    from public.push_outbox o
    join net._http_response resp on resp.request_id = o.recibo_request_id
    where o.estado = 'ticket_ok' and o.recibo_request_id is not null and o.ticket_id is not null
  loop
    -- getReceipts responde un mapa {ticketId: {status, details}}.
    par := r.content -> 'data' -> r.ticket_id;
    if par is null then
      continue;  -- Expo aún no tiene recibo para este ticket
    end if;
    update public.push_outbox
    set estado = case when par->>'status' = 'ok' then 'entregado' else 'error_recepcion' end,
        mensaje = case when par->>'status' = 'ok' then mensaje
                  else left(coalesce(par->>'details', par->>'message', 'error de recepción'), 300) end,
        actualizado_en = now()
    where id = r.id;
  end loop;
end;
$$;

-- ── Orquestador (1 tick = 1 minuto) ────────────────────────────────────────
create or replace function public.push_tick()
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform public.push_procesar_respuestas();
  perform public.push_reintentar();
  perform public.push_pedir_recibos();
  perform public.push_procesar_recibos();
exception when others then
  raise warning '[push] push_tick: %', sqlerrm;
end;
$$;

do $$
begin
  perform cron.schedule('gestorapp-push-tick', '* * * * *', 'select public.push_tick()');
exception when others then
  raise warning 'No se pudo agendar el cron de push (%). Activa la extensión pg_cron y vuelve a ejecutar este bloque.', sqlerrm;
end $$;

-- ============================================================================
-- PRUEBA MANUAL (SQL Editor):
--   insert into public.notificaciones (perfil_id, titulo, cuerpo, tipo)
--   values (auth.uid(), 'Prueba GestorApp', 'Push de negocio por servidor', 'prueba');
-- Luego revisar:  select estado, count(*) from public.push_outbox group by 1;
-- ============================================================================
