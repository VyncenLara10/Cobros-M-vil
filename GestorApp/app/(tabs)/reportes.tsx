/**
 * app/(tabs)/reportes.tsx
 * Dashboard de reportes: recuperación, comisiones, rendimiento por tipo
 */

import { Colors as COLORS, Radius as RADIUS, Spacing as SPACING } from '@/constants/DesignTokens';
import { GESTORES_MOCK, SERVICIOS_MOCK } from '@/data/mocks';
import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

// ─── Datos calculados de los mocks ──────────────────────────────────────────

function calcularResumen() {
  const cobros = SERVICIOS_MOCK.filter((s) => s.tipo === 'cobro');
  const verifs = SERVICIOS_MOCK.filter((s) => s.tipo === 'verificacion');
  const legales = SERVICIOS_MOCK.filter((s) => s.tipo === 'legal');
  const completados = SERVICIOS_MOCK.filter((s) => s.estado === 'completado');
  const totalDeuda = cobros.reduce((acc, s) => acc + s.deudaTotal, 0);
  const totalRecuperado = cobros
    .filter((s) => s.estado === 'completado')
    .reduce((acc, s) => acc + s.montoGestion, 0);
  const totalComisiones = SERVICIOS_MOCK.reduce(
    (acc, s) => acc + (s.estado === 'completado' ? s.comisionCalculada : 0),
    0
  );
  const tasaExito = SERVICIOS_MOCK.length > 0
    ? Math.round((completados.length / SERVICIOS_MOCK.length) * 100)
    : 0;

  return {
    totalServicios: SERVICIOS_MOCK.length,
    completados: completados.length,
    cobros: cobros.length,
    verifs: verifs.length,
    legales: legales.length,
    totalDeuda,
    totalRecuperado,
    totalComisiones,
    tasaExito,
  };
}

// ─── Mini barra visual ────────────────────────────────────────────────────────

function MiniBar({ pct, color }: { pct: number; color: string }) {
  return (
    <View style={miniBarStyles.track}>
      <View style={[miniBarStyles.fill, { width: `${Math.min(pct, 100)}%`, backgroundColor: color }]} />
    </View>
  );
}
const miniBarStyles = StyleSheet.create({
  track: { height: 6, backgroundColor: COLORS.surfaceAlt, borderRadius: 3, overflow: 'hidden', flex: 1 },
  fill: { height: '100%', borderRadius: 3 },
});

// ─── Tarjeta de métrica grande ───────────────────────────────────────────────

function BigMetric({ icon, label, value, sub, color }: {
  icon: string; label: string; value: string; sub?: string; color: string;
}) {
  return (
    <View style={[styles.bigMetric, { borderLeftColor: color, borderLeftWidth: 3 }]}>
      <View style={[styles.bigMetricIcon, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <View style={styles.bigMetricText}>
        <Text style={styles.bigMetricLabel}>{label}</Text>
        <Text style={[styles.bigMetricValue, { color }]}>{value}</Text>
        {sub && <Text style={styles.bigMetricSub}>{sub}</Text>}
      </View>
    </View>
  );
}

// ─── Fila de tipo de servicio ────────────────────────────────────────────────

function TipoRow({ label, count, total, color, monto }: {
  label: string; count: number; total: number; color: string; monto?: number;
}) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <View style={styles.tipoRow}>
      <View style={styles.tipoLeft}>
        <View style={[styles.tipoDot, { backgroundColor: color }]} />
        <Text style={styles.tipoLabel}>{label}</Text>
      </View>
      <MiniBar pct={pct} color={color} />
      <View style={styles.tipoRight}>
        <Text style={styles.tipoCount}>{count}</Text>
        {monto !== undefined && (
          <Text style={styles.tipoMonto}>Q {monto.toLocaleString('es-GT')}</Text>
        )}
      </View>
    </View>
  );
}

// ─── Top gestores ─────────────────────────────────────────────────────────────

function TopGestores() {
  const top = [...GESTORES_MOCK]
    .sort((a, b) => b.serviciosCompletados - a.serviciosCompletados)
    .slice(0, 3);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>TOP GESTORES</Text>
      {top.map((g, i) => (
        <View key={g.id} style={styles.gestorRow}>
          <View style={styles.rankCircle}>
            <Text style={styles.rankText}>#{i + 1}</Text>
          </View>
          <View style={styles.gestorInfo}>
            <Text style={styles.gestorNombre}>{g.nombre}</Text>
            <Text style={styles.gestorZona}>{g.zona}</Text>
          </View>
          <View style={styles.gestorStats}>
            <Text style={styles.gestorCompletados}>{g.serviciosCompletados} serv.</Text>
            <Text style={styles.gestorComision}>Q {g.comisionesAcumuladas.toLocaleString('es-GT')}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

// ─── Pantalla principal ──────────────────────────────────────────────────────

export default function ReportesScreen() {
  const r = calcularResumen();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Reportes</Text>
        <Text style={styles.headerSub}>Resumen general · Datos mock</Text>
      </View>

      {/* Métricas grandes */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>RESUMEN DE RECUPERACIÓN</Text>
        <BigMetric
          icon="cash-outline"
          label="Total recuperado"
          value={`Q ${r.totalRecuperado.toLocaleString('es-GT')}`}
          sub={`de Q ${r.totalDeuda.toLocaleString('es-GT')} en cartera`}
          color={COLORS.success}
        />
        <BigMetric
          icon="trending-up-outline"
          label="Comisiones generadas"
          value={`Q ${r.totalComisiones.toLocaleString('es-GT')}`}
          sub="pagadas a gestores"
          color={COLORS.info}
        />
        <BigMetric
          icon="checkmark-done-outline"
          label="Tasa de éxito"
          value={`${r.tasaExito}%`}
          sub={`${r.completados} de ${r.totalServicios} servicios completados`}
          color="#9B7BF0"
        />
      </View>

      {/* Distribución por tipo */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>DISTRIBUCIÓN POR TIPO</Text>
        <View style={styles.card}>
          <TipoRow
            label="Cobros"
            count={r.cobros}
            total={r.totalServicios}
            color={COLORS.info}
            monto={r.totalRecuperado}
          />
          <TipoRow
            label="Verificaciones"
            count={r.verifs}
            total={r.totalServicios}
            color={COLORS.success}
          />
          <TipoRow
            label="Gestiones legales"
            count={r.legales}
            total={r.totalServicios}
            color="#9B7BF0"
          />
        </View>
      </View>

      {/* Estados */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ESTADOS HOY</Text>
        <View style={styles.estadosGrid}>
          {[
            { label: 'Activos', count: SERVICIOS_MOCK.filter(s => s.estado === 'activo').length, color: COLORS.success },
            { label: 'Pendientes', count: SERVICIOS_MOCK.filter(s => s.estado === 'pendiente').length, color: COLORS.warning },
            { label: 'Completados', count: SERVICIOS_MOCK.filter(s => s.estado === 'completado').length, color: COLORS.info },
            { label: 'No localiz.', count: SERVICIOS_MOCK.filter(s => s.estado === 'no_localizado').length, color: COLORS.danger },
          ].map((e) => (
            <View key={e.label} style={[styles.estadoCard, { borderTopColor: e.color, borderTopWidth: 3 }]}>
              <Text style={[styles.estadoCount, { color: e.color }]}>{e.count}</Text>
              <Text style={styles.estadoLabel}>{e.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Top gestores */}
      <TopGestores />

    </ScrollView>
  );
}

// ─── Estilos ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingBottom: 100 },

  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary },
  headerSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },

  section: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 0.8,
    marginBottom: SPACING.md,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    padding: SPACING.md,
    gap: SPACING.md,
  },

  // Big metric
  bigMetric: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    gap: SPACING.md,
  },
  bigMetricIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigMetricText: { flex: 1 },
  bigMetricLabel: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 2 },
  bigMetricValue: { fontSize: 20, fontWeight: '700' },
  bigMetricSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },

  // Tipo row
  tipoRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  tipoLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, width: 110 },
  tipoDot: { width: 8, height: 8, borderRadius: 4 },
  tipoLabel: { fontSize: 13, color: COLORS.textPrimary },
  tipoRight: { alignItems: 'flex-end', width: 70 },
  tipoCount: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  tipoMonto: { fontSize: 10, color: COLORS.textMuted },

  // Estados grid
  estadosGrid: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  estadoCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: COLORS.border,
  },
  estadoCount: { fontSize: 22, fontWeight: '700' },
  estadoLabel: { fontSize: 10, color: COLORS.textSecondary, marginTop: 2, textAlign: 'center' },

  // Top gestores
  gestorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    gap: SPACING.md,
  },
  rankCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.infoMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: { fontSize: 12, fontWeight: '700', color: COLORS.info },
  gestorInfo: { flex: 1 },
  gestorNombre: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  gestorZona: { fontSize: 11, color: COLORS.textSecondary },
  gestorStats: { alignItems: 'flex-end' },
  gestorCompletados: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
  gestorComision: { fontSize: 11, color: COLORS.success },

  footerNote: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    padding: SPACING.xl,
    lineHeight: 18,
  },
});