/**
 * types.ts
 * Tipos centrales de la app (reconstruido). Este módulo se importa en todo el
 * proyecto como `@/types`. Además de los tipos base, aquí viven las REGLAS DE
 * NEGOCIO que definen qué rol puede aceptar cada tipo de servicio.
 */

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

/** Etiqueta corta para chips. */
export const SUBTIPO_VERIFICACION_CORTO: Record<SubtipoVerificacion, string> = {
  domiciliar: 'Domiciliar',
  laboral: 'Laboral',
};

/** Texto legible de una combinación de subtipos (domiciliar y/o laboral). */
export function subtiposTexto(subs?: SubtipoVerificacion[]): string {
  if (!subs || subs.length === 0) return 'Verificación';
  return subs.map((s) => SUBTIPO_VERIFICACION_CORTO[s]).join(' + ');
}

// ─── Fase de trabajo (separa ACEPTAR de COMPLETAR) ───────────────────────────
// Un servicio 'activo' (ya aceptado por un gestor) pasa por dos fases:
//   aceptado → el gestor lo tomó pero AÚN NO está en el lugar; el formulario
//              de completado está BLOQUEADO.
//   en_sitio → el gestor confirmó que llegó a la ubicación; se DESBLOQUEA el
//              formulario para capturar la información en el lugar.
export type FaseTrabajo = 'aceptado' | 'en_sitio';

export const FASE_TRABAJO_LABEL: Record<FaseTrabajo, string> = {
  aceptado: 'Aceptado · en camino',
  en_sitio: 'En la ubicación',
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

/**
 * Un crédito/deuda del cliente en UN banco. Un mismo cliente puede tener varios
 * (en distintos bancos) y CADA BANCO SE COBRA DISTINTO, por eso cada crédito
 * lleva su propio saldo y su propio porcentaje de comisión.
 */
export interface CreditoCliente {
  id: string;
  banco: string;              // 'Banco Industrial'
  numeroCredito: string;      // 'BI_41013508200025'
  tipoCredito: string;        // 'Consumo', 'Consumo especial'...
  producto?: string;
  saldoReal: number;          // saldo a recuperar (base de la comisión)
  saldoCapital?: number;
  pagoMinimo?: number;
  cuota?: number;
  diasAtraso?: number;
  cuotasAtraso?: number;
  mora?: number;
  fechaVence?: string;
  estadoAsignacion?: string;  // 'Asignado' | 'Desasignado'
  tipoAsignacion?: string;    // 'Consumo Mora 4'...
  /** % de comisión para ESTE banco/crédito (modificable al crear la solicitud). */
  porcentajeComision: number;
}

/** Comisión MÁXIMA de un crédito si se recupera todo el saldo. */
export function comisionMaxCredito(c: CreditoCliente): number {
  return Math.round(c.saldoReal * (c.porcentajeComision / 100) * 100) / 100;
}

/** Suma de saldos de varios créditos. */
export function saldoTotalCreditos(creditos?: CreditoCliente[]): number {
  return (creditos ?? []).reduce((t, c) => t + c.saldoReal, 0);
}

/** Comisión MÁXIMA total (si recupera el 100% de todos los saldos). */
export function comisionMaxTotal(creditos?: CreditoCliente[]): number {
  return Math.round((creditos ?? []).reduce((t, c) => t + comisionMaxCredito(c), 0) * 100) / 100;
}

/** Comisión REAL sobre lo efectivamente recuperado de un crédito. */
export function comisionSobreRecuperado(recuperado: number, porcentaje: number): number {
  return Math.round(recuperado * (porcentaje / 100) * 100) / 100;
}

/** Contacto/referencia telefónica del cliente (titular, familiar, etc.). */
export interface ReferenciaContacto {
  nombre: string;
  telefono: string;
  parentesco?: string;   // 'Titular', 'Hermana', 'Hija'...
}

export interface Cliente {
  nombre: string;
  telefono: string;
  direccion: string;
  zona: string;
  /** Enlace opcional al registro completo del cliente en la BD (ClienteDB.id). */
  clienteId?: string;
  // Datos ampliados (se muestran sobre todo al cobrador)
  dpi?: string;
  municipio?: string;
  departamento?: string;
  trabajo?: string;
  cargo?: string;
  salario?: number;
  // Ubicación del TRABAJO (puede ser distinta de la de la vivienda). Se usa
  // para la parte laboral de una verificación, con su propio candado.
  direccionLaboral?: string;
  zonaLaboral?: string;
  referencias?: ReferenciaContacto[];
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

  /** Fase de trabajo cuando ya está aceptado (aceptado → en_sitio). */
  fase?: FaseTrabajo;

  fechaAsignacion: string;
  fechaLimite: string;

  intentos: Intento[];
  notas: string;

  // Solo legal
  tipoGestionLegal?: string;
  tarifaLegal?: number;

  // Solo verificación — puede ser domiciliar, laboral o AMBAS.
  subtiposVerificacion?: SubtipoVerificacion[];
  /** @deprecated usar subtiposVerificacion. Se mantiene por compatibilidad. */
  subtipoVerificacion?: SubtipoVerificacion;

  // Solo cobro — créditos/deudas del cliente (uno por banco).
  creditos?: CreditoCliente[];

  /** Progreso de cada parte de una verificación (domiciliar/laboral), cuando viene de la BD. */
  partesEstado?: Partial<Record<SubtipoVerificacion, ProgresoParteVerificacion>>;
}

export interface ProgresoParteVerificacion {
  enSitio: boolean;
  completado: boolean;
  dictamen?: string;
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
