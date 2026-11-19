# Probar registro por correo en una APK, sin dominio y sin localhost

## Por qué aparece localhost
Supabase Authentication > URL Configuration tiene por defecto el **Site URL** `http://localhost:3000`. El botón de correo de la plantilla predeterminada redirige allí, lo que NO es accesible desde el celular de otra persona. Esto no afecta la conexión de la APK a Supabase Cloud.

## Flujo recomendado: código OTP dentro de GestorApp
1. En Supabase Dashboard, abre Authentication > Providers > Email y **mantén habilitada** la confirmación de email.
2. Abre Authentication > Email Templates > **Confirm signup** (Confirmar registro).
3. Modifica el cuerpo para **mostrar el código**, no obligar a abrir un enlace de localhost. Ejemplo:
```html
<h2>Confirma tu correo de GestorApp</h2>
<p>Introduce el siguiente código en la aplicación:</p>
<p><strong>{{ .Token }}</strong></p>
<p>Si no pediste crear una cuenta, ignora este correo.</p>
```
4. Guarda la plantilla. No compartas OTP ni contraseñas.
5. Al registrarse en la nueva APK, el usuario irá a la pantalla **Confirma tu correo**. Introduce el código recibido. Si el código vence, solicita uno nuevo.
6. Ya confirmado, entra a **Estado de mi cuenta > Completar solicitud**, llena los datos restantes y adjunta papelería. El perfil sigue `activo=false` hasta que un admin apruebe desde el panel.

Para usuarios que ya aparecen en Authentication pero no tienen solicitud: confirmar email si está pendiente, iniciar sesión, abrir Estado de mi cuenta y terminar el envío. **No borrar usuarios ni marcar perfiles activos a mano.**

## Alternativa: enlaces que abren la APK
En Supabase Authentication > URL Configuration:
- Para una app exclusivamente móvil, configura Site URL para que no use localhost. Un destino móvil compatible con el esquema definido en `app.json` es `gestorapp://auth/callback`.
- En Additional Redirect URLs añade `gestorapp://**`.
- El deep link debe probarse en una **APK EAS instalada**; Expo Go puede crear URLs distintas.

Al usar el código OTP de la sección anterior, **no necesitas que funcione un enlace de confirmación ni comprar un dominio**. Los Magic Links y otros correos con enlace son flujos adicionales que requieren revisar sus plantillas, URL permitidas y el intercambio PKCE.

## Cómo compartir una prueba con otra persona
Desde la rama `fix/security-onboarding-push-2026`:
```bash
git fetch origin
git switch fix/security-onboarding-push-2026
git pull --ff-only origin fix/security-onboarding-push-2026
cd GestorApp
npm ci
npx tsc --noEmit
npx eas env:list --environment preview
npx eas build --platform android --profile preview
```
Entrega al tester el enlace de instalación de EAS Build. La app compilada usa `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY` del entorno `preview`, que **deben apuntar al Supabase nuevo**. Nunca uses una `service_role`/secret key en Expo.

No envíes `http://localhost:8081` a otra persona. Si prefieres Expo Go para una prueba de desarrollo, usa `npx expo start --tunnel` desde tu computadora (que deberá permanecer encendida), con las limitaciones propias de Expo Go.

## Diagnóstico: usuario creado pero sin solicitud
Ejecuta en SQL Editor del **proyecto Supabase al que apunta la APK**:
```sql
select u.email,
  u.email_confirmed_at is not null as correo_confirmado,
  p.rol, p.activo,
  s.id as solicitud_id, s.estado as estado_solicitud
from auth.users u
left join public.perfiles p on p.id = u.id
left join public.solicitudes_registro s on s.perfil_id=u.id
order by u.created_at desc
limit 15;
```
- `activo=false` es normal antes de aprobación.
- `correo_confirmado=false` exige verificación OTP.
- `solicitud_id=null` exige completar registro; no implica que alguien deba activarlo.
- Si aparece el usuario en un proyecto pero no en el que consulta la app, revisa URL y clave del ambiente `preview` en EAS. Cambiar valores EAS **no modifica APKs ya compiladas**: debes generar otra.
- Si las solicitudes no aparecen aun después del envío, revisa errores de Storage y RLS y que estén aplicados `schema.sql`, `fix-registro.sql` y `migrations/20261118_security_onboarding.sql`.

## Seguridad
- Para pruebas usa documentos ficticios (no DPI, antecedentes ni números bancarios reales).
- No desactives confirmación de correo en producción.
- El envío SMTP incorporado de Supabase puede tener restricciones/rate limits; para uso real se recomienda configurar un proveedor SMTP propio. Nunca compartas su contraseña con la APK.
