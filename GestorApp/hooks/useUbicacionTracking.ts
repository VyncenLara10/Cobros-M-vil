/**
 * hooks/useUbicacionTracking.ts
 * Mientras un GESTOR (no admin) tiene sesión iniciada, pide permiso de
 * ubicación y sube su posición (+ batería) a public.ubicaciones_gestor cada
 * cierto tiempo/desplazamiento, para que el admin la vea en vivo en su panel.
 * Si Supabase no está configurado (modo demo) no hace nada.
 */

import type { RolApp } from '@/domain/auth/sesion';
import { supabase, supabaseConfigurado } from '@/lib/supabase';
import * as Battery from 'expo-battery';
import * as Location from 'expo-location';
import { useEffect } from 'react';

const INTERVALO_MS = 30_000;
const DISTANCIA_M = 40;

async function nivelBateria(): Promise<number | null> {
  try {
    const nivel = await Battery.getBatteryLevelAsync();
    return nivel >= 0 ? Math.round(nivel * 100) : null;
  } catch {
    return null;
  }
}

export function useUbicacionTracking(usuario: { id: string; rol: RolApp } | null) {
  useEffect(() => {
    if (!usuario || usuario.rol === 'admin' || !supabaseConfigurado) return;

    let cancelado = false;
    let subscripcion: Location.LocationSubscription | null = null;

    const enviar = async (coords: { latitude: number; longitude: number }) => {
      const bateria = await nivelBateria();
      if (cancelado) return;
      const { error } = await supabase.from('ubicaciones_gestor').upsert({
        gestor_id: usuario.id,
        lat: coords.latitude,
        lng: coords.longitude,
        bateria,
        actualizado_en: new Date().toISOString(),
      });
      if (error) console.warn('[ubicacion] no se pudo actualizar', error.message);
    };

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted' || cancelado) return;

      const inicial = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => null);
      if (inicial && !cancelado) await enviar(inicial.coords);
      if (cancelado) return;

      subscripcion = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: INTERVALO_MS, distanceInterval: DISTANCIA_M },
        (pos) => enviar(pos.coords),
      );
      if (cancelado) subscripcion.remove();
    })();

    return () => {
      cancelado = true;
      subscripcion?.remove();
    };
  }, [usuario?.id, usuario?.rol]);
}
