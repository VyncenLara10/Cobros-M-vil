/**
 * domain/auth/biometria.ts
 * Desbloqueo con Face ID / huella sobre una sesión YA guardada (ver
 * domain/auth/sesion.tsx). No reemplaza el login: solo evita volver a
 * escribir usuario/contraseña en el mismo dispositivo.
 *
 * Además de que el equipo tenga el hardware (biometriaDisponible), el
 * usuario puede prender/apagar esto a su gusto desde la pantalla de
 * Seguridad (app/seguridad.tsx) — esa preferencia se guarda con
 * establecerBiometriaActivada() y se lee con biometriaActivadaPorUsuario().
 */

import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export interface DisponibilidadBiometria {
  soportado: boolean;
  enrolado: boolean;
  tipo: 'rostro' | 'huella' | 'biometria';
}

export async function biometriaDisponible(): Promise<DisponibilidadBiometria> {
  if (Platform.OS === 'web') return { soportado: false, enrolado: false, tipo: 'biometria' };

  const soportado = await LocalAuthentication.hasHardwareAsync();
  const enrolado = soportado && (await LocalAuthentication.isEnrolledAsync());
  const tipos = await LocalAuthentication.supportedAuthenticationTypesAsync();
  const tipo = tipos.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)
    ? 'rostro'
    : tipos.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)
      ? 'huella'
      : 'biometria';

  return { soportado, enrolado, tipo };
}

export async function autenticarConBiometria(): Promise<{ ok: boolean; error?: string }> {
  if (Platform.OS === 'web') return { ok: false, error: 'No disponible en web' };
  const resultado = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Entra a GestorApp',
    cancelLabel: 'Usar usuario y contraseña',
    disableDeviceFallback: false,
  });
  if (resultado.success) return { ok: true };
  return { ok: false, error: resultado.error === 'user_cancel' ? undefined : 'No se pudo verificar tu identidad' };
}

// ─── Preferencia del usuario: prender/apagar el desbloqueo biométrico ───────

const CLAVE_PREFERENCIA = 'gestorapp_biometria_activa';

/** true por defecto (si el equipo soporta): mantiene el comportamiento de siempre a menos que el usuario lo apague. */
export async function biometriaActivadaPorUsuario(): Promise<boolean> {
  try {
    const v = await SecureStore.getItemAsync(CLAVE_PREFERENCIA);
    return v === null ? true : v === '1';
  } catch {
    return true;
  }
}

export async function establecerBiometriaActivada(valor: boolean): Promise<void> {
  try {
    await SecureStore.setItemAsync(CLAVE_PREFERENCIA, valor ? '1' : '0');
  } catch {
    // Web u otra plataforma sin SecureStore: no rompe nada, simplemente no persiste.
  }
}