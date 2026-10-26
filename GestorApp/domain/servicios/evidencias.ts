/**
 * domain/servicios/evidencias.ts
 * Sube y lee las fotos/evidencias que los gestores adjuntan al completar un
 * servicio (verificación y legal).
 *
 * - El archivo vive en el bucket PRIVADO "documentos", dentro de la carpeta
 *   del gestor: `documentos/<uid>/evidencias/<servicioId>/<clave>-<ts>.jpg`
 *   (así reutiliza las políticas de storage existentes: cada quien sube y ve
 *   lo suyo, el admin ve todo).
 * - El registro (clave + ruta) queda en public.evidencias_servicio para
 *   mostrarlo en el detalle del servicio.
 * - En React Native, supabase-js solo sube bien desde bytes (Blob/FormData
 *   no funcionan como se espera): por eso se lee el archivo con
 *   expo-file-system y se manda un Uint8Array.
 */

import { supabase, supabaseConfigurado } from '@/lib/supabase';
import { Platform } from 'react-native';

export interface EvidenciaServicio {
  id: string;
  clave: string;
  titulo: string;
  fecha: string;
  url: string;
  /** Ruta original en el bucket (para copiar al archivar, fase 6). */
  ruta: string;
}

/** Lee los bytes de una imagen (file:// en móvil, blob:/data:/http en web). */
async function bytesDe(uri: string): Promise<Uint8Array> {
  if (Platform.OS === 'web') {
    const res = await fetch(uri);
    return new Uint8Array(await res.arrayBuffer());
  }
  const { File } = await import('expo-file-system');
  const archivo = new File(uri);
  return archivo.bytes();
}

function claveSegura(clave: string): string {
  return clave.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40) || 'foto';
}

/**
 * Sube todas las fotos de un servicio. No lanza: devuelve cuántas subieron y
 * cuántas fallaron, para que la pantalla decida si avisa.
 */
export async function subirEvidencias(
  servicioId: string,
  fotos: Record<string, string | null | undefined>,
): Promise<{ subidas: number; fallidas: number }> {
  const resultado = { subidas: 0, fallidas: 0 };
  if (!supabaseConfigurado) return resultado;

  const entradas = Object.entries(fotos).filter(([, uri]) => !!uri);
  if (entradas.length === 0) return resultado;

  const usuario = await supabase.auth.getUser();
  const uid = usuario.data.user?.id;
  if (!uid) return { ...resultado, fallidas: entradas.length };

  for (const [clave, uri] of entradas) {
    try {
      const bytes = await bytesDe(uri as string);
      const ruta = `${uid}/evidencias/${servicioId}/${claveSegura(clave)}-${Date.now()}.jpg`;
      const { error } = await supabase.storage
        .from('documentos')
        .upload(ruta, bytes, { contentType: 'image/jpeg', upsert: false });
      if (error) throw error;
      const { error: errIns } = await supabase.from('evidencias_servicio').insert({
        servicio_id: servicioId,
        clave: claveSegura(clave),
        ruta_storage: ruta,
        subido_por: uid,
      });
      if (errIns) throw errIns;
      resultado.subidas += 1;
    } catch (e) {
      console.warn('[evidencias] subir', clave, e);
      resultado.fallidas += 1;
    }
  }
  return resultado;
}

/** Historial de evidencias con URL firmada (vence en 24 h) para mostrarlas.
 *  Solo las 'activas': las archivadas (fase 6) viven en archivo_evidencias. */
export async function cargarEvidencias(servicioId: string): Promise<EvidenciaServicio[]> {
  if (!supabaseConfigurado) return [];
  const { data, error } = await supabase
    .from('evidencias_servicio')
    .select('id, clave, ruta_storage, creado_en')
    .eq('servicio_id', servicioId)
    .eq('estado', 'activa')
    .order('creado_en', { ascending: true })
    .limit(30);
  if (error) {
    console.warn('[evidencias] cargar', error.message);
    return [];
  }
  const filas = data ?? [];
  const evidencias = await Promise.all(
    filas.map(async (fila: any): Promise<EvidenciaServicio> => {
      const { data: signed } = await supabase.storage
        .from('documentos')
        .createSignedUrl(fila.ruta_storage, 60 * 60 * 24);
      return {
        id: fila.id,
        clave: fila.clave,
        titulo: fila.clave.replace(/[_-]+/g, ' '),
        fecha: new Date(fila.creado_en).toLocaleString('es-GT', {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }),
        url: signed?.signedUrl ?? '',
        ruta: fila.ruta_storage,
      };
    }),
  );
  return evidencias.filter((e) => e.url);
}
