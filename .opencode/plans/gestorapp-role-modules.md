# GestorApp — Role modules, Uber-style visibility, location & full service lifecycle

## Decisions (from user)
1. **Targeting**: role/type enforced server-side (RLS) + **Uber-style proximity ranking** client-side (nearby gestores see & can accept services even outside their zone) + zone badges.
2. **Alerts**: Supabase Realtime + local notifications (no Edge Function this pass).
3. **Location**: keep foreground GPS (all field roles), enable Realtime publication, rebuild admin **Gestores** tab with real live data. No background tracking this pass.
4. **Dead actions**: implement ALL — pagos (new table), intentos, rechazar, escalar a legal, no-localizado.

## Current state (verified)
- Core lifecycle (create→claim→en_sitio→complete) is REAL Supabase: `domain/servicios/servicios.ts`.
- Role→type map `ROLES_ELEGIBLES` (types.ts:46) mirrored by SQL `rol_elegible()` + RLS on `servicios` (schema.sql:388-401).
- Field-role GPS → `ubicaciones_gestor` every 30s/40m (hooks/useUbicacionTracking.ts:37-43); admin polls 20s + Realtime channel (publication still a comment in schema.sql:426-431).
- Mocks remain in: gestores.tsx (100%), reportes.tsx (100%), mi-perfil stats, index metrics bar (RESUMEN_HOY), servicio/[id] actions (Alert-only TODOs at lines 212/218/232/251).
- `perfiles.zona` never populated; `intentos_servicio` never written; no `pagos` table; no notification on service creation; no realtime for gestores.

## Architecture: Uber-style visibility
- **RLS stays type/role-only** (geo in RLS is impractical without PostGIS): gestor sees own services + pending unassigned of eligible types.
- **Client-side ranking** in `serviciosDisponiblesPara`: haversine distance from gestor's live position (expo-location current fix; fallback `ubicaciones_gestor`) to `clientes.lat/lng`. Sort distance ASC. Badges: "Cerca de ti" (<3 km), "Tu zona" (cliente zona/municipio matches `perfiles.zona`), "Sin ubicación" last.
- `perfiles.zona` populated on approval from `solicitudes_registro.zona_cobertura` (flatten municipio+zonas to text).
- Zone never hides a service (Uber-style): it only ranks/badges.

## Phase 1 — SQL you run once (`supabase/fix-modulos.sql`, new file)
1. `pagos` table (id, servicio_id FK, banco, monto, referencia, capturado_por, creado_en) + RLS: admin or gestor-owner select; gestor-owner insert.
2. notificaciones policy for broadcast rows: `perfil_id is null and rol_destino = rol_de(auth.uid())`.
3. Enable realtime idempotently (DO block): `alter publication supabase_realtime add table public.ubicaciones_gestor; ... add table public.servicios;`
Mirror everything into `supabase/schema.sql` for fresh installs.

## Phase 2 — Domain (`domain/servicios/servicios.ts`)
- `calcularDistanciaKm` haversine helper.
- `serviciosDisponiblesPara`: attach `distanciaKm` + `enMiZona`, sort distance ASC (needs current position param/expo-location).
- New mutations (real + mock parity):
  - `rechazarServicio(id)` → `gestor_id=null, estado='pendiente', fase=null` + intento row.
  - `registrarIntento(id, resultado, nota, geo?)` → INSERT `intentos_servicio`.
  - `registrarPagos(id, pagos[])` → INSERT `pagos`.
  - `escalarALegal(id)` → UPDATE `tipo='legal'`, append nota.
  - `marcarNoLocalizado(id)` → `completarServicio(estadoFinal='no_localizado')`.
- `crearServicio`: after insert, INSERT `notificaciones` broadcast row per eligible role (tipo='servicio_nuevo', referencia_id=servicio id).
- `domain/aprobaciones/aprobaciones.ts` `aprobarSolicitudReal`: also set `perfiles.zona` from flattened `zona_cobertura`.

## Phase 3 — Realtime for gestores
- `hooks/useServicios.ts`: `useServiciosEnTiempoReal(usuario, onNuevo)` → channel on INSERT `servicios`; client-filter pendiente + `rolPuedeAceptar`; on match → `notificarLocal` + refetch. Cleanup on unmount.
- Wire into `app/(tabs)/index.tsx` and `app/(tabs)/mi-perfil.tsx`.

## Phase 4 — Screens (kill mocks)
1. `gestores.tsx` (admin): perfiles (rol≠admin) + gestores_stats + ubicaciones_gestor; live dot green <2min / yellow <10min / gray stale; real stats; keep filters/search.
2. `reportes.tsx` (admin): real aggregates — count by estado/tipo, SUM(pagos.monto), SUM(comision_calculada), tasa éxito, top gestores. Loading/empty states.
3. `mi-perfil.tsx`: real gestores_stats; drop CLIENTES_MOCK enrichment; wire Rechazar → `rechazarServicio`.
4. `index.tsx`: real metrics bar (from loaded data); "Aceptar" on pending eligible cards; distance badges.
5. `components/cards/ServiceCard.tsx`: chips "Cerca de ti" / "Tu zona" / "1.2 km" / "Sin ubicación".
6. `app/servicio/[id].tsx`: wire ModalPago→`registrarPagos`, ModalIntento→`registrarIntento`, escalar→`escalarALegal`, no-localizado→`marcarNoLocalizado`; "Completado" button routes to type flow screen.
7. `app/cobro/[id].tsx`: per-bank amounts → `registrarPagos` on completion.
8. `nuevo-servicio.tsx`: no UI change (notification insert in domain).

## Phase 5 — Types (`types.ts`)
- `Servicio` + `distanciaKm?: number`, `enMiZona?: boolean`; `Pago` interface.

## Verification
1. `npx tsc --noEmit` + `npm run lint`.
2. Manual: admin creates cobro → gestor gets realtime local notification + auto-refresh, sees km badge → Aceptar → en sitio → intento + pago → completar → admin Gestores tab live dot + real stats; reportes real numbers; abogado only sees legal; rechazar returns to pool.

## Out of scope (future)
Background location; real Google Map (react-native-maps + key); remote push Edge Function; GPS-verified arrival; `perfiles.activo` RLS enforcement.

## Files touched (~14)
new `supabase/fix-modulos.sql`; edit `supabase/schema.sql`, `types.ts`, `domain/servicios/servicios.ts`, `domain/aprobaciones/aprobaciones.ts`, `hooks/useServicios.ts`, `app/(tabs)/{index,mi-perfil,gestores,reportes}.tsx`, `app/servicio/[id].tsx`, `app/cobro/[id].tsx`, `components/cards/ServiceCard.tsx`

## Execution order
Phase 1 → 2 → 3 → 4 → 5 (types inline) → verify. Then user runs `fix-modulos.sql` in Supabase SQL Editor → full manual test.
