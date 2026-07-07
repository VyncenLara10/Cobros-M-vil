import {
  Cliente,
  EstadoServicio,
  Gestor,
  ResumenDia,
  RolGestor,
  Servicio,
  SubtipoVerificacion,
  rolPuedeAceptar,
} from '../types';

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
    id: 'SVC-001', tipo: 'cobro', estado: 'activo', fase: 'aceptado',
    cliente: {
      nombre: 'Carlos Méndez', telefono: '5501-1234', direccion: '3a Calle 4-20, Col. La Paz',
      zona: 'Zona 3', clienteId: 'CLI-001', dpi: '1582 23300 1204', municipio: 'Guatemala',
      departamento: 'Guatemala', trabajo: 'Comercial La Bodega', cargo: 'Vendedor', salario: 4500,
      referencias: [
        { nombre: 'Rosa Méndez', telefono: '5540-1020', parentesco: 'Esposa' },
        { nombre: 'Victoriano Ramírez', telefono: '5560-3040', parentesco: 'Referencia' },
      ],
    },
    deudaTotal: 12000, montoGestion: 2500, comisionPct: 15, comisionCalculada: 375,
    gestorId: 'G-001', gestorNombre: 'Luis Pérez',
    fechaAsignacion: '2025-06-24 08:00', fechaLimite: '2025-06-24 17:00',
    creditos: [
      {
        id: 'CR-001', banco: 'Banco Industrial', numeroCredito: 'BI_41013508200025',
        tipoCredito: 'Consumo especial', producto: 'Bi-Fácil Rapidito', saldoReal: 7627.04,
        saldoCapital: 7627.04, pagoMinimo: 2515.79, cuota: 1507.31, diasAtraso: 62,
        cuotasAtraso: 2, mora: 0, fechaVence: '2023-07-01', estadoAsignacion: 'Asignado',
        tipoAsignacion: 'Consumo Especial', porcentajeComision: 15,
      },
      {
        id: 'CR-002', banco: 'Banco G&T', numeroCredito: 'GT_9920145', tipoCredito: 'Consumo',
        saldoReal: 4372.96, saldoCapital: 4372.96, pagoMinimo: 1048.06, cuota: 1250.6,
        diasAtraso: 40, cuotasAtraso: 4, mora: 85.55, fechaVence: '2027-07-25',
        estadoAsignacion: 'Asignado', tipoAsignacion: 'Consumo Mora 4', porcentajeComision: 10,
      },
    ],
    intentos: [{ id: 'I-001', fecha: '2025-06-23 14:30', resultado: 'No atendió', nota: 'Timbró dos veces, nadie abrió', geolocalizacion: 'Zona 3' }],
    notas: '2do intento. Cliente tiene acuerdo verbal de pago parcial.',
  },
  {
    id: 'SVC-002', tipo: 'verificacion', estado: 'pendiente', subtiposVerificacion: ['laboral'],
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
    cliente: {
      nombre: 'Familia Jiménez', telefono: '5504-3456', direccion: '8a Calle 15-40, Col. El Paraíso',
      zona: 'Zona 6', dpi: '2011 55420 0108', municipio: 'Guatemala', departamento: 'Guatemala',
      trabajo: 'Independiente', salario: 3800,
      referencias: [{ nombre: 'Marta Jiménez', telefono: '5548-7788', parentesco: 'Hermana' }],
    },
    deudaTotal: 9000, montoGestion: 1800, comisionPct: 20, comisionCalculada: 360,
    gestorId: null, gestorNombre: 'Sin asignar',
    fechaAsignacion: '2025-06-24 10:00', fechaLimite: '2025-06-24 18:00',
    creditos: [
      {
        id: 'CR-010', banco: 'Banco Industrial', numeroCredito: 'BI_55201440108',
        tipoCredito: 'Consumo', producto: 'Tarjeta Bi-Credit', saldoReal: 9000, saldoCapital: 8600,
        pagoMinimo: 1800, cuota: 950, diasAtraso: 35, cuotasAtraso: 2, mora: 120,
        estadoAsignacion: 'Desasignado', tipoAsignacion: 'Consumo Mora 2', porcentajeComision: 20,
      },
    ],
    intentos: [], notas: 'Primera visita. Coordinado con vecino como referencia.',
  },
  {
    id: 'SVC-005', tipo: 'verificacion', estado: 'activo', fase: 'aceptado', subtiposVerificacion: ['laboral'],
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
    id: 'SVC-009', tipo: 'verificacion', estado: 'pendiente', subtiposVerificacion: ['domiciliar'],
    cliente: { nombre: 'Lucía Herrera', telefono: '5509-8080', direccion: '12 Av. 3-45, Col. Bethania', zona: 'Zona 7' },
    deudaTotal: 0, montoGestion: 375, comisionPct: 0, comisionCalculada: 375,
    gestorId: null, gestorNombre: 'Sin asignar',
    fechaAsignacion: '2025-06-24 10:15', fechaLimite: '2025-06-24 16:00',
    intentos: [], notas: 'Verificación domiciliar: confirmar que reside en la dirección. Fotos de la casa y contador.',
  },
  {
    id: 'SVC-010', tipo: 'verificacion', estado: 'pendiente', subtiposVerificacion: ['laboral'],
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
    cliente: {
      nombre: 'Sandra Morales', telefono: '5512-7676', direccion: '2a Calle 8-30, Villa Nueva',
      zona: 'Zona 5', dpi: '1998 44120 0301', municipio: 'Villa Nueva', departamento: 'Guatemala',
      trabajo: 'Textiles del Sur', cargo: 'Operaria', salario: 3200,
      referencias: [
        { nombre: 'Angélica Morales', telefono: '5570-1212', parentesco: 'Hermana' },
        { nombre: 'Felicita Ruiz', telefono: '5571-3434', parentesco: 'Madre' },
      ],
    },
    deudaTotal: 8626.17, montoGestion: 900, comisionPct: 15, comisionCalculada: 630,
    gestorId: null, gestorNombre: 'Sin asignar',
    fechaAsignacion: '2025-06-24 08:45', fechaLimite: '2025-06-24 17:00',
    creditos: [
      {
        id: 'CR-020', banco: 'Banco Industrial', numeroCredito: 'BI_41013508200034',
        tipoCredito: 'Consumo', producto: 'Bi-Crédito Ciclo', saldoReal: 5426.17, saldoCapital: 5426.17,
        pagoMinimo: 1048.06, cuota: 1250.6, diasAtraso: 40, cuotasAtraso: 4, mora: 85.55,
        estadoAsignacion: 'Asignado', tipoAsignacion: 'Consumo Mora 4', porcentajeComision: 12,
      },
      {
        id: 'CR-021', banco: 'Banco Promerica', numeroCredito: 'PRO_778120', tipoCredito: 'Tarjeta',
        producto: 'Tarjeta Clásica', saldoReal: 3200, saldoCapital: 3050, pagoMinimo: 640,
        cuota: 480, diasAtraso: 25, cuotasAtraso: 1, mora: 40,
        estadoAsignacion: 'Asignado', tipoAsignacion: 'Tarjeta Mora 1', porcentajeComision: 8,
      },
    ],
    intentos: [], notas: 'Cobro de campo. Cliente con mora en dos bancos; cada banco con su comisión.',
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
  {
    id: 'SVC-014', tipo: 'verificacion', estado: 'pendiente', subtiposVerificacion: ['domiciliar', 'laboral'],
    cliente: {
      nombre: 'Byron Castañeda', telefono: '5514-6767',
      direccion: '15 Av. 9-12, Col. Primavera', zona: 'Zona 7',
      trabajo: 'Venta de ropa', direccionLaboral: 'Mercado La Terminal, local 210', zonaLaboral: 'Zona 4',
    },
    deudaTotal: 0, montoGestion: 550, comisionPct: 0, comisionCalculada: 550,
    gestorId: null, gestorNombre: 'Sin asignar',
    fechaAsignacion: '2025-06-24 14:00', fechaLimite: '2025-06-25 12:00',
    intentos: [], notas: 'Verificación domiciliar Y laboral: la casa y el negocio están en zonas distintas.',
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

/** Servicios ya ACEPTADOS por un gestor (en curso: aceptado o en_sitio). */
export function serviciosDeGestor(gestorId: string): Servicio[] {
  return SERVICIOS_MOCK.filter((s) => s.gestorId === gestorId && s.estado === 'activo');
}

export function servicioPorId(id: string): Servicio | undefined {
  return SERVICIOS_MOCK.find((s) => s.id === id);
}

/**
 * ACEPTAR un servicio: lo asigna al gestor y lo pone en fase 'aceptado'.
 * OJO: aceptar NO permite completar todavía; primero hay que llegar al lugar
 * (marcarEnSitio). Prototipo: muta el arreglo en memoria.
 * TODO: reemplazar por POST /servicios/:id/aceptar
 */
export function aceptarServicio(id: string, gestorId: string, gestorNombre: string): Servicio | undefined {
  const s = SERVICIOS_MOCK.find((x) => x.id === id);
  if (s && s.estado === 'pendiente' && s.gestorId === null) {
    s.estado = 'activo';
    s.gestorId = gestorId;
    s.gestorNombre = gestorNombre;
    s.fase = 'aceptado';
  }
  return s;
}

/**
 * Confirmar que el gestor LLEGÓ a la ubicación → desbloquea el formulario.
 * TODO: validar contra GPS real (cliente.coordenadas) en producción.
 */
export function marcarEnSitio(id: string): Servicio | undefined {
  const s = SERVICIOS_MOCK.find((x) => x.id === id);
  if (s && s.estado === 'activo') s.fase = 'en_sitio';
  return s;
}

/**
 * COMPLETAR el servicio con un estado final. Opcionalmente actualiza los datos
 * del cliente (si el gestor los corrigió en el lugar) y agrega una nota de
 * cierre (convenio, negativa a pagar, comentario, etc.).
 */
export function completarServicio(
  id: string,
  estadoFinal: EstadoServicio = 'completado',
  extra?: { notaGestor?: string; clienteActualizado?: Partial<Cliente> },
): Servicio | undefined {
  const s = SERVICIOS_MOCK.find((x) => x.id === id);
  if (s) {
    s.estado = estadoFinal;
    s.fase = undefined;
    if (extra?.clienteActualizado) {
      const limpio: Partial<Cliente> = {};
      (Object.keys(extra.clienteActualizado) as (keyof Cliente)[]).forEach((k) => {
        const v = extra.clienteActualizado![k];
        if (v !== undefined && v !== '') (limpio as any)[k] = v;
      });
      s.cliente = { ...s.cliente, ...limpio };
    }
    if (extra?.notaGestor && extra.notaGestor.trim()) {
      s.notas = s.notas ? `${s.notas}\n— ${extra.notaGestor.trim()}` : extra.notaGestor.trim();
    }
  }
  return s;
}

// ─── Verificación por partes (domiciliar y laboral independientes) ───────────
// Cada parte tiene su propia ubicación y su propio candado, porque la casa y
// el trabajo pueden estar en lugares distintos. La verificación se marca como
// completada solo cuando TODAS sus partes están completas.
type ProgresoParte = { enSitio: boolean; completado: boolean; dictamen?: string };
const PROGRESO_PARTES: Record<string, ProgresoParte> = {};
const claveParte = (id: string, sub: SubtipoVerificacion) => `${id}::${sub}`;

/** Partes (subtipos) requeridas por una verificación. */
export function partesVerificacion(servicio: Servicio): SubtipoVerificacion[] {
  if (servicio.subtiposVerificacion && servicio.subtiposVerificacion.length > 0) return servicio.subtiposVerificacion;
  if (servicio.subtipoVerificacion) return [servicio.subtipoVerificacion];
  return ['domiciliar'];
}

/** Ubicación de una parte: la laboral puede diferir de la domiciliar. */
export function ubicacionParte(servicio: Servicio, sub: SubtipoVerificacion): { direccion: string; zona: string } {
  const c = servicio.cliente;
  if (sub === 'laboral') {
    return { direccion: c.direccionLaboral ?? c.trabajo ?? c.direccion, zona: c.zonaLaboral ?? c.zona };
  }
  return { direccion: c.direccion, zona: c.zona };
}

export function estadoParte(id: string, sub: SubtipoVerificacion): ProgresoParte {
  return PROGRESO_PARTES[claveParte(id, sub)] ?? { enSitio: false, completado: false };
}

export function marcarEnSitioParte(id: string, sub: SubtipoVerificacion): void {
  const k = claveParte(id, sub);
  PROGRESO_PARTES[k] = { ...(PROGRESO_PARTES[k] ?? { enSitio: false, completado: false }), enSitio: true };
}

/** Progreso de una verificación: cuántas partes están completas. */
export function progresoVerificacion(id: string): { total: number; hechas: number } {
  const s = SERVICIOS_MOCK.find((x) => x.id === id);
  if (!s) return { total: 0, hechas: 0 };
  const reqs = partesVerificacion(s);
  return { total: reqs.length, hechas: reqs.filter((r) => estadoParte(id, r).completado).length };
}

/**
 * Completar UNA parte de la verificación. Guarda datos del cliente y nota (con
 * etiqueta de la parte). Cuando TODAS las partes están completas, marca el
 * servicio como 'completado'.
 */
export function completarParte(
  id: string,
  sub: SubtipoVerificacion,
  extra?: { notaGestor?: string; clienteActualizado?: Partial<Cliente>; dictamen?: string },
): { completoTodo: boolean } {
  PROGRESO_PARTES[claveParte(id, sub)] = { enSitio: true, completado: true, dictamen: extra?.dictamen };
  const s = SERVICIOS_MOCK.find((x) => x.id === id);
  if (!s) return { completoTodo: false };

  if (extra?.clienteActualizado) {
    const limpio: Partial<Cliente> = {};
    (Object.keys(extra.clienteActualizado) as (keyof Cliente)[]).forEach((k) => {
      const v = extra.clienteActualizado![k];
      if (v !== undefined && v !== '') (limpio as any)[k] = v;
    });
    s.cliente = { ...s.cliente, ...limpio };
  }
  if (extra?.notaGestor && extra.notaGestor.trim()) {
    const etiqueta = sub === 'laboral' ? 'Laboral' : 'Domiciliar';
    const linea = `[${etiqueta}] ${extra.notaGestor.trim()}`;
    s.notas = s.notas ? `${s.notas}\n— ${linea}` : linea;
  }

  const reqs = partesVerificacion(s);
  const completoTodo = reqs.every((r) => estadoParte(id, r).completado);
  if (completoTodo) {
    s.estado = 'completado';
    s.fase = undefined;
  } else {
    s.fase = 'en_sitio';
  }
  return { completoTodo };
}

export const RESUMEN_HOY: ResumenDia = {
  totalServicios: 14,
  activos: 4,
  completados: 3,
  pendientes: 7,
  recuperadoHoy: 4850,
  comisionesGeneradas: 620,
  noLocalizados: 1,
};
