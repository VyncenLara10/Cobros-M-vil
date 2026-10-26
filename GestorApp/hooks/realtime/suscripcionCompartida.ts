/**
 * hooks/realtime/suscripcionCompartida.ts
 * Suscripciones Realtime COMPARTIDAS con refcount.
 *
 * Motivo (crash real, 2026-10): varios componentes creaban
 * `supabase.channel('servicios-<uid>')` por su cuenta; el segundo `.on(...)`
 * sobre un canal ya suscrito lanzaba dentro del useEffect y el cleanup de uno
 * desconectaba al otro.
 *
 * Reglas:
 *  - Un canal por (topic, filtro): la firma incluye event/schema/table/filter,
 *    así dos pantallas que piden lo mismo comparten canal y los que piden
 *    distinto no chocan.
 *  - `.on(...)` se registra UNA sola vez, antes de `.subscribe()`, en la creación
 *    de la entrada. Suscripciones posteriores solo agregan su callback al Set.
 *  - `suscribirse()` devuelve `unsubscribe`; el último en salir cierra el canal
 *    con `removeChannel`. Idempotente (llamar dos veces = una sola).
 *  - Sin try/catch como sustituto de diseño: la exclusión mutua es el registro
 *    único + el Set, no capturar la excepción de "canal ya suscrito".
 */
import { supabase, supabaseConfigurado } from '@/lib/supabase';

export interface FiltroPostgres {
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  schema: string;
  table: string;
  filter?: string;
}

/** Recibe el payload de postgres_changes (se usa `payload.new` en los callbacks). */
export type Escucha = (payload: any) => void;

interface Entrada {
  canal: ReturnType<typeof supabase.channel>;
  escuchas: Set<Escucha>;
}

/** clave → entrada; canales vivos con sus escuchas (refcount). */
const entradas = new Map<string, Entrada>();

function claveDe(topico: string, filtro: FiltroPostgres): string {
  const filtroTexto = filtro.filter ? `|${filtro.filter}` : '';
  return `${topico}::${filtro.event}:${filtro.schema}:${filtro.table}${filtroTexto}`;
}

/**
 * Suscribe un callback a un topic de Realtime. Comparte canal entre
 * suscriptores del mismo (topic, filtro).
 *
 * @returns función de desuscripción idempotente.
 */
export function suscribirse(topico: string, filtro: FiltroPostgres, escucha: Escucha): () => void {
  if (!supabaseConfigurado || !escucha) return () => {};

  const clave = claveDe(topico, filtro);
  let entrada = entradas.get(clave);
  if (!entrada) {
    const canal = supabase.channel(clave);
    const nueva: Entrada = { canal, escuchas: new Set<Escucha>() };
    entradas.set(clave, nueva);
    entrada = nueva;
    // Único .on() del canal, siempre ANTES de subscribe().
    canal.on('postgres_changes', filtro, (payload) => {
      nueva.escuchas.forEach((cb) => cb(payload));
    });
    canal.subscribe((estado, err) => {
      if (estado === 'CHANNEL_ERROR') console.warn('[realtime] error de canal', clave, err?.message ?? '');
      if (estado === 'TIMED_OUT') console.warn('[realtime] timeout de canal', clave);
    });
  }
  entrada.escuchas.add(escucha);

  let activa = true;
  return () => {
    if (!activa) return;
    activa = false;
    const actual = entradas.get(clave);
    if (!actual) return;
    actual.escuchas.delete(escucha);
    if (actual.escuchas.size === 0) {
      entradas.delete(clave);
      void supabase.removeChannel(actual.canal);
    }
  };
}

/** Depuración/pruebas: canales vivos con su refcount. */
export function estadoSuscripciones(): Array<{ clave: string; escuchas: number }> {
  return Array.from(entradas.entries()).map(([clave, e]) => ({ clave, escuchas: e.escuchas.size }));
}
