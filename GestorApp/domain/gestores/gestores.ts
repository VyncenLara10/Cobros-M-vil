/**
 * domain/gestores/gestores.ts
 * Directorio de gestores para el panel de admin: perfiles reales (rol ≠ admin)
 * + gestores_stats + su última posición en ubicaciones_gestor. El punto de
 * frescura (verde/amarillo/gris) se calcula en la pantalla con `actualizadoEn`.
 */

import { GESTORES_MOCK } from '@/data/mocks';
import { supabase, supabaseConfigurado } from '@/lib/supabase';
import { Gestor } from '@/types';

export interface GestorEnVivo extends Gestor {
  /** Último ping GPS; null si nunca ha reportado posición. */
  ubicacion: { lat: number; lng: number; actualizadoEn: string } | null;
}

function iniciales(nombre: string): string {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

export async function cargarGestores(): Promise<GestorEnVivo[]> {
  if (!supabaseConfigurado) {
    return GESTORES_MOCK.map((g) => ({ ...g, ubicacion: null }));
  }

  const { data, error } = await supabase
    .from('perfiles')
    .select(
      'id, nombre, rol, telefono, zona, avatar_iniciales, numero_colegiado, ' +
        'gestores_stats(calificacion, servicios_completados, comisiones_acumuladas, disponible), ' +
        'ubicaciones_gestor(lat, lng, actualizado_en)',
    )
    .neq('rol', 'admin')
    .order('nombre');

  if (error) {
    console.warn('[gestores] cargarGestores', error.message);
    return [];
  }

  return (data ?? []).map((p: any) => {
    const stats = Array.isArray(p.gestores_stats) ? p.gestores_stats[0] : p.gestores_stats;
    const ubi = Array.isArray(p.ubicaciones_gestor) ? p.ubicaciones_gestor[0] : p.ubicaciones_gestor;
    return {
      id: p.id,
      nombre: p.nombre ?? 'Gestor',
      telefono: p.telefono ?? '—',
      tipo: p.rol as Gestor['tipo'],
      zona: p.zona ?? 'Sin zona asignada',
      calificacion: Number(stats?.calificacion ?? 5),
      serviciosCompletados: stats?.servicios_completados ?? 0,
      comisionesAcumuladas: Number(stats?.comisiones_acumuladas ?? 0),
      disponible: stats?.disponible ?? true,
      avatar: p.avatar_iniciales || iniciales(p.nombre ?? ''),
      numeroColegiado: p.numero_colegiado ?? undefined,
      ubicacion: ubi
        ? { lat: Number(ubi.lat), lng: Number(ubi.lng), actualizadoEn: ubi.actualizado_en }
        : null,
    } satisfies GestorEnVivo;
  });
}

/** Clasifica el frescura del ping GPS. */
export function frescuraUbicacion(actualizadoEn: string | null | undefined): 'en_vivo' | 'reciente' | 'sin_senal' {
  if (!actualizadoEn) return 'sin_senal';
  const minutos = (Date.now() - new Date(actualizadoEn).getTime()) / 60_000;
  if (minutos < 2) return 'en_vivo';
  if (minutos < 10) return 'reciente';
  return 'sin_senal';
}
