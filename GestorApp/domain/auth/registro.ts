import { DatosRegistro, datosRegistroVacios } from '@/components/(auth)/tipos-registro';
import { zonaATexto } from '@/domain/aprobaciones/aprobaciones';
import { guardarBorradorRegistro, borrarBorradorRegistro, leerBorradorRegistro } from '@/domain/auth/borradorRegistro';
import { File } from 'expo-file-system';
import { supabase, supabaseConfigurado } from '@/lib/supabase';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

export interface ResultadoRegistro {
  ok: boolean;
  error?: string;
  requiereConfirmarCorreo?: boolean;
}

const CAMPOS_DOCUMENTOS: { campo: keyof DatosRegistro; columna: string }[] = [
  { campo: 'fotoPerfilUri', columna: 'doc_foto_perfil' },
  { campo: 'dpiFrenteUri', columna: 'doc_dpi_frente' },
  { campo: 'dpiReversoUri', columna: 'doc_dpi_reverso' },
  { campo: 'antecedentesPenalesUri', columna: 'doc_antecedentes_penales' },
  { campo: 'licenciaUri', columna: 'doc_licencia' },
  { campo: 'tarjetaCirculacionUri', columna: 'doc_tarjeta_circulacion' },
  { campo: 'fotoVehiculoUri', columna: 'doc_foto_vehiculo' },
  { campo: 'carneColegiadoUri', columna: 'doc_carne_colegiado' },
];

async function subirDocumento(userId: string, columna: string, uriLocal: string): Promise<string> {
  let bytes: ArrayBuffer;
  if (Platform.OS === 'web') {
    const response = await fetch(uriLocal);
    if (!response.ok) throw new Error('No se pudo leer ' + columna);
    bytes = await response.arrayBuffer();
  } else {
    const archivo = new File(uriLocal);
    if (!archivo.exists) throw new Error('No se encontró la foto ' + columna);
    bytes = await archivo.arrayBuffer();
  }
  if (bytes.byteLength < 100 || bytes.byteLength > 8 * 1024 * 1024) {
    throw new Error('El archivo ' + columna + ' debe pesar entre 100 bytes y 8 MB.');
  }
  const extension = uriLocal.toLowerCase().endsWith('.png') ? 'png' : 'jpg';
  const mime = extension === 'png' ? 'image/png' : 'image/jpeg';
  const ruta = userId + '/' + columna + '_' + Date.now() + '_' + Math.floor(Math.random() * 100000) + '.' + extension;
  const { error } = await supabase.storage.from('documentos').upload(ruta, bytes,
    { upsert: false, contentType: mime });
  if (error) throw new Error('No se pudo subir ' + columna + ': ' + error.message);
  return ruta;
}

export async function enviarRegistroReal(datos: DatosRegistro): Promise<ResultadoRegistro> {
  if (!supabaseConfigurado) {
    return { ok: false, error: 'Supabase no está configurado todavía (ver .env.example).' };
  }
  if (!datos.rol) return { ok: false, error: 'Falta seleccionar el rol.' };

  // Antes del alta, no permitir perfiles huérfanos por fotografías incompletas.
  // Se requieren todas las fotos del rol para poder conservarlas localmente.
  const requeridos = datos.rol === 'abogado'
    ? ['fotoPerfilUri', 'dpiFrenteUri', 'dpiReversoUri', 'antecedentesPenalesUri', 'carneColegiadoUri']
    : ['fotoPerfilUri', 'dpiFrenteUri', 'dpiReversoUri', 'antecedentesPenalesUri',
       'licenciaUri', 'tarjetaCirculacionUri', 'fotoVehiculoUri'];
  for (const campo of requeridos) {
    if (!datos[campo as keyof DatosRegistro]) {
      return { ok: false, error: 'Falta una fotografía o documento obligatorio: ' + campo };
    }
  }

  const correo = datos.correo.trim().toLowerCase();
  // Si el email ya fue confirmado y el candidato inició sesión, NO hacer
  // signUp otra vez. Así se recuperan altas que dejaron un perfil inactivo
  // pero todavía no crearon solicitudes_registro.
  const { data: actual } = await supabase.auth.getUser();
  let userId = actual.user?.id;
  if (actual.user && actual.user.email?.trim().toLowerCase() !== correo) {
    return { ok: false, error: 'El correo del formulario debe coincidir con tu sesión. Cierra sesión para registrar otro usuario.' };
  }
  if (!userId) {
    // Guardar fotos ANTES de crear la cuenta; el correo puede tardar en confirmarse.
    try { await guardarBorradorRegistro(datos); }
    catch (error) {
      return { ok: false, error: 'No se pudo conservar el registro: ' +
        (error instanceof Error ? error.message : 'Error al guardar los archivos') };
    }
    const { data: alta, error: errorAlta } = await supabase.auth.signUp({
      email: correo,
      password: datos.password,
      options: {
        // Evita el redirect predeterminado a localhost del proyecto Supabase.
        // La APK usa el esquema registrado en app.json. El método alternativo
        // por código OTP funciona incluso si el correo se abre en otra app.
        emailRedirectTo: Platform.OS === 'web'
          ? (typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined)
          : Linking.createURL('auth/callback', { scheme: 'gestorapp' }),
        data: {
          nombre: datos.nombreCompleto,
          // El rol de un trabajador no se toma de los metadatos para permisos.
          rol: datos.rol,
          telefono: datos.telefono,
          zona: zonaATexto(datos.zonaCobertura),
          numero_colegiado: datos.numeroColegiado || null,
        },
      },
    });
    if (errorAlta) return { ok: false, error: errorAlta.message };
    if (!alta.user) return { ok: false, error: 'No se pudo registrar la cuenta.' };
    if (!alta.session) return { ok: true, requiereConfirmarCorreo: true };

    userId = alta.user.id;
  }
  const borrador = await leerBorradorRegistro(correo);
  const datosFinales: DatosRegistro = borrador
    ? { ...datos, ...borrador, password: '' }
    : datos;

  // No modificar una solicitud existente ni volver a registrar candidatos.
  const { data: existente, error: buscarError } = await supabase
    .from('solicitudes_registro')
    .select('id, estado')
    .eq('perfil_id', userId)
    .limit(1)
    .maybeSingle();
  if (buscarError) return { ok: false, error: buscarError.message };
  if (existente) {
    return { ok: false, error: 'Ya existe una solicitud para esta cuenta. Consulta Estado de mi cuenta.' };
  }


  // Sin fotos obligatorias no hay solicitud lista para revisión.
  const obligatorios = datosFinales.rol === 'abogado'
    ? ['fotoPerfilUri', 'dpiFrenteUri', 'dpiReversoUri', 'antecedentesPenalesUri', 'carneColegiadoUri']
    : ['fotoPerfilUri', 'dpiFrenteUri', 'dpiReversoUri', 'antecedentesPenalesUri',
       'licenciaUri', 'tarjetaCirculacionUri', 'fotoVehiculoUri'];
  for (const campo of obligatorios) {
    if (!datosFinales[campo as keyof DatosRegistro]) {
      return { ok: false, error: 'Debes adjuntar todos los documentos obligatorios, incluido ' + campo };
    }
  }

  const documentos: Record<string, string | null> = {};
  try {
    for (const { campo, columna } of CAMPOS_DOCUMENTOS) {
      const uri = datosFinales[campo] as string | null;
      documentos[columna] = uri ? await subirDocumento(userId!, columna, uri) : null;
    }
  } catch (error) {
    // Solicitud aún NO creada; el usuario puede reintentar sin duplicar cuenta.
    return { ok: false, error: error instanceof Error ? error.message : 'No se pudo guardar la documentación.' };
  }

  const { error: errorSolicitud } = await supabase.from('solicitudes_registro').insert({
    perfil_id: userId,
    rol: datosFinales.rol,
    nombre_completo: datosFinales.nombreCompleto,
    correo: datosFinales.correo.trim(),
    telefono: datosFinales.telefono,
    dpi_numero: datosFinales.dpiNumero,
    numero_colegiado: datosFinales.numeroColegiado || null,
    tipo_vehiculo: datosFinales.tipoVehiculo || null,
    placa_vehiculo: datosFinales.placaVehiculo || null,
    zona_cobertura: datosFinales.zonaCobertura,
    banco: datosFinales.banco,
    tipo_cuenta: datosFinales.tipoCuenta,
    numero_cuenta: datosFinales.numeroCuenta,
    nombre_titular: datosFinales.nombreTitular,
    ...documentos,
  });

  if (errorSolicitud) {
    return {
      ok: false,
      error:
        `Tu cuenta se creó pero no se pudo enviar la solicitud: ${errorSolicitud.message}. ` +
        'Verifica que se haya corrido supabase/fix-registro.sql en el SQL Editor.',
    };
  }

  try { await borrarBorradorRegistro(); } catch { /* no afecta envío */ }
  return { ok: true };
}

/** Completa la solicitud ya capturada al regresar de confirmar email.
 * Evita pedir de nuevo DPI, banco y fotos, y muestra cualquier error real.
 */
export async function terminarRegistroConfirmado(): Promise<ResultadoRegistro & { sinBorrador?: boolean }> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user?.email) return { ok: false, error: 'Debes iniciar sesión primero.' };
  const borrador = await leerBorradorRegistro(data.user.email);
  if (!borrador) return { ok: false, sinBorrador: true, error: 'No hay una solicitud pendiente guardada en este dispositivo.' };
  return enviarRegistroReal({ ...datosRegistroVacios, ...borrador, password: '' });
}
