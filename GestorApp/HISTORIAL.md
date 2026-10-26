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

### Tanda "fase 6" (completada) — 7 pasos aprobados: suscripciones, sesiones, cámara, escalado, completar, push, informe

- **Paso 3 · Realtime compartido:** nuevo `hooks/realtime/suscripcionCompartida.ts` —
  1 canal por clave `${topico}::${event}:${schema}:${table}[:filter]`, `.on()` una sola
  vez antes de `.subscribe()`, refcount con `Set`, `unsubscribe` idempotente, guard
  `supabaseConfigurado`, helper `estadoSuscripciones()`; sin try/catch como sustituto de
  diseño. `useServiciosEnTiempoReal` y `useSeguimientoEquipo` reusan `suscribirse`
  (2 filtros = 2 canales). Prueba con stub en `/tmp/opencode/rt-test` → **6/6 OK**.
  Higiene: `.catch` en `cargarStatsGestor` (mi-perfil) y `servicioPorId` (useServicios),
  spinner en `mi-perfil` si `!usuario` (estilo `centrado`).
- **Paso 4 · Sesiones/MFA/inactividad:** `app/index.tsx` espera `cargando` antes de
  redirect (sin flash de login); `Guard()` con `useSegments` en `app/_layout.tsx`
  (públicas: `login`, `(auth)`, `auth`, `+not-found`; con sesión en login → `/(tabs)`).
  `faltaSegundoFactor()` endurecido (error AAL → consulta factores; ambos fallan →
  `true` + warn). Link "Volver a entrar con contraseña" en modo MFA de `login.tsx`.
  Inactividad 30 min en `SesionProvider` (`INACTIVIDAD_MS`, chequeo cada 30 s; reset por
  `usePathname`/`AppState active`/`pointerdown`+`keydown` web/`onStartShouldSetResponderCapture`
  con `return false` en la View raíz → no traga taps); logout + `Alert` +
  `borrarSesionGuardada` + `signOut`.
- **Paso 1 · Cámara/galería:** `components/(auth)/Documentuploader.tsx` —
  `seleccionarImagen()` con Alert "Tomar foto"/"Elegir de galería"/"Cancelar" (web → solo
  galería), `tomarFoto` con `requestCameraPermissionsAsync` + `launchCameraAsync`, `elegirDeGaleria`
  migrado a `mediaTypes:['images']` (deprecated `MediaTypeOptions` eliminado), try/catch por
  fuente. Plugin `expo-image-picker` en `app.json` con permisos en español.
- **Paso 2 · Escalado legal:** `supabase/fix-escalado-legal.sql` (+ espejo en `schema.sql`):
  columna `escalado_por uuid`; al escalar `tipo='legal', gestor_id=null, estado='pendiente',
  fase=null, escalado_por=uid` (transición de asignación: los abogados toman el caso con el
  flujo de aceptar existente); SELECT/UPDATE partido en USING/WITH CHECK, con
  `escalado_por = auth.uid()` en WITH CHECK para que el propio UPDATE de escalado pase
  (el escalador queda SOLO LECTURA: USING ya no lo incluye). Notificación broadcast
  `tipo='servicio_escalado'`, `rol_destino='abogado'`. UI: sección "Escalados a legal"
  solo lectura en `mi-perfil` (`useServiciosEscalados`, bordes `#9B7BF0`), `puedeAccionar`
  en `servicio/[id]` + bloque "solo lectura" para legales.
- **Paso 5a · Completar + refresh:** botón "Marcar como completado" para los 4 tipos en
  ACCIONES (`servicio/[id]`) + `useFocusEffect` con `primerFoco` (refresca al volver del
  formulario sin duplicar el fetch inicial → pinta "Caso completado").
- **Paso 5b · Push servidor:** `supabase/fix-push-server.sql` (+ espejo) — tabla
  `push_outbox` (1 fila por destinatario: `orden/request_id/recibo_request_id/ticket_id/
  estado/intentos`), trigger `push_disparar()` SECURITY DEFINER (batch
  `{messages:[...]}` a `https://exp.host/--/api/v2/push/send`, `priority:'high'`;
  excepción interna deja filas `pendiente`), `push_procesar_respuestas` (correlación por
  `orden`, timeout 5 min → error), `push_reintentar` (pendiente>1 min o error con
  `intentos<3`, excluye `%DeviceNotRegistered%`, lotes de 50), `push_pedir_recibos` +
  `push_procesar_recibos` (POST `getReceipts`, mapa ticketId), `push_tick()` +
  `cron.schedule('gestorapp-push-tick','* * * * *')` en bloque DO con excepción
  capturada. Cliente `domain/notificaciones/push.ts`: upsert en `push_tokens`
  (`onConflict:'expo_push_token'`) + poda de tokens viejos, canal Android
  `AndroidImportance.HIGH`; nunca rechaza el registro; cero envío de negocio desde el cliente.
- **Paso 5c · Informe PDF + archivado:** `supabase/fix-pdf-informes.sql` (+ espejo) —
  tabla `informes_servicio` (RLS: solo SELECT para admin/gestor del servicio);
  `evidencias_servicio` += `estado ('activa'|'archivada'), ruta_archivo, archivada_en,
  informe_id` (+ índice). RPC `confirmar_informe_y_archivar(p_servicio,p_ruta_pdf,p_archivos)`
  SECURITY DEFINER: valida admin/gestor, PDF+origen+destino en `storage.objects` con
  `metadata.size > 0`, destino bajo `/archivo_evidencias/`, mapeo 1:1 con las activas,
  registra el informe y archiva; `restaurar_evidencias(p_servicio)` revierte (exige que
  el original vuelva a existir). Policies storage nuevas: SELECT `to postgres` (el RPC
  valida), delete en carpeta propia, insert+delete para admin en cualquier carpeta.
  Cliente `domain/servicios/informes.ts`: fotos → base64 (`File.downloadFileAsync`,
  web fetch) → HTML → `Print.printToFileAsync` → **verificación en el PDF**
  (`/Subtype /Image` >= nº de fotos) → sube PDF a `uid/informes/…` → copia cada evidencia
  a `<dueno>/archivo_evidencias/<servicioId>/…` (idempotente: "already exists" = éxito) →
  RPC → borra originales best-effort → `Sharing.shareAsync`. `cargarEvidencias` ahora
  filtra `estado='activa'` y expone `ruta`. Botones en `servicio/[id]`
  (**solo admin + tipo verificación**): "Descargar informe PDF" (con estado "Generando
  informe…") y "Restaurar evidencias (n)" si hay archivadas. Sin purga automática.
  Nuevas deps: `expo-print ~56.0.4`, `expo-sharing ~56.0.27` (plugin inerte en `app.json`).
- **Validación SQL (hecha en esta tanda):** harness en `/tmp/opencode/sqltest` contra
  `postgres:16-alpine` en Docker (contenedor `pgtest`): stubs de roles/`auth.uid()`/
  `pg_net`/`pg_cron`/`storage.objects` → correr `schema.sql` + `fix-modulos.sql` +
  `fix-fase5.sql` + `fix-escalado-legal.sql` + `fix-push-server.sql` + `fix-pdf-informes.sql`
  + grants → suite `99-test.sql` con aserciones de escalado/RLS, push
  (broadcast/tickets/recibos/retry/DeviceNotRegistered/push_tick) e informes
  (permiso, destino inválido, archivar 2, re-archivar, restaurar sin origen, restaurar OK)
  → **TODO OK**; los dos fix re-ejecutados sin errores (idempotentes ✓). Únicos errores
  tolerados: `create extension pg_net/pg_cron` (ya stubeados).
- **Bug real que la validación cazó:** `net.http_post` retorna `bigint` (los docs lo
  muestran `AS request_id`); el escrito original `select request_id into rid from net.http_post(...)`
  habría fallado en producción → corregido a asignación `rid := net.http_post(...)` en
  las 3 llamadas. También se movió el DDL de `push_outbox` después de `notificaciones`
  en `schema.sql` (referencia hacia adelante) y `fix-escalado-legal.sql` ahora dropea
  también sus propios nombres de policy (idempotente junto a `schema.sql`).
- **Verificación TS:** `npx tsc --noEmit` ✓ (0 errores) y `npm run lint` = **6**
  (baseline intacto, todos en archivos intocados).

---

## Pendientes conocidos del usuario
1. Correr en SQL Editor de Supabase (en este orden): los `fix-*` que falten de fases
   anteriores + **`supabase/fix-escalado-legal.sql`**, **`supabase/fix-push-server.sql`**
   y **`supabase/fix-pdf-informes.sql`** (todos idempotentes; `schema.sql` es el espejo
   completo para instalaciones nuevas).
2. **Google Cloud (mapa):** habilitar Billing + Maps SDK for Android; después borrar
   `EXPO_PUBLIC_MAPA_OFF` de `eas.json` y reconstruir el APK (ver reversión en fase 6).
3. Bucket `documentos` (privado) en Storage si no existe (subida de evidencias).
4. **Rebuild obligatorio** (nativos nuevos: permisos de image-picker, expo-print,
   expo-sharing): `eas build -p android --profile preview` o
   `npx expo prebuild -p android && npx expo run:android`; no llega por OTA.
5. **Push real:** subir credenciales FCM (service account) en `eas credentials` y probar
   una notificación end-to-end (el outbox y el cron ya quedaron validados en SQL local).
6. **Para el amigo:** copiar el `.env` (está en `.gitignore`; las 2 variables de `eas.json`
   solo aplican en EAS, no local).
7. Regenerar tipos de rutas si se agregan pantallas nuevas: arrancar `npx expo start`
   un momento (escribe `.expo/types/router.d.ts`).
