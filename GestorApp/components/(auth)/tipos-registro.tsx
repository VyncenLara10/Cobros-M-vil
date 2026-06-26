import { ZonaCobertura } from '@/components/(auth)/Coverageareapicker';
import { RolGestor } from '@/components/(auth)/Roleselector';

/**
 * Estado completo del formulario de registro multi-step.
 * Vive en memoria mientras el usuario completa el flujo.
 * No hay persistencia real: al conectar el backend, este
 * objeto es el payload que se envia a POST /usuarios/registro.
 */
export interface DatosRegistro {
  rol: RolGestor | null;

  // Paso 2: datos personales
  nombreCompleto: string;
  correo: string;
  telefono: string;
  password: string;
  dpiNumero: string;
  fotoPerfilUri: string | null;

  // Paso 3: datos especificos del rol
  numeroColegiado: string; // solo abogado
  tipoVehiculo: string; // verificador / cobrador
  placaVehiculo: string; // verificador / cobrador
  licenciaUri: string | null; // verificador / cobrador
  tarjetaCirculacionUri: string | null; // verificador / cobrador
  fotoVehiculoUri: string | null; // verificador / cobrador
  carneColegiadoUri: string | null; // abogado

  // Paso 4: documentos generales
  dpiFrenteUri: string | null;
  dpiReversoUri: string | null;
  antecedentesPenalesUri: string | null;

  // Paso 5: zona de cobertura
  zonaCobertura: ZonaCobertura | null;

  // Paso 6: cuenta bancaria
  banco: string;
  tipoCuenta: string;
  numeroCuenta: string;
  nombreTitular: string;

  // Paso 7: acuerdo
  acuerdoAceptado: boolean;
}

export const datosRegistroVacios: DatosRegistro = {
  rol: null,
  nombreCompleto: '',
  correo: '',
  telefono: '',
  password: '',
  dpiNumero: '',
  fotoPerfilUri: null,
  numeroColegiado: '',
  tipoVehiculo: '',
  placaVehiculo: '',
  licenciaUri: null,
  tarjetaCirculacionUri: null,
  fotoVehiculoUri: null,
  carneColegiadoUri: null,
  dpiFrenteUri: null,
  dpiReversoUri: null,
  antecedentesPenalesUri: null,
  zonaCobertura: null,
  banco: '',
  tipoCuenta: '',
  numeroCuenta: '',
  nombreTitular: '',
  acuerdoAceptado: false,
};