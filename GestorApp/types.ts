// ─── Roles de gestor ─────────────────────────────────────────────────────────

export type RolGestor = 'verificador' | 'cobrador' | 'abogado';

export const ROL_LABEL: Record<RolGestor, string> = {
  verificador: 'Verificador',
  cobrador: 'Cobrador',
  abogado: 'Abogado',
};

// ─── Alias de compatibilidad ─────────────────────────────────────────────────
// El proyecto original nombra este mismo concepto como `TipoGestor` /
// `GESTOR_TIPO_LABEL` (p.ej. en app/(tabs)/gestores.tsx). Se exportan como alias
// para que ambos nombres funcionen sin tener que tocar las pantallas existentes.
export type TipoGestor = RolGestor;
export const GESTOR_TIPO_LABEL: Record<TipoGestor, string> = ROL_LABEL;

// ─── Tipos de servicio ───────────────────────────────────────────────────────

export type TipoServicio = 'cobro' | 'notificacion' | 'verificacion' | 'legal';

export const TIPO_SERVICIO_LABEL: Record<TipoServicio, string> = {
  cobro: 'Cobro',
  notificacion: 'Notificación',
  verificacion: 'Verificación',
  legal: 'Legal',
};

/**
 * REGLA CLAVE — qué rol puede ACEPTAR cada tipo de servicio.
 * El servicio le llega (o queda visible) solo a los roles listados aquí y se
 * asigna al PRIMERO que lo acepte.
 *
 *  - cobro         → solo cobrador (persona capacitada; maneja deuda/mora).
 *  - notificacion  → cualquiera de los 3 (solo dejar notificación + conseguir número).
 *  - verificacion  → cualquiera de los 3 (el primero que acepte se lo queda).
 *  - legal         → SOLO abogado (requiere número de colegiado).
 */
export const ROLES_ELEGIBLES: Record<TipoServicio, RolGestor[]> = {
  cobro: ['cobrador'],
  notificacion: ['verificador', 'cobrador', 'abogado'],
  verificacion: ['verificador', 'cobrador', 'abogado'],
  legal: ['abogado'],
};

/** true si un rol puede aceptar/ver un tipo de servicio. */
export function rolPuedeAceptar(rol: RolGestor, tipo: TipoServicio): boolean {
  return ROLES_ELEGIBLES[tipo].includes(rol);
}

// ─── Subtipo de verificación ─────────────────────────────────────────────────
// Domiciliar → fotos de la casa (frente, izq, der) + contador de luz.
// Laboral    → foto del producto / negocio / puesto de trabajo.

export type SubtipoVerificacion = 'domiciliar' | 'laboral';

export const SUBTIPO_VERIFICACION_LABEL: Record<SubtipoVerificacion, string> = {
  domiciliar: 'Verificación domiciliar',
  laboral: 'Verificación laboral',
};

// ─── Estados de servicio ─────────────────────────────────────────────────────

export type EstadoServicio =
  | 'activo'
  | 'pendiente'
  | 'completado'
  | 'no_localizado'
  | 'fallido';

export const ESTADO_LABEL: Record<EstadoServicio, string> = {
  activo: 'Activo',
  pendiente: 'Pendiente',
  completado: 'Completado',
  no_localizado: 'No localizado',
  fallido: 'Fallido',
};

// ─── Entidades ───────────────────────────────────────────────────────────────

export interface Cliente {
  nombre: string;
  telefono: string;
  direccion: string;
  zona: string;
  /** Enlace opcional al registro completo del cliente en la BD (ClienteDB.id). */
  clienteId?: string;
}

export interface Intento {
  id: string;
  fecha: string;
  resultado: string;
  nota: string;
  geolocalizacion?: string;
}

export interface Servicio {
  id: string;
  tipo: TipoServicio;
  estado: EstadoServicio;
  cliente: Cliente;

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

  // Solo legal
  tipoGestionLegal?: string;
  tarifaLegal?: number;

  // Solo verificación
  subtipoVerificacion?: SubtipoVerificacion;
}

export interface Gestor {
  id: string;
  nombre: string;
  telefono: string;
  tipo: RolGestor;
  zona: string;
  calificacion: number;
  serviciosCompletados: number;
  comisionesAcumuladas: number;
  disponible: boolean;
  avatar: string;
  /** Solo abogados: número de colegiado (habilita servicios "legal"). */
  numeroColegiado?: string;
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