/**
 * lib/supabase.ts
 * Cliente de Supabase para toda la app. NO se usa todavía en ninguna
 * pantalla (los mocks en /data siguen mandando) — queda listo para cuando
 * conectes el proyecto real.
 *
 * Cómo activarlo:
 *   1. Crea supabase/schema.sql en tu proyecto de Supabase (SQL Editor → Run).
 *   2. Copia .env.example a .env y pon tu URL y anon key (Settings → API).
 *   3. Reinicia `npx expo start` (las env vars EXPO_PUBLIC_* se leen al arrancar).
 *   4. Importa `supabase` de aquí donde lo necesites, ej:
 *        import { supabase } from '@/lib/supabase';
 *        const { data, error } = await supabase.from('servicios').select('*');
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseConfigurado = !!url && !!anonKey;

if (!supabaseConfigurado) {
  // No lanzamos error: la app debe poder correr con los mocks aunque
  // Supabase todavía no esté configurado.
  console.warn(
    '[supabase] Falta EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY en .env — usando datos mock.',
  );
}

/**
 * `expo start --web` (y `expo export` para web) renderizan un primer pase en
 * Node (SSR/SSG) antes de que exista un navegador real. Ahí NO existe
 * `window`, así que AsyncStorage (que en web usa localStorage) truena si el
 * cliente de Supabase intenta leer la sesión guardada durante ese pase.
 * Por eso: en el servidor usamos un storage que no hace nada; en el
 * navegador o en nativo (iOS/Android) usamos AsyncStorage de verdad.
 */
const enServidor = typeof window === 'undefined';

const storageSinEfecto = {
  getItem: async () => null,
  setItem: async () => {},
  removeItem: async () => {},
};

export const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  anonKey || 'placeholder-anon-key',
  {
    auth: {
      storage: enServidor ? storageSinEfecto : AsyncStorage,
      autoRefreshToken: !enServidor,
      persistSession: !enServidor,
      detectSessionInUrl: false,
      // PKCE: el enlace mágico llega con "?code=..." en vez de un token en el
      // fragmento de la URL. Es más fácil de manejar igual en web y en
      // nativo, y es lo recomendado por Supabase para apps móviles.
      flowType: 'pkce',
    },
  },
);