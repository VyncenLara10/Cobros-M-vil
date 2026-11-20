import { Colors } from '@/constants/DesignTokens';
import { SesionProvider, useSesion } from '@/domain/auth/sesion';
import { registrarPushToken } from '@/domain/notificaciones/push';
import { useUbicacionTracking } from '@/hooks/useUbicacionTracking';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { useEffect, useRef } from 'react';

/** Pide permiso de notificaciones y registra el push token al iniciar sesión. */
function RegistroPush() {
  const { usuario } = useSesion();
  useEffect(() => {
    if (usuario) registrarPushToken();
  }, [usuario]);
  return null;
}

/** Abre el servicio asociado al pulsar una notificación local o push.
 * Funciona cuando la app está abierta o fue iniciada desde el aviso.
 * No permite navegar a contenido protegido sin sesión validada.
 */
function AperturaNotificaciones() {
  const { usuario, cargando } = useSesion();
  const router = useRouter();
  const ultimaAtendida = useRef<string | null>(null);
  useEffect(() => {
    if (Platform.OS === 'web' || cargando || !usuario) return;
    let activo = true;
    const abrir = (respuesta: Notifications.NotificationResponse) => {
      if (!activo) return;
      const data = respuesta.notification.request.content.data;
      const tipo = data?.tipo;
      const id = data?.referencia_id;
      if ((tipo !== 'servicio_nuevo' && tipo !== 'servicio_escalado') ||
          typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id)) return;
      const clave = respuesta.notification.request.identifier + ':' + id;
      if (ultimaAtendida.current === clave) return;
      ultimaAtendida.current = clave;
      router.push({ pathname: '/servicio/[id]', params: { id } });
    };
    const listener = Notifications.addNotificationResponseReceivedListener(abrir);
    void Notifications.getLastNotificationResponseAsync().then((respuesta) => {
      if (respuesta) abrir(respuesta);
    }).catch((error) => {
      console.warn('[push] no se pudo recuperar la notificación inicial', error);
    });
    return () => {
      activo = false;
      listener.remove();
    };
  }, [cargando, usuario?.id, router]);
  return null;
}

/** Mientras haya sesión de un gestor (no admin), sube su ubicación en vivo. */
function SeguimientoUbicacion() {
  const { usuario } = useSesion();
  useUbicacionTracking(usuario ? { id: usuario.id, rol: usuario.rol } : null);
  return null;
}

/** Rutas accesibles sin sesión (login, registro, callback de enlace mágico). */
const RUTAS_PUBLICAS = ['login', '(auth)', 'auth', '+not-found', 'estado-cuenta'];

/**
 * Guard de sesión a nivel raíz:
 *  - sin sesión → a /login (o /login modo MFA si la sesión está aal1);
 *  - con sesión y parado en /login → adentro a /(tabs).
 * Espera `cargando` para no patear al usuario mientras se restaura el token.
 */
function Guard() {
  const { usuario, cuentaPendiente, cargando } = useSesion();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (cargando) return;
    const raiz = segments[0] as string | undefined;
    const publica = !raiz || RUTAS_PUBLICAS.includes(raiz);
    const rutaAuth = (segments as readonly string[])[1];
    const completandoRegistro = raiz === '(auth)' && (rutaAuth === 'registro' || rutaAuth === 'confirmar-correo');
    if (cuentaPendiente && raiz !== 'estado-cuenta' && !completandoRegistro) {
      router.replace('/estado-cuenta');
    } else if (!usuario && !publica) {
      router.replace('/login');
    } else if (usuario && raiz === 'login') {
      router.replace('/(tabs)');
    }
  }, [cargando, usuario, cuentaPendiente, segments, router]);

  return null;
}

export default function RootLayout() {
  return (
    <SesionProvider>
      <Guard />
      <RegistroPush />
      <AperturaNotificaciones />
      <SeguimientoUbicacion />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.background } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="estado-cuenta" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        {/* Sin header nativo: el detalle ya trae su botón "← Mis servicios"
            y su propio contenido; seguridad sí conserva su header (no tiene
            botón de regreso propio). */}
        <Stack.Screen name="servicio/[id]" options={{ headerShown: false }} />
        <Stack.Screen
          name="seguridad"
          options={{
            headerShown: true,
            headerTitle: 'Seguridad',
            headerStyle: { backgroundColor: Colors.surface },
            headerTintColor: Colors.textPrimary,
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen name="notificaciones" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
    </SesionProvider>
  );
}