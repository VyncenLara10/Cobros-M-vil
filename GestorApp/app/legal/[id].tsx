/**
 * app/legal/[id].tsx
 * Formulario que completa el ABOGADO tras aceptar una gestión LEGAL. Igual que
 * los demás: bloqueado hasta confirmar llegada a la ubicación. Permite dejar
 * constancia de la diligencia (firma/negativa), actualizar datos del cliente y
 * registrar la nota del gestor.
 */

import DocumentUploader from '@/components/(auth)/Documentuploader';
import FormInput from '@/components/(auth)/FormInput';
import PrimaryButton from '@/components/(auth)/PrimaryButton';
import { ClienteEditableFields, useClienteEditable } from '@/components/servicio/ClienteEditable';
import { Colors, Radius, Spacing, Typography } from '@/constants/DesignTokens';
import { subirEvidencias } from '@/domain/servicios/evidencias';
import { completarServicio, marcarEnSitio } from '@/domain/servicios/servicios';
import { useBottomInset } from '@/hooks/useBottomInset';
import { useServicio } from '@/hooks/useServicios';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

type Resultado = 'notificado' | 'sin_firma' | 'no_localizado' | 'rechazo';

const RESULTADOS: { id: Resultado; label: string; icon: string; color: string }[] = [
  { id: 'notificado', label: 'Notificado y firmado', icon: 'checkmark-circle', color: Colors.success },
  { id: 'sin_firma', label: 'Entregado sin firma', icon: 'document-text', color: Colors.info },
  { id: 'no_localizado', label: 'No localizado', icon: 'help-circle', color: Colors.textMuted },
  { id: 'rechazo', label: 'Se negó a recibir', icon: 'close-circle', color: Colors.danger },
];

export default function FormularioLegalScreen() {
  const bottomInset = useBottomInset();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { servicio, cargando } = useServicio(id);

  const [enSitioForzado, setEnSitioForzado] = useState(false);
  const enSitio = enSitioForzado || servicio?.fase === 'en_sitio';
  const [confirmando, setConfirmando] = useState(false);
  const cli = useClienteEditable(servicio?.cliente ?? ({ nombre: '', telefono: '', direccion: '', zona: '' } as any));
  const [recibioNombre, setRecibioNombre] = useState('');
  const [evidencia, setEvidencia] = useState<string | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [notas, setNotas] = useState('');
  const [enviando, setEnviando] = useState(false);

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
        <Text style={styles.notFoundText}>Gestión legal no encontrada</Text>
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
      Alert.alert('Falta el resultado', 'Indica cómo terminó la diligencia.');
      return;
    }
    setEnviando(true);
    const notaFinal = [
      recibioNombre ? `Recibió: ${recibioNombre}` : '',
      notas,
    ].filter(Boolean).join('. ');
    await completarServicio(servicio, resultado === 'no_localizado' ? 'no_localizado' : 'completado', {
      notaGestor: notaFinal,
      clienteActualizado: cli.cambios,
    });
    let avisoFotos = '';
    if (evidencia) {
      const evid = await subirEvidencias(servicio.id, { evidencia });
      if (evid.fallidas > 0) avisoFotos = '\n⚠️ No se pudo subir la evidencia; verifica tu conexión.';
    }
    setEnviando(false);
    Alert.alert(
      '✅ Diligencia registrada',
      `Resultado: ${RESULTADOS.find((r) => r.id === resultado)?.label}.${avisoFotos}`,
      [{ text: 'OK', onPress: () => router.back() }],
    );
  };

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
          La gestión ya es tuya. Confirma tu llegada para registrar la diligencia en el lugar.
        </Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>DESTINO</Text>
          <Text style={styles.gateNombre}>{servicio.cliente.nombre}</Text>
          <View style={styles.gateDirRow}>
            <Ionicons name="navigate-outline" size={16} color={Colors.textSecondary} />
            <Text style={styles.gateDir}>{servicio.cliente.direccion} · {servicio.cliente.zona}</Text>
          </View>
          {servicio.tipoGestionLegal && (
            <View style={styles.gateChip}>
              <Ionicons name="briefcase-outline" size={13} color="#9B7BF0" />
              <Text style={styles.gateChipText}>{servicio.tipoGestionLegal}</Text>
            </View>
          )}
        </View>
        <View style={styles.gateAviso}>
          <Ionicons name="lock-closed-outline" size={15} color={Colors.textSecondary} />
          <Text style={styles.gateAvisoText}>No podrás registrar la diligencia antes de estar en la ubicación.</Text>
        </View>
        <PrimaryButton label={confirmando ? 'Verificando ubicación…' : 'Estoy en la ubicación'} onPress={confirmarLlegada} loading={confirmando} style={{ marginTop: Spacing.lg }} />
      </ScrollView>
    );
  }

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

      <View style={[styles.banner, { backgroundColor: 'rgba(155,123,240,0.14)' }]}>
        <Ionicons name="briefcase" size={18} color="#9B7BF0" />
        <Text style={[styles.bannerText, { color: '#7C5CD6' }]}>
          {servicio.tipoGestionLegal ?? 'Gestión legal'}
        </Text>
      </View>

      <Text style={styles.title}>{servicio.cliente.nombre}</Text>
      <Text style={styles.subtitle}>{servicio.cliente.direccion} · {servicio.cliente.zona}</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>DETALLE DE LA GESTIÓN</Text>
        {servicio.tipoGestionLegal && <Ref label="Tipo" value={servicio.tipoGestionLegal} />}
        {servicio.tarifaLegal != null && <Ref label="Tarifa" value={`Q ${servicio.tarifaLegal.toLocaleString('es-GT')}`} />}
        <Text style={styles.instruccion}>{servicio.notas}</Text>
      </View>

      {/* Actualizar datos del cliente */}
      <ClienteEditableFields valores={cli.valores} setCampo={cli.setCampo} huboCambios={cli.huboCambios} />

      {/* Constancia */}
      <Text style={styles.sectionLabel}>CONSTANCIA DE LA DILIGENCIA</Text>
      <FormInput label="¿Quién recibió?" placeholder="Nombre de quien recibe / firma" value={recibioNombre} onChangeText={setRecibioNombre} />
      <DocumentUploader titulo="Evidencia (acta/firma/foto)" descripcion="Foto del documento firmado o del acta de notificación." onChange={setEvidencia} />

      {/* Resultado */}
      <Text style={styles.sectionLabel}>RESULTADO</Text>
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

      {/* Notas del gestor */}
      <Text style={styles.sectionLabel}>NOTA DEL GESTOR</Text>
      <FormInput label="Comentario / convenio / observación" placeholder="Ej: se acordó plan de pago, presentará documentos el viernes…" value={notas} onChangeText={setNotas} />

      <PrimaryButton label={enviando ? 'Registrando…' : 'Registrar diligencia'} onPress={enviar} loading={enviando} style={{ marginTop: Spacing.md }} />
      <View style={{ height: Spacing.xxl }} />
    </ScrollView>
  );
}

function Ref({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.refRow}>
      <Text style={styles.refLabel}>{label}</Text>
      <Text style={styles.refValue}>{value}</Text>
    </View>
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
  gateChip: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', backgroundColor: 'rgba(155,123,240,0.14)', paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: Radius.pill },
  gateChipText: { ...Typography.micro, color: '#7C5CD6', fontWeight: '700', textTransform: 'none', letterSpacing: 0 },
  gateAviso: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center', backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, padding: Spacing.md, marginTop: Spacing.md },
  gateAvisoText: { ...Typography.caption, color: Colors.textSecondary, flex: 1 },

  enSitioBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: Colors.successMuted, paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: Radius.pill, marginBottom: Spacing.md },
  enSitioText: { ...Typography.micro, color: '#065F46', fontWeight: '700', textTransform: 'none', letterSpacing: 0 },

  banner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, alignSelf: 'flex-start', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.pill, marginBottom: Spacing.md },
  bannerText: { ...Typography.caption, fontWeight: '700' },
  title: { ...Typography.title, color: Colors.textPrimary },
  subtitle: { ...Typography.caption, color: Colors.textSecondary, marginBottom: Spacing.lg },

  card: { backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 0.5, borderColor: Colors.border, padding: Spacing.md, marginBottom: Spacing.md },
  cardTitle: { ...Typography.micro, color: Colors.textMuted, letterSpacing: 0.6, marginBottom: Spacing.sm },
  refRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  refLabel: { ...Typography.caption, color: Colors.textSecondary },
  refValue: { ...Typography.caption, color: Colors.textPrimary, fontWeight: '600' },
  instruccion: { ...Typography.caption, color: Colors.textSecondary, marginTop: Spacing.sm, fontStyle: 'italic' },

  sectionLabel: { ...Typography.micro, color: Colors.textMuted, letterSpacing: 0.8, marginBottom: Spacing.sm, marginTop: Spacing.md },
  resultadoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md },
  resultadoCard: { width: '47%', flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.md, paddingHorizontal: Spacing.md, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  resultadoText: { ...Typography.caption, fontWeight: '700', flex: 1 },

  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.background },
  notFoundText: { ...Typography.subtitle, color: Colors.textSecondary },
});