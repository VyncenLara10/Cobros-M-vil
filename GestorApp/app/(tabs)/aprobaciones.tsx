/**
 * app/(tabs)/aprobaciones.tsx
 * Cola de aprobación de gestores nuevos (solo admin). Se revisa la papelería
 * (DPI, licencia, antecedentes...) y se aprueba o rechaza la solicitud.
 * Si Supabase está configurado, lee/escribe la tabla real
 * public.solicitudes_registro (ver domain/aprobaciones/aprobaciones.ts).
 * Si NO está configurado, cae al modo demo con datos en memoria
 * (data/solicitudesRegistro.ts), igual que el resto de la app.
 */

import { Colors, Radius, Spacing, Typography } from '@/constants/DesignTokens';
import {
  aprobarSolicitud,
  rechazarSolicitud,
  SOLICITUDES_REGISTRO,
  SolicitudRegistro,
} from '@/data/solicitudesRegistro';
import { aprobarSolicitudReal, cargarSolicitudesReales, rechazarSolicitudReal } from '@/domain/aprobaciones/aprobaciones';
import { useSesion } from '@/domain/auth/sesion';
import { notificarLocal } from '@/domain/notificaciones/push';
import { useBottomInset } from '@/hooks/useBottomInset';
import { supabaseConfigurado } from '@/lib/supabase';
import { ROL_LABEL } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const DOCS: { key: keyof SolicitudRegistro['documentos']; label: string }[] = [
  { key: 'dpiFrenteUri', label: 'DPI (frente)' },
  { key: 'dpiReversoUri', label: 'DPI (reverso)' },
  { key: 'antecedentesPenalesUri', label: 'Antecedentes penales' },
  { key: 'licenciaUri', label: 'Licencia de conducir' },
  { key: 'tarjetaCirculacionUri', label: 'Tarjeta de circulación' },
  { key: 'fotoVehiculoUri', label: 'Foto del vehículo' },
  { key: 'carneColegiadoUri', label: 'Carné de colegiado' },
];

export default function AprobacionesScreen() {
  const bottomInset = useBottomInset();
  const insets = useSafeAreaInsets();
  const { usuario } = useSesion();

  const [solicitudes, setSolicitudes] = useState<SolicitudRegistro[]>(
    supabaseConfigurado ? [] : SOLICITUDES_REGISTRO,
  );
  const [cargando, setCargando] = useState(supabaseConfigurado);
  const [procesando, setProcesando] = useState(false);
  const [seleccion, setSeleccion] = useState<SolicitudRegistro | null>(null);
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [mostrarRechazo, setMostrarRechazo] = useState(false);
  const [imagenAmpliada, setImagenAmpliada] = useState<string | null>(null);

  const recargar = useCallback(async () => {
    if (!supabaseConfigurado) {
      setSolicitudes([...SOLICITUDES_REGISTRO]);
      return;
    }
    setCargando(true);
    const datos = await cargarSolicitudesReales();
    setSolicitudes(datos);
    setCargando(false);
  }, []);

  useFocusEffect(useCallback(() => { recargar(); }, [recargar]));

  const pendientes = solicitudes.filter((s) => s.estado === 'pendiente');
  const resueltas = solicitudes.filter((s) => s.estado !== 'pendiente').slice(0, 5);

  const cerrarModal = () => {
    setSeleccion(null);
    setMostrarRechazo(false);
    setMotivoRechazo('');
  };

  const aprobar = async (s: SolicitudRegistro) => {
    if (supabaseConfigurado) {
      if (!usuario) return;
      setProcesando(true);
      const r = await aprobarSolicitudReal(s, usuario.id);
      setProcesando(false);
      if (!r.ok) {
        Alert.alert('No se pudo aprobar', r.error ?? 'Intenta de nuevo.');
        return;
      }
      cerrarModal();
      await recargar();
      Alert.alert('✅ Solicitud aprobada', `${s.nombreCompleto} ya puede iniciar sesión.`);
      // NOTA: esta notificación local es una demo en ESTE dispositivo (el del
      // admin). Para que el push llegue al TELÉFONO DEL CANDIDATO hace falta
      // una Edge Function que lea su push_token (ver supabase/schema.sql).
      notificarLocal('✅ Cuenta aprobada', `${s.nombreCompleto} ya puede recibir servicios como ${ROL_LABEL[s.rol]}.`);
      return;
    }

    // Modo demo (sin Supabase configurado)
    const gestor = aprobarSolicitud(s.id);
    cerrarModal();
    await recargar();
    Alert.alert(
      '✅ Solicitud aprobada',
      `${s.nombreCompleto} ya es un gestor activo${gestor ? ` (${gestor.id})` : ''}.`,
    );
    notificarLocal('✅ Cuenta aprobada', `${s.nombreCompleto} ya puede recibir servicios como ${ROL_LABEL[s.rol]}.`);
  };

  const confirmarRechazo = async (s: SolicitudRegistro) => {
    if (!motivoRechazo.trim()) {
      Alert.alert('Falta el motivo', 'Indica por qué se rechaza, para que el candidato pueda corregirlo.');
      return;
    }

    if (supabaseConfigurado) {
      if (!usuario) return;
      setProcesando(true);
      const r = await rechazarSolicitudReal(s, motivoRechazo, usuario.id);
      setProcesando(false);
      if (!r.ok) {
        Alert.alert('No se pudo rechazar', r.error ?? 'Intenta de nuevo.');
        return;
      }
      cerrarModal();
      await recargar();
      Alert.alert('Solicitud rechazada', 'Se le notifica al candidato con el motivo.');
      return;
    }

    rechazarSolicitud(s.id, motivoRechazo);
    cerrarModal();
    await recargar();
    Alert.alert('Solicitud rechazada', 'Se le notifica al candidato con el motivo.');
  };

  if (cargando) {
    return (
      <View style={[styles.screen, styles.cargandoBox]}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingBottom: bottomInset + 32 }]}>
      <Text style={styles.headerSub}>
        {pendientes.length === 0
          ? 'No hay solicitudes pendientes.'
          : `${pendientes.length} solicitud${pendientes.length === 1 ? '' : 'es'} esperando revisión.`}
      </Text>

      {pendientes.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="checkmark-done-outline" size={40} color={Colors.textMuted} />
          <Text style={styles.emptyText}>Al día. No hay gestores nuevos por aprobar.</Text>
        </View>
      ) : (
        pendientes.map((s) => (
          <Pressable key={s.id} style={styles.card} onPress={() => setSeleccion(s)}>
            <View style={styles.cardTop}>
              <View style={styles.rolBadge}>
                <Text style={styles.rolBadgeText}>{ROL_LABEL[s.rol]}</Text>
              </View>
              <Text style={styles.cardId}>{s.id}</Text>
            </View>
            <Text style={styles.cardNombre}>{s.nombreCompleto}</Text>
            <Text style={styles.cardMeta}>{s.correo} · {s.telefono}</Text>
            <Text style={styles.cardFecha}>Enviada {s.fecha}</Text>
            <View style={styles.verChip}>
              <Text style={styles.verChipText}>Revisar papelería →</Text>
            </View>
          </Pressable>
        ))
      )}

      {resueltas.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>RESUELTAS RECIENTEMENTE</Text>
          {resueltas.map((s) => (
            <View key={s.id} style={styles.resueltaRow}>
              <Ionicons
                name={s.estado === 'aprobado' ? 'checkmark-circle' : 'close-circle'}
                size={16}
                color={s.estado === 'aprobado' ? Colors.success : Colors.danger}
              />
              <Text style={styles.resueltaNombre}>{s.nombreCompleto}</Text>
              <Text style={[styles.resueltaEstado, { color: s.estado === 'aprobado' ? Colors.success : Colors.danger }]}>
                {s.estado === 'aprobado' ? 'Aprobado' : 'Rechazado'}
              </Text>
            </View>
          ))}
        </>
      )}

      {/* Modal de revisión */}
      <Modal visible={!!seleccion} transparent animationType="slide" onRequestClose={cerrarModal}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { paddingBottom: bottomInset + Spacing.lg }]}>
            {seleccion && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.modalHeader}>
                  <View style={styles.rolBadge}>
                    <Text style={styles.rolBadgeText}>{ROL_LABEL[seleccion.rol]}</Text>
                  </View>
                  <Pressable onPress={cerrarModal} hitSlop={10}>
                    <Ionicons name="close" size={24} color={Colors.textSecondary} />
                  </Pressable>
                </View>

                <Text style={styles.modalNombre}>{seleccion.nombreCompleto}</Text>

                <Text style={styles.modalSeccion}>DATOS DE CONTACTO</Text>
                <InfoRow label="Correo" value={seleccion.correo} />
                <InfoRow label="Teléfono" value={seleccion.telefono} />
                <InfoRow label="DPI" value={seleccion.dpiNumero} />
                {seleccion.numeroColegiado && <InfoRow label="Colegiado" value={seleccion.numeroColegiado} />}
                {seleccion.tipoVehiculo && <InfoRow label="Vehículo" value={`${seleccion.tipoVehiculo}${seleccion.placaVehiculo ? ` · ${seleccion.placaVehiculo}` : ''}`} />}

                <Text style={styles.modalSeccion}>ZONA DE COBERTURA</Text>
                <Text style={styles.zonaTexto}>
                  {(seleccion.zonaCobertura ?? []).map((a) => a.municipio).join(' · ') || 'Sin definir'}
                </Text>

                <Text style={styles.modalSeccion}>CUENTA BANCARIA</Text>
                <InfoRow label="Banco" value={seleccion.banco || '—'} />
                <InfoRow label="Cuenta" value={seleccion.numeroCuenta || '—'} />
                <InfoRow label="Titular" value={seleccion.nombreTitular || '—'} />

                <Text style={styles.modalSeccion}>DOCUMENTOS</Text>
                <Text style={styles.docsAyuda}>
                  Toca una foto para verla en grande. Revisa que sean legibles y que los datos coincidan entre sí (nombre, cara, placa...).
                </Text>
                <View style={styles.docsGrid}>
                  {DOCS.map((d) => {
                    const uri = seleccion.documentos[d.key];
                    return (
                      <Pressable
                        key={d.key}
                        style={styles.docItem}
                        onPress={() => uri && setImagenAmpliada(uri)}
                        disabled={!uri}
                      >
                        {uri ? (
                          <Image source={{ uri }} style={styles.docThumb} />
                        ) : (
                          <View style={[styles.docThumb, styles.docThumbVacio]}>
                            <Ionicons name="image-outline" size={22} color={Colors.textMuted} />
                          </View>
                        )}
                        <Text style={[styles.docLabel, !uri && { color: Colors.danger }]} numberOfLines={2}>
                          {d.label}
                        </Text>
                        {!uri && <Text style={styles.docFalta}>no subido</Text>}
                      </Pressable>
                    );
                  })}
                </View>

                {mostrarRechazo ? (
                  <>
                    <Text style={styles.modalSeccion}>MOTIVO DE RECHAZO</Text>
                    <View style={styles.motivoBox}>
                      <Ionicons name="information-circle-outline" size={15} color={Colors.textSecondary} />
                      <Text style={styles.motivoAyuda}>Explica qué falta o qué está mal, para que el candidato pueda corregirlo y volver a enviar.</Text>
                    </View>
                    <ScrollView horizontal={false}>
                      <TextEntry value={motivoRechazo} onChangeText={setMotivoRechazo} />
                    </ScrollView>
                    <View style={styles.accionesRow}>
                      <Pressable style={styles.btnSecundario} onPress={() => setMostrarRechazo(false)} disabled={procesando}>
                        <Text style={styles.btnSecundarioText}>Atrás</Text>
                      </Pressable>
                      <Pressable style={styles.btnRechazar} onPress={() => confirmarRechazo(seleccion)} disabled={procesando}>
                        {procesando ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="close-circle-outline" size={18} color="#fff" />}
                        <Text style={styles.btnRechazarText}>Confirmar rechazo</Text>
                      </Pressable>
                    </View>
                  </>
                ) : (
                  <View style={styles.accionesRow}>
                    <Pressable style={styles.btnSecundario} onPress={() => setMostrarRechazo(true)} disabled={procesando}>
                      <Ionicons name="close-circle-outline" size={18} color={Colors.danger} />
                      <Text style={[styles.btnSecundarioText, { color: Colors.danger }]}>Rechazar</Text>
                    </Pressable>
                    <Pressable style={styles.btnAprobar} onPress={() => aprobar(seleccion)} disabled={procesando}>
                      {procesando ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />}
                      <Text style={styles.btnAprobarText}>Aprobar gestor</Text>
                    </Pressable>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Visor de foto en grande */}
      <Modal visible={!!imagenAmpliada} transparent animationType="fade" onRequestClose={() => setImagenAmpliada(null)}>
        <Pressable style={styles.visorOverlay} onPress={() => setImagenAmpliada(null)}>
          {imagenAmpliada && <Image source={{ uri: imagenAmpliada }} style={styles.visorImagen} resizeMode="contain" />}
          <Pressable style={[styles.visorCerrar, { top: insets.top + 12 }]} onPress={() => setImagenAmpliada(null)}>
            <Ionicons name="close" size={26} color="#fff" />
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function TextEntry({ value, onChangeText }: { value: string; onChangeText: (t: string) => void }) {
  return (
    <TextInput
      style={styles.motivoInput}
      placeholder="Ej: la foto del DPI está borrosa, vuelve a subirla…"
      placeholderTextColor={Colors.textMuted}
      multiline
      value={value}
      onChangeText={onChangeText}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  cargandoBox: { alignItems: 'center', justifyContent: 'center' },
  content: { padding: Spacing.lg },
  headerSub: { ...Typography.caption, color: Colors.textSecondary, marginBottom: Spacing.lg },

  emptyState: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.sm },
  emptyText: { ...Typography.caption, color: Colors.textMuted, textAlign: 'center', maxWidth: 260 },

  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 0.5, borderColor: Colors.border, padding: Spacing.md, marginBottom: Spacing.sm },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  cardId: { ...Typography.micro, color: Colors.textMuted, marginLeft: 'auto', fontFamily: 'monospace' },
  cardNombre: { ...Typography.subtitle, color: Colors.textPrimary, fontWeight: '700', marginBottom: 2 },
  cardMeta: { ...Typography.caption, color: Colors.textSecondary },
  cardFecha: { ...Typography.micro, color: Colors.textMuted, marginTop: 4, textTransform: 'none', letterSpacing: 0 },
  verChip: { alignSelf: 'flex-start', backgroundColor: Colors.surfaceAlt, paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: Radius.pill, marginTop: Spacing.sm },
  verChipText: { ...Typography.micro, color: Colors.textSecondary, fontWeight: '600', textTransform: 'none', letterSpacing: 0 },

  rolBadge: { backgroundColor: Colors.primaryMuted, paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: Radius.pill, alignSelf: 'flex-start' },
  rolBadgeText: { ...Typography.micro, color: Colors.primary, fontWeight: '700', textTransform: 'none', letterSpacing: 0 },

  sectionTitle: { ...Typography.micro, color: Colors.textMuted, letterSpacing: 0.8, marginTop: Spacing.xl, marginBottom: Spacing.sm },
  resueltaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  resueltaNombre: { ...Typography.caption, color: Colors.textPrimary, flex: 1 },
  resueltaEstado: { ...Typography.micro, fontWeight: '700', textTransform: 'none', letterSpacing: 0 },

  modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  modalCard: { backgroundColor: Colors.surface, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing.xl, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  modalNombre: { ...Typography.title, color: Colors.textPrimary, marginBottom: Spacing.sm },
  modalSeccion: { ...Typography.micro, color: Colors.textMuted, letterSpacing: 0.6, marginTop: Spacing.lg, marginBottom: Spacing.sm },

  infoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  infoLabel: { ...Typography.caption, color: Colors.textSecondary, width: 92 },
  infoValue: { ...Typography.caption, color: Colors.textPrimary, fontWeight: '600', flex: 1, textAlign: 'right' },

  zonaTexto: { ...Typography.body, color: Colors.textPrimary },

  docsAyuda: { ...Typography.caption, color: Colors.textSecondary, marginBottom: Spacing.md },
  docsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  docItem: { width: '31%', alignItems: 'center' },
  docThumb: { width: '100%', aspectRatio: 1, borderRadius: Radius.md, backgroundColor: Colors.surfaceAlt, borderWidth: 0.5, borderColor: Colors.border },
  docThumbVacio: { alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed' },
  docLabel: { ...Typography.micro, color: Colors.textSecondary, textAlign: 'center', marginTop: 4, textTransform: 'none', letterSpacing: 0 },
  docFalta: { ...Typography.micro, color: Colors.danger, fontWeight: '700', textTransform: 'none', letterSpacing: 0 },

  visorOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' },
  visorImagen: { width: '100%', height: '80%' },
  visorCerrar: { position: 'absolute', top: 48, right: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },

  motivoBox: { flexDirection: 'row', gap: Spacing.sm, backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm },
  motivoAyuda: { ...Typography.caption, color: Colors.textSecondary, flex: 1 },
  motivoInput: { backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, borderWidth: 0.5, borderColor: Colors.border, padding: Spacing.md, fontSize: 14, color: Colors.textPrimary, minHeight: 80, textAlignVertical: 'top' },

  accionesRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg },
  btnSecundario: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, paddingVertical: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.surfaceAlt },
  btnSecundarioText: { ...Typography.subtitle, color: Colors.textSecondary, fontWeight: '600' },
  btnAprobar: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, paddingVertical: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.success },
  btnAprobarText: { ...Typography.subtitle, color: '#fff', fontWeight: '600' },
  btnRechazar: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, paddingVertical: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.danger },
  btnRechazarText: { ...Typography.subtitle, color: '#fff', fontWeight: '600' },
});