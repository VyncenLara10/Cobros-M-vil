import { supabase, supabaseConfigurado } from '@/lib/supabase';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

export interface ResultadoMagicLink {
  ok: boolean;
  error?: string;
}

function urlDeRetorno(): string {
  if (Platform.OS === 'web') {
    return typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : '';
  }
  return Linking.createURL('auth/callback');
}

export async function enviarEnlaceMagico(correo: string): Promise<ResultadoMagicLink> {
  if (!supabaseConfigurado) {
    return { ok: false, error: 'Supabase no está configurado todavía' };
  }
  const limpio = correo.trim().toLowerCase();
  if (!limpio) return { ok: false, error: 'Escribe tu correo.' };

  const { error } = await supabase.auth.signInWithOtp({
    email: limpio,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: urlDeRetorno(),
    },
  });

  if (error) {
    console.error('[MagicLink] Error de Supabase:', error);
    return { ok: false, error: `Error: ${error.message} (${error.status})` };
  }
  return { ok: true };
}