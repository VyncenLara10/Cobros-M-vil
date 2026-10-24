/**
 * domain/servicios/eventos.ts
 * Historial "quién hizo qué, cuándo y desde dónde" de cada servicio.
 * Cada acción sobre un servicio (aceptar, rechazar, intento, pago, llegar,
 * completar, escalar…) deja un registro en public.eventos_servicio con la
 * hora del servidor (creado_en) y la posición GPS del dispositivo en ese
 * momento (mejor esfuerzo: si no hay permiso o tarda, se guarda sin GPS).
 */

import { supabase, supabaseConfigurado } from '@/lib/supabase';
import * as Location from 'expo-location';

export interface EventoServicio {
  id: string;
  accion: string;
  etiqueta: string;
  fecha: string;
  gestor: string;
  lat?: number;
  lng?: number;
}

const ETIQUETAS: Record<string, string> = {
  aceptado: 'Servicio aceptado',
  rechazado: 'Devuelto al pool',
  pago: 'Pago registrado',
  en_sitio: 'Llegó a la ubicación',
  completado: 'Servicio completado',
  no_localizado: 'Cliente no localizado',
  escalado_legal: 'Escalado a gestión legal',
};

/** Etiqueta legible de una acción (los intentos llevan el resultado crudo). */
export function etiquetaEvento(accion: string): string {
  if (ETIQUETAS[accion]) return ETIQUETAS[accion];
  if (accion.startsWith('intento_')) return `Intento: ${accion.slice('intento_'.length)}`;
  return accion;
}

/** Posición con límite de tiempo: si el GPS tarda más de `ms`, se rinde. */
async function posicionConLimite(ms = 3000): Promise<{ lat: number; lng: number } | null> {
  const limite = new Promise<null>((resolve) => setTimeout(() => resolve(null), ms));
  return Promise.race([pedirPosicion(), limite]);
}

async function pedirPosicion(): Promise<{ lat: number; lng: number } | null> {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch {
    return null;
  }
}

/**
 * Registra un evento del servicio. Es "fire and forget": nunca debe frenar ni
 * romper la acción principal (se llama sin await desde las mutaciones).
 * Si se pasa `pos`, no vuelve a pedir el GPS.
 */
export async function registrarEvento(
  servicioId: string,
  accion: string,
  pos?: { lat: number; lng: number } | null,
): Promise<void> {
  if (!supabaseConfigurado) return;
  try {
    const posicion = pos !== undefined ? pos : await posicionConLimite();
    const { error } = await supabase.from('eventos_servicio').insert({
      servicio_id: servicioId,
      accion,
      lat: posicion?.lat ?? null,
      lng: posicion?.lng ?? null,
    });
    if (error) console.warn('[eventos]', accion, error.message);
  } catch (e) {
    console.warn('[eventos]', accion, e);
  }
}

/** Historial visible del servicio (admin y gestor asignado, según RLS). */
export async function cargarEventos(servicioId: string): Promise<EventoServicio[]> {
  if (!supabaseConfigurado) return [];
  const { data, error } = await supabase
    .from('eventos_servicio')
    .select('id, accion, lat, lng, creado_en, perfiles(nombre)')
    .eq('servicio_id', servicioId)
    .order('creado_en', { ascending: false })
    .limit(60);
  if (error) {
    console.warn('[eventos] cargar', error.message);
    return [];
  }
  return (data ?? []).map((fila: any) => ({
    id: fila.id,
    accion: fila.accion,
    etiqueta: etiquetaEvento(fila.accion),
    fecha: new Date(fila.creado_en).toLocaleString('es-GT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }),
    gestor: fila.perfiles?.nombre ?? 'Sistema',
    lat: fila.lat ?? undefined,
    lng: fila.lng ?? undefined,
  }));
}
