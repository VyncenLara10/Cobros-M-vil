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

export const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  anonKey || 'placeholder-anon-key',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);
