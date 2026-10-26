import { supabase } from '@/lib/supabase';

export interface FactorMfa {
  id: string;
  friendlyName: string | null;
  status: 'verified' | 'unverified';
}

export interface EnrolamientoTotp {
  factorId: string;
  secreto: string;
  uriOtpAuth: string;
}

export async function factoresMfa(): Promise<FactorMfa[]> {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error || !data) return [];
  return (data.totp ?? []).map((f) => ({
    id: f.id,
    friendlyName: f.friendly_name ?? null,
    status: f.status as 'verified' | 'unverified',
  }));
}

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

export async function confirmarEnrolamientoTotp(factorId: string, codigo: string) {
  return desafiarYVerificar(factorId, codigo);
}

export async function eliminarFactorMfa(factorId: string): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function nivelDeAcceso(): Promise<{ actual: string; siguiente: string } | null> {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error || !data) return null;
  return { actual: data.currentLevel ?? 'aal1', siguiente: data.nextLevel ?? 'aal1' };
}

export async function faltaSegundoFactor(): Promise<boolean> {
  try {
    const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (error || !data) {
      // Sin respuesta fiable NO se asume "sin MFA" (antes un error dejaba
      // pasar la sesión aal1 sin segundo factor). Se pregunta por los
      // factores: si hay factor verificado, se exige el código; solo si
      // AMBAS consultas fallan se asume lo más seguro para el acceso (true).
      const { data: factores, error: errorFactores } = await supabase.auth.mfa.listFactors();
      if (errorFactores || !factores) {
        console.warn('[mfa] sin respuesta de AAL ni factores; se exige el segundo factor');
        return true;
      }
      const verificado = (factores.totp ?? []).some((f) => f.status === 'verified');
      if (verificado) console.warn('[mfa] AAL no disponible; exigiendo segundo factor por seguridad');
      return verificado;
    }
    return data.nextLevel === 'aal2' && data.currentLevel !== data.nextLevel;
  } catch (e) {
    console.warn('[mfa] error verificando el nivel de acceso', e);
    return true;
  }
}

export async function completarDesafioMfaConCodigo(codigo: string): Promise<{ ok: boolean; error?: string }> {
  const factores = await factoresMfa();
  const factor = factores.find((f) => f.status === 'verified');
  if (!factor) return { ok: false, error: 'No tienes un método de verificación en dos pasos activo.' };
  return desafiarYVerificar(factor.id, codigo);
}
