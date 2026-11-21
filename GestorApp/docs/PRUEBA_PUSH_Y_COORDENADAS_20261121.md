# GestorApp — Puesta en marcha de push y coordenadas (Android preview)

## Diagnóstico del error 42P01: public.push_outbox no existe

Este error indica que **no se instaló** la infraestructura de entrega de push en Supabase. Firebase/FCM configurado en Expo **no crea tablas** de Supabase.

1. Abrir Supabase Dashboard del MISMO proyecto indicado por la URL de EAS `preview`.
2. Ir a **Database → Extensions** y verificar que estén habilitadas `pg_net` y `pg_cron` (el script también intenta habilitarlas).
3. Desde **SQL Editor**, con rol administrador, ejecutar completo `GestorApp/supabase/fix-push-server.sql`, desde su primera línea hasta la última. Contiene las migraciones CREATE TABLE, trigger, funciones y cron. **No ejecutar schema.sql completo, no borrar usuarios/servicios/tokens.**
4. Si un error SQL detiene la ejecución, parar y copiar su mensaje; no asumir que las funciones quedaron instaladas.

### Diagnóstico 1 (después de ejecutar el script)

```sql
SELECT
  to_regclass('public.push_outbox') IS NOT NULL AS outbox_instalada,
  to_regprocedure('public.push_tick()') IS NOT NULL AS tareas_instaladas,
  EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.notificaciones'::regclass
      AND tgname = 'notificaciones_push'
      AND tgenabled = 'O'
      AND NOT tgisinternal
  ) AS trigger_habilitado,
  EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_net'
  ) AS pg_net_habilitado,
  EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) AS pg_cron_habilitado;
```

Todas deben ser `true`. Comprobar además en **Supabase → Integrations → Cron** que exista el job `gestorapp-push-tick` y esté activo; según la interfaz también puede verse en SQL `cron.job` si la extensión está presente.

### Diagnóstico 2 (sin revelar tokens)

```sql
SELECT COUNT(*) AS telefonos_registrados
FROM public.push_tokens;

SELECT p.rol, count(*) AS telefonos_registrados
FROM public.push_tokens t
JOIN public.perfiles p ON p.id=t.perfil_id
WHERE p.activo=true
GROUP BY p.rol
ORDER BY p.rol;

SELECT estado, count(*) AS total,
       left(max(mensaje), 120) AS ejemplo_error
FROM public.push_outbox
GROUP BY estado
ORDER BY estado;
```

- **0 teléfonos:** no hay token Expo persistido; reinstalar APK con `GOOGLE_SERVICES_JSON` tipo **File** (preview), credencial FCM V1 en Expo/EAS (otro JSON distinto), permisos Android para notificaciones, iniciar sesión y comprobar la tabla otra vez.
- **Tokens > 0, outbox vacía:** crear **un servicio ficticio nuevo** y ver que `public.notificaciones` reciba avisos; los avisos existentes ANTES de instalar el trigger no se reenviarán automáticamente.
- **Estado `error`/`error_recepcion`:** revisar `ejemplo_error` para credenciales FCM, token inválido o límite de envío. No imprimir tokens ni la clave privada.
- **`ticket_ok` o `entregado`:** Expo/FCM aceptó el envío, no garantiza que Android ya haya mostrado el aviso. Verificar permisos, ahorro de batería y conexión del teléfono.

Documentación oficial:
- https://docs.expo.dev/push-notifications/fcm-credentials/
- https://docs.expo.dev/push-notifications/sending-notifications/
- https://supabase.com/docs/guides/database/extensions/pg_net
- https://supabase.com/docs/guides/cron/install

## Coordenadas para las cuatro categorías de solicitudes

`Nueva solicitud → Datos del cliente → Ubicación para visita`:

- **Opción A:** pegar latitud y longitud desde una coordenada conocida (acepta punto o coma decimal y valores negativos); ej. latitud `14.834000`, longitud `-91.518000`.
- **Opción B:** tocar **Fijar ubicación tocando el mapa** y marcar el punto; se muestran y actualizan los dos valores automáticamente.
- **Opción C:** **Usar mi ubicación actual** cuando el administrador está físicamente en el lugar. Requiere permiso GPS.
- Se puede borrar el punto; las coordenadas son **opcionales** para mantener compatibilidad con solicitudes antiguas, pero si solo llenas una o un valor está fuera de rango, no te dejará publicar.
- Al elegir un cliente existente, recupera sus coordenadas anteriores; si asignas otras nuevas se actualizan en `clientes.lat` y `clientes.lng`.
- Esta sección es compartida por **cobro, notificación, verificación y legal**; no se requieren API Keys adicionales.
- La coordenada se guarda en la tabla `public.clientes`, ya existente. Por ahora representa el **destino principal del cliente**. Si una verificación laboral y domiciliar necesita DOS ubicaciones diferentes, se tendrá que implementar un segundo punto separado para la ubicación laboral, sin sobrescribir el principal.
- La posición puede usarse en los mapas ya existentes de Seguimiento, Detalle del servicio y Navegar después de que el trabajador acepte la asignación y tenga permiso de lectura del cliente.

**Costos:** escribir o seleccionar una coordenada no llama a Google Geocoding, Places ni Routes. El mapa nativo sí utiliza Maps SDK for Android para mostrar el mapa base y está sujeto a su política de facturación y cuotas. En web el selector utiliza OpenStreetMap/Leaflet (sus propios términos de uso). El botón Navegar abre Google Maps.

## Compilar

```bash
cd ~/Cobros-M-vil
git switch fix/security-onboarding-push-2026
git status --short
git pull --ff-only origin fix/security-onboarding-push-2026
cd GestorApp
npm ci
npx tsc --noEmit
npm run lint
npx eas-cli@latest build --platform android --profile preview --clear-cache
```

**No se necesita nuevo bucket**, nuevo esquema de GPS ni merge a main. Sí es indispensable ejecutar `fix-push-server.sql` en Supabase para reparar el servidor de notificaciones.
