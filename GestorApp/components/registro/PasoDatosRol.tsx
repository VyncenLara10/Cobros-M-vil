import DocumentUploader from '@/components/(auth)/Documentuploader';
import FormInput from '@/components/(auth)/FormInput';
import { DatosRegistro } from '@/components/(auth)/tipos-registro';
import { Colors, Spacing, Typography } from '@/constants/DesignTokens';
import { StyleSheet, Text, View } from 'react-native';

interface PasoDatosRolProps {
  datos: DatosRegistro;
  errores: Partial<Record<keyof DatosRegistro, string>>;
  onCambiarCampo: <K extends keyof DatosRegistro>(campo: K, valor: DatosRegistro[K]) => void;
}

/**
 * Este paso cambia completamente segun el rol:
 * - Abogado: numero de colegiado + carne de colegiado
 * - Verificador / Cobrador: datos de vehiculo + licencia
 */
export default function PasoDatosRol({
  datos,
  errores,
  onCambiarCampo,
}: PasoDatosRolProps) {
  if (datos.rol === 'abogado') {
    return (
      <View>
        <Text style={styles.titulo}>Datos profesionales</Text>
        <Text style={styles.subtitulo}>
          Necesitamos validar tu colegiado activo ante el Colegio de Abogados
        </Text>

        <FormInput
          label="Numero de colegiado"
          placeholder="00000"
          required
          keyboardType="number-pad"
          value={datos.numeroColegiado}
          onChangeText={(t) => onCambiarCampo('numeroColegiado', t)}
          error={errores.numeroColegiado}
        />

        <DocumentUploader
          titulo="Carne de colegiado activo"
          descripcion="Foto del carne vigente del Colegio de Abogados y Notarios"
          obligatorio
          onChange={(uri) => onCambiarCampo('carneColegiadoUri', uri)}
        />
      </View>
    );
  }

  // Verificador o cobrador: requieren vehiculo y licencia
  return (
    <View>
      <Text style={styles.titulo}>Datos de tu vehiculo</Text>
      <Text style={styles.subtitulo}>
        Necesario para asignarte servicios cercanos a tu ubicacion
      </Text>

      <FormInput
        label="Tipo de vehiculo"
        placeholder="Moto, carro u otro"
        required
        value={datos.tipoVehiculo}
        onChangeText={(t) => onCambiarCampo('tipoVehiculo', t)}
        error={errores.tipoVehiculo}
      />

      <FormInput
        label="Placa"
        placeholder="P 000AAA"
        required
        autoCapitalize="characters"
        value={datos.placaVehiculo}
        onChangeText={(t) => onCambiarCampo('placaVehiculo', t)}
        error={errores.placaVehiculo}
      />

      <DocumentUploader
        titulo="Licencia de conducir"
        descripcion="Frente del documento, vigente"
        obligatorio
        onChange={(uri) => onCambiarCampo('licenciaUri', uri)}
      />

      <DocumentUploader
        titulo="Tarjeta de circulacion"
        descripcion="Documento del vehiculo a tu nombre o autorizado"
        obligatorio
        onChange={(uri) => onCambiarCampo('tarjetaCirculacionUri', uri)}
      />

      <DocumentUploader
        titulo="Fotografia del vehiculo"
        descripcion="Foto donde se vea la placa con claridad"
        obligatorio
        onChange={(uri) => onCambiarCampo('fotoVehiculoUri', uri)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  titulo: {
    ...Typography.title,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  subtitulo: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.xl,
  },
});