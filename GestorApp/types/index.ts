export type TipoServicio = 'cobro' | 'verificacion' | 'legal';
export type EstadoServicio = 'pendiente' | 'activo' | 'completado' | 'no_localizado' | 'fallido';
export type TipoGestor = 'cobrador' | 'verificador' | 'abogado';

export interface Gestor {
  id: string;
  nombre: string;
  telefono: string;
  tipo: TipoGestor;
  zona: string;
  calificacion: number;
  serviciosCompletados: number;
  comisionesAcumuladas: number;
  disponible: boolean;
  avatar: string;
}

export interface Servicio {
  id: string;
  tipo: TipoServicio;
  estado: EstadoServicio;
  cliente: {
    nombre: string;
    telefono: string;
    direccion: string;
    zona: string;
    coordenadas?: { lat: number; lng: number };
  };
  deudaTotal: number;
  montoGestion: number;
  comisionPct: number;
  comisionCalculada: number;
  gestorId: string | null;
  gestorNombre: string;
  fechaAsignacion: string;
  fechaLimite: string;
  intentos: Intento[];
  notas: string;
  tipoGestionLegal?: string;
  tarifaLegal?: number;
}

export interface Intento {
  id: string;
  fecha: string;
  resultado: string;
  nota: string;
  geolocalizacion?: string;
}

export interface ResumenDia {
  totalServicios: number;
  activos: number;
  completados: number;
  pendientes: number;
  recuperadoHoy: number;
  comisionesGeneradas: number;
  noLocalizados: number;
}