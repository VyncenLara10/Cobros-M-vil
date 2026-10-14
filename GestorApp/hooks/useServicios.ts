/**
 * hooks/useServicios.ts
 * Hooks de conveniencia sobre domain/servicios/servicios.ts: manejan el
 * estado de carga y exponen un `refrescar()` para volver a pedir los datos
 * (por ejemplo al volver de un formulario de completado).
 */

import type { RolApp } from '@/domain/auth/sesion';
import * as ServiciosDB from '@/domain/servicios/servicios';
import { RolGestor, Servicio } from '@/types';
import { useCallback, useEffect, useState } from 'react';

interface EstadoLista {
  servicios: Servicio[];
  cargando: boolean;
  refrescar: () => void;
}

function useCargaServicios(cargar: () => Promise<Servicio[]>, deps: any[]): EstadoLista {
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [cargando, setCargando] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelado = false;
    setCargando(true);
    cargar().then((data) => {
      if (!cancelado) {
        setServicios(data);
        setCargando(false);
      }
    });
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  return { servicios, cargando, refrescar: () => setTick((t) => t + 1) };
}

/** Solicitudes pendientes elegibles para el rol del gestor en sesión. */
export function useServiciosDisponibles(rol: RolGestor): EstadoLista {
  return useCargaServicios(() => ServiciosDB.serviciosDisponiblesPara(rol), [rol]);
}

/** Servicios activos (ya aceptados) de un gestor. */
export function useServiciosDeGestor(gestorId: string | undefined): EstadoLista {
  return useCargaServicios(() => (gestorId ? ServiciosDB.serviciosDeGestor(gestorId) : Promise.resolve([])), [gestorId]);
}

/** Todo lo que le corresponde ver a un usuario en su panel principal. */
export function useServiciosVisibles(usuario: { id: string; rol: RolApp } | null): EstadoLista {
  return useCargaServicios(() => (usuario ? ServiciosDB.serviciosVisiblesPara(usuario) : Promise.resolve([])), [
    usuario?.id,
    usuario?.rol,
  ]);
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
