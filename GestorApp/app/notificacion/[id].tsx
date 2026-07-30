import FormInput from '@/components/(auth)/FormInput';
import PrimaryButton from '@/components/(auth)/PrimaryButton';
import { ClienteEditableFields, useClienteEditable } from '@/components/servicio/ClienteEditable';
import { Colors, Radius, Spacing, Typography } from '@/constants/DesignTokens';
import { completarServicio, marcarEnSitio, servicioPorId } from '@/data/mocks';
import { useBottomInset } from '@/hooks/useBottomInset';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

type Resultado = 'entregada' | 'con_tercero' | 'no_localizado' | 'rechazo';

const RESULTADOS: { id: Resultado; label: string; icon: string; color: string }[] = [
  { id: 'entregada', label: 'Entregada al cliente', icon: 'checkmark-circle', color: Colors.success },
  { id: 'con_tercero', label: 'Recibió un tercero', icon: 'people', color: Colors.info },
  { id: 'no_localizado', label: 'No localizado', icon: 'help-circle', color: Colors.textMuted },
  { id: 'rechazo', label: 'Rechazó recibir', icon: 'close-circle', color: Colors.danger },
];

export default function FormularioNotificacionScreen() {
  const bottomInset = useBottomInset();
  const { id } = useLocalSearchParams<{ id: string }>();
  const servicio = servicioPorId(id as string);

  const [enSitio, setEnSitio] = useState(servicio?.fase === 'en_sitio');
  const [confirmando, setConfirmando] = useState(false);
  const cli = useClienteEditable(servicio?.cliente ?? ({ nombre: '', telefono: '', direccion: '', zona: '' } as any));
  const [contacto, setContacto] = useState('');
  const [nombreContacto, setNombreContacto] = useState('');
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [notas, setNotas] = useState('');
  const [enviando, setEnviando] = useState(false);

  if (!servicio) {
    return (
      <View style={styles.notFound}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.textMuted} />
        <Text style={styles.notFoundText}>Notificación no encontrada</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={{ color: Colors.info, marginTop: 8 }}>Volver</Text>
        </Pressable>
      </View>
    );
  }

  const confirmarLlegada = () => {
    setConfirmando(true);
    setTimeout(() => {
      marcarEnSitio(servicio.id);
      setConfirmando(false);
      setEnSitio(true);
    }, 900);
  };

  const enviar = () => {
    if (!resultado) {
      Alert.alert('Falta el resultado', 'Indica cómo terminó la entrega de la notificación.');
      return;
    }
    setEnviando(true);
    setTimeout(() => {
      const notaFinal = [
        contacto ? `Número conseguido: ${contacto}${nombreContacto ? ` (${nombreContacto})` : ''}` : '',
        notas,
      ].filter(Boolean).join('. ');
      // Si se consiguió un número nuevo, se refleja también en el teléfono.
      const clienteActualizado = { ...cli.cambios, ...(contacto ? { telefono: contacto } : {}) };
      completarServicio(servicio.id, resultado === 'no_localizado' ? 'no_localizado' : 'completado', {
        notaGestor: notaFinal,
        clienteActualizado,
      });
      setEnviando(false);
      Alert.alert('✅ Notificación registrada', `Resultado: ${RESULTADOS.find((r) => r.id === resultado)?.label}.`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    }, 1000);
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
          La notificación ya es tuya. Confirma tu llegada para registrar la entrega y conseguir el contacto.
        </Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>DESTINO</Text>
          <Text style={styles.gateNombre}>{servicio.cliente.nombre}</Text>
          <View style={styles.gateDirRow}>
            <Ionicons name="navigate-outline" size={16} color={Colors.textSecondary} />
            <Text style={styles.gateDir}>{servicio.cliente.direccion} · {servicio.cliente.zona}</Text>
          </View>
        </View>
        <View style={styles.gateAviso}>
          <Ionicons name="lock-closed-outline" size={15} color={Colors.textSecondary} />
          <Text style={styles.gateAvisoText}>No podrás registrar la notificación antes de estar en la ubicación.</Text>
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

      <View style={[styles.banner, { backgroundColor: Colors.infoMuted }]}>
        <Ionicons name="document-text" size={18} color={Colors.info} />
        <Text style={[styles.bannerText, { color: Colors.info }]}>Notificación</Text>
      </View>

      <Text style={styles.title}>{servicio.cliente.nombre}</Text>
      <Text style={styles.subtitle}>{servicio.cliente.direccion} · {servicio.cliente.zona}</Text>

      <View style={styles.avisoBox}>
        <Ionicons name="information-circle-outline" size={16} color={Colors.info} />
        <Text style={styles.avisoText}>{servicio.notas}</Text>
      </View>

      {/* Actualizar datos del cliente */}
      <ClienteEditableFields valores={cli.valores} setCampo={cli.setCampo} huboCambios={cli.huboCambios} />

      {/* Conseguir número de contacto */}
      <Text style={styles.sectionLabel}>NÚMERO DE CONTACTO CONSEGUIDO</Text>
      <FormInput label="Teléfono vigente del cliente" placeholder="0000-0000" keyboardType="phone-pad" value={contacto} onChangeText={setContacto} />
      <FormInput label="¿De quién es el número?" placeholder="El cliente, un familiar, vecino…" value={nombreContacto} onChangeText={setNombreContacto} />

      {/* Resultado */}
      <Text style={styles.sectionLabel}>RESULTADO DE LA ENTREGA</Text>
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
      <FormInput label="Comentario / convenio / observación" placeholder="Ej: el cliente pidió que lo llamen el lunes…" value={notas} onChangeText={setNotas} />

      <PrimaryButton label={enviando ? 'Registrando…' : 'Registrar notificación'} onPress={enviar} loading={enviando} style={{ marginTop: Spacing.md }} />
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
  gateDirRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  gateDir: { ...Typography.caption, color: Colors.textSecondary, flex: 1 },
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
  avisoBox: { flexDirection: 'row', gap: Spacing.sm, backgroundColor: Colors.infoMuted, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.md },
  avisoText: { ...Typography.caption, color: Colors.info, flex: 1 },

  sectionLabel: { ...Typography.micro, color: Colors.textMuted, letterSpacing: 0.8, marginBottom: Spacing.sm, marginTop: Spacing.md },
  resultadoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md },
  resultadoCard: { width: '47%', flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.md, paddingHorizontal: Spacing.md, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  resultadoText: { ...Typography.caption, fontWeight: '700', flex: 1 },

  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.background },
  notFoundText: { ...Typography.subtitle, color: Colors.textSecondary },
});