import CoverageAreaPicker, { ZonaCobertura } from '@/components/(auth)/Coverageareapicker';
import { Colors, Spacing, Typography } from '@/constants/DesignTokens';
import { StyleSheet, Text, View } from 'react-native';

interface PasoZonaCoberturaProps {
  zona: ZonaCobertura | null;
  onChange: (zona: ZonaCobertura) => void;
}

export default function PasoZonaCobertura({ zona, onChange }: PasoZonaCoberturaProps) {
  return (
    <View>
      <Text style={styles.titulo}>Tu zona de cobertura</Text>
      <Text style={styles.subtitulo}>
        Se usa para notificarte solicitudes cercanas a tu ubicacion habitual
      </Text>
      <CoverageAreaPicker value={zona} onChange={onChange} />
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