/**
 * components/UI.tsx
 * Componentes visuales reutilizables.
 * Ubícalo en: components/UI.tsx
 */

import { Colors, EstadoColors, Radius, TipoColors } from '@/constants/DesignTokens';
import { EstadoServicio, TipoServicio } from '@/types';
import { StyleSheet, Text, View } from 'react-native';

const TIPO_LABEL: Record<TipoServicio, string> = {
  cobro: 'Cobro',
  verificacion: 'Verificación',
  legal: 'Legal',
  notificacion: 'Notificación',
};

const ESTADO_LABEL: Record<EstadoServicio, string> = {
  activo: 'Activo',
  pendiente: 'Pendiente',
  completado: 'Completado',
  no_localizado: 'No localizado',
  fallido: 'Fallido',
};

// ─── Badge tipo de servicio ────────────────────────────────────────────────
export function BadgeTipo({ tipo }: { tipo: TipoServicio }) {
  const scheme = TipoColors[tipo] ?? TipoColors.cobro;
  return (
    <View style={[styles.badge, { backgroundColor: scheme.muted }]}>
      <Text style={[styles.badgeText, { color: scheme.text }]}>
        {TIPO_LABEL[tipo]}
      </Text>
    </View>
  );
}

// ─── Badge estado ──────────────────────────────────────────────────────────
export function BadgeEstado({ estado }: { estado: EstadoServicio }) {
  const scheme = EstadoColors[estado] ?? EstadoColors.pendiente;
  return (
    <View style={[styles.badge, { backgroundColor: scheme.muted }]}>
      <View style={[styles.dot, { backgroundColor: scheme.base }]} />
      <Text style={[styles.badgeText, { color: scheme.text }]}>
        {ESTADO_LABEL[estado]}
      </Text>
    </View>
  );
}

// ─── Stat card ─────────────────────────────────────────────────────────────
export function StatCard({ label, value, color }: {
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, color ? { color } : {}]}>{value}</Text>
    </View>
  );
}

// ─── Section title ─────────────────────────────────────────────────────────
export function SectionTitle({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

// ─── Avatar circle ─────────────────────────────────────────────────────────
export function Avatar({ initials, size = 40 }: { initials: string; size?: number }) {
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.35 }]}>{initials}</Text>
    </View>
  );
}

// ─── Empty state ───────────────────────────────────────────────────────────
export function EmptyState({ icon, title, subtitle }: {
  icon: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>{icon}</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle ? <Text style={styles.emptySubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

// ─── Detail row ────────────────────────────────────────────────────────────
export function DetailRow({ label, value, valueColor }: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailKey}>{label}</Text>
      <Text style={[styles.detailVal, valueColor ? { color: valueColor } : {}]}>{value}</Text>
    </View>
  );
}

// ─── Estilos ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    gap: 4,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: 12,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginTop: 4,
  },
  avatar: {
    backgroundColor: Colors.infoMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: Colors.info,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    maxWidth: 240,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
    gap: 12,
  },
  detailKey: {
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
  },
  detailVal: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textPrimary,
    flex: 1.5,
    textAlign: 'right',
  },
});