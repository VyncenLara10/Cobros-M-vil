-- ============================================================================
-- FIX PERFIL · fix-perfil-activar.sql
-- Problema: solicitudes creadas ANTES de que existiera solicitudes_registro.perfil_id
-- quedaron aprobadas sin vincular → al aprobar, perfiles.activo nunca se
-- encendía → el gestor ve "Tu cuenta está pendiente de aprobación" para siempre
-- ("no me deja entrar").
--
-- Qué hace (una vez):
--   1. Vincula perfil_id de esas solicitudes viejas con el usuario de Auth
--      (por correo).
--   2. Activa los perfiles cuya solicitud ya estaba aprobada.
--
-- CÓMO SE CORRE: Supabase → SQL Editor → Run. Idempotente.
-- ============================================================================

-- 1) Vincular perfil_id faltantes (usuario de Auth == fila de perfiles).
update public.solicitudes_registro s
set perfil_id = u.id
from auth.users u
where s.perfil_id is null
  and lower(s.correo) = lower(coalesce(u.email, ''));

-- 2) Activar perfiles de solicitudes ya aprobadas.
update public.perfiles p
set activo = true
from public.solicitudes_registro s
where s.perfil_id = p.id
  and s.estado = 'aprobado'
  and p.activo = false;

-- Verificación esperada: 0 filas afectadas en (2) después de correrlo.
