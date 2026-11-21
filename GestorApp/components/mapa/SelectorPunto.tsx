/**
 * Selección manual de punto para las solicitudes de servicio (Android/iOS).
 * Al tocar el mapa solo capturamos la coordenada del toque; NO llamamos a
 * Places, Geocoding ni Routes. Maps SDK Android carga el mapa base.
 */
import { MAPAS_OFF } from '@/components/mapa/mapa-comun';
import { Colors, Radius, Spacing, Typography } from '@/constants/DesignTokens';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

export interface Coordenada {
  lat: number;
  lng: number;
}
export interface SelectorPuntoProps {
  valor: Coordenada | null;
  onCambiar: (punto: Coordenada) => void;
  alto?: number;
}

let MapView: any = null;
let Marker: any = null;
try {
  // La versión nativa está instalada en el APK generado con EAS Build.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mapas = require('react-native-maps');
  MapView = mapas.default;
  Marker = mapas.Marker;
} catch {
  // Sin módulo nativo permitimos escribir las coordenadas manualmente.
}

export default function SelectorPunto({ valor, onCambiar, alto = 310 }: SelectorPuntoProps) {
  if (MAPAS_OFF || !MapView || !Marker) {
    return (
      <View style={[styles.fallback, { height: alto }]}>
        <Ionicons name="map-outline" size={30} color={Colors.textMuted} />
        <Text style={styles.fallbackTexto}>
          Mapa no disponible en este dispositivo. Puedes pegar latitud y longitud en el formulario.
        </Text>
      </View>
    );
  }
  const centro = valor ?? { lat: 14.8340, lng: -91.5180 };
  return (
    <View style={[styles.mapa, { height: alto }]}>
      <MapView
        style={{ flex: 1 }}
        initialRegion={{
          latitude: centro.lat,
          longitude: centro.lng,
          latitudeDelta: 0.06,
          longitudeDelta: 0.06,
        }}
        loadingEnabled
        toolbarEnabled={false}
        onPress={(e: { nativeEvent: { coordinate: { latitude: number; longitude: number } } }) => {
          const coordenada = e.nativeEvent.coordinate;
          onCambiar({ lat: coordenada.latitude, lng: coordenada.longitude });
        }}
      >
        {valor && (
          <Marker
            coordinate={{ latitude: valor.lat, longitude: valor.lng }}
            title="Ubicación del servicio"
            pinColor={Colors.primary}
          />
        )}
      </MapView>
      <View pointerEvents="none" style={styles.ayuda}>
        <Text style={styles.ayudaText}>Toca el mapa para fijar el destino</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mapa: { borderRadius: Radius.md, overflow: 'hidden', borderColor: Colors.border, borderWidth: 1 },
  fallback: {
    alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.md, gap: Spacing.sm, padding: Spacing.lg,
  },
  fallbackTexto: { ...Typography.caption, textAlign: 'center', color: Colors.textSecondary },
  ayuda: {
    position: 'absolute', left: 12, right: 12, top: 12, alignItems: 'center',
  },
  ayudaText: {
    backgroundColor: Colors.surface, color: Colors.textPrimary,
    borderRadius: Radius.pill, overflow: 'hidden',
    paddingHorizontal: 14, paddingVertical: 8, fontSize: 12, fontWeight: '700',
  },
});
