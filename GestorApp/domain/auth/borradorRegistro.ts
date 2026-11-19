/**
 * Borrador mínimo para reanudar registro después de confirmar el correo.
 * Cifrado por el sistema operativo (SecureStore); nunca guarda password, DPI,
 * datos bancarios ni documentos. Las fotos se seleccionan de nuevo.
 * Caduca en 7 días y no se restaura para otro correo.
 */
import type { DatosRegistro } from '@/components/(auth)/tipos-registro';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const PREFIJO = 'gestorapp_registro_v1';
const LIMITE_DIAS = 7;
const TAMANIO = 1400; // evita el límite de valor de algunas plataformas

type Borrador = Pick<DatosRegistro,
  'correo' | 'rol' | 'nombreCompleto' | 'telefono' |
  'numeroColegiado' | 'tipoVehiculo' | 'placaVehiculo' |
  'zonaCobertura' | 'acuerdoAceptado'
> & { guardadoEn: number };

export async function borrarBorradorRegistro(): Promise<void> {
  if (Platform.OS === 'web') return;
  const longitud = await SecureStore.getItemAsync(`${PREFIJO}_longitud`);
  const cantidad = Math.min(Math.max(Number(longitud) || 0, 0), 20);
  for (let i = 0; i < cantidad; i++) {
    await SecureStore.deleteItemAsync(`${PREFIJO}_${i}`);
  }
  await SecureStore.deleteItemAsync(`${PREFIJO}_longitud`);
}

export async function guardarBorradorRegistro(datos: DatosRegistro): Promise<void> {
  if (Platform.OS === 'web') return; // web: no almacenar DPI/banco en localStorage
  const borrador: Borrador = {
    correo: datos.correo.trim().toLowerCase(),
    rol: datos.rol,
    nombreCompleto: datos.nombreCompleto,
    telefono: datos.telefono,
    numeroColegiado: datos.numeroColegiado,
    tipoVehiculo: datos.tipoVehiculo,
    placaVehiculo: datos.placaVehiculo,
    zonaCobertura: datos.zonaCobertura,
    acuerdoAceptado: datos.acuerdoAceptado,
    guardadoEn: Date.now(),
  };
  const texto = JSON.stringify(borrador);
  await borrarBorradorRegistro();
  const partes = texto.match(new RegExp(`.{1,${TAMANIO}`, 'gs')) ?? [];
  if (partes.length > 20) return; // sin guardar datos incompletos
  for (let i = 0; i < partes.length; i++) {
    await SecureStore.setItemAsync(`${PREFIJO}_${i}`, partes[i]);
  }
  await SecureStore.setItemAsync(`${PREFIJO}_longitud`, String(partes.length));
}

export async function leerBorradorRegistro(correo: string): Promise<Partial<DatosRegistro> | null> {
  if (Platform.OS === 'web') return null;
  try {
    const longitud = await SecureStore.getItemAsync(`${PREFIJO}_longitud`);
    const cantidad = Number(longitud);
    if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 20) return null;
    let texto = '';
    for (let i = 0; i < cantidad; i++) {
      const parte = await SecureStore.getItemAsync(`${PREFIJO}_${i}`);
      if (!parte) return null;
      texto += parte;
    }
    const borrador = JSON.parse(texto) as Borrador;
    if (borrador.correo !== correo.trim().toLowerCase()
      || !borrador.guardadoEn
      || Date.now() - borrador.guardadoEn > LIMITE_DIAS * 86400000) {
      return null;
    }
    const { guardadoEn: _guardadoEn, ...datos } = borrador;
    return datos;
  } catch {
    return null;
  }
}
