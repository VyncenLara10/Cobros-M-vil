-- ============================================================================
-- Fix: registro de gestores no insertaba en solicitudes_registro
-- ============================================================================
-- Problema 1: domain/auth/registro.ts inserta `perfil_id` pero la columna no
--             existía en la tabla (schema.sql no la definía) → el INSERT
--             fallaba siempre con "column solicitudes_registro.perfil_id does
--             not exist".
-- Problema 2: el bucket de Storage "documentos" no existía → la subida de DPI/
--             licencias/etc. fallaba (no bloqueante, pero sin papelería para
--             el admin).
--
-- Cómo usarlo:
--   Supabase Dashboard → SQL Editor → pega este archivo → Run.
--   (Si la columna/bucket ya existen, no rompe nada: son idempotentes.)
--
-- Además, para pruebas: Dashboard → Authentication → Providers → Email →
-- desactiva "Confirm email" (el app inserta la solicitud justo después del
-- signUp y necesita la sesión activa).
-- ============================================================================

alter table public.solicitudes_registro
  add column if not exists perfil_id uuid references public.perfiles(id);

insert into storage.buckets (id, name, public)
values ('documentos', 'documentos', false)
on conflict (id) do nothing;
