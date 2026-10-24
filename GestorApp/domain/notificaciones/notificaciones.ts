/**
 * domain/notificaciones/notificaciones.ts
 * Campana de notificaciones: lista, contador de no leídas y marcado como
 * leídas sobre public.notificaciones.
 *
 * RLS (supabase/fix-fase5.sql):
 *  - gestor: ve las suyas (perfil_id = uid) + las broadcast de su rol
 *    (perfil_id null, rol_destino = su rol) y puede marcarlas como leídas;
 *  - admin: ve y marca todas.
 */

import { supabase, supabaseConfigurado } from '@/lib/supabase';

export interface NotificacionApp {
  id: string;
  titulo: string;
  cuerpo: string;
  tipo: string;
  referenciaId: string | null;
  leida: boolean;
  fecha: string;
}

function mapear(fila: any): NotificacionApp {
  return {
    id: fila.id,
    titulo: fila.titulo,
    cuerpo: fila.cuerpo,
    tipo: fila.tipo,
    referenciaId: fila.referencia_id ?? null,
    leida: !!fila.leida,
    fecha: new Date(fila.enviada_en).toLocaleString('es-GT', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }),
  };
}

/** Últimas notificaciones visibles para el usuario con sesión. */
export async function cargarNotificaciones(): Promise<NotificacionApp[]> {
  if (!supabaseConfigurado) return [];
  const { data, error } = await supabase
    .from('notificaciones')
    .select('id, titulo, cuerpo, tipo, referencia_id, leida, enviada_en')
    .order('enviada_en', { ascending: false })
    .limit(100);
  if (error) {
    console.warn('[notificaciones] cargar', error.message);
    return [];
  }
  return (data ?? []).map(mapear);
}

/** Cuántas hay sin leer (para el punto rojo de la campana). */
export async function contarNoLeidas(): Promise<number> {
  if (!supabaseConfigurado) return 0;
  const { count, error } = await supabase
    .from('notificaciones')
    .select('id', { count: 'exact', head: true })
    .eq('leida', false);
  if (error) {
    console.warn('[notificaciones] contar', error.message);
    return 0;
  }
  return count ?? 0;
}

/** Marca todas las visibles como leídas (RLS limita a las que puede ver). */
export async function marcarTodasLeidas(): Promise<void> {
  if (!supabaseConfigurado) return;
  const { error } = await supabase
    .from('notificaciones')
    .update({ leida: true })
    .eq('leida', false);
  if (error) console.warn('[notificaciones] marcar', error.message);
}

/**
 * Crea una notificación dirigida a una persona (p. ej. al gestor cuando el
 * admin aprueba o rechaza su solicitud de registro).
 */
export async function notificarGestor(
  perfilId: string | undefined | null,
  titulo: string,
  cuerpo: string,
  tipo: string,
  referenciaId?: string | null,
): Promise<void> {
  if (!supabaseConfigurado || !perfilId) return;
  const { error } = await supabase.from('notificaciones').insert({
    perfil_id: perfilId,
    titulo,
    cuerpo,
    tipo,
    referencia_id: referenciaId ?? null,
  });
  if (error) console.warn('[notificaciones] crear', error.message);
}
