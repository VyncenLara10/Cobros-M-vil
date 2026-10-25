/**
 * components/mapa/MapaPins.tsx
 * Variante NATIVA del mapa de varios pines (react-native-maps). En web se
 * usa MapaPins.web.tsx (Leaflet). Si react-native-maps no está disponible o
 * MAPAS_OFF está activo (falta billing de Google), muestra un esquemático con
 * los pines en lugar de crashear o dejar el cuadro negro.
 */

import { MAPAS_OFF, MapaPinsProps } from '@/components/mapa/mapa-comun';
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

// Mapa real solo si la librería existe Y el interruptor temporal no lo apaga
// (ver MAPAS_OFF en mapa-comun.ts: mapa negro por falta de billing en Google Cloud).
const USAR_MAPA = HAY_MAPA && !MAPAS_OFF;

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
  if (puntos.length === 0) {
    return (
      <View style={[styles.aviso, { height: alto, width: ancho }]}>
        <Ionicons name="map-outline" size={28} color={Colors.textMuted} />
        <Text style={styles.avisoText}>Sin posiciones GPS para mostrar</Text>
      </View>
    );
  }
  if (!USAR_MAPA) {
    return <MapaPinsEsquematico puntos={puntos} alto={alto} ancho={ancho} />;
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

/**
 * Esquemático con pines: proyecta lat/lng a la caja y dibuja cada pin con su
 * color (verde/amarillo/gris de la leyenda). Se usa mientras MAPAS_OFF esté
 * activo (mapa de Google negro por falta de billing).
 */
function MapaPinsEsquematico({ puntos, alto = 240, ancho }: MapaPinsProps) {
  const lats = puntos.map((p) => p.lat);
  const lngs = puntos.map((p) => p.lng);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const spanLat = maxLat - minLat || 0.001;
  const spanLng = maxLng - minLng || 0.001;
  const P = 32;
  const toXY = (lat: number, lng: number) => ({
    x: P + ((lng - minLng) / spanLng) * (ancho - 2 * P),
    y: P + ((maxLat - lat) / spanLat) * (alto - 2 * P),
  });

  return (
    <View style={[styles.wrap, styles.esquema, { height: alto, width: ancho }]}>
      {puntos.map((p) => {
        const { x, y } = toXY(p.lat, p.lng);
        return (
          <View key={p.id} style={[styles.pin, { left: x - 10, top: y - 10, backgroundColor: p.color }]}>
            <View style={styles.pinCentro} />
          </View>
        );
      })}
      <View style={styles.badge}>
        <View style={styles.badgeDot} />
        <Text style={styles.badgeText}>Mapa apagado temporalmente · falta billing de Google</Text>
      </View>
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
  esquema: { backgroundColor: Colors.surfaceAlt },
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
  pin: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinCentro: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.85)' },
  badge: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  badgeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.warning },
  badgeText: { ...Typography.micro, color: Colors.textSecondary, textTransform: 'none', letterSpacing: 0 },
});
