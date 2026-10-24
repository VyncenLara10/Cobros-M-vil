/**
 * components/mapa/MapaPins.tsx
 * Variante NATIVA del mapa de varios pines (react-native-maps). En web se
 * usa MapaPins.web.tsx (Leaflet). Si react-native-maps no está disponible
 * (p. ej. Expo Go sin el módulo), muestra un aviso en lugar de crashear.
 */

import { MapaPinsProps } from '@/components/mapa/mapa-comun';
import { Colors, Radius, Spacing, Typography } from '@/constants/DesignTokens';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

// ── Carga condicional de react-native-maps ───────────────────────────────────
let MapView: any = null;
let Marker: any = null;
let HAY_MAPA = false;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const maps = require('react-native-maps');
  MapView = maps.default;
  Marker = maps.Marker;
  HAY_MAPA = !!MapView;
} catch {
  HAY_MAPA = false;
}

function regionDe(puntos: { lat: number; lng: number }[]) {
  const lats = puntos.map((p) => p.lat);
  const lngs = puntos.map((p) => p.lng);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const padLat = Math.max((maxLat - minLat) * 0.35, 0.01);
  const padLng = Math.max((maxLng - minLng) * 0.35, 0.01);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: maxLat - minLat + padLat * 2,
    longitudeDelta: maxLng - minLng + padLng * 2,
  };
}

export default function MapaPins({ puntos, alto = 240, ancho }: MapaPinsProps) {
  if (!HAY_MAPA || puntos.length === 0) {
    return (
      <View style={[styles.aviso, { height: alto, width: ancho }]}>
        <Ionicons name="map-outline" size={28} color={Colors.textMuted} />
        <Text style={styles.avisoText}>
          {puntos.length === 0
            ? 'Sin posiciones GPS para mostrar'
            : 'Mapa no disponible en este entorno'}
        </Text>
      </View>
    );
  }

  const region = regionDe(puntos);

  return (
    <View style={[styles.wrap, { height: alto, width: ancho }]}>
      <MapView style={{ flex: 1 }} initialRegion={region} toolbarEnabled={false} loadingEnabled>
        {puntos.map((p) => (
          <Marker
            key={p.id}
            coordinate={{ latitude: p.lat, longitude: p.lng }}
            title={p.titulo}
            description={p.descripcion}
            pinColor={p.color}
          />
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: Radius.md,
    borderWidth: 0.5,
    borderColor: Colors.border,
    overflow: 'hidden',
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  aviso: {
    borderRadius: Radius.md,
    borderWidth: 0.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  avisoText: { ...Typography.caption, color: Colors.textMuted },
});
