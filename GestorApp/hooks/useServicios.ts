/**
 * hooks/useServicios.ts
 * Hooks de conveniencia sobre domain/servicios/servicios.ts: manejan el
 * estado de carga y exponen un `refrescar()` para volver a pedir los datos
 * (por ejemplo al volver de un formulario de completado).
 *
 * Los feeds de disponibles/visibles se ordenan por cercanía (Uber-style):
 * se pide la posición del dispositivo una vez por montaje y se reutiliza en
 * cada refetch. `useServiciosEnTiempoReal` avisa (notificación local +
 * refetch) cuando aparece un servicio nuevo elegible para el rol.
 */

import type { RolApp } from '@/domain/auth/sesion';
import { notificarLocal } from '@/domain/notificaciones/push';
import * as ServiciosDB from '@/domain/servicios/servicios';
import { supabase, supabaseConfigurado } from '@/lib/supabase';
import { RolGestor, Servicio, TIPO_SERVICIO_LABEL, rolPuedeAceptar } from '@/types';
import { useCallback, useEffect, useRef, useState } from 'react';

interface EstadoLista {
  servicios: Servicio[];
  cargando: boolean;
  refrescar: () => void;
}

type Posicion = { lat: number; lng: number } | null;

/** Posición del dispositivo con cache corta: no vale la pena pedirla en cada refetch. */
let cachePosicion: { valor: Posicion; ts: number } = { valor: null, ts: 0 };
async function posicionConCache(): Promise<Posicion> {
  if (Date.now() - cachePosicion.ts < 60_000) return cachePosicion.valor;
  const valor = await ServiciosDB.obtenerPosicionActual();
  cachePosicion = { valor, ts: Date.now() };
  return valor;
}

function useCargaServicios(cargar: () => Promise<Servicio[]>, deps: any[]): EstadoLista {
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [cargando, setCargando] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelado = false;
    setCargando(true);
    cargar()
      .then((data) => {
        if (!cancelado) {
          setServicios(data);
          setCargando(false);
        }
      })
      .catch((e) => {
        // Nunca dejar una promesa rechazada sin manejar: en Android una
        // excepción no capturada puede cerrar la app. Se vacía la lista y
        // se marca la carga como terminada.
        console.warn('[servicios] error cargando lista', e);
        if (!cancelado) {
          setServicios([]);
          setCargando(false);
        }
      });
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  // ESTABLE: este callback se usa dentro de useFocusEffect en las pantallas;
  // si se recreara en cada render provocaría un bucle infinito de re-render
  // (crash: "Maximum update depth exceeded").
  const refrescar = useCallback(() => setTick((t) => t + 1), []);
  return { servicios, cargando, refrescar };
}

/** Solicitudes pendientes elegibles para el rol del gestor, ordenadas por cercanía. */
export function useServiciosDisponibles(rol: RolGestor, zonaGestor?: string): EstadoLista {
  const [posicion, setPosicion] = useState<Posicion>(null);
  useEffect(() => {
    let cancelado = false;
    posicionConCache().then((p) => {
      if (!cancelado) setPosicion(p);
    });
    return () => {
      cancelado = true;
    };
  }, []);
  return useCargaServicios(
    () => ServiciosDB.serviciosDisponiblesPara(rol, { posicion, zonaGestor }),
    [rol, zonaGestor, posicion],
  );
}

/** Servicios activos (ya aceptados) de un gestor. */
export function useServiciosDeGestor(gestorId: string | undefined): EstadoLista {
  return useCargaServicios(() => (gestorId ? ServiciosDB.serviciosDeGestor(gestorId) : Promise.resolve([])), [gestorId]);
}

/** Todo lo que le corresponde ver a un usuario en su panel principal. */
export function useServiciosVisibles(usuario: { id: string; rol: RolApp; zona?: string } | null): EstadoLista {
  const esGestor = !!usuario && usuario.rol !== 'admin';
  const [posicion, setPosicion] = useState<Posicion>(null);
  useEffect(() => {
    if (!esGestor) return;
    let cancelado = false;
    posicionConCache().then((p) => {
      if (!cancelado) setPosicion(p);
    });
    return () => {
      cancelado = true;
    };
  }, [esGestor]);
  return useCargaServicios(
    () =>
      usuario
        ? ServiciosDB.serviciosVisiblesPara(usuario, esGestor ? { posicion } : undefined)
        : Promise.resolve([]),
    [usuario?.id, usuario?.rol, usuario?.zona, posicion],
  );
}

/** Un servicio puntual por id (pantallas de detalle/formulario). */
export function useServicio(id: string | undefined) {
  const [servicio, setServicio] = useState<Servicio | undefined>(undefined);
  const [cargando, setCargando] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelado = false;
    if (!id) {
      setServicio(undefined);
      setCargando(false);
      return;
    }
    setCargando(true);
    ServiciosDB.servicioPorId(id).then((data) => {
      if (!cancelado) {
        setServicio(data);
        setCargando(false);
      }
    });
    return () => {
      cancelado = true;
    };
  }, [id, tick]);

  const refrescar = useCallback(() => setTick((t) => t + 1), []);
  return { servicio, cargando, refrescar };
}

/**
 * Realtime para gestores: escucha INSERTs en `servicios` y, si el nuevo es
 * pendiente + elegible para el rol, dispara notificación local y refetch.
 * Requiere que `servicios` esté en la publicación supabase_realtime
 * (supabase/fix-modulos.sql). El admin no lo necesita (ve todo y no reclama).
 */
export function useServiciosEnTiempoReal(
  usuario: { id: string; rol: RolApp } | null,
  onNuevo: () => void,
) {
  const callbackRef = useRef(onNuevo);
  callbackRef.current = onNuevo;

  useEffect(() => {
    if (!supabaseConfigurado || !usuario || usuario.rol === 'admin') return;

    const canal = supabase
      .channel(`servicios-${usuario.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'servicios' },
        (payload) => {
          const fila = payload.new as { estado?: string; tipo?: string } | null;
          if (
            fila?.estado === 'pendiente' &&
            fila.tipo &&
            rolPuedeAceptar(usuario.rol as RolGestor, fila.tipo as any)
          ) {
            notificarLocal(
              '📋 Nuevo servicio disponible',
              `Hay un nuevo servicio de ${TIPO_SERVICIO_LABEL[fila.tipo as keyof typeof TIPO_SERVICIO_LABEL]} para tu rol.`,
            );
            callbackRef.current();
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [usuario?.id, usuario?.rol]);
}
