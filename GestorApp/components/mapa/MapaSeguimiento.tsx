/**
 *
 * ══ PARA ACTIVAR EL MAPA REAL ══
 *   1. npx expo install react-native-maps
 *   2. En app.json → android.config.googleMaps.apiKey = "TU_API_KEY"
 *      (API key de Google Cloud con "Maps SDK for Android" habilitado)
 *   3. Recompilar el APK (es dependencia nativa: NO basta OTA)
 *
 * ══ DATOS ══
 * Recibe las paradas (con lat/lng) y la ubicación actual del gestor. Cuando
 * conectes el backend, esos mismos datos vendrán del feed de GPS real y este
 * componente no cambia.
 */

import { Colors, Radius, Spacing, Typography } from '@/constants/DesignTokens';
import { COLOR_ESTADO, MAPAS_OFF, MapaProps } from '@/components/mapa/mapa-comun';
import { Parada } from '@/data/seguimiento';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

export { COLOR_ESTADO };
export type { MapaProps };

// ── Carga condicional de react-native-maps ───────────────────────────────────
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
  HAY_MAPA = false; // librería no instalada → se usa el esquemático
}

// Mapa real solo si la librería existe Y el interruptor temporal no lo apaga
// (ver MAPAS_OFF en mapa-comun.ts: mapa negro por falta de billing en Google Cloud).
const USAR_MAPA = HAY_MAPA && !MAPAS_OFF;

export default function MapaSeguimiento(props: MapaProps) {
  return USAR_MAPA ? <MapaReal {...props} /> : <MapaEsquematico {...props} />;
}

/** Encuadra todos los puntos con margen. */
function calcularRegion(paradas: Parada[], actual: { lat: number; lng: number }) {
  const pts = [...paradas.map((p) => ({ lat: p.lat, lng: p.lng })), actual];
  const lats = pts.map((p) => p.lat);
  const lngs = pts.map((p) => p.lng);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const padLat = Math.max((maxLat - minLat) * 0.4, 0.006);
  const padLng = Math.max((maxLng - minLng) * 0.4, 0.006);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: maxLat - minLat + padLat,
    longitudeDelta: maxLng - minLng + padLng,
  };
}

// ═══════════════════════ MAPA REAL (react-native-maps) ═══════════════════════
function MapaReal({ paradas, actual, nombreGestor, alto = 220, ancho }: MapaProps) {
  const region = calcularRegion(paradas, actual);
  const rutaHecha = paradas
    .filter((p) => p.estado === 'completado' || p.estado === 'no_localizado')
    .map((p) => ({ latitude: p.lat, longitude: p.lng }));
  const rutaPendiente = paradas
    .filter((p) => p.estado !== 'completado' && p.estado !== 'no_localizado')
    .map((p) => ({ latitude: p.lat, longitude: p.lng }));

  return (
    <View style={[styles.wrap, { height: alto, width: ancho }]}>
      <MapView
        style={{ flex: 1 }}
        initialRegion={region}
        showsUserLocation={false}
        toolbarEnabled={false}
        loadingEnabled
      >
        {/* Tramo ya recorrido */}
        {rutaHecha.length > 1 && (
          <Polyline coordinates={rutaHecha} strokeColor={Colors.success} strokeWidth={3} />
        )}
        {/* Tramo pendiente (desde donde está el gestor) */}
        {rutaPendiente.length > 0 && (
          <Polyline
            coordinates={[{ latitude: actual.lat, longitude: actual.lng }, ...rutaPendiente]}
            strokeColor={Colors.textMuted}
            strokeWidth={2}
            lineDashPattern={[6, 6]}
          />
        )}

        {/* Paradas */}
        {paradas.map((p) => (
          <Marker
            key={p.servicioId}
            coordinate={{ latitude: p.lat, longitude: p.lng }}
            title={`${p.orden}. ${p.cliente}`}
            description={`${p.direccion}, ${p.zona}`}
            pinColor={COLOR_ESTADO[p.estado]}
          />
        ))}

        {/* Gestor */}
        <Marker
          coordinate={{ latitude: actual.lat, longitude: actual.lng }}
          title={nombreGestor}
          description="Ubicación actual"
        >
          <View style={styles.gestorPin}>
            <Ionicons name="navigate" size={13} color="#fff" />
          </View>
        </Marker>
      </MapView>
    </View>
  );
}

// ═════════════ MAPA ESQUEMÁTICO (fallback, sin dependencias) ═════════════════
function MapaEsquematico({ paradas, actual, alto = 220, ancho }: MapaProps) {
  const pts = [...paradas.map((p) => ({ lat: p.lat, lng: p.lng })), actual];
  const lats = pts.map((p) => p.lat);
  const lngs = pts.map((p) => p.lng);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const spanLat = maxLat - minLat || 0.001;
  const spanLng = maxLng - minLng || 0.001;
  const P = 26;
  const toXY = (lat: number, lng: number) => ({
    x: P + ((lng - minLng) / spanLng) * (ancho - 2 * P),
    y: P + ((maxLat - lat) / spanLat) * (alto - 2 * P),
  });

  const puntos = paradas.map((p) => ({ ...toXY(p.lat, p.lng), estado: p.estado, orden: p.orden }));
  const pos = toXY(actual.lat, actual.lng);

  return (
    <View style={[styles.wrap, styles.esquema, { height: alto, width: ancho }]}>
      {puntos.slice(1).map((pt, i) => (
        <Linea key={`l${i}`} a={puntos[i]} b={pt} />
      ))}

      {puntos.map((pt) => (
        <View
          key={`p${pt.orden}`}
          style={[styles.dot, { left: pt.x - 11, top: pt.y - 11, backgroundColor: COLOR_ESTADO[pt.estado] }]}
        >
          <Text style={styles.dotText}>{pt.orden}</Text>
        </View>
      ))}

      <View style={[styles.halo, { left: pos.x - 16, top: pos.y - 16 }]} />
      <View style={[styles.gestorPin, styles.gestorAbs, { left: pos.x - 9, top: pos.y - 9 }]}>
        <Ionicons name="navigate" size={11} color="#fff" />
      </View>

      <View style={styles.badge}>
        <View style={styles.badgeDot} />
        <Text style={styles.badgeText}>
          {MAPAS_OFF
            ? 'Mapa apagado temporalmente · falta billing de Google'
            : 'Vista esquemática · instala react-native-maps'}
        </Text>
      </View>
    </View>
  );
}

function Linea({ a, b }: { a: { x: number; y: number }; b: { x: number; y: number } }) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  const ang = (Math.atan2(dy, dx) * 180) / Math.PI;
  return (
    <View
      style={{
        position: 'absolute',
        left: (a.x + b.x) / 2 - len / 2,
        top: (a.y + b.y) / 2 - 1,
        width: len,
        height: 2,
        backgroundColor: Colors.borderStrong,
        transform: [{ rotate: `${ang}deg` }],
      }}
    />
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: Radius.md, borderWidth: 0.5, borderColor: Colors.border, overflow: 'hidden', marginTop: Spacing.md, marginBottom: Spacing.md },
  esquema: { backgroundColor: Colors.surfaceAlt },
  dot: { position: 'absolute', width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.surface },
  dotText: { ...Typography.micro, color: '#fff', fontWeight: '800', textTransform: 'none', letterSpacing: 0 },
  halo: { position: 'absolute', width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(79,110,247,0.22)' },
  gestorPin: { width: 18, height: 18, borderRadius: 9, backgroundColor: Colors.info, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#fff' },
  gestorAbs: { position: 'absolute' },
  badge: { position: 'absolute', left: 8, bottom: 8, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Colors.surface, paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: Radius.pill, borderWidth: 0.5, borderColor: Colors.border },
  badgeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.warning },
  badgeText: { ...Typography.micro, color: Colors.textSecondary, textTransform: 'none', letterSpacing: 0 },
});