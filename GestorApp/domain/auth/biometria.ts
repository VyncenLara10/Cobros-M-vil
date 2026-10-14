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

const CLAVE_PREFERENCIA = 'gestorapp_biometria_activa';

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
    // Web sin SecureStore
  }
}