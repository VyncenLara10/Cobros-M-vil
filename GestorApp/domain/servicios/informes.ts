/**
 * domain/servicios/informes.ts
 * Informe PDF del caso (fase 6): lo genera el cliente con expo-print, verifica
 * que TODAS las fotos quedaron incrustadas en el PDF, sube el archivo, copia
 * las evidencias a la carpeta de archivo y confirma todo con una RPC del
 * servidor. Solo entonces se borran los originales (mejor esfuerzo).
 *
 * Flujo de archivado (nada se mueve antes de que la RPC confirme):
 *   1. fotos → base64 → HTML → printToFileAsync → PDF local
 *   2. verificación: nº de objetos /Subtype /Image en el PDF >= nº de fotos
 *   3. sube el PDF a `documentos/<uid>/informes/<servicioId>/…`
 *   4. copia cada evidencia a `<dueno>/archivo_evidencias/<servicioId>/…`
 *   5. RPC confirmar_informe_y_archivar valida storage + permisos y archiva
 *   6. borra los originales (best effort) y abre la hoja de compartir
 *
 * Restaurar es simétrico: primero copia de vuelta, luego la RPC, y recién
 * después borra la copia de archivo. No hay purga automática en ningún lado.
 */

import { supabase, supabaseConfigurado } from '@/lib/supabase';
import { ESTADO_LABEL, Servicio, TIPO_SERVICIO_LABEL } from '@/types';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { cargarEvidencias, EvidenciaServicio } from '@/domain/servicios/evidencias';

export interface ResultadoInforme {
  ok: boolean;
  error?: string;
  uri?: string;
}

const BUCKET = 'documentos';

// ─── Utilidades de bytes ─────────────────────────────────────────────────────

/** Lee un archivo local (file://) o remoto (https/blob:) como bytes. */
async function bytesDeUri(uri: string): Promise<Uint8Array> {
  if (Platform.OS === 'web') {
    const res = await fetch(uri);
    if (!res.ok) throw new Error(`HTTP ${res.status} al leer ${uri.slice(0, 60)}`);
    return new Uint8Array(await res.arrayBuffer());
  }
  const { File } = await import('expo-file-system');
  return await new File(uri).bytes();
}

/** Descarga una URL y devuelve sus bytes (nativo: file-system; web: fetch). */
async function bytesDeUrl(url: string): Promise<Uint8Array> {
  if (Platform.OS === 'web') {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} al descargar`);
    return new Uint8Array(await res.arrayBuffer());
  }
  const { File, Paths } = await import('expo-file-system');
  const destino = new File(
    Paths.cache,
    `dl-${Date.now()}-${Math.random().toString(36).slice(2)}.tmp`,
  );
  const descargado = await File.downloadFileAsync(url, destino, { idempotent: true });
  try {
    return await descargado.bytes();
  } finally {
    try {
      descargado.delete();
    } catch {
      // el cache lo limpia el sistema
    }
  }
}

/** base64 de una imagen para incrustarla en el HTML (solo web usa btoa). */
async function base64DeImagen(url: string): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      const bytes = await bytesDeUrl(url);
      let bin = '';
      const tam = 0x8000;
      for (let i = 0; i < bytes.length; i += tam) {
        bin += String.fromCharCode(...bytes.subarray(i, i + tam));
      }
      return (globalThis as any).btoa(bin);
    }
    const { File, Paths } = await import('expo-file-system');
    const destino = new File(
      Paths.cache,
      `inf-${Date.now()}-${Math.random().toString(36).slice(2)}.img`,
    );
    const descargado = await File.downloadFileAsync(url, destino, { idempotent: true });
    try {
      return await descargado.base64();
    } finally {
      try {
        descargado.delete();
      } catch {
        // el cache lo limpia el sistema
      }
    }
  } catch (e) {
    console.warn('[informes] leer foto', e);
    return null;
  }
}

// ─── Verificación del PDF ────────────────────────────────────────────────────

/** ¿Hay "/Subtype /Image" (con espacios opcionales) en esta posición? */
function coincideSubtipoImagen(b: Uint8Array, i: number): boolean {
  const subtipo = [0x2f, 0x53, 0x75, 0x62, 0x74, 0x79, 0x70, 0x65]; // /Subtype
  const imagen = [0x2f, 0x49, 0x6d, 0x61, 0x67, 0x65]; // /Image
  for (let j = 0; j < subtipo.length; j++) {
    if (b[i + j] !== subtipo[j]) return false;
  }
  let k = i + subtipo.length;
  while (k < b.length && (b[k] === 0x20 || b[k] === 0x09 || b[k] === 0x0a || b[k] === 0x0d)) k++;
  for (let j = 0; j < imagen.length; j++) {
    if (b[k + j] !== imagen[j]) return false;
  }
  const c = b[k + imagen.length];
  const esLetra =
    c === undefined || !((c >= 0x41 && c <= 0x5a) || (c >= 0x61 && c <= 0x7a) || (c >= 0x30 && c <= 0x39));
  return esLetra;
}

/** Cuenta las imágenes incrustadas en un PDF (XObject /Subtype /Image). */
export function contarImagenesPdf(bytes: Uint8Array): number {
  let n = 0;
  for (let i = 0; i <= bytes.length - 8; i++) {
    if (coincideSubtipoImagen(bytes, i)) n++;
  }
  return n;
}

// ─── HTML del informe ────────────────────────────────────────────────────────

function esc(valor: string): string {
  const entidades: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return valor.replace(/[&<>"']/g, (c) => entidades[c] ?? c);
}

function fila(etiqueta: string, valor?: string | null): string {
  const texto = (valor ?? '').trim();
  if (!texto) return '';
  return `<tr><th>${esc(etiqueta)}</th><td>${esc(texto)}</td></tr>`;
}

function construirHtmlInforme(
  servicio: Servicio,
  evidencias: EvidenciaServicio[],
  fotos: string[],
): string {
  const generado = new Date().toLocaleString('es-GT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const q = (n: number) => `Q ${n.toLocaleString('es-GT')}`;

  const filasCliente = [
    fila('Nombre', servicio.cliente.nombre),
    fila('Dirección', `${servicio.cliente.direccion} · ${servicio.cliente.zona}`),
    fila('Teléfono', servicio.cliente.telefono),
    fila('Municipio', servicio.cliente.municipio),
    fila('Departamento', servicio.cliente.departamento),
  ].join('');

  const filasServicio = [
    fila('Tipo', TIPO_SERVICIO_LABEL[servicio.tipo]),
    fila('Estado', ESTADO_LABEL[servicio.estado]),
    fila('Gestor asignado', servicio.gestorNombre),
    fila('Asignado el', servicio.fechaAsignacion),
    fila('Fecha límite', servicio.fechaLimite),
    fila('Monto de gestión', q(servicio.montoGestion)),
    fila('Deuda total', servicio.tipo === 'cobro' ? q(servicio.deudaTotal) : ''),
    fila('Comisión', servicio.tipo === 'cobro' ? `${servicio.comisionPct}%` : ''),
    fila('Tipo de gestión', servicio.tipoGestionLegal),
    fila('Tarifa legal', servicio.tarifaLegal ? q(servicio.tarifaLegal) : ''),
    fila('Notas', servicio.notas),
  ].join('');

  const filasIntento = servicio.intentos
    .map(
      (i) =>
        `<tr><td>${esc(i.resultado)}</td><td>${esc(i.fecha)}</td><td>${esc(i.nota)}</td></tr>`,
    )
    .join('');

  const figuras = evidencias
    .map(
      (ev, i) =>
        `<figure class="foto"><img src="data:image/jpeg;base64,${fotos[i]}" alt="${esc(
          ev.titulo,
        )}" /><figcaption>${esc(ev.titulo)} · ${esc(ev.fecha)}</figcaption></figure>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Informe · ${esc(servicio.cliente.nombre)}</title>
<style>
  @page { margin: 18mm 14mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Roboto, Helvetica, Arial, sans-serif;
         color: #1c1c1e; font-size: 12px; line-height: 1.45; margin: 0; }
  header { border-bottom: 2px solid #2f6fed; padding-bottom: 8px; margin-bottom: 14px; }
  h1 { font-size: 18px; margin: 0 0 2px; color: #2f6fed; }
  .sub { color: #6b7280; font-size: 11px; }
  h2 { font-size: 13px; margin: 16px 0 6px; text-transform: uppercase;
       letter-spacing: 0.4px; color: #374151; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
  th, td { text-align: left; padding: 5px 8px; border-bottom: 1px solid #e5e7eb;
           vertical-align: top; }
  th { width: 34%; color: #6b7280; font-weight: 600; background: #f9fafb; }
  .intentos td { border-bottom: 1px solid #e5e7eb; }
  .intentos thead td { font-weight: 700; background: #f9fafb; border-bottom: 1px solid #d1d5db; }
  .galeria { display: flex; flex-wrap: wrap; gap: 10px; }
  .foto { width: 48%; margin: 0; break-inside: avoid; page-break-inside: avoid; }
  .foto img { width: 100%; height: auto; border: 1px solid #d1d5db; border-radius: 4px; }
  .foto figcaption { font-size: 10px; color: #6b7280; margin-top: 3px; }
  footer { margin-top: 18px; padding-top: 8px; border-top: 1px solid #e5e7eb;
           font-size: 10px; color: #9ca3af; }
</style>
</head>
<body>
<header>
  <h1>Informe de caso</h1>
  <div class="sub">GestorApp · generado el ${generado}</div>
</header>

<h2>Datos del cliente</h2>
<table>${filasCliente}</table>

<h2>Datos del servicio</h2>
<table>${filasServicio}</table>

${
  servicio.intentos.length
    ? `<h2>Historial de intentos (${servicio.intentos.length})</h2>
<table class="intentos">
  <thead><tr><td>Resultado</td><td>Fecha</td><td>Nota</td></tr></thead>
  <tbody>${filasIntento}</tbody>
</table>`
    : ''
}

<h2>Evidencias (${evidencias.length})</h2>
<div class="galeria">${figuras}</div>

<footer>
  Documento generado por GestorApp. Las evidencias de este informe quedaron
  archivadas en el expediente del servicio.
</footer>
</body>
</html>`;
}

// ─── Copia de archivos en storage ────────────────────────────────────────────

/** Copia un objeto del bucket a otra ruta. Idempotente: si el destino ya
 *  existe (reintento tras un fallo parcial) se toma como éxito. */
async function copiarObjeto(origen: string, destino: string): Promise<boolean> {
  try {
    const { data: signed, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(origen, 60 * 60);
    if (error || !signed?.signedUrl) {
      console.warn('[informes] URL firmada', error?.message);
      return false;
    }
    const bytes = await bytesDeUrl(signed.signedUrl);
    const { error: errSubir } = await supabase.storage
      .from(BUCKET)
      .upload(destino, bytes, { contentType: 'image/jpeg', upsert: false });
    if (errSubir && !/already exists/i.test(errSubir.message)) {
      console.warn('[informes] copiar', errSubir.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('[informes] copiar', e);
    return false;
  }
}

/** Borra rutas del bucket sin fallar la operación principal. */
function borrarEnBloque(rutas: string[]): void {
  if (rutas.length === 0) return;
  supabase.storage
    .from(BUCKET)
    .remove(rutas)
    .then(({ error }) => {
      if (error) console.warn('[informes] borrar originales', error.message);
    })
    .catch((e) => console.warn('[informes] borrar originales', e));
}

// ─── Operación principal ─────────────────────────────────────────────────────

export async function generarInformeYArchivar(servicio: Servicio): Promise<ResultadoInforme> {
  if (!supabaseConfigurado) {
    return { ok: false, error: 'Supabase no está configurado en esta app.' };
  }
  try {
    const usuario = await supabase.auth.getUser();
    const uid = usuario.data.user?.id;
    if (!uid) return { ok: false, error: 'Sesión expirada, vuelve a entrar.' };

    const evidencias = await cargarEvidencias(servicio.id);
    if (evidencias.length === 0) {
      return { ok: false, error: 'Este servicio no tiene evidencias activas que archivar.' };
    }

    // 1) Fotos en base64 (todas: si una falla, no se genera el informe).
    const fotos: string[] = [];
    for (const ev of evidencias) {
      const b64 = await base64DeImagen(ev.url);
      if (!b64) {
        return {
          ok: false,
          error: `No se pudo leer la foto "${ev.titulo}" (${fotos.length} de ${evidencias.length}).`,
        };
      }
      fotos.push(b64);
    }

    // 2) HTML → PDF local.
    const html = construirHtmlInforme(servicio, evidencias, fotos);
    const { uri } = await Print.printToFileAsync({
      html,
      margins: { top: 36, bottom: 36, left: 32, right: 32 },
    });

    // 3) Verificación de integridad: todas las fotos quedaron incrustadas.
    const bytesPdf = await bytesDeUri(uri);
    const incrustadas = contarImagenesPdf(bytesPdf);
    if (incrustadas < evidencias.length) {
      return {
        ok: false,
        error: `El PDF salió incompleto: ${incrustadas} de ${evidencias.length} fotos incrustadas. Intenta de nuevo.`,
      };
    }

    // 4) Sube el PDF al bucket.
    const rutaPdf = `${uid}/informes/${servicio.id}/informe-${Date.now()}.pdf`;
    const { error: errPdf } = await supabase.storage
      .from(BUCKET)
      .upload(rutaPdf, bytesPdf, { contentType: 'application/pdf', upsert: true });
    if (errPdf) return { ok: false, error: `No se pudo subir el PDF: ${errPdf.message}` };

    // 5) Copia cada evidencia a la carpeta de archivo (sin borrar nada aún).
    const mapeo: { original: string; archivo: string }[] = [];
    for (const ev of evidencias) {
      const dueno = ev.ruta.split('/')[0];
      const nombre = ev.ruta.split('/').pop();
      const destino = `${dueno}/archivo_evidencias/${servicio.id}/${nombre}`;
      const listo = await copiarObjeto(ev.ruta, destino);
      if (!listo) {
        return {
          ok: false,
          error: `No se pudo copiar la evidencia "${ev.titulo}" al archivo.`,
        };
      }
      mapeo.push({ original: ev.ruta, archivo: destino });
    }

    // 6) La RPC valida storage/permisos, registra el informe y archiva.
    const { data: informeId, error: errRpc } = await supabase.rpc(
      'confirmar_informe_y_archivar',
      { p_servicio: servicio.id, p_ruta_pdf: rutaPdf, p_archivos: mapeo },
    );
    if (errRpc) return { ok: false, error: errRpc.message };

    // 7) Solo ahora se borran los originales (mejor esfuerzo).
    borrarEnBloque(evidencias.map((e) => e.ruta));

    // 8) Hoja de compartir para guardar/imprimir/enviar el PDF.
    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Informe del caso',
          UTI: 'com.adobe.pdf',
        });
      }
    } catch (e) {
      console.warn('[informes] compartir', e);
    }

    return { ok: true, uri, ...(typeof informeId === 'string' ? { informeId } : {}) };
  } catch (e: any) {
    console.warn('[informes] generar', e);
    return { ok: false, error: e?.message ?? 'Error desconocido al generar el informe.' };
  }
}

/** Nº de evidencias ya archivadas de un servicio (para ofrecer restaurar). */
export async function contarEvidenciasArchivadas(servicioId: string): Promise<number> {
  if (!supabaseConfigurado) return 0;
  const { count, error } = await supabase
    .from('evidencias_servicio')
    .select('id', { count: 'exact', head: true })
    .eq('servicio_id', servicioId)
    .eq('estado', 'archivada');
  if (error) {
    console.warn('[informes] contar archivadas', error.message);
    return 0;
  }
  return count ?? 0;
}

/** Devuelve a 'activa' todo lo archivado: primero copia los archivos de
 *  vuelta, luego confirma con la RPC y recién entonces borra las copias. */
export async function restaurarEvidencias(
  servicioId: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!supabaseConfigurado) {
    return { ok: false, error: 'Supabase no está configurado en esta app.' };
  }
  try {
    const { data: filas, error } = await supabase
      .from('evidencias_servicio')
      .select('ruta_storage, ruta_archivo')
      .eq('servicio_id', servicioId)
      .eq('estado', 'archivada');
    if (error) return { ok: false, error: error.message };

    const pendientes = (filas ?? []).filter((f: any) => f.ruta_archivo);
    for (const f of pendientes as any[]) {
      const listo = await copiarObjeto(f.ruta_archivo, f.ruta_storage);
      if (!listo) {
        return {
          ok: false,
          error: 'No se pudo devolver un archivo desde el archivo de evidencias.',
        };
      }
    }

    const { error: errRpc } = await supabase.rpc('restaurar_evidencias', {
      p_servicio: servicioId,
    });
    if (errRpc) return { ok: false, error: errRpc.message };

    borrarEnBloque((pendientes as any[]).map((f) => f.ruta_archivo));
    return { ok: true };
  } catch (e: any) {
    console.warn('[informes] restaurar', e);
    return { ok: false, error: e?.message ?? 'Error desconocido al restaurar.' };
  }
}
