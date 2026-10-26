import { Colors } from '@/constants/DesignTokens';
import { SesionProvider, useSesion } from '@/domain/auth/sesion';
import { registrarPushToken } from '@/domain/notificaciones/push';
import { useUbicacionTracking } from '@/hooks/useUbicacionTracking';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';

/** Pide permiso de notificaciones y registra el push token al iniciar sesión. */
function RegistroPush() {
  const { usuario } = useSesion();
  useEffect(() => {
    if (usuario) registrarPushToken();
  }, [usuario?.id]);
  return null;
}

/** Mientras haya sesión de un gestor (no admin), sube su ubicación en vivo. */
function SeguimientoUbicacion() {
  const { usuario } = useSesion();
  useUbicacionTracking(usuario ? { id: usuario.id, rol: usuario.rol } : null);
  return null;
}

/** Rutas accesibles sin sesión (login, registro, callback de enlace mágico). */
const RUTAS_PUBLICAS = ['login', '(auth)', 'auth', '+not-found'];

/**
 * Guard de sesión a nivel raíz:
 *  - sin sesión → a /login (o /login modo MFA si la sesión está aal1);
 *  - con sesión y parado en /login → adentro a /(tabs).
 * Espera `cargando` para no patear al usuario mientras se restaura el token.
 */
function Guard() {
  const { usuario, cargando } = useSesion();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (cargando) return;
    const raiz = segments[0] as string | undefined;
    const publica = !raiz || RUTAS_PUBLICAS.includes(raiz);
    if (!usuario && !publica) {
      router.replace('/login');
    } else if (usuario && raiz === 'login') {
      router.replace('/(tabs)');
    }
  }, [cargando, usuario, segments, router]);

  return null;
}

export default function RootLayout() {
  return (
    <SesionProvider>
      <Guard />
      <RegistroPush />
      <SeguimientoUbicacion />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.background } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
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