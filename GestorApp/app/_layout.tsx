import { Colors } from '@/constants/DesignTokens';
import { SesionProvider, useSesion } from '@/domain/auth/sesion';
import { registrarPushToken } from '@/domain/notificaciones/push';
import { useUbicacionTracking } from '@/hooks/useUbicacionTracking';
import { Stack } from 'expo-router';
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

export default function RootLayout() {
  return (
    <SesionProvider>
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