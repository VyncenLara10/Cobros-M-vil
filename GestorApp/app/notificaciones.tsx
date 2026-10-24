/**
 * app/notificaciones.tsx
 * Campana: lista de notificaciones del usuario (gestor: las suyas + broadcast
 * de su rol; admin: todas). Al abrirla se marcan como leídas; tocar una de
 * tipo "servicio" lleva al detalle del servicio.
 */

import { Colors, Radius, Spacing, Typography } from '@/constants/DesignTokens';
import { useSesion } from '@/domain/auth/sesion';
import {
    cargarNotificaciones,
    marcarTodasLeidas,
    NotificacionApp,
} from '@/domain/notificaciones/notificaciones';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

const ICONO_TIPO: Record<string, string> = {
  servicio_nuevo: 'briefcase-outline',
  solicitud_aprobada: 'checkmark-circle-outline',
  solicitud_rechazada: 'close-circle-outline',
};

export default function NotificacionesScreen() {
  const { usuario } = useSesion();
  const [notifs, setNotifs] = useState<NotificacionApp[]>([]);
  const [cargando, setCargando] = useState(true);

  // Callback ESTABLE (deps []): un callback que cambia en cada render con
  // useFocusEffect provoca un bucle infinito (ver HISTORIAL, fix Mi perfil).
  useFocusEffect(
    useCallback(() => {
      let cancelado = false;
      (async () => {
        await marcarTodasLeidas();
        const lista = await cargarNotificaciones();
        if (!cancelado) {
          setNotifs(lista);
          setCargando(false);
        }
      })();
      return () => {
        cancelado = true;
      };
    }, []),
  );

  const abrir = (n: NotificacionApp) => {
    if (n.tipo === 'servicio_nuevo' && n.referenciaId) {
      router.push(`/servicio/${n.referenciaId}`);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Pressable style={styles.backRow} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={20} color={Colors.info} />
        <Text style={styles.backText}>Panel</Text>
      </Pressable>

      <Text style={styles.titulo}>Notificaciones</Text>
      <Text style={styles.subtitulo}>
        {usuario?.rol === 'admin' ? 'Todas las notificaciones del sistema.' : 'Tus avisos y los servicios disponibles.'}
      </Text>

      {cargando ? (
        <View style={styles.vacio}>
          <ActivityIndicator color={Colors.info} />
        </View>
      ) : notifs.length === 0 ? (
        <View style={styles.vacio}>
          <Ionicons name="notifications-off-outline" size={42} color={Colors.textMuted} />
          <Text style={styles.vacioText}>No hay notificaciones por ahora.</Text>
        </View>
      ) : (
        notifs.map((n) => (
          <Pressable key={n.id} style={[styles.card, !n.leida && styles.cardNoLeida]} onPress={() => abrir(n)}>
            <View style={[styles.iconoCaja, !n.leida && { backgroundColor: Colors.primaryMuted }]}>
              <Ionicons
                name={(ICONO_TIPO[n.tipo] ?? 'notifications-outline') as any}
                size={18}
                color={!n.leida ? Colors.primary : Colors.textMuted}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitulo, !n.leida && { color: Colors.textPrimary }]}>{n.titulo}</Text>
              <Text style={styles.cardCuerpo}>{n.cuerpo}</Text>
              <Text style={styles.cardFecha}>{n.fecha}</Text>
            </View>
            {!n.leida && <View style={styles.puntoLeida} />}
          </Pressable>
        ))
      )}
      <View style={{ height: Spacing.xxl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.lg },
  backText: { ...Typography.caption, color: Colors.info, fontWeight: '600' },
  titulo: { ...Typography.title, color: Colors.textPrimary },
  subtitulo: { ...Typography.caption, color: Colors.textSecondary, marginTop: 2, marginBottom: Spacing.lg },
  vacio: { alignItems: 'center', paddingVertical: 60, gap: Spacing.sm },
  vacioText: { ...Typography.caption, color: Colors.textMuted },
  card: {
    flexDirection: 'row',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 0.5,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    alignItems: 'flex-start',
  },
  cardNoLeida: { borderColor: Colors.primary, borderWidth: 1 },
  iconoCaja: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitulo: { ...Typography.subtitle, color: Colors.textSecondary, fontWeight: '700' },
  cardCuerpo: { ...Typography.caption, color: Colors.textSecondary, marginTop: 2, lineHeight: 18 },
  cardFecha: { ...Typography.micro, color: Colors.textMuted, marginTop: 6 },
  puntoLeida: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary, marginTop: 6 },
});
