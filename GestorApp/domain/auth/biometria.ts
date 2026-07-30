/**
 * domain/auth/biometria.ts
 * Desbloqueo con Face ID / huella sobre una sesión YA guardada (ver
 * domain/auth/sesion.tsx). No reemplaza el login: solo evita volver a
 * escribir usuario/contraseña en el mismo dispositivo.
 */

import * as LocalAuthentication from 'expo-local-authentication';
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
