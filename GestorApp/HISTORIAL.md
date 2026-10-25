# HISTORIAL de cambios — GestorApp

> **Cómo usar este archivo:** es el punto de partida de cada sesión. Léelo antes de
> tocar código y **añade una entrada nueva al final** cada vez que termines un cambio
> (qué se hizo, en qué archivos, cómo se verificó, qué falta al usuario). Así no hay
> que releer todo el proyecto para hacer el siguiente cambio.

---

## Datos fijos del proyecto (no releer)

- **Stack:** Expo SDK 56 + expo-router + TypeScript, npm; Supabase vía `lib/supabase.ts`
  (`supabaseConfigurado`); `.env` con anon key → la app corre en modo REAL.
- **Mapas:** `react-native-maps@1.27.2` (Android/iOS) + `leaflet` (web). Key de Google en
  `app.json` → `android.config.googleMaps.apiKey`.
- **Comandos de verificación:** `npx tsc --noEmit` y `npm run lint` (baseline actual: **6
  problemas** preexistentes; no subir ese conteo). No hay tests.
- **Pasos manuales del usuario** (siempre se le recuerdan):
  1. Correr los `.sql` de `supabase/` en el SQL Editor de Supabase.
  2. Regenerar/build de Android: `npx expo prebuild -p android && npx expo run:android`
     (los cambios nativos NO llegan por OTA).
  3. Crear bucket privado `documentos` en Storage si no existe.
- **Español de Guatemala:** UI y comentarios en español; moneda Q, locale `es-GT`.
- **RLS clave:** `perfiles` (perfil propio / admin), `servicios` (visibles por rol elegible),
  `notificaciones` (propias + broadcast por rol + staff crea; ver fase 5), `pagos`,
  storage `documentos/{uid}/…` (subir/ver propios, admin ve todo).
- **Roles:** `admin` (todo) · `cobrador` → cobro/notificacion/verificacion ·
  `verificador` → notificacion/verificacion · `abogado` → notificacion/verificacion/legal
  (`ROLES_ELEGIBLES` en `types.ts`).
- **Mapa de rutas:** ruta real por calles = deep link a Google Maps
  (`https://www.google.com/maps/dir/?api=1&destination=…`) — gratis. Pines/líneas dentro de
  la app son gratis (tier gratuito Maps SDK); Directions API sería de pago (no se usa).

---

## Log de cambios

### Fases 1–4e (completadas — módulos de roles con datos reales)
- `supabase/fix-modulos.sql` + espejo en `schema.sql`: pagos, policies de notificaciones,
  realtime de `servicios`. `fix-perfil-registro.sql`: trigger de registro guarda
  teléfono/zona/nº colegiado y backfill desde `solicitudes_registro`.
- Domain: ranking por cercanía (`rankearDisponibles`, `distanciaKm`/`enMiZona`),
  `serviciosVisiblesPara`, mutaciones (aceptar/rechazar/intento/pagos/completar/escalar/
  en_sitio), `crearServicio` con broadcast de notificaciones, `cargarStatsGestor`,
  `actualizarDisponibilidad`, `cargarGestores`.
- Hooks: `useServiciosDisponibles`, `useServiciosEnTiempoReal`, `posicionConCache`.
- Web: `components/mapa/mapa-comun.ts` + `MapaSeguimiento.web.tsx`/`MapaPins.web.tsx`
  (Leaflet, import dinámico, SSG-safe).
- Tabs: pestaña "Solicitar" solo admin; `softwareKeyboardLayoutMode: pan` en `app.json`.
- Fix registro: `aprobarSolicitudReal` copia teléfono/zona/nº colegiado al perfil;
  `mi-perfil` muestra teléfono.

### Fase 5 (completada) — bugs críticos + funcionalidad
- **Crash "Mi perfil" (maximum update depth):** `useFocusEffect` con callback inestable →
  bucle infinito. Corregido en `hooks/useServicios.ts` (refrescar vía `useCallback([])` +
  `.catch`) y `app/(tabs)/mi-perfil.tsx` (refrescar con deps estables). **Regla:** callbacks a
  `useFocusEffect` SIEMPRE `useCallback` con deps estables.
- **SQL nuevos:** `supabase/fix-fase5.sql` (tablas `eventos_servicio` + `evidencias_servicio`
  con índices/RLS; policies "actualizar mis notificaciones" y "admin ve todas") y
  `supabase/fix-perfil-activar.sql` (backfill `perfil_id` por email + activar perfiles de
  solicitudes aprobadas). Espejo completo en `schema.sql`.
- **Módulos nuevos:** `domain/servicios/eventos.ts` (`registrarEvento` fire-and-forget con GPS
  límite 3 s, `cargarEventos`), `domain/servicios/evidencias.ts` (`subirEvidencias` con bytes vía
  `expo-file-system`, `cargarEvidencias` con URL firmada 24 h; path `uid/evidencias/servicioId/`),
  `domain/notificaciones/notificaciones.ts` (`cargarNotificaciones`, `contarNoLeidas`,
  `marcarTodasLeidas`, `notificarGestor`).
- **Eventos cableados** en `domain/servicios/servicios.ts`: aceptar, rechazar, intento (+ GPS),
  pago, escalado legal, en sitio, completar (parcial y total). Aprobación/rechazo de solicitudes
  notifican al gestor (`domain/aprobaciones/aprobaciones.ts`).
- **Campana + notificaciones:** pantalla `app/notificaciones.tsx`; badge con contador en
  `app/(tabs)/index.tsx` (recarga con `useFocusEffect` estable); marcado de leídas al abrir.
- **Filtros por rol** en index: solo muestra tipos que el rol puede hacer (`rolPuedeAceptar`),
  admin conserva todos.
- **Títulos/headers:** `(tabs)/_layout` con `headerShown: false`; títulos en `admin`
  ("Seguimiento del equipo") + botón `tel:` con `Linking`, `aprobaciones` ("Aprobación de
  gestores"), `mi-perfil` ("Mi perfil").
- **Ruta al servicio:** `components/ModalRuta.tsx` (bottom sheet con mapa `MapaRuta`,
  distancia y botón "Navegar con Google Maps"), `components/mapa/MapaRuta.tsx` (native) +
  `.web.tsx` (Leaflet). Botón en detalle del servicio y en `mi-perfil`.
- **Evidencias/fotos:** `verificacion/[id]` sube sus fotos al completar la parte;
  `legal/[id]` sube la evidencia; aviso si alguna falla. Detalle muestra sección
  **EVIDENCIAS** (miniaturas + visor a pantalla completa) y **ACTIVIDAD** (timeline de
  eventos con hora, gestor y GPS).
- **ID solo admin:** en `servicio/[id]` (`usuario?.rol === 'admin'`), `ServiceCard` y fuera de
  `mi-perfil` (pantalla de gestores).
- **Android:** `npx expo prebuild -p android` aplicado → manifest con
  `com.google.android.geo.API_KEY` y `windowSoftInputMode="adjustPan"` ✓ (falta build/ejecución).
- **Verificación:** `npx tsc --noEmit` ✓; `npm run lint` = **6 problemas** (eran 8: se
  corrigieron los 2 nuevos de la fase 5 y no se agregaron).

---

### Fase 6 (completada) — Mapa negro en Android: causa billing + switch temporal
- **Diagnóstico (sin tocar código):** el manifest SÍ lleva la key
  (`com.google.android.geo.API_KEY` desde el prebuild) y los componentes están bien.
  La causa es la **key de prueba**: probada con curl contra Google responde
  `REQUEST_DENIED: "You must enable Billing on the Google Cloud Project"` → sin billing
  Google no sirve tiles → el MapView de Android queda **negro**. No hay forma de usar el
  Maps SDK de Android sin habilitar Billing (aunque el crédito de US$200/mes cubre pruebas).
- **Se probó la app en:** APK de EAS perfil `preview` (no hay build local gradle).
- **Switch temporal `EXPO_PUBLIC_MAPA_OFF`** (solo afecta nativo/Android; web Leaflet/OSM
  y Expo Go no lo ven):
  - `components/mapa/mapa-comun.ts` → `MAPAS_OFF = process.env.EXPO_PUBLIC_MAPA_OFF === '1'`
    con la doc de reversión. **Default (ausente) = mapa real.**
  - `MapaSeguimiento.tsx` (admin) → esquemático existente (pines + ruta) + badge
    *"Mapa apagado temporalmente · falta billing de Google"*.
  - `MapaPins.tsx` (gestores) → **esquemático con pines de colores** (proyección lat/lng→xy,
    conserva la leyenda verde/amarillo/gris de la pantalla).
  - `MapaRuta.tsx` (cómo llegar) → **esquemático de 2 pines + línea**; el botón
    "Navegar con Google Maps" (en `ModalRuta`) no depende del mapa y sigue funcionando.
  - `eas.json` → `"EXPO_PUBLIC_MAPA_OFF": "1"` **solo en `preview.env`**; `production` sin flag.
- **Reversión (sin tocar código):** 1) Google Cloud → habilitar **Billing** + **Maps SDK
  for Android** (recomendado: restringir key a `com.tuempresa.cobranzagt` + SHA-1);
  2) borrar la línea `EXPO_PUBLIC_MAPA_OFF` de `eas.json`; 3) `eas build -p android
  --profile preview` → mapas reales de vuelta.
- **Verificación:** `npx tsc --noEmit` y `npm run lint` (≤6). El cambio visual se confirma
  reconstruyendo el APK preview (debe verse esquemático, no negro).

---

## Pendientes conocidos del usuario
1. Correr en SQL Editor: `supabase/fix-fase5.sql` y `supabase/fix-perfil-activar.sql`
   (además de `fix-modulos.sql` y `fix-perfil-registro.sql` si aún no).
2. **Google Cloud (mapa):** habilitar Billing + Maps SDK for Android; después borrar
   `EXPO_PUBLIC_MAPA_OFF` de `eas.json` y reconstruir el APK (ver reversión en fase 6).
3. Bucket `documentos` (privado) en Storage si no existe (subida de evidencias).
4. Regenerar tipos de rutas si se agregan pantallas nuevas: arrancar `npx expo start`
   un momento (escribe `.expo/types/router.d.ts`).
