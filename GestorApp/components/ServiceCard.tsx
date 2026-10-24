import { Colors as COLORS, Radius as RADIUS, Spacing as SPACING } from '@/constants/DesignTokens';
import { useSesion } from '@/domain/auth/sesion';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Servicio } from '../types';
import { BadgeEstado, BadgeTipo } from './UI';

interface Props {
  servicio: Servicio;
  onPress: (id: string) => void;
  /** Si se provee, se muestra el botón "Aceptar" en tarjetas pendientes. */
  onAceptar?: (servicio: Servicio) => void;
  aceptando?: boolean;
}

export default function ServiceCard({ servicio, onPress, onAceptar, aceptando }: Props) {
  const { usuario } = useSesion();
  const formatMonto = (n: number) =>
    n > 0 ? `Q ${n.toLocaleString('es-GT')}` : '—';

  const esPendiente = servicio.estado === 'pendiente' && servicio.gestorId == null;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(servicio.id)}
      activeOpacity={0.75}>
      {/* Header (el ID interno solo lo ve el admin) */}
      <View style={styles.cardTop}>
        {usuario?.rol === 'admin' && <Text style={styles.cardId}>{servicio.id}</Text>}
        <BadgeTipo tipo={servicio.tipo} />
      </View>

      {/* Cliente */}
      <Text style={styles.clientName}>{servicio.cliente.nombre}</Text>
      <Text style={styles.clientAddress}>
        📍 {servicio.cliente.direccion} · {servicio.cliente.zona}
      </Text>

      {/* Chips de cercanía (ranking Uber) */}
      {(servicio.distanciaKm != null || servicio.enMiZona) && (
        <View style={styles.chipsRow}>
          {servicio.distanciaKm != null && (
            <View style={[styles.chip, servicio.distanciaKm <= 3 && styles.chipCerca]}>
              <Text style={[styles.chipText, servicio.distanciaKm <= 3 && styles.chipTextCerca]}>
                📍 {servicio.distanciaKm} km
              </Text>
            </View>
          )}
          {servicio.distanciaKm != null && servicio.distanciaKm <= 3 && (
            <View style={[styles.chip, styles.chipCerca]}>
              <Text style={[styles.chipText, styles.chipTextCerca]}>Cerca de ti</Text>
            </View>
          )}
          {servicio.enMiZona && (
            <View style={styles.chip}>
              <Text style={styles.chipText}>Tu zona</Text>
            </View>
          )}
        </View>
      )}

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
        {esPendiente && onAceptar ? (
          <TouchableOpacity
            style={[styles.aceptarBtn, aceptando && { opacity: 0.6 }]}
            onPress={() => onAceptar(servicio)}
            disabled={aceptando}
            activeOpacity={0.8}>
            <Text style={styles.aceptarText}>{aceptando ? '…' : 'Aceptar'}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.arrowChip}>
            <Text style={styles.arrowText}>Ver →</Text>
          </View>
        )}
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
  chipsRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  chip: {
    backgroundColor: COLORS.surfaceAlt,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: RADIUS.pill,
    borderWidth: 0.5,
    borderColor: COLORS.border,
  },
  chipCerca: {
    backgroundColor: COLORS.successMuted,
    borderColor: COLORS.success,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  chipTextCerca: {
    color: '#065F46',
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
    borderRadius: RADIUS.pill,
  },
  arrowText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  aceptarBtn: {
    backgroundColor: COLORS.success,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
  },
  aceptarText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
});
