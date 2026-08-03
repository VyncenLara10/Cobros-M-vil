import { Colors } from '@/constants/DesignTokens';
import { SesionProvider, useSesion } from '@/domain/auth/sesion';
import { registrarPushToken } from '@/domain/notificaciones/push';
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

export default function RootLayout() {
  return (
    <SesionProvider>
      <RegistroPush />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.background } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="servicio/[id]"
          options={{
            headerShown: true,
            headerTitle: 'Detalle del servicio',
            headerStyle: { backgroundColor: Colors.surface },
            headerTintColor: Colors.textPrimary,
            headerShadowVisible: false,
          }}
        />
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
        <Stack.Screen name="+not-found" />
      </Stack>
    </SesionProvider>
  );
}