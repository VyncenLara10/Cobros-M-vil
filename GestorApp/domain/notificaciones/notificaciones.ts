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

/** Recupera notificaciones visibles y sus lecturas privadas. */
export async function cargarNotificaciones(): Promise<NotificacionApp[]> {
  if (!supabaseConfigurado) return [];
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];
  const { data, error } = await supabase
    .from('notificaciones')
    .select('id, perfil_id, titulo, cuerpo, tipo, referencia_id, leida, enviada_en')
    .order('enviada_en', { ascending: false })
    .limit(500);
  if (error) {
    console.warn('[notificaciones] cargar', error.message);
    return [];
  }
  if (!data?.length) return [];
  const ids = data.map((f) => f.id);
  const { data: vistas, error: errorVistas } = await supabase
    .from('notificaciones_vistas')
    .select('notificacion_id')
    .eq('perfil_id', auth.user.id)
    .in('notificacion_id', ids);
  if (errorVistas) {
    console.warn('[notificaciones] lecturas', errorVistas.message);
    // No mostrar como leídas ofertas cuya lectura no se pudo verificar.
  }
  const leidas = new Set((vistas ?? []).map((v) => v.notificacion_id));
  const notificaciones = data.map((fila) => ({
    ...mapear(fila),
    leida: leidas.has(fila.id) || (fila.perfil_id !== null && !!fila.leida),
  }));
  // Un servicio nuevo crea una notificación por rol elegible. El admin puede
  // ver las tres por RLS, pero son una sola oferta, no tres servicios.
  const vistasServicios = new Set<string>();
  return notificaciones.filter((n) => {
    if (n.tipo !== 'servicio_nuevo' || !n.referenciaId) return true;
    const llave = `${n.tipo}:${n.referenciaId}`;
    if (vistasServicios.has(llave)) return false;
    vistasServicios.add(llave);
    return true;
  });
}

/** Cuenta no leídas, independientemente de las lecturas de otros gestores. */
export async function contarNoLeidas(): Promise<number> {
  return (await cargarNotificaciones()).filter((f) => !f.leida).length;
}

/** Inserta exclusivamente marcadores propios, sin modificar notificaciones ajenas. */
export async function marcarTodasLeidas(): Promise<void> {
  if (!supabaseConfigurado) return;
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;
  const { data, error } = await supabase.from('notificaciones')
    .select('id').order('enviada_en', { ascending: false }).limit(500);
  if (error) {
    console.warn('[notificaciones] cargar para marcar', error.message);
    return;
  }
  if (!data?.length) return;
  const filas = data.map((n) => ({ perfil_id: auth.user!.id, notificacion_id: n.id }));
  // La PK descarta duplicados y RLS valida que el aviso sea visible.
  for (let i = 0; i < filas.length; i += 100) {
    const { error: errorInsert } = await supabase.from('notificaciones_vistas')
      .upsert(filas.slice(i, i + 100), {
        onConflict: 'perfil_id,notificacion_id',
        ignoreDuplicates: true,
      });
    if (errorInsert) {
      console.warn('[notificaciones] marcar', errorInsert.message);
      return;
    }
  }
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
