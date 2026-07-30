import { BadgeEstado, BadgeTipo, DetailRow } from '@/components/UI';
import { Colors as COLORS, Radius as RADIUS, Spacing as SPACING } from '@/constants/DesignTokens';
import { SERVICIOS_MOCK } from '@/data/mocks';
import { useBottomInset } from '@/hooks/useBottomInset';
import { ESTADO_LABEL, Servicio } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

// ─── Botón de acción ─────────────────────────────────────────────────────────

function ActionBtn({
  icon,
  label,
  color,
  bg,
  onPress,
}: {
  icon: string;
  label: string;
  color: string;
  bg: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.actionBtn, { backgroundColor: bg }]} onPress={onPress}>
      <Ionicons name={icon as any} size={20} color={color} />
      <Text style={[styles.actionBtnText, { color }]}>{label}</Text>
    </Pressable>
  );
}

// ─── Modal: registrar pago ────────────────────────────────────────────────────

function ModalPago({
  visible,
  deudaTotal,
  comisionPct,
  onConfirmar,
  onCerrar,
}: {
  visible: boolean;
  deudaTotal: number;
  comisionPct: number;
  onConfirmar: (monto: number) => void;
  onCerrar: () => void;
}) {
  const [monto, setMonto] = useState('');
  const bottomInset = useBottomInset();

  const montoParsed = parseFloat(monto) || 0;
  const comision = montoParsed * (comisionPct / 100);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { paddingBottom: bottomInset }]}>
          <Text style={styles.modalTitle}>Registrar pago recibido</Text>
          <Text style={styles.modalSub}>
            Deuda total: Q {deudaTotal.toLocaleString('es-GT')}
          </Text>

          <Text style={styles.inputLabel}>Monto recibido del cliente (Q)</Text>
          <TextInput
            style={styles.input}
            placeholder="0.00"
            keyboardType="decimal-pad"
            value={monto}
            onChangeText={setMonto}
            placeholderTextColor={COLORS.textMuted}
          />

          {montoParsed > 0 && (
            <View style={styles.comisionBox}>
              <View style={styles.comisionRow}>
                <Text style={styles.comisionKey}>Monto ingresado</Text>
                <Text style={styles.comisionVal}>Q {montoParsed.toLocaleString('es-GT')}</Text>
              </View>
              <View style={styles.comisionRow}>
                <Text style={styles.comisionKey}>Comisión ({comisionPct}%)</Text>
                <Text style={[styles.comisionVal, { color: COLORS.success }]}>
                  Q {comision.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                </Text>
              </View>
              <View style={[styles.comisionRow, { borderTopWidth: 0.5, borderTopColor: COLORS.border, paddingTop: 6 }]}>
                <Text style={[styles.comisionKey, { fontWeight: '700' }]}>Neto empresa</Text>
                <Text style={[styles.comisionVal, { fontWeight: '700' }]}>
                  Q {(montoParsed - comision).toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                </Text>
              </View>
            </View>
          )}

          <View style={styles.modalBtns}>
            <Pressable style={styles.modalBtnSecondary} onPress={onCerrar}>
              <Text style={styles.modalBtnSecText}>Cancelar</Text>
            </Pressable>
            <Pressable
              style={[styles.modalBtnPrimary, !montoParsed && { opacity: 0.4 }]}
              onPress={() => {
                if (!montoParsed) return;
                onConfirmar(montoParsed);
              }}
              disabled={!montoParsed}>
              <Text style={styles.modalBtnPriText}>Confirmar pago</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Modal: registrar intento fallido ───────────────────────────────────────

function ModalIntento({
  visible,
  onConfirmar,
  onCerrar,
}: {
  visible: boolean;
  onConfirmar: (nota: string) => void;
  onCerrar: () => void;
}) {
  const [nota, setNota] = useState('');
  const bottomInset = useBottomInset();

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { paddingBottom: bottomInset }]}>
          <Text style={styles.modalTitle}>Registrar intento fallido</Text>
          <Text style={styles.modalSub}>Describe qué pasó al intentar la visita</Text>

          <Text style={styles.inputLabel}>Nota del intento</Text>
          <TextInput
            style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
            placeholder="Ej: Nadie atendió el timbre, vecinos dicen que viajó..."
            multiline
            value={nota}
            onChangeText={setNota}
            placeholderTextColor={COLORS.textMuted}
          />

          <View style={styles.modalBtns}>
            <Pressable style={styles.modalBtnSecondary} onPress={onCerrar}>
              <Text style={styles.modalBtnSecText}>Cancelar</Text>
            </Pressable>
            <Pressable
              style={[styles.modalBtnPrimary, { backgroundColor: COLORS.warning }, !nota.trim() && { opacity: 0.4 }]}
              onPress={() => { if (nota.trim()) onConfirmar(nota); }}
              disabled={!nota.trim()}>
              <Text style={styles.modalBtnPriText}>Registrar</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Pantalla de detalle ─────────────────────────────────────────────────────

export default function DetalleServicioScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const bottomInset = useBottomInset();
  const [modalPago, setModalPago] = useState(false);
  const [modalIntento, setModalIntento] = useState(false);

  // Buscar servicio en mocks (después vendrá del API)
  const servicio: Servicio | undefined = SERVICIOS_MOCK.find((s) => s.id === id);

  if (!servicio) {
    return (
      <View style={styles.notFound}>
        <Ionicons name="alert-circle-outline" size={48} color={COLORS.textMuted} />
        <Text style={styles.notFoundText}>Servicio no encontrado</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={{ color: COLORS.info, marginTop: 8 }}>Volver</Text>
        </Pressable>
      </View>
    );
  }

  // ── Acciones ──────────────────────────────────────────────────────────

  const handlePagoConfirmado = (monto: number) => {
    setModalPago(false);
    Alert.alert(
      '✅ Pago registrado',
      `Se registró un pago de Q ${monto.toLocaleString('es-GT')}.\nComisión del gestor: Q ${(monto * servicio.comisionPct / 100).toFixed(2)}`,
      [{ text: 'OK', onPress: () => router.back() }]
    );
    // TODO: await fetch(`/api/servicios/${id}/pago`, { method: 'POST', body: { monto } })
  };

  const handleIntentoFallido = (nota: string) => {
    setModalIntento(false);
    Alert.alert('Intento registrado', nota, [{ text: 'OK' }]);
    // TODO: await fetch(`/api/servicios/${id}/intento`, { method: 'POST', body: { nota, resultado: 'fallido' } })
  };

  const handleEscalarLegal = () => {
    Alert.alert(
      'Escalar a gestión legal',
      '¿Confirmas que este caso debe escalarse al área legal?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Escalar',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Caso escalado', 'Se notificó al equipo legal.');
            // TODO: await fetch(`/api/servicios/${id}/escalar-legal`, { method: 'POST' })
          },
        },
      ]
    );
  };

  const handleNoLocalizado = () => {
    Alert.alert(
      'Marcar como no localizado',
      'Se registrará que el cliente no fue encontrado en la dirección indicada.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Marcado', 'El caso quedó como "No localizado".');
            router.back();
            // TODO: await fetch(`/api/servicios/${id}/estado`, { method: 'PATCH', body: { estado: 'no_localizado' } })
          },
        },
      ]
    );
  };

  const estaActivo = servicio.estado === 'activo' || servicio.estado === 'pendiente';

  return (
    <>
      <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingBottom: 100 + bottomInset }]}>
        {/* Header back */}
        <Pressable style={styles.backRow} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.info} />
          <Text style={styles.backText}>Mis servicios</Text>
        </Pressable>

        {/* Badges + ID */}
        <View style={styles.badgeRow}>
          <BadgeTipo tipo={servicio.tipo} />
          <BadgeEstado estado={servicio.estado} />
          <Text style={styles.idText}>{servicio.id}</Text>
        </View>

        {/* Nombre del cliente */}
        <Text style={styles.clienteNombre}>{servicio.cliente.nombre}</Text>

        {/* ── Sección: Datos del cliente ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>DATOS DEL CLIENTE</Text>
          <DetailRow label="Dirección" value={`${servicio.cliente.direccion} · ${servicio.cliente.zona}`} />
          <DetailRow label="Teléfono" value={servicio.cliente.telefono} />
          {servicio.tipo === 'cobro' && (
            <DetailRow
              label="Deuda total"
              value={`Q ${servicio.deudaTotal.toLocaleString('es-GT')}`}
              valueColor={COLORS.danger}
            />
          )}
          {servicio.tipoGestionLegal && (
            <DetailRow label="Tipo de gestión" value={servicio.tipoGestionLegal} />
          )}
          <DetailRow label="Notas" value={servicio.notas} />
        </View>

        {/* ── Sección: Datos del servicio ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>DATOS DEL SERVICIO</Text>
          <DetailRow label="Gestor asignado" value={servicio.gestorNombre} />
          <DetailRow label="Asignado el" value={servicio.fechaAsignacion} />
          <DetailRow label="Fecha límite" value={servicio.fechaLimite} />
          <DetailRow
            label="Monto de gestión"
            value={`Q ${servicio.montoGestion.toLocaleString('es-GT')}`}
          />
          {servicio.tipo === 'cobro' && (
            <DetailRow
              label="Comisión del gestor"
              value={`${servicio.comisionPct}% · Q ${servicio.comisionCalculada.toLocaleString('es-GT')} estimado`}
              valueColor={COLORS.success}
            />
          )}
          {servicio.tarifaLegal && (
            <DetailRow
              label="Tarifa legal"
              value={`Q ${servicio.tarifaLegal.toLocaleString('es-GT')}`}
              valueColor={COLORS.success}
            />
          )}
        </View>

        {/* ── Historial de intentos ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            HISTORIAL DE INTENTOS ({servicio.intentos.length})
          </Text>
          {servicio.intentos.length === 0 ? (
            <Text style={styles.noIntentos}>Sin intentos registrados aún</Text>
          ) : (
            servicio.intentos.map((intento, i) => (
              <View key={intento.id} style={styles.intentoRow}>
                <View style={styles.intentoTimeline}>
                  <View style={[styles.intentoDot, {
                    backgroundColor: intento.resultado === 'Entregado' ? COLORS.success : COLORS.warning
                  }]} />
                  {i < servicio.intentos.length - 1 && <View style={styles.intentoLine} />}
                </View>
                <View style={styles.intentoContent}>
                  <View style={styles.intentoHeader}>
                    <Text style={styles.intentoResultado}>{intento.resultado}</Text>
                    <Text style={styles.intentoFecha}>{intento.fecha}</Text>
                  </View>
                  <Text style={styles.intentoNota}>{intento.nota}</Text>
                  {intento.geolocalizacion && (
                    <Text style={styles.intentoGeo}>📍 {intento.geolocalizacion}</Text>
                  )}
                </View>
              </View>
            ))
          )}
        </View>

        {/* ── Acciones (solo si está activo/pendiente) ── */}
        {estaActivo && (
          <View style={styles.actionsSection}>
            <Text style={styles.cardTitle}>ACCIONES</Text>

            {servicio.tipo === 'cobro' && (
              <ActionBtn
                icon="cash-outline"
                label="Registrar pago recibido"
                color={COLORS.success}
                bg={`${COLORS.success}15`}
                onPress={() => setModalPago(true)}
              />
            )}
            {(servicio.tipo === 'verificacion' || servicio.tipo === 'legal') && (
              <ActionBtn
                icon="checkmark-circle-outline"
                label="Marcar como completado"
                color={COLORS.success}
                bg={`${COLORS.success}15`}
                onPress={() => Alert.alert('Completado', 'Servicio marcado como completado.')}
              />
            )}

            <ActionBtn
              icon="close-circle-outline"
              label="Registrar intento fallido"
              color={COLORS.warning}
              bg={`${COLORS.warning}15`}
              onPress={() => setModalIntento(true)}
            />

            {servicio.tipo !== 'legal' && (
              <ActionBtn
                icon="scale-outline"
                label="Escalar a gestión legal"
                color="#9B7BF0"
                bg="rgba(155,123,240,0.12)"
                onPress={handleEscalarLegal}
              />
            )}

            <ActionBtn
              icon="map-outline"
              label="Marcar como no localizado"
              color={COLORS.danger}
              bg={`${COLORS.danger}12`}
              onPress={handleNoLocalizado}
            />
          </View>
        )}

        {/* Estado final si ya cerrado */}
        {!estaActivo && (
          <View style={[styles.estadoFinal, {
            backgroundColor:
              servicio.estado === 'completado' ? `${COLORS.success}12` : `${COLORS.danger}12`
          }]}>
            <Ionicons
              name={servicio.estado === 'completado' ? 'checkmark-circle' : 'close-circle'}
              size={24}
              color={servicio.estado === 'completado' ? COLORS.success : COLORS.danger}
            />
            <Text style={[styles.estadoFinalText, {
              color: servicio.estado === 'completado' ? COLORS.success : COLORS.danger
            }]}>
              Caso {ESTADO_LABEL[servicio.estado]}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Modales */}
      <ModalPago
        visible={modalPago}
        deudaTotal={servicio.deudaTotal}
        comisionPct={servicio.comisionPct}
        onConfirmar={handlePagoConfirmado}
        onCerrar={() => setModalPago(false)}
      />
      <ModalIntento
        visible={modalIntento}
        onConfirmar={handleIntentoFallido}
        onCerrar={() => setModalIntento(false)}
      />
    </>
  );
}

// ─── Estilos ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md, paddingBottom: 100 },

  backRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: SPACING.lg },
  backText: { fontSize: 14, color: COLORS.accent, fontWeight: '600' },

  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  idText: { fontSize: 11, color: COLORS.textMuted, fontFamily: 'monospace', marginLeft: 'auto' },

  clienteNombre: { fontSize: 22, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.lg },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 0.8,
    marginBottom: SPACING.sm,
  },

  // Intentos
  noIntentos: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', paddingVertical: 12 },
  intentoRow: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.md },
  intentoTimeline: { alignItems: 'center', width: 16 },
  intentoDot: { width: 12, height: 12, borderRadius: 6, marginTop: 3 },
  intentoLine: { flex: 1, width: 1.5, backgroundColor: COLORS.border, marginTop: 4 },
  intentoContent: { flex: 1 },
  intentoHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  intentoResultado: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  intentoFecha: { fontSize: 11, color: COLORS.textMuted },
  intentoNota: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 18 },
  intentoGeo: { fontSize: 11, color: COLORS.textMuted, marginTop: 4 },

  // Acciones
  actionsSection: { marginBottom: SPACING.md },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  actionBtnText: { fontSize: 14, fontWeight: '600' },

  // Estado final
  estadoFinal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  estadoFinalText: { fontSize: 15, fontWeight: '700' },

  // Not found
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  notFoundText: { fontSize: 16, color: COLORS.textSecondary },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.xl,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  modalSub: { fontSize: 13, color: COLORS.textSecondary, marginBottom: SPACING.lg },
  inputLabel: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 6, fontWeight: '600' },
  input: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.md,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    padding: SPACING.md,
    fontSize: 16,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  comisionBox: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    gap: 6,
  },
  comisionRow: { flexDirection: 'row', justifyContent: 'space-between' },
  comisionKey: { fontSize: 13, color: COLORS.textSecondary },
  comisionVal: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  modalBtns: { flexDirection: 'row', gap: SPACING.sm },
  modalBtnSecondary: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
  },
  modalBtnPrimary: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.success,
    alignItems: 'center',
  },
  modalBtnSecText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  modalBtnPriText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});