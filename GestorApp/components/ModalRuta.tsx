/**
 * components/ModalRuta.tsx
 * Hoja inferior "Cómo llegar": mapa con tu pin y el del servicio, distancia
 * en línea recta y botón "Navegar" que abre la app de Google Maps con la
 * ruta real por calles (gratis, con indicaciones paso a paso).
 * La app no calcula rutas por calles por su cuenta (eso sería la API de
 * Directions, de pago): se delega a Google Maps.
 */

import MapaRuta from '@/components/mapa/MapaRuta';
import { Colors, Radius, Spacing, Typography } from '@/constants/DesignTokens';
import { calcularDistanciaKm, obtenerPosicionActual } from '@/domain/servicios/servicios';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Alert, Dimensions, Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

export interface DestinoRuta {
  lat?: number;
  lng?: number;
  titulo: string;
  direccion?: string;
}

interface ModalRutaProps {
  visible: boolean;
  destino: DestinoRuta | null;
  onCerrar: () => void;
}

const ANCHO = Dimensions.get('window').width - Spacing.xl * 2;

export default function ModalRuta({ visible, destino, onCerrar }: ModalRutaProps) {
  const [origen, setOrigen] = useState<{ lat: number; lng: number } | null>(null);

  // Al abrir: pedir posición (si no la tenemos ya) para pintar los 2 pines.
  // (La posición es siempre la tuya: no se limpia al cerrar, así reabre al instante.)
  useEffect(() => {
    if (!visible || !destino) return;
    let cancelado = false;
    (async () => {
      try {
        let pos = await obtenerPosicionActual();
        if (!pos) {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') pos = await obtenerPosicionActual();
        }
        if (!cancelado && pos) setOrigen(pos);
      } catch {
        // sin posición: se muestra "Buscando tu posición…"
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [visible, destino]);

  const hayCoords = destino?.lat != null && destino?.lng != null;

  const navegar = () => {
    if (!destino) return;
    const destinoParam = hayCoords
      ? `${destino.lat},${destino.lng}`
      : encodeURIComponent(destino.direccion ?? destino.titulo);
    const url = `https://www.google.com/maps/dir/?api=1&destination=${destinoParam}&travelmode=driving`;
    Linking.openURL(url).catch(() =>
      Alert.alert('No se pudo abrir la ruta', '¿Tienes Google Maps instalado en tu equipo?'),
    );
  };

  const distancia =
    origen && hayCoords ? calcularDistanciaKm(origen.lat, origen.lng, destino!.lat!, destino!.lng!) : null;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.titulo}>Cómo llegar</Text>
              {destino && <Text style={styles.subtitulo}>{destino.titulo}</Text>}
            </View>
            <Pressable onPress={onCerrar} hitSlop={10}>
              <Ionicons name="close" size={24} color={Colors.textSecondary} />
            </Pressable>
          </View>

          {hayCoords ? (
            <MapaRuta
              destino={{
                lat: destino!.lat!,
                lng: destino!.lng!,
                titulo: destino!.titulo,
                descripcion: destino!.direccion,
              }}
              origen={origen}
              ancho={ANCHO}
              alto={220}
            />
          ) : (
            <View style={styles.sinCoords}>
              <Ionicons name="location-outline" size={26} color={Colors.textMuted} />
              <Text style={styles.sinCoordsText}>Este cliente no tiene ubicación en el mapa.</Text>
            </View>
          )}

          <View style={styles.infoRow}>
            <View style={styles.infoCelda}>
              <Text style={styles.infoValor}>{distancia != null ? `${distancia} km` : '—'}</Text>
              <Text style={styles.infoLabel}>Distancia en línea recta</Text>
            </View>
            <View style={styles.infoCelda}>
              <Text style={styles.infoValor}>{origen ? '📍' : '⏳'}</Text>
              <Text style={styles.infoLabel}>{origen ? 'Tu posición detectada' : 'Buscando tu posición…'}</Text>
            </View>
          </View>

          <Pressable style={styles.btnNavegar} onPress={navegar}>
            <Ionicons name="navigate" size={18} color="#fff" />
            <Text style={styles.btnNavegarText}>Navegar con Google Maps</Text>
          </Pressable>
          <Text style={styles.nota}>La app de Google Maps te da la ruta real con indicaciones.</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  card: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  titulo: { ...Typography.subtitle, color: Colors.textPrimary, fontWeight: '700' },
  subtitulo: { ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },
  sinCoords: {
    height: 160,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 0.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  sinCoordsText: { ...Typography.caption, color: Colors.textMuted, maxWidth: 240, textAlign: 'center' },
  infoRow: { flexDirection: 'row', gap: Spacing.md },
  infoCelda: {
    flex: 1,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  infoValor: { ...Typography.subtitle, color: Colors.textPrimary, fontWeight: '800' },
  infoLabel: { ...Typography.micro, color: Colors.textMuted, textAlign: 'center', marginTop: 2 },
  btnNavegar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
  },
  btnNavegarText: { ...Typography.subtitle, color: '#fff', fontWeight: '700' },
  nota: { ...Typography.micro, color: Colors.textMuted, textAlign: 'center' },
});
