/**
 * Registro pendiente de confirmación: se conserva LOCALMENTE, no en el servidor.
 * Datos pequeños: SecureStore (cifrado por el sistema operativo).
 * Fotografías: carpeta privada de la aplicación (no exportar, limpiar al enviar).
 * NO guarda contraseñas, tokens ni secretos. Expira en 24 h.
 * No son archivos cifrados individualmente: no usar dispositivos compartidos.
 */
import type { DatosRegistro } from '@/components/(auth)/tipos-registro';
import { Directory, File, Paths } from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const PREFIJO = 'gestorapp_registro_v2';
const CADUCIDAD = 24 * 60 * 60 * 1000;
const LIMITE_FRAGMENTO = 1400;
const CAMPOS_FOTO = [
  'fotoPerfilUri', 'dpiFrenteUri', 'dpiReversoUri', 'antecedentesPenalesUri',
  'licenciaUri', 'tarjetaCirculacionUri', 'fotoVehiculoUri', 'carneColegiadoUri',
] as const;

type DatoFoto = (typeof CAMPOS_FOTO)[number];
type BorradorGuardado = Omit<DatosRegistro, 'password'> & { guardadoEn: number };
const carpeta = () => new Directory(Paths.document, 'gestorapp-registro-pendiente');
const keyTotal = `${PREFIJO}_total`;
const keyFragmento = (n: number) => `${PREFIJO}_${n}`;

async function borrarClave(): Promise<void> {
  const total = Number(await SecureStore.getItemAsync(keyTotal)) || 0;
  for (let i = 0; i < Math.min(total, 30); i++) {
    await SecureStore.deleteItemAsync(keyFragmento(i));
  }
  await SecureStore.deleteItemAsync(keyTotal);
}

export async function borrarBorradorRegistro(): Promise<void> {
  if (Platform.OS === 'web') return;
  await borrarClave();
  const dir = carpeta();
  if (dir.exists) dir.delete();
}

/** Conserva todos los campos YA ingresados y las fotografías del formulario.
 * Se llama ANTES del signup, porque una cuenta sin confirmar aún no puede
 * escribir en Storage y los URIs del picker pueden ser temporales.
 */
export async function guardarBorradorRegistro(datos: DatosRegistro): Promise<void> {
  if (Platform.OS === 'web') return; // No persistimos documentación sensible en navegador.
  await borrarBorradorRegistro();
  const dir = carpeta();
  dir.create({ intermediates: true, idempotent: true });
  const valores = { ...datos, password: undefined } as Omit<DatosRegistro, 'password'>;
  try {
    for (const campo of CAMPOS_FOTO) {
      const uri = datos[campo];
      if (!uri) continue;
      const origen = new File(uri);
      if (!origen.exists || origen.size <= 0 || origen.size > 8 * 1024 * 1024) {
        throw new Error('No se puede conservar la fotografía ' + campo + '. Vuelve a tomarla.');
      }
      const extension = uri.toLowerCase().includes('.png') ? 'png' : 'jpg';
      const destino = new File(dir, `${campo}.${extension}`);
      await origen.copy(destino);
      valores[campo] = destino.uri;
    }
    const serializado = JSON.stringify({ ...valores, guardadoEn: Date.now() } satisfies BorradorGuardado);
    const partes: string[] = [];
    for (let i = 0; i < serializado.length; i += LIMITE_FRAGMENTO) {
      partes.push(serializado.slice(i, i + LIMITE_FRAGMENTO));
    }
    if (!partes.length || partes.length > 30) {
      throw new Error('El registro excede el límite de almacenamiento seguro.');
    }
    for (let i = 0; i < partes.length; i++) {
      await SecureStore.setItemAsync(keyFragmento(i), partes[i]);
    }
    await SecureStore.setItemAsync(keyTotal, String(partes.length));
  } catch (error) {
    await borrarBorradorRegistro();
    throw error;
  }
}

export async function leerBorradorRegistro(correo: string): Promise<Partial<DatosRegistro> | null> {
  if (Platform.OS === 'web') return null;
  try {
    const total = Number(await SecureStore.getItemAsync(keyTotal));
    if (!Number.isInteger(total) || total < 1 || total > 30) return null;
    const partes: string[] = [];
    for (let i = 0; i < total; i++) {
      const parte = await SecureStore.getItemAsync(keyFragmento(i));
      if (!parte) return null;
      partes.push(parte);
    }
    const { guardadoEn, ...datos } = JSON.parse(partes.join('')) as BorradorGuardado;
    if (!guardadoEn || Date.now() - guardadoEn > CADUCIDAD ||
        datos.correo.trim().toLowerCase() !== correo.trim().toLowerCase()) {
      await borrarBorradorRegistro();
      return null;
    }
    for (const campo of CAMPOS_FOTO) {
      const uri = datos[campo];
      if (uri && !new File(uri).exists) return null;
    }
    return { ...datos, password: '' };
  } catch (error) {
    console.warn('[registro] no se pudo leer el borrador', error);
    return null;
  }
}
