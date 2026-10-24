/**
 * app/(tabs)/admin.tsx
 * PANEL DE ADMIN · seguimiento en vivo del equipo en campo.
 * Por cada gestor que aceptó trabajos: su ubicación actual (GPS real), la
 * ruta del día en un mapa real (react-native-maps en Android/iOS, Leaflet
 * en web; con fallback esquemático si el mapa nativo no está disponible),
 * la lista ordenada de paradas con su estado, y los contadores del día.
 */

import { Avatar } from '@/components/UI';
import MapaSeguimiento from '@/components/mapa/MapaSeguimiento';
import { Colors, Radius, Spacing, Typography } from '@/constants/DesignTokens';
import {
    ESTADO_PARADA_LABEL,
    EstadoParada,
    Parada,
    RecorridoGestor,
    statsDe,
    statsEquipo,
} from '@/data/seguimiento';
import { useSeguimientoEquipo } from '@/hooks/useSeguimientoEquipo';
import { supabaseConfigurado } from '@/lib/supabase';
import { ROL_LABEL, TIPO_SERVICIO_LABEL } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Dimensions, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

const COLOR_ESTADO: Record<EstadoParada, string> = {
  completado: Colors.success,
  no_localizado: Colors.danger,
  en_sitio: Colors.info,
  en_camino: Colors.warning,
  pendiente: Colors.textMuted,
};

const MAP_H = 190;
const MAP_W = Dimensions.get('window').width - Spacing.xl * 2 - Spacing.md * 2;

export default function AdminScreen() {
  const { recorridos, cargando } = useSeguimientoEquipo();
  const [abierto, setAbierto] = useState<string | null>(null);
  const eq = statsEquipo(recorridos);

  const abiertoActual = abierto ?? recorridos[0]?.gestorId ?? null;

  if (supabaseConfigurado && cargando && recorridos.length === 0) {
    return (
      <View style={[styles.screen, styles.centrado]}>
        <ActivityIndicator color={Colors.primary} />
        <Text style={styles.footNote}>Cargando ubicaciones en vivo…</Text>
      </View>
    );
  }

  if (supabaseConfigurado && recorridos.length === 0) {
    return (
      <View style={[styles.screen, styles.centrado]}>
        <Ionicons name="navigate-outline" size={40} color={Colors.textMuted} />
        <Text style={styles.equipoTitleVacio}>Ningún gestor ha compartido su ubicación todavía</Text>
        <Text style={styles.footNote}>
          En cuanto un gestor inicie sesión y acepte el permiso de ubicación, aparecerá aquí en vivo.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>Seguimiento del equipo</Text>

      {/* Resumen del equipo */}
      <View style={styles.equipoCard}>
        <View style={styles.equipoHeader}>
          <View style={styles.pulseDot} />
          <Text style={styles.equipoTitle}>{eq.gestores} gestores en campo</Text>
          <Text style={styles.equipoLive}>EN VIVO</Text>
        </View>
        <View style={styles.equipoStats}>
          <Mini label="Hechas" value={eq.completadas} color={Colors.success} />
          <Mini label="En curso" value={eq.enCurso} color={Colors.info} />
          <Mini label="No localiz." value={eq.noLocalizado} color={Colors.danger} />
          <Mini label="Pendientes" value={eq.pendientes} color={Colors.textSecondary} />
          <Mini label="% éxito" value={`${eq.tasaExito}%`} color={Colors.primary} />
        </View>
      </View>

      {recorridos.map((r) => (
        <TarjetaGestor
          key={r.gestorId}
          r={r}
          abierto={abiertoActual === r.gestorId}
          onToggle={() => setAbierto(abiertoActual === r.gestorId ? '' : r.gestorId)}
        />
      ))}

      <Text style={styles.footNote}>
        {supabaseConfigurado
          ? 'Ubicación en vivo desde el dispositivo de cada gestor. La ruta del día se arma con los servicios asignados hoy.'
          : 'Ubicaciones y rutas simuladas para el prototipo (conecta Supabase para ver datos reales).'}
      </Text>
      <View style={{ height: Spacing.xxl }} />
    </ScrollView>
  );
}

function TarjetaGestor({ r, abierto, onToggle }: { r: RecorridoGestor; abierto: boolean; onToggle: () => void }) {
  const s = statsDe(r);
  const enSitio = r.paradas.find((p) => p.estado === 'en_sitio' || p.estado === 'en_camino');

  return (
    <View style={styles.card}>
      <Pressable style={styles.cardHead} onPress={onToggle}>
        <Avatar initials={r.avatar} />

        <View style={{ flex: 1 }}>
          <Text style={styles.nombre}>{r.nombre}</Text>
          <Text style={styles.rol}>{ROL_LABEL[r.rol]} · {r.ultimoPing}</Text>
          <Text style={styles.ubicActual} numberOfLines={1}>
            {enSitio ? `${enSitio.estado === 'en_sitio' ? '📍 En' : '🚶 Hacia'} ${enSitio.cliente} · ${enSitio.zona}` : 'Sin parada activa'}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <View style={styles.bateria}>
            <Ionicons name="battery-half-outline" size={13} color={r.bateria < 30 ? Colors.danger : Colors.textSecondary} />
            <Text style={[styles.bateriaText, r.bateria < 30 && { color: Colors.danger }]}>{r.bateria}%</Text>
          </View>
          <Text style={styles.progresoMini}>{s.completadas}/{s.total} hechas</Text>
          <Ionicons name={abierto ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.textMuted} />
        </View>
      </Pressable>

      {abierto && (
        <View style={styles.cardBody}>
          {/* Mapa real de la ruta del día */}
          <MapaSeguimiento
            paradas={r.paradas}
            actual={r.actual}
            nombreGestor={r.nombre}
            alto={MAP_H}
            ancho={MAP_W}
          />

          {/* Stats del día */}
          <View style={styles.statsRow}>
            <Stat label="Hechas" value={s.completadas} color={Colors.success} />
            <Stat label="Éxito" value={`${s.tasaExito}%`} color={Colors.primary} />
            <Stat label="No local." value={s.noLocalizado} color={Colors.danger} />
            <Stat label="En curso" value={s.enCurso} color={Colors.info} />
          </View>

          {/* Ruta / timeline */}
          <Text style={styles.rutaTitle}>RUTA DEL DÍA</Text>
          {r.paradas.map((p, i) => (
            <ParadaRow key={p.servicioId} p={p} ultima={i === r.paradas.length - 1} />
          ))}

          <Pressable
            style={[styles.btnLlamar, !r.telefono && { opacity: 0.5 }]}
            disabled={!r.telefono}
            onPress={() => {
              if (!r.telefono) return;
              Linking.openURL(`tel:${r.telefono.replace(/[^\d+]/g, '')}`).catch(() =>
                console.warn('[admin] no se pudo abrir el marcador'),
              );
            }}>
            <Ionicons name="call-outline" size={16} color={Colors.primary} />
            <Text style={styles.btnLlamarText}>
              {r.telefono ? `Llamar a ${r.nombre.split(' ')[0]} · ${r.telefono}` : 'Sin teléfono registrado'}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function ParadaRow({ p, ultima }: { p: Parada; ultima: boolean }) {
  const color = COLOR_ESTADO[p.estado];
  return (
    <View style={styles.paradaRow}>
      <View style={styles.paradaLeft}>
        <View style={[styles.paradaDot, { backgroundColor: color }]}>
          <Text style={styles.paradaNum}>{p.orden}</Text>
        </View>
        {!ultima && <View style={styles.paradaLinea} />}
      </View>
      <View style={{ flex: 1, paddingBottom: Spacing.md }}>
        <View style={styles.paradaTop}>
          <Text style={styles.paradaCliente}>{p.cliente}</Text>
          <View style={[styles.paradaBadge, { backgroundColor: color + '22' }]}>
            <Text style={[styles.paradaBadgeText, { color }]}>{ESTADO_PARADA_LABEL[p.estado]}</Text>
          </View>
        </View>
        <Text style={styles.paradaMeta}>{TIPO_SERVICIO_LABEL[p.tipo]} · {p.direccion}, {p.zona}</Text>
        {p.hora && <Text style={styles.paradaHora}>🕑 {p.hora}</Text>}
      </View>
    </View>
  );
}

function Mini({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <View style={styles.miniStat}>
      <Text style={[styles.miniValue, { color }]}>{value}</Text>
      <Text style={styles.miniLabel}>{label}</Text>
    </View>
  );
}

function Stat({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.xl, paddingBottom: Spacing.xxl },
  centrado: { alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, padding: Spacing.xl },
  equipoTitleVacio: { ...Typography.subtitle, color: Colors.textPrimary, fontWeight: '700', textAlign: 'center' },
  pageTitle: { ...Typography.title, color: Colors.textPrimary, marginBottom: Spacing.lg },

  equipoCard: { backgroundColor: Colors.primary, borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.lg },
  equipoHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  pulseDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#4ADE80' },
  equipoTitle: { ...Typography.subtitle, color: '#fff', fontWeight: '700', flex: 1 },
  equipoLive: { ...Typography.micro, color: '#4ADE80', fontWeight: '800', letterSpacing: 1 },
  equipoStats: { flexDirection: 'row', justifyContent: 'space-between' },
  miniStat: { alignItems: 'center', flex: 1 },
  miniValue: { ...Typography.subtitle, fontWeight: '800' },
  miniLabel: { ...Typography.micro, color: 'rgba(255,255,255,0.7)', textTransform: 'none', letterSpacing: 0, marginTop: 2 },

  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 0.5, borderColor: Colors.border, marginBottom: Spacing.md, overflow: 'hidden' },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md },
  nombre: { ...Typography.subtitle, color: Colors.textPrimary, fontWeight: '700' },
  rol: { ...Typography.micro, color: Colors.textMuted, textTransform: 'none', letterSpacing: 0, marginTop: 1 },
  ubicActual: { ...Typography.caption, color: Colors.info, marginTop: 3 },
  bateria: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  bateriaText: { ...Typography.micro, color: Colors.textSecondary, textTransform: 'none', letterSpacing: 0 },
  progresoMini: { ...Typography.micro, color: Colors.textSecondary, textTransform: 'none', letterSpacing: 0 },

  cardBody: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.md, borderTopWidth: 0.5, borderTopColor: Colors.border },

  statsRow: { flexDirection: 'row', backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, paddingVertical: Spacing.sm, marginBottom: Spacing.md },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { ...Typography.subtitle, fontWeight: '800' },
  statLabel: { ...Typography.micro, color: Colors.textSecondary, textTransform: 'none', letterSpacing: 0, marginTop: 2 },

  rutaTitle: { ...Typography.micro, color: Colors.textMuted, letterSpacing: 0.6, marginBottom: Spacing.sm },
  paradaRow: { flexDirection: 'row', gap: Spacing.md },
  paradaLeft: { alignItems: 'center', width: 24 },
  paradaDot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  paradaNum: { ...Typography.micro, color: '#fff', fontWeight: '800', textTransform: 'none', letterSpacing: 0 },
  paradaLinea: { width: 2, flex: 1, backgroundColor: Colors.border, marginVertical: 2 },
  paradaTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  paradaCliente: { ...Typography.body, color: Colors.textPrimary, fontWeight: '700', flex: 1 },
  paradaBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: Radius.pill },
  paradaBadgeText: { ...Typography.micro, fontWeight: '700', textTransform: 'none', letterSpacing: 0 },
  paradaMeta: { ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },
  paradaHora: { ...Typography.micro, color: Colors.textMuted, textTransform: 'none', letterSpacing: 0, marginTop: 2 },

  btnLlamar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.primaryMuted, marginTop: Spacing.sm },
  btnLlamarText: { ...Typography.caption, color: Colors.primary, fontWeight: '700' },

  footNote: { ...Typography.micro, color: Colors.textMuted, textAlign: 'center', textTransform: 'none', letterSpacing: 0, marginTop: Spacing.md, lineHeight: 15 },
});