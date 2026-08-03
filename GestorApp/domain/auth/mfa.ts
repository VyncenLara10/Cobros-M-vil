/**
 * domain/auth/mfa.ts
 * Verificación en dos pasos (MFA) usando TOTP (Google Authenticator, Authy,
 * etc.) vía Supabase Auth. No requiere nada adicional en el dashboard: la
 * API de MFA está disponible por defecto en cualquier proyecto de Supabase.
 *
 * Flujo de ENROLAMIENTO (activar por primera vez):
 *   1. iniciarEnrolamientoTotp()  -> te da un secreto + una URI otpauth://
 *   2. El usuario lo agrega a su app de autenticación (con el secreto o
 *      escaneando un QR generado a partir de uriOtpAuth).
 *   3. confirmarEnrolamientoTotp(factorId, codigoDe6Digitos) -> queda activo.
 *
 * Flujo de DESAFÍO (cada login, después de la contraseña o el código):
 *   1. Tras iniciar sesión, revisa si hace falta el segundo factor
 *      (lo hace automáticamente domain/auth/sesion.tsx).
 *   2. completarDesafioMfaConCodigo(codigo) valida el código actual del
 *      usuario y sube el nivel de la sesión de aal1 a aal2.
 */

import { supabase } from '@/lib/supabase';

export interface FactorMfa {
  id: string;
  friendlyName: string | null;
  status: 'verified' | 'unverified';
}

export interface EnrolamientoTotp {
  factorId: string;
  /** Para mostrarlo como texto y que el usuario lo escriba a mano en su app. */
  secreto: string;
  /** otpauth://totp/... — de aquí se puede generar un QR si luego agregas una librería de QR. */
  uriOtpAuth: string;
}

/** Lista los factores TOTP que el usuario ya tiene (activos o pendientes de confirmar). */
export async function factoresMfa(): Promise<FactorMfa[]> {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error || !data) return [];
  return (data.totp ?? []).map((f) => ({
    id: f.id,
    friendlyName: f.friendly_name ?? null,
    status: f.status as 'verified' | 'unverified',
  }));
}

/** Paso 1 del enrolamiento: crea el factor y devuelve el secreto/URI para la app de autenticación. */
export async function iniciarEnrolamientoTotp(): Promise<
  { ok: true; data: EnrolamientoTotp } | { ok: false; error: string }
> {
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: 'GestorApp',
  });
  if (error || !data) {
    return { ok: false, error: error?.message ?? 'No se pudo iniciar el registro de verificación en dos pasos.' };
  }
  return {
    ok: true,
    data: { factorId: data.id, secreto: data.totp.secret, uriOtpAuth: data.totp.uri },
  };
}

async function desafiarYVerificar(factorId: string, codigo: string): Promise<{ ok: boolean; error?: string }> {
  const { data: reto, error: errorReto } = await supabase.auth.mfa.challenge({ factorId });
  if (errorReto || !reto) {
    return { ok: false, error: errorReto?.message ?? 'No se pudo generar el desafío de verificación.' };
  }
  const { error: errorVerificar } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: reto.id,
    code: codigo.trim(),
  });
  if (errorVerificar) {
    return { ok: false, error: 'Código incorrecto o vencido. Revisa la hora de tu teléfono e intenta de nuevo.' };
  }
  return { ok: true };
}

/** Paso 2 del enrolamiento: confirma el código de 6 dígitos y activa el factor. */
export async function confirmarEnrolamientoTotp(factorId: string, codigo: string) {
  return desafiarYVerificar(factorId, codigo);
}

/** Quita un factor (por ejemplo, si el usuario perdió el teléfono y quiere reconfigurar). */
export async function eliminarFactorMfa(factorId: string): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Nivel de autenticación actual de la sesión ('aal1' = solo password/código, 'aal2' = + MFA). */
export async function nivelDeAcceso(): Promise<{ actual: string; siguiente: string } | null> {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error || !data) return null;
  return { actual: data.currentLevel ?? 'aal1', siguiente: data.nextLevel ?? 'aal1' };
}

/** true si el usuario tiene MFA activo y la sesión actual todavía no lo cumplió. */
export async function faltaSegundoFactor(): Promise<boolean> {
  const nivel = await nivelDeAcceso();
  return !!nivel && nivel.siguiente === 'aal2' && nivel.actual !== nivel.siguiente;
}

/** Completa el desafío de MFA durante el login, usando el primer factor verificado del usuario. */
export async function completarDesafioMfaConCodigo(codigo: string): Promise<{ ok: boolean; error?: string }> {
  const factores = await factoresMfa();
  const factor = factores.find((f) => f.status === 'verified');
  if (!factor) return { ok: false, error: 'No tienes un método de verificación en dos pasos activo.' };
  return desafiarYVerificar(factor.id, codigo);
}
