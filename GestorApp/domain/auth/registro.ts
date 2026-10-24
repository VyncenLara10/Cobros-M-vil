import { DatosRegistro } from '@/components/(auth)/tipos-registro';
import { zonaATexto } from '@/domain/aprobaciones/aprobaciones';
import { supabase, supabaseConfigurado } from '@/lib/supabase';

export interface ResultadoRegistro {
  ok: boolean;
  error?: string;
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

async function subirDocumento(userId: string, columna: string, uriLocal: string): Promise<string | null> {
  try {
    const respuesta = await fetch(uriLocal);
    const blob = await respuesta.blob();
    const extension = (blob.type?.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
    const ruta = `${userId}/${columna}.${extension}`;
    const { error } = await supabase.storage.from('documentos').upload(ruta, blob, {
      upsert: true,
      contentType: blob.type || 'image/jpeg',
    });
    if (error) {
      console.warn('[registro] no se pudo subir', columna, error.message);
      return null;
    }
    return ruta;
  } catch (e) {
    console.warn('[registro] error subiendo documento', columna, e);
    return null;
  }
}

export async function enviarRegistroReal(datos: DatosRegistro): Promise<ResultadoRegistro> {
  if (!supabaseConfigurado) {
    return { ok: false, error: 'Supabase no está configurado todavía (ver .env.example).' };
  }
  if (!datos.rol) return { ok: false, error: 'Falta seleccionar el rol.' };

  // La metadata viaja a raw_user_meta_data y el trigger `crear_perfil_nuevo_usuario`
  // la copia a public.perfiles (teléfono, zona, colegiado) al crear el perfil.
  const { data: alta, error: errorAlta } = await supabase.auth.signUp({
    email: datos.correo.trim(),
    password: datos.password,
    options: {
      data: {
        nombre: datos.nombreCompleto,
        rol: datos.rol,
        telefono: datos.telefono,
        zona: zonaATexto(datos.zonaCobertura),
        numero_colegiado: datos.numeroColegiado || null,
      },
    },
  });
  if (errorAlta) return { ok: false, error: errorAlta.message };
  if (!alta.user) return { ok: false, error: 'No se pudo crear la cuenta. Intenta de nuevo.' };

  // Si "Confirm email" está activo en Supabase, signUp NO devuelve sesión y lo
  // que sigue (subir docs + insertar la solicitud) corre sin JWT → RLS lo
  // rechaza con un error críptico. Mejor cortar aquí con un mensaje claro.
  if (!alta.session) {
    return {
      ok: false,
      error:
        'La cuenta se creó pero tu correo debe confirmarse antes de enviar la solicitud. ' +
        'Para pruebas, desactiva "Confirm email" en Supabase (Authentication → Providers → Email) y vuelve a registrarte.',
    };
  }

  const userId = alta.user.id;

  const documentos: Record<string, string | null> = {};
  await Promise.all(
    CAMPOS_DOCUMENTOS.map(async ({ campo, columna }) => {
      const uri = datos[campo] as string | null;
      documentos[columna] = uri ? await subirDocumento(userId, columna, uri) : null;
    }),
  );
  
  const { error: errorSolicitud } = await supabase.from('solicitudes_registro').insert({
    perfil_id: userId,
    rol: datos.rol,
    nombre_completo: datos.nombreCompleto,
    correo: datos.correo.trim(),
    telefono: datos.telefono,
    dpi_numero: datos.dpiNumero,
    numero_colegiado: datos.numeroColegiado || null,
    tipo_vehiculo: datos.tipoVehiculo || null,
    placa_vehiculo: datos.placaVehiculo || null,
    zona_cobertura: datos.zonaCobertura,
    banco: datos.banco,
    numero_cuenta: datos.numeroCuenta,
    nombre_titular: datos.nombreTitular,
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

  return { ok: true };
}
