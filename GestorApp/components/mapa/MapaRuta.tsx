/**
 * components/mapa/MapaRuta.tsx
 * Variante NATIVA del mapa "tú → servicio": pines de origen y destino con una
 * línea recta. La ruta real por calles se abre con el botón "Navegar"
 * (app de Google Maps) desde components/ModalRuta.tsx.
 * Si react-native-maps no está disponible, muestra un aviso (no crashea).
 */

import { MapaRutaProps } from '@/components/mapa/mapa-comun';
import { Colors, Radius, Spacing, Typography } from '@/constants/DesignTokens';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

let MapView: any = null;
let Marker: any = null;
let Polyline: any = null;
let HAY_MAPA = false;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const maps = require('react-native-maps');
  MapView = maps.default;
  Marker = maps.Marker;
  Polyline = maps.Polyline;
  HAY_MAPA = !!MapView;
} catch {
  HAY_MAPA = false;
}

function regionDe(puntos: { lat: number; lng: number }[]) {
  const lats = puntos.map((p) => p.lat);
  const lngs = puntos.map((p) => p.lng);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const padLat = Math.max((maxLat - minLat) * 0.4, 0.008);
  const padLng = Math.max((maxLng - minLng) * 0.4, 0.008);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: maxLat - minLat + padLat * 2,
    longitudeDelta: maxLng - minLng + padLng * 2,
  };
}

export default function MapaRuta({ destino, origen, alto = 220, ancho }: MapaRutaProps) {
  if (!HAY_MAPA) {
    return (
      <View style={[styles.aviso, { height: alto, width: ancho }]}>
        <Ionicons name="map-outline" size={28} color={Colors.textMuted} />
        <Text style={styles.avisoText}>Mapa no disponible en este entorno</Text>
      </View>
    );
  }

  const puntos = origen ? [origen, { lat: destino.lat, lng: destino.lng }] : [{ lat: destino.lat, lng: destino.lng }];
  const region = regionDe(puntos);

  return (
    <View style={[styles.wrap, { height: alto, width: ancho }]}>
      <MapView style={{ flex: 1 }} initialRegion={region} toolbarEnabled={false} loadingEnabled>
        {origen && (
          <Marker
            coordinate={{ latitude: origen.lat, longitude: origen.lng }}
            title="Tú"
            pinColor="#2563EB"
          />
        )}
        <Marker
          coordinate={{ latitude: destino.lat, longitude: destino.lng }}
          title={destino.titulo}
          description={destino.descripcion}
          pinColor={Colors.danger}
        />
        {origen && (
          <Polyline
            coordinates={[
              { latitude: origen.lat, longitude: origen.lng },
              { latitude: destino.lat, longitude: destino.lng },
            ]}
            strokeColor={Colors.info}
            strokeWidth={3}
            lineDashPattern={[8, 6]}
          />
        )}
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
  },
  aviso: {
    borderRadius: Radius.md,
    borderWidth: 0.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  avisoText: { ...Typography.caption, color: Colors.textMuted },
});
