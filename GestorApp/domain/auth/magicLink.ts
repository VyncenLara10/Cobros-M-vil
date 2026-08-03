/**
 * domain/auth/magicLink.ts
 * "Entrar con enlace mágico": Supabase manda un correo con un botón/enlace;
 * al tocarlo, abre la app (o la pestaña web) en /auth/callback y ahí se
 * completa el login solo, sin contraseña ni código que escribir.
 *
 * Por qué enlace y no código de 6 dígitos: en el plan gratuito de Supabase,
 * el envío de correos usa la plantilla por defecto, que solo entrega el
 * enlace (no separa un código aparte de forma confiable). El enlace mágico
 * es, además, el flujo recomendado por Supabase para apps con cliente móvil.
 *
 * Requisito en el dashboard de Supabase (una sola vez):
 *   Authentication → URL Configuration → Redirect URLs — agrega ahí las
 *   URLs de retorno (ver detalle completo en la respuesta del chat), si no
 *   Supabase rechaza el link y no entra nadie.
 */

import { supabase, supabaseConfigurado } from '@/lib/supabase';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

export interface ResultadoMagicLink {
  ok: boolean;
  error?: string;
}

/** A dónde debe volver el enlace del correo: la pantalla app/auth/callback.tsx. */
function urlDeRetorno(): string {
  if (Platform.OS === 'web') {
    // Durante el SSR (Node) no hay `window`; en ese caso no se debería
    // llamar a esta función de todos modos (solo se usa al hacer click en un
    // botón, ya en el navegador).
    return typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : '';
  }
  return Linking.createURL('auth/callback');
}

/**
 * Pide a Supabase que mande el enlace mágico al correo. `shouldCreateUser:
 * false` evita que alguien cree una cuenta nueva solo escribiendo un correo
 * cualquiera: el correo debe pertenecer a un usuario que YA existe y ya fue
 * aprobado (admin, o un gestor ya aprobado).
 */
export async function enviarEnlaceMagico(correo: string): Promise<ResultadoMagicLink> {
  if (!supabaseConfigurado) {
    return { ok: false, error: 'Supabase no está configurado todavía (ver .env.example).' };
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
    // Mensaje genérico a propósito: no revela si el correo existe o no.
    console.error('[MagicLink] Error de Supabase:', error);
    return { ok: false, error: `Error: ${error.message} (${error.status})` };
  }
  return { ok: true };
}