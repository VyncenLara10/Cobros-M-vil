/**
 * data/seguimiento.ts
 * Datos de SEGUIMIENTO para el panel de admin: por cada gestor en campo, su
 * ubicación actual (simulada), la ruta del día (paradas ordenadas con estado)
 * y los contadores del día (hechas, con éxito, no localizados, en curso).
 *
 * En producción esto vendría de pings GPS del dispositivo del gestor + el
 * estado real de cada servicio. Aquí son mocks en memoria.
 * TODO: reemplazar por GET /api/seguimiento/hoy y websockets de ubicación.
 */

import { RolGestor, TipoServicio } from '../types';

export type EstadoParada = 'completado' | 'no_localizado' | 'en_sitio' | 'en_camino' | 'pendiente';

export const ESTADO_PARADA_LABEL: Record<EstadoParada, string> = {
  completado: 'Completada',
  no_localizado: 'No localizado',
  en_sitio: 'En el lugar',
  en_camino: 'En camino',
  pendiente: 'Pendiente',
};

export interface Parada {
  orden: number;
  servicioId: string;
  cliente: string;
  tipo: TipoServicio;
  direccion: string;
  zona: string;
  lat: number;
  lng: number;
  estado: EstadoParada;
  hora?: string;
}

export interface RecorridoGestor {
  gestorId: string;
  nombre: string;
  rol: RolGestor;
  avatar: string;
  telefono: string;
  ultimoPing: string; // "hace 2 min"
  bateria: number;
  actual: { lat: number; lng: number };
  paradas: Parada[];
}

export const RECORRIDOS_HOY: RecorridoGestor[] = [
  {
    gestorId: 'G-002', nombre: 'María López', rol: 'verificador', avatar: 'ML',
    telefono: '5522-4455', ultimoPing: 'hace 2 min', bateria: 68,
    actual: { lat: 14.628, lng: -90.545 },
    paradas: [
      { orden: 1, servicioId: 'SVC-002', cliente: 'Ana Torres', tipo: 'verificacion', direccion: '5a Av. 12-55, San Cristóbal', zona: 'Zona 8', lat: 14.630, lng: -90.540, estado: 'completado', hora: '08:20' },
      { orden: 2, servicioId: 'SVC-020', cliente: 'Comercial Rivas', tipo: 'verificacion', direccion: '6a Calle 3-10', zona: 'Zona 7', lat: 14.626, lng: -90.548, estado: 'completado', hora: '09:05' },
      { orden: 3, servicioId: 'SVC-021', cliente: 'Julio Marroquín', tipo: 'notificacion', direccion: '2a Av. 8-40', zona: 'Zona 7', lat: 14.633, lng: -90.552, estado: 'no_localizado', hora: '09:40' },
      { orden: 4, servicioId: 'SVC-014', cliente: 'Byron Castañeda', tipo: 'verificacion', direccion: '15 Av. 9-12, Col. Primavera', zona: 'Zona 7', lat: 14.628, lng: -90.545, estado: 'en_sitio', hora: '10:10' },
      { orden: 5, servicioId: 'SVC-022', cliente: 'Taller Súper', tipo: 'verificacion', direccion: '4a Calle 1-20, Mixco', zona: 'Zona 4', lat: 14.640, lng: -90.535, estado: 'pendiente' },
    ],
  },
  {
    gestorId: 'G-001', nombre: 'Luis Pérez', rol: 'cobrador', avatar: 'LP',
    telefono: '5510-2233', ultimoPing: 'hace 5 min', bateria: 41,
    actual: { lat: 14.641, lng: -90.513 },
    paradas: [
      { orden: 1, servicioId: 'SVC-030', cliente: 'Carlos Méndez', tipo: 'cobro', direccion: '3a Calle 4-20', zona: 'Zona 3', lat: 14.638, lng: -90.520, estado: 'completado', hora: '08:00' },
      { orden: 2, servicioId: 'SVC-031', cliente: 'Familia Ruano', tipo: 'cobro', direccion: '9a Av. 5-15', zona: 'Zona 1', lat: 14.642, lng: -90.516, estado: 'completado', hora: '08:45' },
      { orden: 3, servicioId: 'SVC-004', cliente: 'Familia Jiménez', tipo: 'cobro', direccion: '8a Calle 15-40, El Paraíso', zona: 'Zona 6', lat: 14.641, lng: -90.513, estado: 'en_camino' },
      { orden: 4, servicioId: 'SVC-032', cliente: 'Distribuidora León', tipo: 'cobro', direccion: '7a Av. 2-30', zona: 'Zona 1', lat: 14.648, lng: -90.508, estado: 'pendiente' },
    ],
  },
  {
    gestorId: 'G-003', nombre: 'Abog. Soto', rol: 'abogado', avatar: 'AS',
    telefono: '5533-6677', ultimoPing: 'hace 12 min', bateria: 83,
    actual: { lat: 14.599, lng: -90.512 },
    paradas: [
      { orden: 1, servicioId: 'SVC-040', cliente: 'Importadora Muñoz', tipo: 'legal', direccion: '10a Av. 22-45', zona: 'Zona 12', lat: 14.601, lng: -90.515, estado: 'completado', hora: '09:00' },
      { orden: 2, servicioId: 'SVC-041', cliente: 'Roberto Chávez', tipo: 'legal', direccion: '14 Calle 3-12, Reforma', zona: 'Zona 10', lat: 14.599, lng: -90.512, estado: 'en_sitio', hora: '10:30' },
      { orden: 3, servicioId: 'SVC-042', cliente: 'Textiles GT', tipo: 'legal', direccion: '5a Av. 9-50', zona: 'Zona 9', lat: 14.596, lng: -90.508, estado: 'pendiente' },
    ],
  },
];

export interface StatsGestor {
  total: number;
  completadas: number;
  exito: number;
  noLocalizado: number;
  enCurso: number;
  pendientes: number;
  tasaExito: number; // % de las cerradas que fueron exitosas
}

export function statsDe(r: RecorridoGestor): StatsGestor {
  const total = r.paradas.length;
  const completadas = r.paradas.filter((p) => p.estado === 'completado').length;
  const noLocalizado = r.paradas.filter((p) => p.estado === 'no_localizado').length;
  const enCurso = r.paradas.filter((p) => p.estado === 'en_sitio' || p.estado === 'en_camino').length;
  const pendientes = r.paradas.filter((p) => p.estado === 'pendiente').length;
  const cerradas = completadas + noLocalizado;
  const tasaExito = cerradas ? Math.round((completadas / cerradas) * 100) : 0;
  return { total, completadas, exito: completadas, noLocalizado, enCurso, pendientes, tasaExito };
}

/** Totales del equipo para la cabecera del panel. */
export function statsEquipo(lista: RecorridoGestor[] = RECORRIDOS_HOY) {
  let completadas = 0, noLocalizado = 0, enCurso = 0, pendientes = 0;
  lista.forEach((r) => {
    const s = statsDe(r);
    completadas += s.completadas;
    noLocalizado += s.noLocalizado;
    enCurso += s.enCurso;
    pendientes += s.pendientes;
  });
  const cerradas = completadas + noLocalizado;
  return {
    gestores: lista.length,
    completadas, noLocalizado, enCurso, pendientes,
    tasaExito: cerradas ? Math.round((completadas / cerradas) * 100) : 0,
  };
} 