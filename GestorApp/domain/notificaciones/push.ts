/**
 * domain/notificaciones/push.ts
 * Notificaciones para: (1) avisar que una solicitud de registro fue
 * aprobada, y (2) avisar de servicios nuevos disponibles para el rol del
 * gestor.
 *
 * REMOTO (server-side, supabase/fix-push-server.sql): el servidor inserta en
 * `public.notificaciones`; un trigger + pg_net envía el push a Expo Push API
 * usando los tokens de `public.push_tokens`, con outbox por destinatario,
 * reintentos y tickets/recibos auditados. El cliente SOLO registra su token
 * aquí; nunca envía notificaciones de negocio.
 *
 * LOCAL: notificarLocal() sigue disponible para feedback inmediato en el
 * mismo dispositivo (ej. "servicio aceptado").
 */

import { supabase, supabaseConfigurado } from '@/lib/supabase';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// En `expo start --web`, Expo Router hace un primer render en Node (SSR)
// donde no existe `window`/`localStorage`. La implementación web de
// expo-notifications sí los necesita, así que este handler solo se registra
// cuando estamos de verdad en un navegador (o en nativo, donde no aplica).
const puedeUsarNotificaciones = Platform.OS !== 'web' || typeof window !== 'undefined';

if (puedeUsarNotificaciones) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/**
 * Pide permiso, obtiene el Expo Push Token del dispositivo y lo guarda en
 * `push_tokens` (una fila por perfil/dispositivo). Se llama al iniciar
 * sesión; de aquí sale el disparo de los pushes de negocio (trigger SQL).
 */
export async function registrarPushToken(): Promise<string | null> {
  if (Platform.OS === 'web' || !Device.isDevice) return null;

  // Todo el flujo va en un único try/catch: cualquier paso (permisos, canal
  // de Android, token) puede fallar la primera vez que corre en un build
  // nuevo (p. ej. si Firebase/FCM todavía no está configurado para push
  // remoto) y no debe mostrarse como error al usuario — es un plus, nunca
  // debe interrumpir el login.
  try {
    const permisos = await Notifications.getPermissionsAsync();
    let estado = permisos.status;
    if (estado !== 'granted') {
      const pedido = await Notifications.requestPermissionsAsync();
      estado = pedido.status;
    }
    if (estado !== 'granted') return null;

    if (Platform.OS === 'android') {
      // Alta prioridad: los pushes de negocio deben llegar en primer plano
      // aunque la app esté en segundo plano.
      await Notifications.setNotificationChannelAsync('default', {
        name: 'GestorApp',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#1A1A2E',
      });
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const { data: token } = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );

    if (supabaseConfigurado && token) {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (uid) {
        const { error } = await supabase
          .from('push_tokens')
          .upsert(
            { perfil_id: uid, expo_push_token: token, plataforma: Platform.OS },
            { onConflict: 'expo_push_token' },
          );
        if (error) console.warn('[push] no se pudo guardar el token', error.message);
        // Limpia tokens viejos de este perfil (reinstalaciones/cambios de device).
        const { error: errPodar } = await supabase
          .from('push_tokens')
          .delete()
          .eq('perfil_id', uid)
          .neq('expo_push_token', token);
        if (errPodar) console.warn('[push] no se pudieron podar tokens', errPodar.message);
      }
    }
    return token;
  } catch {
    return null; // sin red, sin credenciales push configuradas, o permiso denegado: no bloquea el login
  }
}

/** Dispara una notificación ya mismo en este dispositivo (trigger: null = inmediata). */
export async function notificarLocal(titulo: string, cuerpo: string, data?: Record<string, unknown>): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title: titulo, body: cuerpo, data },
      trigger: null,
    });
  } catch {
    // no-op: la notificación es un plus, nunca debe romper el flujo principal
  }
}