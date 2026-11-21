# Despliegue seguro de GestorApp — noviembre de 2026

## Estado del pull request
Esta rama está preparada para **revisión y pruebas**. No fusionar ni instalar a los trabajadores sin ejecutar primero la migración en Supabase y probar la compatibilidad con la APK. Las modificaciones SQL en GitHub NO se aplican solas a la base de datos.

## 1. Antes de aplicar SQL
1. Identifica el proyecto real en Supabase Dashboard > Project Settings y realiza un respaldo lógico (esquema y datos) y de la configuración de Auth y Storage.
2. Crea un proyecto **staging**, preferiblemente con datos sintéticos o anonimizados. Nunca copies DPI, cuentas bancarias o secretos reales a entornos de prueba.
3. Comprueba que estén instalados previamente los módulos existentes (schema.sql, fix-registro.sql, fix-fase5.sql, fix-push-server.sql y demás scripts usados en producción). No ejecutes schema.sql encima de un proyecto ya creado: contiene CREATE TABLE y CREATE TYPE sin IF NOT EXISTS.
4. Ejecuta en staging **GestorApp/supabase/migrations/20261118_security_onboarding.sql** mediante SQL Editor con un usuario administrador de base de datos. Es una transacción: si falla, no debería dejar cambios parciales en esa ejecución.
5. Reinicia la app y prueba con tres identidades diferentes: administrador existente, trabajador aprobado y candidato pendiente/rechazado.

**El SQL modifica permisos de perfiles, clientes, servicios, notificaciones y estadísticas.** No se debe desplegar por separado de la versión Expo que llama a las nuevas RPC: `resolver_solicitud_registro`, `reenviar_papeleria` y `cambiar_mi_disponibilidad`. No uses la contraseña de la base de datos o la clave `service_role` en Expo.

## 2. Pruebas de seguridad obligatorias
- Registro intentando metadatos con rol `admin`: perfil nuevo debe quedar `activo=false` y nunca ser administrador.
- Candidato sin aprobar: puede leer solo SU estado y subir SU documentación; NO puede leer clientes, servicios, otros perfiles, ubicación ni pagos.
- Trabajador aprobado: no puede modificar `rol` ni `activo` en `perfiles`; tampoco cambiar comisiones o montos de servicios mediante la API REST.
- Gestor A y B aceptan simultáneamente el mismo servicio: solo uno se asigna y el segundo recibe el estado de no disponible.
- Rechazo con motivo (mínimo 8 caracteres) y reenvío de nueva fotografía: la solicitud regresa a `pendiente` y el administrador debe revisar antes de activar.
- Dos gestores leen una oferta broadcast: la lectura de A no altera el contador de B.
- Nuevo pago con importe negativo: debe ser rechazado por PostgreSQL.
- Aprobar y rechazar requieren administrador. Ningún cliente móvil puede insertar notificaciones arbitrarias para terceros.
- Un escalado a legal genera aviso desde trigger de base de datos; probarlo sobre el flujo completo.
- Prueba también los roles desactivados, con token de sesión previo, y el acceso a rutas directas.

## 3. APK con Expo + EAS (tu método actual)
Desde la carpeta `GestorApp`:

```bash
npm ci
npx tsc --noEmit
npm run lint
npx expo-doctor
npx eas build --platform android --profile preview
```

Para comprobar el resultado, descarga la APK desde el enlace que devuelve EAS Build o desde el panel de Expo. Instálala en un Android real y haz pruebas con redes móviles y wifi. El perfil `preview` utiliza `EXPO_PUBLIC_MAPA_OFF=1`; en ese perfil el mapa puede mostrar el reemplazo temporal, **aunque tengas una API key válida**. La visualización real requiere un perfil con Maps habilitado y las credenciales/configuración correctas.

Las variables `EXPO_PUBLIC_*` son públicas dentro de una app compilada, nunca guardes ahí tokens privados de la API empresarial, claves de administrador, `service_role` ni credenciales bancarias.

## 4. Notificaciones push
- Configura Firebase Cloud Messaging y credenciales de servicio Android en EAS/Expo para este proyecto.
- Reaplica `GestorApp/supabase/fix-push-server.sql` actualizado en Supabase (recrea las funciones y trigger); comprueba extensiones pg_net y pg_cron.
- Inicia sesión en APKs instaladas en teléfonos físicos, concede permisos push y confirma registro de tokens en `push_tokens`.
- Inserta una notificación desde un flujo de administración, revisa `push_outbox` y las respuestas/tickets/recibos.
- Comprueba notificaciones con aplicación abierta, en segundo plano y cerrada. La llegada de push depende de Expo/FCM y del sistema operativo, no es una garantía de entrega.
- No compartir datos confidenciales de clientes en el título o cuerpo de avisos: podrían aparecer en pantalla bloqueada.

## 5. Maps y consumo
El API key de Maps presente en `app.json` no debe tratarse como contraseña: la clave de una app móvil puede ser extraída de la APK. **Es imprescindible restringirla en Google Cloud** a Android (package + SHA-1 de certificado de firma EAS), únicamente a los servicios necesarios. Para iOS se necesita una credencial/regla separada.

Tener 3 notificadores de planta y alrededor de 25 gestiones por persona no permite garantizar costo cero: el consumo depende de pantallas, rutas y solicitudes concretas. Configura presupuesto, alertas y cuotas máximas en Google Cloud. Evita consultas de geocodificación en cada render y cachea direcciones ya resueltas cuando corresponda.

El package actual `com.tuempresa.cobranzagt` sigue siendo provisional: el identificador final y el SHA-1 deben fijarse antes de registrar restricciones y publicar. Cambiar el package después cambia la identidad de instalación.

## 6. API futura de clientes
Cuando la empresa entregue su API, no se conectará con un token privado desde la APK. Proponemos:
`Expo → Supabase Edge Function (JWT + rol administrador + validación/rate limit) → API empresarial → normalización/validación → datos de autocompletado`.

Solicitar a la empresa URL base, autenticación, entorno de pruebas, límites, campos disponibles, ejemplos de respuesta, errores esperados, regla de actualización y políticas de privacidad. Los resultados deben mostrar fecha/origen y requerir confirmación administrativa antes de crear un servicio. Nunca sobrescribir modificaciones humanas de la empresa sin un control.

## 7. Pendientes antes de producción
- **Pendiente, crítico:** conectar el registro a un flujo de confirmación de email y solicitud diferida si se habilita `Confirm email`; actualmente el registro necesita una sesión activa inmediatamente.
- **Pendiente, crítico:** revisar RLS y SECURITY DEFINER de todos los scripts históricos y verificar en la base real; una migración no elimina posibles políticas adicionales no inventariadas.
- **Pendiente, crítico:** cifrado de campo de cuentas bancarias y modelo de liquidación con registros auditados. El esquema actual contiene datos bancarios legibles para roles con acceso a solicitudes.
- **Pendiente:** consulta geográfica del servidor (PostGIS), validar ubicación reciente y disponibilidad, expansión por radio y ofertas con vencimiento.
- **Pendiente:** conciliación de pagos y pruebas de reintentos para no duplicar operaciones si falla el cierre.
- **Pendiente:** verificación de documentos realmente presentes e íntegros antes de marcar una gestión como completada, en servidor.
- **Pendiente:** iOS (bundleIdentifier, certificados APNs, pruebas TestFlight), Google Play (AAB, identificador definitivo, declaraciones de datos, publicación).

**No existe garantía de vulnerabilidad cero.** El objetivo es defensa en profundidad, mínimos permisos, revisiones y pruebas de penetración sobre un entorno autorizado, no confiar en ocultar botones de la UI.
