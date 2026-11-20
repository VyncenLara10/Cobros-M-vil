# GestorApp — Activar mapas Android y notificaciones reales (EAS preview)

**Estado del código:** `app.config.js` configura Google Maps y FCM únicamente cuando encuentra las variables del entorno EAS. **El usuario debe conectar sus propios proyectos de Google Cloud/Firebase en los paneles.** No hay claves activas incluidas en Git.

## 1. Google Maps nativo (Android)

No se usa Routes API para navegación: el botón **Navegar** abre Google Maps con la ruta real mediante la URL universal. Las pantallas internas ya implementadas utilizan `react-native-maps` y `Maps SDK for Android`. Este SDK utiliza el SKU `Maps SDK`, que tiene uso gratuito ilimitado de mapas nativos en la lista oficial actual. **Aun así requiere facturación activada**, una API key y restricciones de seguridad. Otros servicios (Dynamic Maps web, geocodificación, Directions, Routes, Places) sí tienen cuotas y costes distintos; no habilitarlos para esta prueba.

1. Google Cloud Console → selecciona o crea un proyecto propio, vincula una **cuenta de facturación** y habilita únicamente **Maps SDK for Android**.
2. En Expo EAS (proyecto de GestorApp), revisa las credenciales de Android y copia el **SHA-1** del keystore que firma los APK preview. El identificador Android actual está en `app.json`: **`com.tuempresa.cobranzagt`**. Si lo cambias más adelante, deberás actualizar también la restricción de la clave, Firebase y posiblemente la instalación de la app.
3. Google Cloud → APIs y servicios → Credenciales → Crea una API key nueva, restringida por **Android apps (package + SHA-1)** y por **API: Maps SDK for Android**. **Rota/restringe la antigua clave que estuvo escrita en app.json/Git**.
4. Expo → GestorApp → Environment variables → `preview`: crea `GOOGLE_MAPS_ANDROID_API_KEY` como **Sensitive** (valor: clave Android restringida). El script `app.config.js` añade el plugin nativo `react-native-maps` y activa los mapas solo si existe esta variable. No uses `EXPO_PUBLIC_` para esta variable ni pegues la clave en `app.json`.
5. EAS `preview` ya no contiene `EXPO_PUBLIC_MAPA_OFF=1`. Si hay una variable EAS `EXPO_PUBLIC_MAPA_OFF=1` en el proyecto, elimínala o cámbiala a `0`. Comprueba los nombres de variables sin compartir valores.
6. **Reconstruir** una nueva APK `preview` (configuración nativa; no basta recargar JS). El mapa requiere permisos de ubicación del móvil. Los gestores se mostrarán donde realmente haya registros GPS; no se inventan ubicaciones. Si la clave no está presente, la UI conserva un esquema alternativo.

La API key nativa **no puede ocultarse dentro de la APK**: la seguridad se consigue con restricciones de aplicación, firma SHA-1, restricción de API, presupuesto/alertas y control de cuotas. Los presupuestos son **alertas**, no cortes automáticos del gasto.

Referencias:
- https://developers.google.com/maps/documentation/android-sdk/usage-and-billing
- https://developers.google.com/maps/billing-and-pricing/pricing
- https://docs.expo.dev/versions/v56.0.0/sdk/map-view/
- https://developers.google.com/maps/billing-and-pricing/manage-costs

## 2. Android push remoto (Firebase/Expo)

**Supabase Realtime e in-app no son igual a push remoto.** Para recibir avisos con la app cerrada, hace falta FCM V1 de Firebase + Expo Push Service. Esto es independiente de la API key de Maps.

1. Firebase Console → proyecto Firebase propio → registra una **aplicación Android** con el package de `app.json`, por ahora `com.tuempresa.cobranzagt`. Activa **Firebase Cloud Messaging API (V1)** donde corresponda.
2. Descarga `google-services.json` desde la configuración de la aplicación Android de Firebase. En Expo → Environment variables → `preview`, súbelo como variable **tipo File** denominada **`GOOGLE_SERVICES_JSON`** (preferiblemente Secret). `app.config.js` usará la ruta entregada por EAS en `android.googleServicesFile`. No subas el contenido del JSON a Git ni a una conversación.
3. En Firebase / Google Cloud → Service accounts, crea la **clave JSON de cuenta de servicio FCM V1** con los permisos mínimos adecuados (FCM API Admin, según las instrucciones Expo). Es un JSON **DIFERENTE** de `google-services.json`.
4. Expo Dashboard → proyecto → Credentials → Android → Service credentials → **FCM V1 service account key** → sube el archivo de cuenta de servicio a Expo. Alternativamente, `npx eas-cli@latest credentials` y usa la opción de Google Service Account para FCM V1. Nunca agregues esta clave como `EXPO_PUBLIC`.
5. Reconstruye APK de `preview`, instálala en Android físico y concede permiso de notificaciones. Al iniciar sesión el cliente obtiene y guarda un token en `public.push_tokens`; Supabase crea notificaciones, la migración `fix-push-server.sql` encola y entrega mediante `pg_net`, Expo Push API y `pg_cron`.
6. Comprueba desde Supabase SQL Editor, **sin imprimir tokens**:

```sql
SELECT count(*) AS dispositivos_con_token
FROM public.push_tokens;

SELECT estado, count(*) AS cantidad
FROM public.push_outbox
GROUP BY estado
ORDER BY estado;

SELECT tgname, tgenabled
FROM pg_trigger
WHERE tgrelid = 'public.notificaciones'::regclass
  AND tgname = 'notificaciones_push'
  AND NOT tgisinternal;
```

El trigger `notificaciones_push` debe existir/habilitarse (`O`). Si faltan la tabla outbox/trigger o las extensiones, revisar/ejecutar **solo si corresponde** `supabase/fix-push-server.sql` después de respaldar y verificar el esquema actual. Los errores de Expo se ven en estados/mensajes de la outbox; no asegures entregas basándote en que aparezcan filas en `notificaciones`.

**Importante:** el teléfono Android debe tener servicios de Google/Firebase disponibles y conexión; desactivar la optimización de batería para la app puede ayudar en ciertas marcas, pero no sustituye FCM.

Referencias:
- https://docs.expo.dev/push-notifications/fcm-credentials/
- https://docs.expo.dev/push-notifications/push-notifications-setup/
- https://docs.expo.dev/eas/environment-variables/manage/

## 3. Compilar y validar

```bash
cd ~/Cobros-M-vil
git switch fix/security-onboarding-push-2026
git status --short   # Guardar cambios propios antes del pull si hay algo modificado.
git pull --ff-only origin fix/security-onboarding-push-2026
cd GestorApp
npm ci
npx tsc --noEmit
npm run lint
npx eas-cli@latest env:list --environment preview
npx eas-cli@latest build --platform android --profile preview --clear-cache
```

**Pruebas sin datos sensibles:** crear un solo servicio ficticio; un trabajador del rol correcto debe recibir el aviso, abrir el caso, aceptarlo y seguir su flujo. En Seguimiento/Gestores verificar que se vea el mapa real y los pines de dispositivos con ubicación disponible. Confirmar comportamiento en segundo plano con un segundo teléfono; no aceptar un aviso como prueba de entrega hasta comprobar push real fuera de primer plano.

No se hizo merge a `main`. Las pantallas de Servicios ya no muestran el diagnóstico `PRUEBA SVC-R3` ni los UUID en tarjetas/detalles. La ID se sigue usando internamente para navegación y permisos.
