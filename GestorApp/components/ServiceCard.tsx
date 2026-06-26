import { Colors as COLORS, Radius as RADIUS, Spacing as SPACING } from '@/constants/DesignTokens';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Servicio } from '../types';
import { BadgeEstado, BadgeTipo } from './UI';

interface Props {
  servicio: Servicio;
  onPress: (id: string) => void;
}

export default function ServiceCard({ servicio, onPress }: Props) {
  const formatMonto = (n: number) =>
    n > 0 ? `Q ${n.toLocaleString('es-GT')}` : '—';

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(servicio.id)}
      activeOpacity={0.75}>
      {/* Header */}
      <View style={styles.cardTop}>
        <Text style={styles.cardId}>{servicio.id}</Text>
        <BadgeTipo tipo={servicio.tipo} />
      </View>

      {/* Cliente */}
      <Text style={styles.clientName}>{servicio.cliente.nombre}</Text>
      <Text style={styles.clientAddress}>
        📍 {servicio.cliente.direccion} · {servicio.cliente.zona}
      </Text>

      {/* Meta row */}
      <View style={styles.metaRow}>
        <BadgeEstado estado={servicio.estado} />
        <Text style={styles.metaText}>🕐 {servicio.fechaLimite.split(' ')[1]}</Text>
        <Text style={styles.metaText}>👤 {servicio.gestorNombre}</Text>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <View>
          {servicio.tipo === 'cobro' && (
            <Text style={styles.footerSub}>
              Deuda: {formatMonto(servicio.deudaTotal)} · {servicio.comisionPct}% comisión
            </Text>
          )}
          {servicio.tipo === 'legal' && servicio.tipoGestionLegal && (
            <Text style={styles.footerSub}>{servicio.tipoGestionLegal}</Text>
          )}
          {servicio.tipo === 'verificacion' && (
            <Text style={styles.footerSub}>Verificación de campo</Text>
          )}
          <Text style={styles.footerMonto}>{formatMonto(servicio.montoGestion)}</Text>
        </View>
        <View style={styles.arrowChip}>
          <Text style={styles.arrowText}>Ver →</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  cardId: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontFamily: 'monospace',
  },
  clientName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  clientAddress: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flexWrap: 'wrap',
    marginBottom: SPACING.sm,
  },
  metaText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingTop: SPACING.sm,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.border,
  },
  footerSub: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  footerMonto: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  arrowChip: {
    backgroundColor: COLORS.surfaceAlt,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
  },
  arrowText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
});