import ServiceAgreement from '@/components/(auth)/Serviceagreement';
import { Colors, Spacing, Typography } from '@/constants/DesignTokens';
import { StyleSheet, Text, View } from 'react-native';

interface PasoAcuerdoProps {
  aceptado: boolean;
  onChange: (aceptado: boolean) => void;
}

export default function PasoAcuerdo({ aceptado, onChange }: PasoAcuerdoProps) {
  return (
    <View>
      <Text style={styles.titulo}>Acuerdo de servicio</Text>
      <Text style={styles.subtitulo}>
        Ultimo paso antes de enviar tu solicitud de registro
      </Text>
      <ServiceAgreement aceptado={aceptado} onChange={onChange} />
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