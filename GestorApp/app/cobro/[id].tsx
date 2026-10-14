/**
 * app/cobro/[id].tsx
 * Formulario que completa el COBRADOR tras aceptar un cobro. Igual que la
 * verificación, está separado de "aceptar": el formulario permanece bloqueado
 * hasta confirmar la llegada a la ubicación.
 *
 * El cliente puede deber en VARIOS bancos; cada banco tiene su propio saldo y
 * su propio % de comisión. Aquí el cobrador registra cuánto recuperó de cada
 * banco y la comisión se calcula SOLO sobre lo recuperado.
 */

import FormInput from '@/components/(auth)/FormInput';
import PrimaryButton from '@/components/(auth)/PrimaryButton';
import { ClienteEditableFields, useClienteEditable } from '@/components/servicio/ClienteEditable';
import { Colors, Radius, Spacing, Typography } from '@/constants/DesignTokens';
import { completarServicio, marcarEnSitio } from '@/domain/servicios/servicios';
import { comisionMaxCredito, comisionSobreRecuperado } from '@/types';
import { useBottomInset } from '@/hooks/useBottomInset';
import { useServicio } from '@/hooks/useServicios';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

type Resultado = 'pago' | 'abono' | 'no_pago' | 'no_localizado';

const RESULTADOS: { id: Resultado; label: string; icon: string; color: string }[] = [
  { id: 'pago', label: 'Pago total', icon: 'checkmark-circle', color: Colors.success },
  { id: 'abono', label: 'Abono parcial', icon: 'cash', color: Colors.warning },
  { id: 'no_pago', label: 'No pagó', icon: 'close-circle', color: Colors.danger },
  { id: 'no_localizado', label: 'No localizado', icon: 'help-circle', color: Colors.textMuted },
];

export default function FormularioCobroScreen() {
  const bottomInset = useBottomInset();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { servicio, cargando } = useServicio(id);

  const [enSitioForzado, setEnSitioForzado] = useState(false);
  const enSitio = enSitioForzado || servicio?.fase === 'en_sitio';
  const [confirmando, setConfirmando] = useState(false);
  const cli = useClienteEditable(servicio?.cliente ?? ({ nombre: '', telefono: '', direccion: '', zona: '' } as any));
  const [recuperado, setRecuperado] = useState<Record<string, string>>({});
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [notas, setNotas] = useState('');
  const [enviando, setEnviando] = useState(false);

  const creditos = servicio?.creditos ?? [];

  // Totales (hooks antes de cualquier return condicional)
  const totales = useMemo(() => {
    let recTotal = 0;
    let comTotal = 0;
    for (const c of creditos) {
      const rec = Math.min(parseFloat(recuperado[c.id] || '0') || 0, c.saldoReal);
      recTotal += rec;
      comTotal += comisionSobreRecuperado(rec, c.porcentajeComision);
    }
    return { recTotal, comTotal: Math.round(comTotal * 100) / 100 };
  }, [recuperado, creditos]);

  if (cargando) {
    return (
      <View style={styles.notFound}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  if (!servicio) {
    return (
      <View style={styles.notFound}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.textMuted} />
        <Text style={styles.notFoundText}>Cobro no encontrado</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={{ color: Colors.info, marginTop: 8 }}>Volver</Text>
        </Pressable>
      </View>
    );
  }

  const confirmarLlegada = async () => {
    setConfirmando(true);
    await marcarEnSitio(servicio.id);
    setConfirmando(false);
    setEnSitioForzado(true);
  };

  const enviar = async () => {
    if (!resultado) {
      Alert.alert('Falta el resultado', 'Indica cómo terminó la gestión de cobro.');
      return;
    }
    setEnviando(true);
    await completarServicio(servicio, resultado === 'no_localizado' ? 'no_localizado' : 'completado', {
      notaGestor: notas,
      clienteActualizado: cli.cambios,
    });
    setEnviando(false);
    Alert.alert(
      '✅ Cobro registrado',
      `Recuperado: Q ${totales.recTotal.toLocaleString('es-GT', { minimumFractionDigits: 2 })}\nTu comisión: Q ${totales.comTotal.toLocaleString('es-GT', { minimumFractionDigits: 2 })}`,
      [{ text: 'OK', onPress: () => router.back() }],
    );
  };

  // ══════════════ CANDADO DE UBICACIÓN ══════════════
  if (!enSitio) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingBottom: bottomInset }]}>
        <Pressable style={styles.backRow} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={Colors.primary} />
          <Text style={styles.backText}>Volver</Text>
        </Pressable>

        <View style={styles.gateIconWrap}>
          <Ionicons name="location-outline" size={40} color={Colors.primary} />
        </View>
        <Text style={styles.gateTitle}>Dirígete a la ubicación</Text>
        <Text style={styles.gateSub}>
          El cobro ya es tuyo. Registra el pago estando en el lugar; confirma tu llegada para
          desbloquear el formulario.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>DESTINO</Text>
          <Text style={styles.gateNombre}>{servicio.cliente.nombre}</Text>
          <View style={styles.gateDirRow}>
            <Ionicons name="navigate-outline" size={16} color={Colors.textSecondary} />
            <Text style={styles.gateDir}>{servicio.cliente.direccion} · {servicio.cliente.zona}</Text>
          </View>
          <View style={styles.gateChip}>
            <Ionicons name="cash-outline" size={13} color={Colors.warning} />
            <Text style={styles.gateChipText}>Saldo Q {servicio.deudaTotal.toLocaleString('es-GT', { minimumFractionDigits: 2 })}</Text>
          </View>
        </View>

        <View style={styles.gateAviso}>
          <Ionicons name="lock-closed-outline" size={15} color={Colors.textSecondary} />
          <Text style={styles.gateAvisoText}>No podrás registrar el cobro antes de estar en la ubicación.</Text>
        </View>

        <PrimaryButton
          label={confirmando ? 'Verificando ubicación…' : 'Estoy en la ubicación'}
          onPress={confirmarLlegada}
          loading={confirmando}
          style={{ marginTop: Spacing.lg }}
        />
      </ScrollView>
    );
  }

  // ══════════════ FORMULARIO DE COBRO ══════════════
  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingBottom: bottomInset }]}>
      <Pressable style={styles.backRow} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={20} color={Colors.primary} />
        <Text style={styles.backText}>Guardar y salir</Text>
      </Pressable>

      <View style={styles.enSitioBanner}>
        <Ionicons name="location" size={16} color={Colors.success} />
        <Text style={styles.enSitioText}>En la ubicación · formulario desbloqueado</Text>
      </View>

      <Text style={styles.title}>{servicio.cliente.nombre}</Text>
      <Text style={styles.subtitle}>{servicio.cliente.direccion} · {servicio.cliente.zona}</Text>

      {servicio.cliente.referencias && servicio.cliente.referencias.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>CONTACTOS</Text>
          {servicio.cliente.referencias.map((r, i) => (
            <View key={i} style={styles.refRow}>
              <Text style={styles.refLabel}>{r.parentesco ?? 'Contacto'}</Text>
              <Text style={styles.refValue}>{r.nombre} · {r.telefono}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Actualizar datos del cliente */}
      <ClienteEditableFields valores={cli.valores} setCampo={cli.setCampo} huboCambios={cli.huboCambios} />

      {/* Registro de recuperación por banco */}
      <Text style={styles.sectionLabel}>RECUPERACIÓN POR BANCO</Text>
      <Text style={styles.fotosAyuda}>Ingresa cuánto recuperaste de cada banco. La comisión se calcula sobre ese monto.</Text>

      {creditos.map((c) => {
        const rec = Math.min(parseFloat(recuperado[c.id] || '0') || 0, c.saldoReal);
        const com = comisionSobreRecuperado(rec, c.porcentajeComision);
        return (
          <View key={c.id} style={styles.bancoCard}>
            <View style={styles.bancoHeader}>
              <Text style={styles.bancoNombre}>{c.banco}</Text>
              <Text style={styles.bancoPct}>{c.porcentajeComision}%</Text>
            </View>
            <Text style={styles.bancoNum}>{c.numeroCredito} · {c.tipoCredito}</Text>
            <View style={styles.bancoInfoRow}>
              <Text style={styles.bancoInfo}>Saldo: Q {c.saldoReal.toLocaleString('es-GT', { minimumFractionDigits: 2 })}</Text>
              <Text style={styles.bancoInfo}>Comisión máx.: Q {comisionMaxCredito(c).toLocaleString('es-GT', { minimumFractionDigits: 2 })}</Text>
            </View>
            <FormInput
              label="Recuperado (Q)"
              placeholder="0.00"
              keyboardType="decimal-pad"
              value={recuperado[c.id] ?? ''}
              onChangeText={(t) => setRecuperado((p) => ({ ...p, [c.id]: t }))}
              hint={rec > 0 ? `Comisión de este banco: Q ${com.toLocaleString('es-GT', { minimumFractionDigits: 2 })}` : undefined}
            />
          </View>
        );
      })}

      {/* Totales */}
      <View style={styles.totalBox}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total recuperado</Text>
          <Text style={styles.totalSaldo}>Q {totales.recTotal.toLocaleString('es-GT', { minimumFractionDigits: 2 })}</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Tu comisión (sobre lo recuperado)</Text>
          <Text style={styles.totalComision}>Q {totales.comTotal.toLocaleString('es-GT', { minimumFractionDigits: 2 })}</Text>
        </View>
      </View>

      {/* Resultado */}
      <Text style={styles.sectionLabel}>RESULTADO DE LA GESTIÓN</Text>
      <View style={styles.resultadoGrid}>
        {RESULTADOS.map((r) => {
          const activo = resultado === r.id;
          return (
            <Pressable
              key={r.id}
              style={[styles.resultadoCard, activo && { borderColor: r.color, borderWidth: 2, backgroundColor: Colors.surfaceAlt }]}
              onPress={() => setResultado(r.id)}
            >
              <Ionicons name={r.icon as any} size={20} color={r.color} />
              <Text style={[styles.resultadoText, { color: activo ? r.color : Colors.textSecondary }]}>{r.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <FormInput label="Notas del cobro" placeholder="Acuerdo de pago, próxima visita, observaciones…" value={notas} onChangeText={setNotas} />

      <PrimaryButton label={enviando ? 'Registrando…' : 'Registrar cobro'} onPress={enviar} loading={enviando} style={{ marginTop: Spacing.md }} />
      <View style={{ height: Spacing.xxl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.xl, paddingBottom: Spacing.xxxl },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.lg },
  backText: { ...Typography.caption, color: Colors.primary, fontWeight: '600' },

  gateIconWrap: { alignSelf: 'center', width: 84, height: 84, borderRadius: 42, backgroundColor: Colors.primaryMuted, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.lg, marginBottom: Spacing.md },
  gateTitle: { ...Typography.title, color: Colors.textPrimary, textAlign: 'center' },
  gateSub: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center', lineHeight: 21, marginTop: Spacing.sm, marginBottom: Spacing.xl },
  gateNombre: { ...Typography.subtitle, color: Colors.textPrimary, fontWeight: '700', marginBottom: 4 },
  gateDirRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.sm },
  gateDir: { ...Typography.caption, color: Colors.textSecondary, flex: 1 },
  gateChip: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', backgroundColor: Colors.warningMuted, paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: Radius.pill },
  gateChipText: { ...Typography.micro, color: '#92400E', fontWeight: '700', textTransform: 'none', letterSpacing: 0 },
  gateAviso: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center', backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, padding: Spacing.md, marginTop: Spacing.md },
  gateAvisoText: { ...Typography.caption, color: Colors.textSecondary, flex: 1 },

  enSitioBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: Colors.successMuted, paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: Radius.pill, marginBottom: Spacing.md },
  enSitioText: { ...Typography.micro, color: '#065F46', fontWeight: '700', textTransform: 'none', letterSpacing: 0 },

  title: { ...Typography.title, color: Colors.textPrimary },
  subtitle: { ...Typography.caption, color: Colors.textSecondary, marginBottom: Spacing.lg },

  card: { backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 0.5, borderColor: Colors.border, padding: Spacing.md, marginBottom: Spacing.lg },
  cardTitle: { ...Typography.micro, color: Colors.textMuted, letterSpacing: 0.6, marginBottom: Spacing.sm },
  refRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  refLabel: { ...Typography.caption, color: Colors.textSecondary },
  refValue: { ...Typography.caption, color: Colors.textPrimary, fontWeight: '600' },

  sectionLabel: { ...Typography.micro, color: Colors.textMuted, letterSpacing: 0.8, marginBottom: Spacing.sm, marginTop: Spacing.md },
  fotosAyuda: { ...Typography.caption, color: Colors.textMuted, marginBottom: Spacing.md },

  bancoCard: { backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 0.5, borderColor: Colors.border, padding: Spacing.md, marginBottom: Spacing.md },
  bancoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bancoNombre: { ...Typography.body, color: Colors.textPrimary, fontWeight: '700' },
  bancoPct: { ...Typography.caption, color: Colors.warning, fontWeight: '800' },
  bancoNum: { ...Typography.micro, color: Colors.textMuted, marginTop: 2, marginBottom: Spacing.sm, textTransform: 'none', letterSpacing: 0 },
  bancoInfoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm },
  bancoInfo: { ...Typography.caption, color: Colors.textSecondary },

  totalBox: { backgroundColor: Colors.primaryMuted, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.lg },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  totalLabel: { ...Typography.caption, color: Colors.textSecondary, flex: 1 },
  totalSaldo: { ...Typography.subtitle, color: Colors.textPrimary, fontWeight: '800' },
  totalComision: { ...Typography.subtitle, color: Colors.success, fontWeight: '800' },

  resultadoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.lg },
  resultadoCard: { width: '47%', flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.md, paddingHorizontal: Spacing.md, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  resultadoText: { ...Typography.caption, fontWeight: '700' },

  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.background },
  notFoundText: { ...Typography.subtitle, color: Colors.textSecondary },
});