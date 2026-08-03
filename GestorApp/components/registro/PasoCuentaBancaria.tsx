import FormInput from '@/components/(auth)/FormInput';
import { DatosRegistro } from '@/components/(auth)/tipos-registro';
import { Colors, Radius, Spacing, Typography } from '@/constants/DesignTokens';
import { soloDigitos, soloLetras, textoSeguro } from '@/domain/validators';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

interface PasoCuentaBancariaProps {
  datos: DatosRegistro;
  errores: Partial<Record<keyof DatosRegistro, string>>;
  onCambiarCampo: <K extends keyof DatosRegistro>(campo: K, valor: DatosRegistro[K]) => void;
}

export default function PasoCuentaBancaria({
  datos,
  errores,
  onCambiarCampo,
}: PasoCuentaBancariaProps) {
  return (
    <View>
      <Text style={styles.titulo}>Cuenta para tus pagos</Text>
      <Text style={styles.subtitulo}>
        Aqui se depositara el pago por cada servicio que completes
      </Text>

      <View style={styles.avisoSeguridad}>
        <Ionicons name="lock-closed-outline" size={16} color={Colors.info} />
        <Text style={styles.avisoSeguridadTexto}>
          Tu numero de cuenta se guarda cifrado y no se muestra completo
          en ninguna pantalla
        </Text>
      </View>

      <FormInput
        label="Banco"
        placeholder="Nombre del banco"
        required
        maxLength={60}
        value={datos.banco}
        onChangeText={(t) => onCambiarCampo('banco', textoSeguro(t))}
        error={errores.banco}
      />

      <FormInput
        label="Tipo de cuenta"
        placeholder="Monetaria o ahorro"
        required
        maxLength={30}
        value={datos.tipoCuenta}
        onChangeText={(t) => onCambiarCampo('tipoCuenta', textoSeguro(t))}
        error={errores.tipoCuenta}
      />

      <FormInput
        label="Numero de cuenta"
        placeholder="0000000000"
        required
        keyboardType="number-pad"
        maxLength={20}
        value={datos.numeroCuenta}
        onChangeText={(t) => onCambiarCampo('numeroCuenta', soloDigitos(t))}
        error={errores.numeroCuenta}
      />

      <FormInput
        label="Nombre del titular"
        placeholder="Como aparece en la cuenta bancaria"
        required
        maxLength={60}
        value={datos.nombreTitular}
        onChangeText={(t) => onCambiarCampo('nombreTitular', soloLetras(t))}
        error={errores.nombreTitular}
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
    marginBottom: Spacing.lg,
  },
  avisoSeguridad: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.infoMuted,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
  },
  avisoSeguridadTexto: {
    ...Typography.caption,
    color: Colors.textSecondary,
    flex: 1,
  },
});