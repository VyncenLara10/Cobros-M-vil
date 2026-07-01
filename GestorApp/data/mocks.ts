import { Gestor, ResumenDia, RolGestor, Servicio, rolPuedeAceptar } from '@/types';

export const GESTORES_MOCK: Gestor[] = [
  {
    id: 'G-001', nombre: 'Luis Pérez', telefono: '5510-2233', tipo: 'cobrador',
    zona: 'Guatemala Z.3 / Z.6', calificacion: 4.8, serviciosCompletados: 142,
    comisionesAcumuladas: 18450, disponible: true, avatar: 'LP',
  },
  {
    id: 'G-002', nombre: 'María López', telefono: '5522-4455', tipo: 'verificador',
    zona: 'Mixco / Guatemala Z.8', calificacion: 4.5, serviciosCompletados: 89,
    comisionesAcumuladas: 12300, disponible: true, avatar: 'ML',
  },
  {
    id: 'G-003', nombre: 'Abog. Soto', telefono: '5533-6677', tipo: 'abogado',
    zona: 'Guatemala Z.10 / Z.9', calificacion: 4.9, serviciosCompletados: 67,
    comisionesAcumuladas: 32100, disponible: false, avatar: 'AS',
    numeroColegiado: '18452',
  },
  {
    id: 'G-004', nombre: 'Pedro Gómez', telefono: '5544-8899', tipo: 'cobrador',
    zona: 'Guatemala Z.1 / Z.2', calificacion: 4.2, serviciosCompletados: 55,
    comisionesAcumuladas: 8900, disponible: true, avatar: 'PG',
  },
  {
    id: 'G-005', nombre: 'Ana García', telefono: '5566-0011', tipo: 'verificador',
    zona: 'Villa Nueva', calificacion: 4.7, serviciosCompletados: 103,
    comisionesAcumuladas: 14200, disponible: true, avatar: 'AG',
  },
];

/**
 * Usuario actualmente logueado (el gestor que usa la app).
 * Cambia `tipo` para ver cómo cambian las solicitudes pendientes según el rol.
 * En "Mi perfil" hay un switch de rol para demo.
 */
export const USUARIO_ACTUAL: Gestor = {
  id: 'G-100', nombre: 'Carlos Ramírez', telefono: '5599-1000', tipo: 'verificador',
  zona: 'Guatemala Z.7 / Mixco', calificacion: 4.6, serviciosCompletados: 74,
  comisionesAcumuladas: 9800, disponible: true, avatar: 'CR',
};

export const SERVICIOS_MOCK: Servicio[] = [
  {
    id: 'SVC-001', tipo: 'cobro', estado: 'activo',
    cliente: { nombre: 'Carlos Méndez', telefono: '5501-1234', direccion: '3a Calle 4-20, Col. La Paz', zona: 'Zona 3', clienteId: 'CLI-001' },
    deudaTotal: 12000, montoGestion: 2500, comisionPct: 15, comisionCalculada: 375,
    gestorId: 'G-001', gestorNombre: 'Luis Pérez',
    fechaAsignacion: '2025-06-24 08:00', fechaLimite: '2025-06-24 17:00',
    intentos: [{ id: 'I-001', fecha: '2025-06-23 14:30', resultado: 'No atendió', nota: 'Timbró dos veces, nadie abrió', geolocalizacion: 'Zona 3' }],
    notas: '2do intento. Cliente tiene acuerdo verbal de pago parcial.',
  },
  {
    id: 'SVC-002', tipo: 'verificacion', estado: 'pendiente', subtipoVerificacion: 'laboral',
    cliente: { nombre: 'Ana Torres', telefono: '5502-5678', direccion: '5a Av. 12-55, San Cristóbal', zona: 'Zona 8', clienteId: 'CLI-002' },
    deudaTotal: 0, montoGestion: 350, comisionPct: 0, comisionCalculada: 350,
    gestorId: 'G-002', gestorNombre: 'María López',
    fechaAsignacion: '2025-06-24 09:00', fechaLimite: '2025-06-24 13:00',
    intentos: [], notas: 'Verificar dirección laboral y confirmar que trabaja allí.',
  },
  {
    id: 'SVC-003', tipo: 'legal', estado: 'completado',
    cliente: { nombre: 'Roberto Chávez', telefono: '5503-9012', direccion: '14 Calle 3-12, Av. Reforma', zona: 'Zona 10', clienteId: 'CLI-003' },
    deudaTotal: 45000, montoGestion: 800, comisionPct: 0, comisionCalculada: 800,
    gestorId: 'G-003', gestorNombre: 'Abog. Soto',
    fechaAsignacion: '2025-06-23 10:00', fechaLimite: '2025-06-23 18:00',
    intentos: [{ id: 'I-002', fecha: '2025-06-23 15:20', resultado: 'Entregado', nota: 'Notificación recibida y firmada por el deudor', geolocalizacion: 'Zona 10' }],
    notas: 'Notificación de demanda civil entregada.',
    tipoGestionLegal: 'Notificación de demanda', tarifaLegal: 800,
  },
  {
    id: 'SVC-004', tipo: 'cobro', estado: 'pendiente',
    cliente: { nombre: 'Familia Jiménez', telefono: '5504-3456', direccion: '8a Calle 15-40, Col. El Paraíso', zona: 'Zona 6' },
    deudaTotal: 9000, montoGestion: 1800, comisionPct: 20, comisionCalculada: 360,
    gestorId: null, gestorNombre: 'Sin asignar',
    fechaAsignacion: '2025-06-24 10:00', fechaLimite: '2025-06-24 18:00',
    intentos: [], notas: 'Primera visita. Coordinado con vecino como referencia.',
  },
  {
    id: 'SVC-005', tipo: 'verificacion', estado: 'activo', subtipoVerificacion: 'laboral',
    cliente: { nombre: 'Comercial Rivera', telefono: '5505-7890', direccion: '6a Av. 8-30, local 4', zona: 'Zona 1' },
    deudaTotal: 0, montoGestion: 400, comisionPct: 0, comisionCalculada: 400,
    gestorId: 'G-004', gestorNombre: 'Pedro Gómez',
    fechaAsignacion: '2025-06-24 07:30', fechaLimite: '2025-06-24 12:00',
    intentos: [], notas: 'Verificar existencia del negocio y actividad comercial actual.',
  },
  {
    id: 'SVC-006', tipo: 'cobro', estado: 'no_localizado',
    cliente: { nombre: 'Diego Salazar', telefono: '5506-1122', direccion: '2a Calle 5-18', zona: 'Zona 5', clienteId: 'CLI-004' },
    deudaTotal: 6500, montoGestion: 1200, comisionPct: 15, comisionCalculada: 0,
    gestorId: 'G-001', gestorNombre: 'Luis Pérez',
    fechaAsignacion: '2025-06-23 09:00', fechaLimite: '2025-06-23 15:00',
    intentos: [
      { id: 'I-003', fecha: '2025-06-23 11:00', resultado: 'No localizado', nota: 'Vecinos dicen que se mudó', geolocalizacion: 'Zona 5' },
      { id: 'I-004', fecha: '2025-06-23 14:00', resultado: 'No localizado', nota: 'Nadie en el inmueble, puerta con candado', geolocalizacion: 'Zona 5' },
    ],
    notas: 'Dirección desactualizada. Requiere nueva investigación.',
  },
  {
    id: 'SVC-007', tipo: 'legal', estado: 'pendiente',
    cliente: { nombre: 'Importadora Muñoz', telefono: '5507-3344', direccion: '10a Av. 22-45', zona: 'Zona 12', clienteId: 'CLI-005' },
    deudaTotal: 120000, montoGestion: 2500, comisionPct: 0, comisionCalculada: 2500,
    gestorId: 'G-003', gestorNombre: 'Abog. Soto',
    fechaAsignacion: '2025-06-24 11:00', fechaLimite: '2025-06-25 12:00',
    intentos: [], notas: 'Notificación de embargo precautorio.',
    tipoGestionLegal: 'Embargo precautorio', tarifaLegal: 2500,
  },

  // ─── Solicitudes PENDIENTES sin asignar (aparecen en "Mi perfil") ──────────
  {
    id: 'SVC-008', tipo: 'notificacion', estado: 'pendiente',
    cliente: { nombre: 'Josué Ramírez', telefono: '5508-2211', direccion: '4a Calle 6-15, Col. Molino', zona: 'Zona 7' },
    deudaTotal: 0, montoGestion: 150, comisionPct: 0, comisionCalculada: 150,
    gestorId: null, gestorNombre: 'Sin asignar',
    fechaAsignacion: '2025-06-24 09:30', fechaLimite: '2025-06-24 18:00',
    intentos: [], notas: 'Solo dejar la notificación y conseguir un número de contacto del cliente.',
  },
  {
    id: 'SVC-009', tipo: 'verificacion', estado: 'pendiente', subtipoVerificacion: 'domiciliar',
    cliente: { nombre: 'Lucía Herrera', telefono: '5509-8080', direccion: '12 Av. 3-45, Col. Bethania', zona: 'Zona 7' },
    deudaTotal: 0, montoGestion: 375, comisionPct: 0, comisionCalculada: 375,
    gestorId: null, gestorNombre: 'Sin asignar',
    fechaAsignacion: '2025-06-24 10:15', fechaLimite: '2025-06-24 16:00',
    intentos: [], notas: 'Verificación domiciliar: confirmar que reside en la dirección. Fotos de la casa y contador.',
  },
  {
    id: 'SVC-010', tipo: 'verificacion', estado: 'pendiente', subtipoVerificacion: 'laboral',
    cliente: { nombre: 'Taller El Rápido', telefono: '5510-3131', direccion: '5a Calle 2-10, Mixco', zona: 'Zona 4' },
    deudaTotal: 0, montoGestion: 400, comisionPct: 0, comisionCalculada: 400,
    gestorId: null, gestorNombre: 'Sin asignar',
    fechaAsignacion: '2025-06-24 11:00', fechaLimite: '2025-06-24 17:00',
    intentos: [], notas: 'Verificación laboral: confirmar actividad y tomar foto del producto/negocio.',
  },
  {
    id: 'SVC-011', tipo: 'notificacion', estado: 'pendiente',
    cliente: { nombre: 'Mario Cifuentes', telefono: '5511-4545', direccion: '9a Av. 14-22', zona: 'Zona 11' },
    deudaTotal: 0, montoGestion: 150, comisionPct: 0, comisionCalculada: 150,
    gestorId: null, gestorNombre: 'Sin asignar',
    fechaAsignacion: '2025-06-24 12:00', fechaLimite: '2025-06-25 12:00',
    intentos: [], notas: 'Entregar aviso y confirmar teléfono vigente del cliente.',
  },
  {
    id: 'SVC-012', tipo: 'cobro', estado: 'pendiente',
    cliente: { nombre: 'Sandra Morales', telefono: '5512-7676', direccion: '2a Calle 8-30, Villa Nueva', zona: 'Zona 5' },
    deudaTotal: 4200, montoGestion: 900, comisionPct: 15, comisionCalculada: 630,
    gestorId: null, gestorNombre: 'Sin asignar',
    fechaAsignacion: '2025-06-24 08:45', fechaLimite: '2025-06-24 17:00',
    intentos: [], notas: 'Cobro de campo. Cliente con 25 días de mora.',
  },
  {
    id: 'SVC-013', tipo: 'legal', estado: 'pendiente',
    cliente: { nombre: 'Distribuidora Paz', telefono: '5513-9090', direccion: '7a Av. 5-55', zona: 'Zona 9' },
    deudaTotal: 78000, montoGestion: 1200, comisionPct: 0, comisionCalculada: 1200,
    gestorId: null, gestorNombre: 'Sin asignar',
    fechaAsignacion: '2025-06-24 13:00', fechaLimite: '2025-06-26 12:00',
    intentos: [], notas: 'Carta pre-jurídica. Requiere abogado con colegiado.',
    tipoGestionLegal: 'Carta pre-jurídica', tarifaLegal: 1200,
  },
];

/**
 * Solicitudes que un gestor con cierto rol PUEDE ver/aceptar:
 * están pendientes, sin asignar, y su tipo es elegible para ese rol.
 */
export function serviciosDisponiblesPara(rol: RolGestor): Servicio[] {
  return SERVICIOS_MOCK.filter(
    (s) => s.estado === 'pendiente' && s.gestorId === null && rolPuedeAceptar(rol, s.tipo),
  );
}

export const RESUMEN_HOY: ResumenDia = {
  totalServicios: 13,
  activos: 4,
  completados: 3,
  pendientes: 6,
  recuperadoHoy: 4850,
  comisionesGeneradas: 620,
  noLocalizados: 1,
};