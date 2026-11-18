# Arranque desde cero: Supabase propio + APK EAS de la rama PR #1

## Antes de empezar
Usa un proyecto Supabase NUEVO de pruebas en tu propia organización. Si no tienes acceso al Supabase anterior, su información y usuarios no se migrarán solos; habrá que volver a registrar personas y servicios o recuperar una exportación legítima. **No hagas merge a main aún**. No subas contraseñas ni credenciales secretas a GitHub.

## A. Crear Supabase
1. Ve a https://supabase.com/dashboard > New project; elige tu propia organización, nombre (ej. `cobros-movil-pruebas`), contraseña fuerte de base de datos y región cercana.
2. Espera a que termine el aprovisionamiento.
3. Abre SQL Editor > New query. Ejecuta las consultas de cada archivo del repositorio UNO POR UNO en el siguiente orden. Para ver el contenido abre el archivo en GitHub, copia la versión RAW completa y pégala.
4. Si falla un script, detente: **NO** saltes al siguiente. Conserva error y nombre del archivo para diagnóstico.

### Orden para una base VACÍA
Todos los archivos bajo `GestorApp/supabase/` de la rama `fix/security-onboarding-push-2026`:

1. `schema.sql` (crea tipos, tablas, triggers y RLS inicial).
2. `fix-registro.sql` (crea bucket privado `documentos` y asegura `perfil_id`).
3. `fix-modulos.sql`.
4. `fix-fase5.sql`.
5. `fix-escalado-legal.sql`.
6. `fix-pdf-informes.sql`.
7. `fix-perfil-registro.sql` (debe ir **antes** de la migración de seguridad, porque sustituye el trigger de Auth).
8. `fix-push-server.sql` (requiere `pg_net` y `pg_cron`; si la extensión no se habilita, consulta Database > Extensions, y no declares funcional el push).
9. `migrations/20261118_security_onboarding.sql` **AL FINAL** (vuelve a endurecer las policies de módulos anteriores, y añade portal de revisión/RPCs).

**Omitir** `fix-perfil-activar.sql` en una base vacía: es una reparación de solicitudes históricas.

**Nota**: El orden es una propuesta basada en el SQL del repositorio. No se ha ejecutado todavía contra tu proyecto; para un ambiente real se debe verificar cada salida de SQL y la compatibilidad con Supabase actualizado.

### Comprobar las tablas después del último SQL
```sql
select table_name from information_schema.tables
where table_schema = 'public' and table_type = 'BASE TABLE'
order by table_name;

select id, name, public from storage.buckets where id = 'documentos';

select proname from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname='public'
  and proname in (
    'resolver_solicitud_registro',
    'reenviar_papeleria',
    'cambiar_mi_disponibilidad',
    'push_tick'
  )
order by proname;
```
El bucket `documentos` debe tener `public = false`.

## B. Crear el primer administrador
1. En Supabase > Authentication > Users > Add user, crea **tu propio** email de administrador (no uses una cuenta de empleado). Si se puede, usa el control para marcar email confirmado.
2. Asegúrate de que los scripts de la sección A ya se aplicaron. El trigger debe crear automáticamente una fila en `public.perfiles` con rol inicial sin privilegios y `activo=false`.
3. En SQL Editor, consulta tu usuario primero (sustituye el email, ¡NO publiques ese correo si no quieres!):
```sql
select u.id, u.email, p.rol, p.activo
from auth.users u left join public.perfiles p on p.id = u.id
where lower(u.email) = lower('TU_CORREO_ADMIN@EJEMPLO.COM');
```
4. Si es el usuario correcto, conviértelo explícitamente en administrador, solo desde SQL Editor (nunca desde código Expo):
```sql
update public.perfiles p
set rol = 'admin'::public.rol_app, activo = true
from auth.users u
where p.id = u.id
  and lower(u.email) = lower('TU_CORREO_ADMIN@EJEMPLO.COM')
  and p.activo = false
returning p.id, p.nombre, p.rol, p.activo;
```
5. Confirma que regresó **una sola fila**. Si sale cero, consulta si se creó `perfiles` y no repitas ciegamente.

## C. Conectar Expo/EAS con tu Supabase nuevo
En Supabase > Settings / Project Settings > API Keys busca la URL del proyecto y la **publishable key** (`sb_publishable_...`) o la `anon` pública heredada. **Nunca** uses `service_role` / `secret` en `EXPO_PUBLIC_*`.

En tu PC, desde la raíz del repo:
```bash
git fetch origin
git switch fix/security-onboarding-push-2026
git pull --ff-only origin fix/security-onboarding-push-2026
cd GestorApp
npm ci
npx tsc --noEmit
npm run lint
npx eas whoami
npx eas project:info
```
El último comando debe mostrar un proyecto Expo bajo tu cuenta o equipo al que sí tengas acceso. Si aparece permiso denegado, **no cambies el projectId al azar**: primero vincula la app con un proyecto Expo que controles y actualiza `owner` y `extra.eas.projectId` con EAS.

En https://expo.dev, entra al proyecto > Environment variables > añade en el entorno **preview**:
- `EXPO_PUBLIC_SUPABASE_URL` = URL HTTPS de tu proyecto nuevo.
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` = publishable/anon pública.

Como alternativa en CLI (sustituye los valores):
```bash
npx eas env:set --name EXPO_PUBLIC_SUPABASE_URL --value "https://TU-PROYECTO.supabase.co" --environment preview --visibility plaintext
npx eas env:set --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "TU_PUBLISHABLE_KEY" --environment preview --visibility plaintext
npx eas env:list --environment preview
```

Para pruebas Expo locales, crea `GestorApp/.env.local` (ya ignorado por Git):
```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=TU_PUBLISHABLE_KEY
```
Confirma primero que las variables de **preview** están bien antes de hacer el EAS Build; una `.env.local` de tu PC no sustituye la configuración correcta del servidor EAS.

Generar tu APK **desde esta rama**:
```bash
npx eas build --platform android --profile preview
```
El comando usa el contenido del checkout actual. Descarga la APK del enlace de EAS Build. No requiere fusionar la rama a `main`. También existe build desde GitHub: el proyecto debe tener enlazado el repo y, si procede, configurar `GestorApp` como directorio base.

## D. Primeras pruebas
1. En la APK, inicia sesión con el administrador recién creado. Confirma acceso al panel.
2. Crea un servicio de prueba y verifica las inserciones de `clientes` y `servicios` en Table Editor.
3. Para probar candidatos, considera que el formulario actual envía la solicitud después de `signUp` y necesita una sesión Auth inmediata. Con confirmación de correo habilitada, **todavía no es compatible**. En un proyecto exclusivamente de pruebas y con usuarios ficticios puedes deshabilitar temporalmente confirmación de email en Authentication > Providers > Email, volver a registrar un usuario nuevo y comprobar el portal. **Mantener confirmación de email activa en producción** y corregir el flujo antes de lanzar.
4. Con el administrador rechaza la solicitud con un motivo, inicia sesión como candidato, corrige documentos y reenvía.
5. Aprobar al candidato solo tras revisar la documentación, cerrar y volver a abrir sesión, comprobar acceso limitado por rol.
6. Probar dos usuarios intentando tomar un mismo servicio, verificación con fotos, cobro con pagos y estados.
7. Para push, se requiere FCM/EAS configurado y dispositivos Android físicos; revisar `public.push_outbox` y los registros de errores. Las pruebas de negocio funcionan sin push, pero no debes afirmar que el envío remoto está validado.
8. **Mapa:** el perfil `preview` conserva `EXPO_PUBLIC_MAPA_OFF=1`, así que se verá el mapa alternativo hasta que habilites un perfil con Google Maps y clave restringida.

## E. Antes de producción
Una base recién creada **no** se convierte automáticamente en tu base de producción; configura otro entorno EAS `production` con otra URL/clave y ejecuta migraciones probadas. Una APK instalada con referencias al Supabase viejo no cambiará por sí sola. Valida el manejo de correo, SMS, storage, banco, auditoría, autenticación MFA, ubicación y políticas con cuentas sintéticas. No hay garantía de seguridad absoluta sin pruebas en el backend real.
