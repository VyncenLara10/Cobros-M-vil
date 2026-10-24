/**
 * domain/aprobaciones/aprobaciones.ts
 * Cola de aprobación conectada a Supabase de verdad: lee/actualiza
 * public.solicitudes_registro y, al aprobar, activa public.perfiles.activo
 * y crea la fila en public.gestores_stats. Usado por
 * app/(tabs)/aprobaciones.tsx (solo admin).
 *
 * Requiere las políticas RLS de admin (is_admin(), etc.) — ver el bloque SQL
 * nuevo al final de supabase/schema.sql.
 */

import { ZonaCobertura } from '@/components/(auth)/Coverageareapicker';
import { SolicitudRegistro } from '@/data/solicitudesRegistro';
import { notificarGestor } from '@/domain/notificaciones/notificaciones';
import { supabase } from '@/lib/supabase';

/** Aplana la zona de cobertura del registro a texto plano para perfiles.zona. */
export function zonaATexto(zona: ZonaCobertura | null | undefined): string | null {
  if (!zona || zona.length === 0) return null;
  return zona
    .map((a) => (a.zonas.length > 0 ? `${a.municipio} (${a.zonas.join(', ')})` : a.municipio))
    .join(' · ');
}

const DOC_COLUMNAS: { campo: keyof SolicitudRegistro['documentos']; columna: string }[] = [
  { campo: 'fotoPerfilUri', columna: 'doc_foto_perfil' },
  { campo: 'dpiFrenteUri', columna: 'doc_dpi_frente' },
  { campo: 'dpiReversoUri', columna: 'doc_dpi_reverso' },
  { campo: 'antecedentesPenalesUri', columna: 'doc_antecedentes_penales' },
  { campo: 'licenciaUri', columna: 'doc_licencia' },
  { campo: 'tarjetaCirculacionUri', columna: 'doc_tarjeta_circulacion' },
  { campo: 'fotoVehiculoUri', columna: 'doc_foto_vehiculo' },
  { campo: 'carneColegiadoUri', columna: 'doc_carne_colegiado' },
];

function filaASolicitud(fila: any, firmas: Map<string, string>): SolicitudRegistro {
  const documentos = {} as SolicitudRegistro['documentos'];
  DOC_COLUMNAS.forEach(({ campo, columna }) => {
    const ruta = fila[columna] as string | null;
    documentos[campo] = ruta ? firmas.get(ruta) ?? null : null;
  });

  return {
    id: fila.id,
    fecha: (fila.creado_en as string)?.slice(0, 16).replace('T', ' ') ?? '',
    estado: fila.estado,
    rol: fila.rol,
    nombreCompleto: fila.nombre_completo,
    correo: fila.correo,
    telefono: fila.telefono,
    dpiNumero: fila.dpi_numero,
    numeroColegiado: fila.numero_colegiado ?? undefined,
    tipoVehiculo: fila.tipo_vehiculo ?? undefined,
    placaVehiculo: fila.placa_vehiculo ?? undefined,
    zonaCobertura: (fila.zona_cobertura as ZonaCobertura) ?? null,
    banco: fila.banco ?? '',
    numeroCuenta: fila.numero_cuenta ?? '',
    nombreTitular: fila.nombre_titular ?? '',
    documentos,
    motivoRechazo: fila.motivo_rechazo ?? undefined,
    perfilId: fila.perfil_id ?? undefined,
  };
}

/** Trae todas las solicitudes (pendientes + resueltas) con las fotos ya firmadas para poder verlas en el modal. */
export async function cargarSolicitudesReales(): Promise<SolicitudRegistro[]> {
  const { data, error } = await supabase
    .from('solicitudes_registro')
    .select('*')
    .order('creado_en', { ascending: false });

  if (error || !data) {
    console.warn('[aprobaciones] no se pudieron cargar las solicitudes:', error?.message);
    return [];
  }

  const rutas = data.flatMap((fila) =>
    DOC_COLUMNAS.map(({ columna }) => fila[columna]).filter((v): v is string => !!v),
  );

  const firmas = new Map<string, string>();
  if (rutas.length > 0) {
    const { data: firmadas } = await supabase.storage
      .from('documentos')
      .createSignedUrls(rutas, 60 * 30); // 30 min: alcanza para revisar en el modal
    firmadas?.forEach((f) => {
      if (f.signedUrl && f.path) firmas.set(f.path, f.signedUrl);
    });
  }

  return data.map((fila) => filaASolicitud(fila, firmas));
}

/** Aprueba: marca la solicitud, activa el perfil (ya puede iniciar sesión) y crea sus estadísticas de gestor. */
export async function aprobarSolicitudReal(
  s: SolicitudRegistro,
  adminId: string,
): Promise<{ ok: boolean; error?: string }> {
  const { error: errorSolicitud } = await supabase
    .from('solicitudes_registro')
    .update({ estado: 'aprobado', revisado_por: adminId, revisado_en: new Date().toISOString() })
    .eq('id', s.id);
  if (errorSolicitud) return { ok: false, error: errorSolicitud.message };

  if (s.perfilId) {
    // activo=true desbloquea el login; zona/teléfono/colegiado copian los
    // datos del registro al perfil para que "Mi perfil" los muestre.
    const { error: errorPerfil } = await supabase
      .from('perfiles')
      .update({
        activo: true,
        zona: zonaATexto(s.zonaCobertura),
        telefono: s.telefono || null,
        numero_colegiado: s.numeroColegiado || null,
      })
      .eq('id', s.perfilId);
    if (errorPerfil) console.warn('[aprobaciones] no se pudo activar el perfil:', errorPerfil.message);

    const { error: errorStats } = await supabase
      .from('gestores_stats')
      .upsert({ perfil_id: s.perfilId }, { onConflict: 'perfil_id' });
    if (errorStats) console.warn('[aprobaciones] no se pudieron crear las estadísticas:', errorStats.message);

    await notificarGestor(
      s.perfilId,
      '✅ Solicitud aprobada',
      'Tu cuenta ya está activa. Inicia sesión para empezar a recibir servicios.',
      'solicitud_aprobada',
      s.id,
    );
  }

  return { ok: true };
}

/** Rechaza con motivo, para que el candidato sepa qué corregir. */
export async function rechazarSolicitudReal(
  s: SolicitudRegistro,
  motivo: string,
  adminId: string,
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from('solicitudes_registro')
    .update({ estado: 'rechazado', motivo_rechazo: motivo.trim(), revisado_por: adminId, revisado_en: new Date().toISOString() })
    .eq('id', s.id);
  if (error) return { ok: false, error: error.message };
  await notificarGestor(
    s.perfilId,
    '❌ Solicitud rechazada',
    motivo.trim() || 'Revisa tu solicitud con el administrador.',
    'solicitud_rechazada',
    s.id,
  );
  return { ok: true };
}