/**
 * domain/servicios/servicios.ts
 * Capa de datos para servicios/clientes. Si Supabase está configurado (ver
 * lib/supabase.ts) lee/escribe en las tablas reales (public.servicios,
 * public.clientes, ...) respetando las reglas de rol en supabase/schema.sql.
 * Si NO está configurado, cae de vuelta a los mocks en memoria de data/mocks.ts
 * (modo demo), para que la app siga funcionando sin backend.
 *
 * Esto es lo único que las pantallas deben importar para leer/escribir
 * servicios — así el mismo código sirve en demo y en producción.
 */

import { buscarCliente as buscarClienteMock, ClienteDB } from '@/data/clientesMock';
import * as Mocks from '@/data/mocks';
import { supabase, supabaseConfigurado } from '@/lib/supabase';
import {
  Cliente,
  CreditoCliente,
  EstadoServicio,
  Intento,
  ProgresoParteVerificacion,
  ReferenciaContacto,
  RolGestor,
  Servicio,
  SubtipoVerificacion,
  TipoServicio,
  rolPuedeAceptar,
} from '@/types';
import type { RolApp } from '@/domain/auth/sesion';

// ─── Mapeo DB (snake_case, filas anidadas) → tipos de la app ────────────────

const SELECT_SERVICIO =
  '*, cliente:clientes(*, referencias:referencias_cliente(*)), creditos:creditos_cliente(*), intentos:intentos_servicio(*), gestor:perfiles(nombre)';

function formatearFecha(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d
    .toLocaleString('es-GT', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    .replace(',', '');
}

function mapCliente(row: any): Cliente {
  const referencias: ReferenciaContacto[] = (row?.referencias ?? []).map((r: any) => ({
    nombre: r.nombre,
    telefono: r.telefono,
    parentesco: r.parentesco ?? undefined,
  }));
  return {
    nombre: row?.nombre ?? '',
    telefono: row?.telefono ?? '',
    direccion: row?.direccion ?? '',
    zona: row?.zona ?? '',
    clienteId: row?.id,
    dpi: row?.dpi ?? undefined,
    municipio: row?.municipio ?? undefined,
    departamento: row?.departamento ?? undefined,
    trabajo: row?.trabajo ?? undefined,
    cargo: row?.cargo ?? undefined,
    salario: row?.salario != null ? Number(row.salario) : undefined,
    direccionLaboral: row?.direccion_laboral ?? undefined,
    zonaLaboral: row?.zona_laboral ?? undefined,
    referencias: referencias.length > 0 ? referencias : undefined,
  };
}

function mapCredito(row: any): CreditoCliente {
  return {
    id: row.id,
    banco: row.banco,
    numeroCredito: row.numero_credito ?? '',
    tipoCredito: row.tipo_credito ?? '',
    producto: row.producto ?? undefined,
    saldoReal: Number(row.saldo_real ?? 0),
    saldoCapital: row.saldo_capital != null ? Number(row.saldo_capital) : undefined,
    pagoMinimo: row.pago_minimo != null ? Number(row.pago_minimo) : undefined,
    cuota: row.cuota != null ? Number(row.cuota) : undefined,
    diasAtraso: row.dias_atraso ?? undefined,
    cuotasAtraso: row.cuotas_atraso ?? undefined,
    mora: row.mora != null ? Number(row.mora) : undefined,
    fechaVence: row.fecha_vence ?? undefined,
    estadoAsignacion: row.estado_asignacion ?? undefined,
    tipoAsignacion: row.tipo_asignacion ?? undefined,
    porcentajeComision: Number(row.porcentaje_comision ?? 0),
  };
}

function mapIntento(row: any): Intento {
  return {
    id: row.id,
    fecha: formatearFecha(row.fecha),
    resultado: row.resultado,
    nota: row.nota ?? '',
    geolocalizacion: row.geolocalizacion ?? undefined,
  };
}

function mapServicio(row: any): Servicio {
  return {
    id: row.id,
    tipo: row.tipo,
    estado: row.estado,
    cliente: mapCliente(row.cliente),
    deudaTotal: Number(row.deuda_total ?? 0),
    montoGestion: Number(row.monto_gestion ?? 0),
    comisionPct: Number(row.comision_pct ?? 0),
    comisionCalculada: Number(row.comision_calculada ?? 0),
    gestorId: row.gestor_id ?? null,
    gestorNombre: row.gestor?.nombre ?? (row.gestor_id ? 'Gestor asignado' : 'Sin asignar'),
    fase: row.fase ?? undefined,
    fechaAsignacion: formatearFecha(row.fecha_asignacion),
    fechaLimite: formatearFecha(row.fecha_limite),
    intentos: (row.intentos ?? []).map(mapIntento),
    notas: row.notas ?? '',
    tipoGestionLegal: row.tipo_gestion_legal ?? undefined,
    tarifaLegal: row.tarifa_legal != null ? Number(row.tarifa_legal) : undefined,
    subtiposVerificacion: row.subtipos_verificacion ?? undefined,
    creditos: (row.creditos ?? []).map(mapCredito),
    partesEstado: row.partes_estado && Object.keys(row.partes_estado).length > 0 ? row.partes_estado : undefined,
  };
}

// ─── Lecturas ────────────────────────────────────────────────────────────────

/** Solicitudes pendientes sin asignar que un gestor con ese rol puede tomar. */
export async function serviciosDisponiblesPara(rol: RolGestor): Promise<Servicio[]> {
  if (!supabaseConfigurado) return Mocks.serviciosDisponiblesPara(rol);
  const { data, error } = await supabase
    .from('servicios')
    .select(SELECT_SERVICIO)
    .is('gestor_id', null)
    .eq('estado', 'pendiente')
    .order('fecha_asignacion', { ascending: true });
  if (error) {
    console.warn('[servicios] serviciosDisponiblesPara', error.message);
    return [];
  }
  return (data ?? []).filter((r: any) => rolPuedeAceptar(rol, r.tipo)).map(mapServicio);
}

/** Servicios ya aceptados (activos) por ese gestor. */
export async function serviciosDeGestor(gestorId: string): Promise<Servicio[]> {
  if (!supabaseConfigurado) return Mocks.serviciosDeGestor(gestorId);
  const { data, error } = await supabase
    .from('servicios')
    .select(SELECT_SERVICIO)
    .eq('gestor_id', gestorId)
    .eq('estado', 'activo')
    .order('fecha_asignacion', { ascending: true });
  if (error) {
    console.warn('[servicios] serviciosDeGestor', error.message);
    return [];
  }
  return (data ?? []).map(mapServicio);
}

/** Todo el historial (cualquier estado) asignado a ese gestor. */
export async function serviciosDeGestorTodos(gestorId: string): Promise<Servicio[]> {
  if (!supabaseConfigurado) return Mocks.SERVICIOS_MOCK.filter((s) => s.gestorId === gestorId);
  const { data, error } = await supabase
    .from('servicios')
    .select(SELECT_SERVICIO)
    .eq('gestor_id', gestorId)
    .order('fecha_asignacion', { ascending: false });
  if (error) {
    console.warn('[servicios] serviciosDeGestorTodos', error.message);
    return [];
  }
  return (data ?? []).map(mapServicio);
}

/** Todos los servicios de la empresa. Solo admin (RLS lo garantiza). */
export async function serviciosTodos(): Promise<Servicio[]> {
  if (!supabaseConfigurado) return Mocks.SERVICIOS_MOCK;
  const { data, error } = await supabase
    .from('servicios')
    .select(SELECT_SERVICIO)
    .order('fecha_asignacion', { ascending: false });
  if (error) {
    console.warn('[servicios] serviciosTodos', error.message);
    return [];
  }
  return (data ?? []).map(mapServicio);
}

/**
 * Lo que le corresponde ver a UN usuario en su panel principal: admin ve todo
 * lo de la empresa; un gestor ve solo lo suyo (cualquier estado) + lo
 * pendiente elegible para su rol. Así se evita que un gestor vea servicios de
 * otros o que no le pertenecen a su tipo.
 */
export async function serviciosVisiblesPara(usuario: { id: string; rol: RolApp }): Promise<Servicio[]> {
  if (usuario.rol === 'admin') return serviciosTodos();
  const [propios, disponibles] = await Promise.all([
    serviciosDeGestorTodos(usuario.id),
    serviciosDisponiblesPara(usuario.rol),
  ]);
  const idsPropios = new Set(propios.map((s) => s.id));
  return [...propios, ...disponibles.filter((s) => !idsPropios.has(s.id))];
}

export async function servicioPorId(id: string): Promise<Servicio | undefined> {
  if (!supabaseConfigurado) {
    // .find() en mocks.ts devuelve SIEMPRE la misma referencia en memoria; se
    // copia para que React detecte el cambio cuando se refresca la pantalla
    // tras aceptar/completar una parte (si no, el useState de la screen no
    // vuelve a renderizar porque el objeto "nuevo" es === al anterior).
    const s = Mocks.servicioPorId(id);
    return s ? { ...s } : undefined;
  }
  const { data, error } = await supabase.from('servicios').select(SELECT_SERVICIO).eq('id', id).maybeSingle();
  if (error || !data) return undefined;
  return mapServicio(data);
}

// ─── Búsqueda de cliente (para vincular uno existente al crear una solicitud) ─

export interface ClienteBusqueda {
  id: string;
  nombre: string;
  telefono: string;
  direccion: string;
  municipio: string;
  zona: string;
  dpi?: string;
  deudaTotal?: number;
}

function mapClienteMock(c: ClienteDB): ClienteBusqueda {
  return {
    id: c.id,
    nombre: `${c.nombre} ${c.apellido}`.trim(),
    telefono: c.telefono,
    direccion: c.direccion,
    municipio: c.municipio,
    zona: c.zona,
    dpi: c.dpi,
    deudaTotal: c.deudaTotal,
  };
}

export async function buscarClienteDB(query: string): Promise<ClienteBusqueda[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  if (!supabaseConfigurado) return buscarClienteMock(q).map(mapClienteMock);

  const { data, error } = await supabase
    .from('clientes')
    .select('id, nombre, telefono, direccion, municipio, zona, dpi')
    .or(`nombre.ilike.%${q}%,dpi.ilike.%${q}%`)
    .limit(20);
  if (error) {
    console.warn('[servicios] buscarClienteDB', error.message);
    return [];
  }
  return (data ?? []).map((c) => ({
    id: c.id,
    nombre: c.nombre,
    telefono: c.telefono ?? '',
    direccion: c.direccion ?? '',
    municipio: c.municipio ?? '',
    zona: c.zona ?? '',
    dpi: c.dpi ?? undefined,
  }));
}

// ─── Crear una solicitud nueva ───────────────────────────────────────────────

export interface NuevoServicioInput {
  tipo: TipoServicio;
  cliente: {
    clienteId?: string; // si ya viene vinculado desde el buscador
    nombre: string;
    apellido?: string;
    dpi?: string;
    telefono?: string;
    direccion: string;
    colonia?: string;
    municipio: string;
    referencia?: string;
  };
  deudaTotal?: number;
  comisionPct?: number;
  notas?: string;
  tipoGestionLegal?: string;
  tarifaLegal?: number;
  subtiposVerificacion?: SubtipoVerificacion[];
  ubicacion?: { lat: number; lng: number };
}

export async function crearServicio(input: NuevoServicioInput): Promise<{ ok: boolean; error?: string }> {
  if (!supabaseConfigurado) return { ok: true }; // modo demo: nada que persistir

  try {
    let clienteId = input.cliente.clienteId;

    if (!clienteId) {
      const nombreCompleto = [input.cliente.nombre, input.cliente.apellido].filter(Boolean).join(' ').trim();
      const { data: cli, error: errCli } = await supabase
        .from('clientes')
        .insert({
          nombre: nombreCompleto || 'Cliente',
          telefono: input.cliente.telefono || null,
          direccion: input.cliente.direccion,
          zona: input.cliente.colonia || null,
          dpi: input.cliente.dpi || null,
          municipio: input.cliente.municipio,
          lat: input.ubicacion?.lat ?? null,
          lng: input.ubicacion?.lng ?? null,
        })
        .select('id')
        .single();
      if (errCli || !cli) return { ok: false, error: errCli?.message ?? 'No se pudo crear el cliente' };
      clienteId = cli.id;
    } else if (input.ubicacion) {
      await supabase
        .from('clientes')
        .update({ lat: input.ubicacion.lat, lng: input.ubicacion.lng })
        .eq('id', clienteId);
    }

    const deudaTotal = input.deudaTotal ?? 0;
    const comisionPct = input.comisionPct ?? 0;
    const comisionMax = deudaTotal > 0 ? Math.round(deudaTotal * (comisionPct / 100) * 100) / 100 : 0;
    const notasFinal = [input.notas, input.cliente.referencia ? `Referencia de ubicación: ${input.cliente.referencia}` : '']
      .filter(Boolean)
      .join('\n');

    const { data: svc, error: errSvc } = await supabase
      .from('servicios')
      .insert({
        tipo: input.tipo,
        cliente_id: clienteId,
        deuda_total: deudaTotal,
        monto_gestion: input.tipo === 'legal' ? input.tarifaLegal ?? 0 : comisionMax,
        comision_pct: comisionPct,
        comision_calculada: comisionMax,
        subtipos_verificacion: input.tipo === 'verificacion' ? input.subtiposVerificacion ?? ['domiciliar'] : null,
        tipo_gestion_legal: input.tipoGestionLegal ?? null,
        tarifa_legal: input.tarifaLegal ?? null,
        notas: notasFinal || null,
      })
      .select('id')
      .single();
    if (errSvc || !svc) return { ok: false, error: errSvc?.message ?? 'No se pudo crear el servicio' };

    if (input.tipo === 'cobro' && deudaTotal > 0) {
      const { error: errCred } = await supabase.from('creditos_cliente').insert({
        servicio_id: svc.id,
        banco: input.cliente.clienteId ? 'Cuenta vinculada' : 'Cobro directo',
        saldo_real: deudaTotal,
        porcentaje_comision: comisionPct,
      });
      if (errCred) console.warn('[servicios] crearServicio creditos_cliente', errCred.message);
    }

    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? 'Error de conexión con la base de datos' };
  }
}

// ─── Aceptar / avanzar / completar ───────────────────────────────────────────

/** Reclama un servicio pendiente. Falla con un mensaje claro si ya lo tomó otro gestor. */
export async function aceptarServicio(
  servicioId: string,
  gestorId: string,
  gestorNombre: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!supabaseConfigurado) {
    Mocks.aceptarServicio(servicioId, gestorId, gestorNombre);
    return { ok: true };
  }
  const { data, error } = await supabase
    .from('servicios')
    .update({ estado: 'activo', gestor_id: gestorId, fase: 'aceptado' })
    .eq('id', servicioId)
    .eq('estado', 'pendiente')
    .is('gestor_id', null)
    .select('id')
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: 'Este servicio ya fue tomado por otro gestor.' };
  return { ok: true };
}

export async function marcarEnSitio(servicioId: string): Promise<void> {
  if (!supabaseConfigurado) {
    Mocks.marcarEnSitio(servicioId);
    return;
  }
  const { error } = await supabase.from('servicios').update({ fase: 'en_sitio' }).eq('id', servicioId);
  if (error) console.warn('[servicios] marcarEnSitio', error.message);
}

function patchCliente(cambios?: Partial<Cliente>): Record<string, any> {
  const patch: Record<string, any> = {};
  if (!cambios) return patch;
  if (cambios.nombre) patch.nombre = cambios.nombre;
  if (cambios.telefono) patch.telefono = cambios.telefono;
  if (cambios.direccion) patch.direccion = cambios.direccion;
  if (cambios.zona) patch.zona = cambios.zona;
  if (cambios.direccionLaboral) patch.direccion_laboral = cambios.direccionLaboral;
  if (cambios.zonaLaboral) patch.zona_laboral = cambios.zonaLaboral;
  return patch;
}

export async function completarServicio(
  servicio: Servicio,
  estadoFinal: EstadoServicio = 'completado',
  extra?: { notaGestor?: string; clienteActualizado?: Partial<Cliente> },
): Promise<void> {
  if (!supabaseConfigurado) {
    Mocks.completarServicio(servicio.id, estadoFinal, extra);
    return;
  }

  const notaGestor = extra?.notaGestor?.trim();
  const notasFinal = notaGestor ? (servicio.notas ? `${servicio.notas}\n— ${notaGestor}` : notaGestor) : servicio.notas;

  const { error } = await supabase
    .from('servicios')
    .update({ estado: estadoFinal, fase: null, notas: notasFinal })
    .eq('id', servicio.id);
  if (error) console.warn('[servicios] completarServicio', error.message);

  const patch = patchCliente(extra?.clienteActualizado);
  if (Object.keys(patch).length > 0 && servicio.cliente.clienteId) {
    const { error: errCli } = await supabase.from('clientes').update(patch).eq('id', servicio.cliente.clienteId);
    if (errCli) console.warn('[servicios] completarServicio cliente', errCli.message);
  }
}

// ─── Verificación por partes (domiciliar / laboral independientes) ─────────
// Las funciones puras (qué partes requiere, dónde queda cada una) no dependen
// del origen de datos: se reexportan tal cual desde los mocks.
export const partesVerificacion = Mocks.partesVerificacion;
export const ubicacionParte = Mocks.ubicacionParte;

/** Progreso de una parte. En modo demo viene del mapa en memoria de mocks.ts;
 *  en modo BD viene directo del `servicio` ya cargado (columna partes_estado). */
export function estadoParte(servicio: Servicio, sub: SubtipoVerificacion): ProgresoParteVerificacion {
  if (!supabaseConfigurado) return Mocks.estadoParte(servicio.id, sub);
  return servicio.partesEstado?.[sub] ?? { enSitio: false, completado: false };
}

export async function marcarEnSitioParte(servicio: Servicio, sub: SubtipoVerificacion): Promise<void> {
  if (!supabaseConfigurado) {
    Mocks.marcarEnSitioParte(servicio.id, sub);
    return;
  }
  const actual = servicio.partesEstado ?? {};
  const nuevo = { ...actual, [sub]: { ...(actual[sub] ?? { enSitio: false, completado: false }), enSitio: true } };
  const { error } = await supabase.from('servicios').update({ partes_estado: nuevo }).eq('id', servicio.id);
  if (error) console.warn('[servicios] marcarEnSitioParte', error.message);
}

export async function completarParte(
  servicio: Servicio,
  sub: SubtipoVerificacion,
  extra?: { notaGestor?: string; clienteActualizado?: Partial<Cliente>; dictamen?: string },
): Promise<{ completoTodo: boolean }> {
  if (!supabaseConfigurado) return Mocks.completarParte(servicio.id, sub, extra);

  const actual = servicio.partesEstado ?? {};
  const nuevo = { ...actual, [sub]: { enSitio: true, completado: true, dictamen: extra?.dictamen } };
  const reqs = partesVerificacion(servicio);
  const completoTodo = reqs.every((r) => nuevo[r]?.completado);

  const notaGestor = extra?.notaGestor?.trim();
  const notasFinal = notaGestor
    ? (() => {
        const etiqueta = sub === 'laboral' ? 'Laboral' : 'Domiciliar';
        const linea = `[${etiqueta}] ${notaGestor}`;
        return servicio.notas ? `${servicio.notas}\n— ${linea}` : linea;
      })()
    : servicio.notas;

  const patchServicio: Record<string, any> = { partes_estado: nuevo, notas: notasFinal };
  if (completoTodo) {
    patchServicio.estado = 'completado';
    patchServicio.fase = null;
  } else {
    patchServicio.fase = 'en_sitio';
  }

  const { error } = await supabase.from('servicios').update(patchServicio).eq('id', servicio.id);
  if (error) console.warn('[servicios] completarParte', error.message);

  const patch = patchCliente(extra?.clienteActualizado);
  if (Object.keys(patch).length > 0 && servicio.cliente.clienteId) {
    const { error: errCli } = await supabase.from('clientes').update(patch).eq('id', servicio.cliente.clienteId);
    if (errCli) console.warn('[servicios] completarParte cliente', errCli.message);
  }

  return { completoTodo };
}
