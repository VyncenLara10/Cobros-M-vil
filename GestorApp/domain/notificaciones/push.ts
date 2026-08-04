/**
 * domain/notificaciones/push.ts
 * Notificaciones para: (1) avisar que una solicitud de registro fue
 * aprobada, y (2) avisar de servicios nuevos disponibles para el rol del
 * gestor.
 *
 * HOY (sin backend): se disparan como notificación LOCAL en el mismo
 * dispositivo — sirve para probar el flujo real de principio a fin.
 * CUANDO EXISTA SUPABASE: en vez de notificarLocal(), una Edge Function
 * hace POST a la Expo Push API usando el token guardado en la tabla
 * `push_tokens` (ver supabase/schema.sql) del USUARIO QUE DEBE recibirla
 * (no necesariamente el que dispara la acción).
 */

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
 * Pide permiso y obtiene el Expo Push Token del dispositivo. Se llama al
 * iniciar sesión. Por ahora solo queda listo en memoria (log) — cuando haya
 * backend, se guarda en `push_tokens` asociado al usuario.
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
      await Notifications.setNotificationChannelAsync('default', {
        name: 'GestorApp',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const { data: token } = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    // TODO: await supabase.from('push_tokens').upsert({ perfil_id, expo_push_token: token, plataforma: Platform.OS })
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