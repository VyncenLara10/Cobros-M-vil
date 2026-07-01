import { Colors, Radius } from '@/constants/DesignTokens';
import { StyleSheet, Text, View } from 'react-native';

export default function MapaPicker({ onCoordenadas, coordenadas }: any) {
  return (
    <View style={styles.box}>
      <Text style={styles.text}>🗺️ El mapa solo está disponible en la app móvil</Text>
      <Text style={styles.sub}>Usa la app en tu celular para colocar el pin</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    height: 200,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: Colors.border,
    gap: 8,
  },
  text: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  sub: { fontSize: 12, color: Colors.textMuted },
});