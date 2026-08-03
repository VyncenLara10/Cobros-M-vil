import DocumentUploader from '@/components/(auth)/Documentuploader';
import FormInput from '@/components/(auth)/FormInput';
import { DatosRegistro } from '@/components/(auth)/tipos-registro';
import { Colors, Spacing, Typography } from '@/constants/DesignTokens';
import { MAX, soloDigitos, soloLetras } from '@/domain/validators';
import { StyleSheet, Text, View } from 'react-native';

interface PasoDatosPersonalesProps {
  datos: DatosRegistro;
  errores: Partial<Record<keyof DatosRegistro, string>>;
  onCambiarCampo: <K extends keyof DatosRegistro>(campo: K, valor: DatosRegistro[K]) => void;
}

export default function PasoDatosPersonales({
  datos,
  errores,
  onCambiarCampo,
}: PasoDatosPersonalesProps) {
  return (
    <View>
      <Text style={styles.titulo}>Tus datos personales</Text>
      <Text style={styles.subtitulo}>
        Esta informacion se usa para crear tu perfil y verificar tu identidad
      </Text>

      <DocumentUploader
        titulo="Fotografia de perfil"
        descripcion="Foto clara de tu rostro, sin lentes oscuros ni gorra"
        obligatorio
        onChange={(uri) => onCambiarCampo('fotoPerfilUri', uri)}
      />

      <FormInput
        label="Nombre completo"
        placeholder="Como aparece en tu DPI"
        required
        maxLength={MAX.nombre}
        value={datos.nombreCompleto}
        onChangeText={(t) => onCambiarCampo('nombreCompleto', soloLetras(t))}
        error={errores.nombreCompleto}
      />

      <FormInput
        label="Numero de DPI"
        placeholder="0000 00000 0000"
        required
        keyboardType="number-pad"
        maxLength={13}
        value={datos.dpiNumero}
        onChangeText={(t) => onCambiarCampo('dpiNumero', soloDigitos(t))}
        error={errores.dpiNumero}
      />

      <FormInput
        label="Correo electronico"
        placeholder="nombre@correo.com"
        required
        keyboardType="email-address"
        autoCapitalize="none"
        maxLength={MAX.email}
        value={datos.correo}
        onChangeText={(t) => onCambiarCampo('correo', t.trim())}
        error={errores.correo}
      />

      <FormInput
        label="Telefono"
        placeholder="00000000"
        required
        keyboardType="phone-pad"
        maxLength={8}
        value={datos.telefono}
        onChangeText={(t) => onCambiarCampo('telefono', soloDigitos(t))}
        error={errores.telefono}
      />

      <FormInput
        label="Contrasena"
        placeholder="Minimo 8 caracteres"
        required
        secureTextEntry
        maxLength={72}
        value={datos.password}
        onChangeText={(t) => onCambiarCampo('password', t)}
        error={errores.password}
        hint={!errores.password ? 'Mayúscula, minúscula, número y símbolo (ej. !@#$%)' : undefined}
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