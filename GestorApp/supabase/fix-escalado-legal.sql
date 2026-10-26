-- ============================================================================
-- Fase 6 · Escalado a legal: migración + RLS + transición de asignación
-- ============================================================================
-- Problema (diagnóstico de la fase 6): `escalarALegal` solo cambiaba el tipo a
-- 'legal' y dejaba `gestor_id` del gestor que escaló. Resultado:
--   * ningún abogado podía VER el caso (la política SELECT solo daba acceso a
--     gestor_id = uid / pendientes elegibles por rol);
--   * el alert "Se notificó al equipo legal" era mentira: no se insertaba
--     ninguna notificación;
--   * el escalador retenía el caso (no había transición de asignación).
--
-- Diseño:
--   * el escalador suelta el caso: gestor_id = null, estado = 'pendiente',
--     fase = null y `escalado_por` = su uid (quién lo mandó, para historial);
--   * los abogados ven todos los servicios tipo 'legal' y pueden tomarlos con
--     el flujo de aceptar ya existente (pendiente + sin asignar);
--   * el escalador conserva SOLO LECTURA vía `escalado_por` en SELECT; el
--     UPDATE queda cerrado para él (USING no lo incluye);
--   * `escalado_por = auth.uid()` en WITH CHECK permite el propio UPDATE de
--     escalado (fila nueva con gestor_id null) sin abrirle otras ediciones.
--
-- Aplicar en el SQL Editor de Supabase. Es idempotente.
-- ============================================================================

-- 1) Columna de auditoría: quién escaló el caso.
alter table public.servicios
  add column if not exists escalado_por uuid references public.perfiles(id) on delete set null;

create index if not exists servicios_escalado_por_idx
  on public.servicios (escalado_por)
  where escalado_por is not null;

-- 2) SELECT: además de lo de siempre, el escalador ve su historial y los
--    abogados ven todos los casos legales (tomados o no).
drop policy if exists "ver servicios propios, elegibles o admin" on public.servicios;
drop policy if exists "ver servicios propios, elegibles, escalados o admin" on public.servicios;
create policy "ver servicios propios, elegibles, escalados o admin" on public.servicios
  for select to authenticated using (
    public.es_admin()
    or gestor_id = auth.uid()
    or escalado_por = auth.uid()
    or (public.rol_de(auth.uid()) = 'abogado' and tipo = 'legal')
    or (gestor_id is null and estado = 'pendiente' and public.rol_elegible(public.rol_de(auth.uid()), tipo))
  );

-- 3) UPDATE partido en USING (qué fila puedo tocar) y WITH CHECK (qué valores
--    nuevos acepto). Esto es lo que hace real la transición de asignación:
--    el abogado puede tomar/editar legales; el escalador ya no.
drop policy if exists "actualizar servicio propio, reclamar pendiente, o admin" on public.servicios;
drop policy if exists "actualizar servicio, reclamar o escalar" on public.servicios;
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
    or escalado_por = auth.uid()   -- permite el propio UPDATE de escalado
  );
