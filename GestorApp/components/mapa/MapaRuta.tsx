/**
 * components/mapa/MapaRuta.tsx
 * Variante NATIVA del mapa "tú → servicio": pines de origen y destino con una
 * línea recta. La ruta real por calles se abre con el botón "Navegar"
 * (app de Google Maps) desde components/ModalRuta.tsx.
 * Si react-native-maps no está disponible o MAPAS_OFF está activo (falta
 * billing de Google), muestra un esquemático con los 2 pines (no crashea).
 */

import { MAPAS_OFF, MapaRutaProps } from '@/components/mapa/mapa-comun';
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

// Mapa real solo si la librería existe Y el interruptor temporal no lo apaga
// (ver MAPAS_OFF en mapa-comun.ts: mapa negro por falta de billing en Google Cloud).
const USAR_MAPA = HAY_MAPA && !MAPAS_OFF;

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
  if (!USAR_MAPA) {
    return <RutaEsquematica destino={destino} origen={origen} alto={alto} ancho={ancho} />;
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

/**
 * Esquemático "tú → servicio": 2 pines + línea recta, proyectando las
 * coordenadas a la caja. Se usa mientras MAPAS_OFF esté activo (mapa de
 * Google negro por falta de billing). El botón "Navegar con Google Maps"
 * vive en ModalRuta y no depende de este mapa.
 */
function RutaEsquematica({ destino, origen, alto = 220, ancho }: MapaRutaProps) {
  const pts = origen
    ? [origen, { lat: destino.lat, lng: destino.lng }]
    : [{ lat: destino.lat, lng: destino.lng }];
  const lats = pts.map((p) => p.lat);
  const lngs = pts.map((p) => p.lng);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const spanLat = maxLat - minLat || 0.001;
  const spanLng = maxLng - minLng || 0.001;
  const P = 44;
  const toXY = (lat: number, lng: number) => ({
    x: P + ((lng - minLng) / spanLng) * (ancho - 2 * P),
    y: P + ((maxLat - lat) / spanLat) * (alto - 2 * P),
  });

  const b = toXY(destino.lat, destino.lng);
  const a = origen ? toXY(origen.lat, origen.lng) : null;
  const dx = a ? b.x - a.x : 0;
  const dy = a ? b.y - a.y : 0;
  const len = a ? Math.hypot(dx, dy) : 0;
  const angulo = a ? (Math.atan2(dy, dx) * 180) / Math.PI : 0;

  return (
    <View style={[styles.wrap, styles.esquema, { height: alto, width: ancho }]}>
      {a && (
        <View
          style={{
            position: 'absolute',
            left: (a.x + b.x) / 2 - len / 2,
            top: (a.y + b.y) / 2 - 1,
            width: len,
            height: 2,
            backgroundColor: Colors.info,
            opacity: 0.7,
            transform: [{ rotate: `${angulo}deg` }],
          }}
        />
      )}
      {a && (
        <View style={[styles.pinAncla, { left: a.x - 13, top: a.y - 32 }]}>
          <Ionicons name="location" size={26} color="#2563EB" />
          <Text style={styles.pinLabel}>Tú</Text>
        </View>
      )}
      <View style={[styles.pinAncla, { left: b.x - 13, top: b.y - 32 }]}>
        <Ionicons name="location" size={26} color={Colors.danger} />
      </View>
      <View style={styles.badge}>
        <View style={styles.badgeDot} />
        <Text style={styles.badgeText}>Mapa apagado temporalmente · usa Navegar</Text>
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
  },
  esquema: { backgroundColor: Colors.surfaceAlt },
  pinAncla: { position: 'absolute', alignItems: 'center' },
  pinLabel: { ...Typography.micro, color: '#2563EB', fontWeight: '700', marginTop: -2 },
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
