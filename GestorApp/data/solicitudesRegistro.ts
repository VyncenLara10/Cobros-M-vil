/**
 * data/solicitudesRegistro.ts
 * Cola de APROBACIONES: solicitudes de registro de gestores nuevos, pendientes
 * de que el admin revise la papelería (DPI, licencia, antecedentes...) antes
 * de activar la cuenta. Prototipo en memoria — TODO: reemplazar por
 * GET/POST /api/solicitudes-registro cuando exista el backend (ver
 * supabase/schema.sql: tabla `solicitudes_registro`).
 */

import { ZonaCobertura } from '@/components/(auth)/Coverageareapicker';
import { RolGestor } from '@/components/(auth)/Roleselector';
import { DatosRegistro } from '@/components/(auth)/tipos-registro';
import { Gestor } from '@/types';
import { GESTORES_MOCK } from './mocks';

export type EstadoSolicitud = 'pendiente' | 'aprobado' | 'rechazado';

export interface SolicitudRegistro {
  id: string;
  fecha: string;
  estado: EstadoSolicitud;
  rol: RolGestor;
  nombreCompleto: string;
  correo: string;
  telefono: string;
  dpiNumero: string;
  numeroColegiado?: string;
  tipoVehiculo?: string;
  placaVehiculo?: string;
  zonaCobertura: ZonaCobertura | null;
  banco: string;
  numeroCuenta: string;
  nombreTitular: string;
  documentos: {
    fotoPerfilUri: string | null;
    dpiFrenteUri: string | null;
    dpiReversoUri: string | null;
    antecedentesPenalesUri: string | null;
    licenciaUri: string | null;
    tarjetaCirculacionUri: string | null;
    fotoVehiculoUri: string | null;
    carneColegiadoUri: string | null;
  };
  motivoRechazo?: string;
  perfilId?: string;
}

let contador = 3;
const zonaTexto = (z: ZonaCobertura | null) => (z ?? []).map((a) => a.municipio).join(' / ') || 'Sin definir';

export const SOLICITUDES_REGISTRO: SolicitudRegistro[] = [
  {
    id: 'SOL-001', fecha: '2026-07-27 09:15', estado: 'pendiente', rol: 'cobrador',
    nombreCompleto: 'Jorge Estrada', correo: 'jorge.estrada@correo.com', telefono: '5588-2210',
    dpiNumero: '2540 11023 0108', tipoVehiculo: 'Motocicleta', placaVehiculo: 'M-124578',
    zonaCobertura: [{ departamento: 'Guatemala', municipio: 'Villa Nueva', zonas: [] }],
    banco: 'Banco Industrial', numeroCuenta: '3021456789', nombreTitular: 'Jorge Estrada',
    // Sin fotos reales: son candidatos ficticios de demo. Para ver documentos
    // de verdad, completa el formulario de /registro en tu propio teléfono
    // (las fotos se guardan localmente en ESE dispositivo) y aprueba desde
    // la misma sesión/dispositivo.
    documentos: { fotoPerfilUri: null, dpiFrenteUri: null, dpiReversoUri: null, antecedentesPenalesUri: null, licenciaUri: null, tarjetaCirculacionUri: null, fotoVehiculoUri: null, carneColegiadoUri: null },
  },
  {
    id: 'SOL-002', fecha: '2026-07-27 14:40', estado: 'pendiente', rol: 'verificador',
    nombreCompleto: 'Paola Requena', correo: 'paola.requena@correo.com', telefono: '5599-4471',
    dpiNumero: '1877 90042 0301', tipoVehiculo: 'A pie / transporte público', placaVehiculo: '',
    zonaCobertura: [{ departamento: 'Guatemala', municipio: 'Guatemala', zonas: ['Zona 11', 'Zona 12'] }],
    banco: 'Banco G&T', numeroCuenta: '4498021135', nombreTitular: 'Paola Requena',
    documentos: { fotoPerfilUri: null, dpiFrenteUri: null, dpiReversoUri: null, antecedentesPenalesUri: null, licenciaUri: null, tarjetaCirculacionUri: null, fotoVehiculoUri: null, carneColegiadoUri: null },
  },
  {
    id: 'SOL-003', fecha: '2026-07-28 08:05', estado: 'pendiente', rol: 'abogado',
    nombreCompleto: 'Lic. Fernanda Ixchel', correo: 'f.ixchel@correo.com', telefono: '5566-8823',
    dpiNumero: '1699 34521 0113', numeroColegiado: '22190',
    zonaCobertura: [{ departamento: 'Guatemala', municipio: 'Guatemala', zonas: [] }],
    banco: 'Banco Promerica', numeroCuenta: '7712340098', nombreTitular: 'Fernanda Ixchel',
    documentos: { fotoPerfilUri: null, dpiFrenteUri: null, dpiReversoUri: null, antecedentesPenalesUri: null, licenciaUri: null, tarjetaCirculacionUri: null, fotoVehiculoUri: null, carneColegiadoUri: null },
  },
];

export function solicitudesPendientes(): SolicitudRegistro[] {
  return SOLICITUDES_REGISTRO.filter((s) => s.estado === 'pendiente');
}

export function solicitudPorId(id: string): SolicitudRegistro | undefined {
  return SOLICITUDES_REGISTRO.find((s) => s.id === id);
}

/** Se llama al enviar el formulario de registro (paso 7 → "Enviar solicitud"). */
export function enviarSolicitudRegistro(datos: DatosRegistro): SolicitudRegistro {
  contador += 1;
  const solicitud: SolicitudRegistro = {
    id: `SOL-${String(contador).padStart(3, '0')}`,
    fecha: new Date().toISOString().slice(0, 16).replace('T', ' '),
    estado: 'pendiente',
    rol: datos.rol ?? 'verificador',
    nombreCompleto: datos.nombreCompleto,
    correo: datos.correo,
    telefono: datos.telefono,
    dpiNumero: datos.dpiNumero,
    numeroColegiado: datos.numeroColegiado || undefined,
    tipoVehiculo: datos.tipoVehiculo || undefined,
    placaVehiculo: datos.placaVehiculo || undefined,
    zonaCobertura: datos.zonaCobertura,
    banco: datos.banco,
    numeroCuenta: datos.numeroCuenta,
    nombreTitular: datos.nombreTitular,
    documentos: {
      fotoPerfilUri: datos.fotoPerfilUri,
      dpiFrenteUri: datos.dpiFrenteUri,
      dpiReversoUri: datos.dpiReversoUri,
      antecedentesPenalesUri: datos.antecedentesPenalesUri,
      licenciaUri: datos.licenciaUri,
      tarjetaCirculacionUri: datos.tarjetaCirculacionUri,
      fotoVehiculoUri: datos.fotoVehiculoUri,
      carneColegiadoUri: datos.carneColegiadoUri,
    },
  };
  SOLICITUDES_REGISTRO.unshift(solicitud);
  return solicitud;
}

/**
 * APROBAR: activa al gestor — lo agrega a GESTORES_MOCK para que ya pueda
 * recibir servicios. TODO: en el backend esto crea el usuario real y
 * dispara la notificación push de "cuenta aprobada" (ver AVISOS_MOCK).
 */
export function aprobarSolicitud(id: string): Gestor | undefined {
  const s = solicitudPorId(id);
  if (!s || s.estado !== 'pendiente') return undefined;
  s.estado = 'aprobado';

  const iniciales = s.nombreCompleto
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

  const nuevoGestor: Gestor = {
    id: `G-N${s.id.replace('SOL-', '')}`,
    nombre: s.nombreCompleto,
    telefono: s.telefono,
    tipo: s.rol,
    zona: zonaTexto(s.zonaCobertura),
    calificacion: 5,
    serviciosCompletados: 0,
    comisionesAcumuladas: 0,
    disponible: true,
    avatar: iniciales || 'GX',
    numeroColegiado: s.numeroColegiado,
  };
  GESTORES_MOCK.push(nuevoGestor);
  return nuevoGestor;
}

/** RECHAZAR: requiere motivo, para que el candidato sepa qué corregir. */
export function rechazarSolicitud(id: string, motivo: string): SolicitudRegistro | undefined {
  const s = solicitudPorId(id);
  if (!s || s.estado !== 'pendiente') return undefined;
  s.estado = 'rechazado';
  s.motivoRechazo = motivo.trim();
  return s;
}
