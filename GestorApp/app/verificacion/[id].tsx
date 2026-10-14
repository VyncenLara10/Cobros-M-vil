/**
 * app/verificacion/[id].tsx
 * Verificación con partes INDEPENDIENTES: domiciliar y laboral. La casa y el
 * trabajo pueden estar en lugares distintos, así que cada parte tiene su propia
 * ubicación y su propio candado ("Estoy en la ubicación").
 *
 * - Sin `parte` en la URL y con 2 partes → HUB con las dos tarjetas.
 * - Con `?parte=domiciliar|laboral` (o si solo hay una) → formulario de esa parte.
 * La verificación se completa cuando AMBAS partes están hechas.
 */

import DocumentUploader from '@/components/(auth)/Documentuploader';
import FormInput from '@/components/(auth)/FormInput';
import PrimaryButton from '@/components/(auth)/PrimaryButton';
import { ClienteEditableFields, useClienteEditable } from '@/components/servicio/ClienteEditable';
import { Colors, Radius, Spacing, Typography } from '@/constants/DesignTokens';
import {
  completarParte,
  estadoParte,
  marcarEnSitioParte,
  partesVerificacion,
  ubicacionParte,
} from '@/domain/servicios/servicios';
import { useBottomInset } from '@/hooks/useBottomInset';
import { useServicio } from '@/hooks/useServicios';
import { SubtipoVerificacion } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

type Dictamen = 'aprobado' | 'observaciones' | 'rechazado';

const DICTAMENES: { id: Dictamen; label: string; icon: string; color: string; bg: string }[] = [
  { id: 'aprobado', label: 'Aprobar', icon: 'checkmark-circle', color: Colors.success, bg: Colors.successMuted },
  { id: 'observaciones', label: 'Con observaciones', icon: 'alert-circle', color: Colors.warning, bg: Colors.warningMuted },
  { id: 'rechazado', label: 'Rechazar', icon: 'close-circle', color: Colors.danger, bg: Colors.dangerMuted },
];

const FOTOS_DOMICILIAR = [
  { key: 'frente', titulo: 'Frente de la casa', desc: 'Fachada completa de la vivienda.' },
  { key: 'izquierda', titulo: 'Lado izquierdo', desc: 'Vista lateral izquierda de la casa.' },
  { key: 'derecha', titulo: 'Lado derecho', desc: 'Vista lateral derecha de la casa.' },
  { key: 'contador', titulo: 'Contador de luz', desc: 'Foto legible del medidor de energía.' },
];

const FOTOS_LABORAL = [
  { key: 'producto', titulo: 'Producto / mercadería', desc: 'Foto del producto o inventario del negocio.' },
  { key: 'negocio', titulo: 'Frente del negocio', desc: 'Fachada o rótulo del local / puesto.' },
  { key: 'puesto', titulo: 'Puesto de trabajo', desc: 'Cliente en su lugar de trabajo (opcional).' },
];

const META: Record<SubtipoVerificacion, { label: string; icon: string; lugar: string }> = {
  domiciliar: { label: 'Verificación domiciliar', icon: 'home-outline', lugar: 'Casa del cliente' },
  laboral: { label: 'Verificación laboral', icon: 'briefcase-outline', lugar: 'Lugar de trabajo' },
};

export default function VerificacionScreen() {
  const bottomInset = useBottomInset();
  const { id, parte } = useLocalSearchParams<{ id: string; parte?: string }>();
  const { servicio, cargando, refrescar } = useServicio(id);

  const partes = servicio ? partesVerificacion(servicio) : [];
  const soloUna = partes.length === 1;
  const parteActiva: SubtipoVerificacion | null =
    (parte as SubtipoVerificacion) ?? (soloUna ? partes[0] : null);

  // ── Estado del formulario de una parte (declarado siempre, hooks estables) ──
  const [enSitioForzado, setEnSitioForzado] = useState(false);
  const enSitio = enSitioForzado || (servicio && parteActiva ? estadoParte(servicio, parteActiva).enSitio : false);
  const [confirmando, setConfirmando] = useState(false);
  const cli = useClienteEditable(servicio?.cliente ?? ({ nombre: '', telefono: '', direccion: '', zona: '' } as any));
  const [fotos, setFotos] = useState<Record<string, string | null>>({});
  const [campoA, setCampoA] = useState('');
  const [campoB, setCampoB] = useState('');
  const [campoC, setCampoC] = useState('');
  const [dirLaboral, setDirLaboral] = useState('');
  const [zonaLaboral, setZonaLaboral] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [dictamen, setDictamen] = useState<Dictamen | null>(null);
  const [enviando, setEnviando] = useState(false);

  useFocusEffect(useCallback(() => { refrescar(); }, [refrescar]));

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
        <Text style={styles.notFoundText}>Verificación no encontrada</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={{ color: Colors.info, marginTop: 8 }}>Volver</Text>
        </Pressable>
      </View>
    );
  }

  // ═══════════════════ HUB: dos partes en lugares distintos ═══════════════════
  if (!parteActiva) {
    const hechas = partes.filter((p) => estadoParte(servicio, p).completado).length;
    return (
      <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingBottom: bottomInset }]}>
        <Pressable style={styles.backRow} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={Colors.primary} />
          <Text style={styles.backText}>Volver</Text>
        </Pressable>

        <Text style={styles.title}>{servicio.cliente.nombre}</Text>
        <Text style={styles.subtitle}>Verificación en dos partes · casa y trabajo por separado</Text>

        <View style={styles.progresoBar}>
          <Ionicons name="git-branch-outline" size={15} color={Colors.info} />
          <Text style={styles.progresoText}>{hechas} de {partes.length} partes completadas</Text>
        </View>

        <Text style={styles.hubAviso}>
          Cada parte se llena en su propia ubicación. Completa una y luego dirígete a la otra.
        </Text>

        {partes.map((p) => {
          const est = estadoParte(servicio, p);
          const ubic = ubicacionParte(servicio, p);
          const m = META[p];
          return (
            <Pressable
              key={p}
              style={[styles.parteCard, est.completado && { borderColor: Colors.success, opacity: 0.85 }]}
              onPress={() => router.push(`/verificacion/${servicio.id}?parte=${p}`)}
            >
              <View style={[styles.parteIcon, est.completado && { backgroundColor: Colors.successMuted }]}>
                <Ionicons name={m.icon as any} size={22} color={est.completado ? Colors.success : Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.parteLabel}>{m.label}</Text>
                <Text style={styles.parteLugar}>{m.lugar}</Text>
                <Text style={styles.parteDir}>📍 {ubic.direccion} · {ubic.zona}</Text>
                <View style={[styles.parteEstado, est.completado ? styles.estOk : est.enSitio ? styles.estSitio : styles.estPend]}>
                  <Text style={[styles.parteEstadoText, { color: est.completado ? Colors.success : est.enSitio ? Colors.info : Colors.textSecondary }]}>
                    {est.completado ? '✓ Completada' : est.enSitio ? 'En la ubicación' : 'Pendiente'}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
            </Pressable>
          );
        })}

        {hechas === partes.length && (
          <View style={styles.hubOk}>
            <Ionicons name="checkmark-done" size={18} color={Colors.success} />
            <Text style={styles.hubOkText}>Verificación completa. Ya puedes volver.</Text>
          </View>
        )}
        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    );
  }

  // ═══════════════════ FORMULARIO de una parte concreta ══════════════════════
  const esDom = parteActiva === 'domiciliar';
  const ubic = ubicacionParte(servicio, parteActiva);
  const m = META[parteActiva];
  const yaCompletada = estadoParte(servicio, parteActiva).completado;

  const setFoto = (key: string, uri: string | null) => setFotos((p) => ({ ...p, [key]: uri }));

  const confirmarLlegada = async () => {
    setConfirmando(true);
    // TODO: expo-location, comparar contra las coordenadas de ESTA parte.
    await marcarEnSitioParte(servicio, parteActiva);
    setConfirmando(false);
    setEnSitioForzado(true);
  };

  const fotosObligatorias = esDom ? FOTOS_DOMICILIAR : FOTOS_LABORAL.slice(0, 2);
  const faltanFotos = fotosObligatorias.filter((f) => !fotos[f.key]).map((f) => f.titulo);

  const enviar = async () => {
    if (faltanFotos.length > 0) {
      Alert.alert('Faltan fotografías', `Adjunta: ${faltanFotos.join(', ')}`);
      return;
    }
    if (!dictamen) {
      Alert.alert('Falta el dictamen', 'Indica si apruebas, rechazas o marcas observaciones para esta parte.');
      return;
    }
    setEnviando(true);
    const clienteActualizado = esDom
      ? cli.cambios
      : { ...(dirLaboral ? { direccionLaboral: dirLaboral } : {}), ...(zonaLaboral ? { zonaLaboral } : {}) };
    const { completoTodo } = await completarParte(servicio, parteActiva, {
      notaGestor: observaciones,
      clienteActualizado,
      dictamen,
    });
    setEnviando(false);
    Alert.alert(
      `✅ Parte ${esDom ? 'domiciliar' : 'laboral'} enviada`,
      completoTodo
        ? 'Ambas partes están completas. La verificación quedó finalizada.'
        : 'Falta la otra parte; dirígete a la siguiente ubicación para completarla.',
      [{ text: 'OK', onPress: () => router.back() }],
    );
  };

  // Candado de esta parte
  if (!enSitio && !yaCompletada) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingBottom: bottomInset }]}>
        <Pressable style={styles.backRow} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={Colors.primary} />
          <Text style={styles.backText}>Volver</Text>
        </Pressable>

        <View style={styles.gateIconWrap}>
          <Ionicons name={m.icon as any} size={38} color={Colors.primary} />
        </View>
        <Text style={styles.gateTitle}>{m.label}</Text>
        <Text style={styles.gateSub}>{m.lugar}. Confirma tu llegada a esta ubicación para llenar esta parte.</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>UBICACIÓN DE ESTA PARTE</Text>
          <Text style={styles.gateNombre}>{servicio.cliente.nombre}</Text>
          <View style={styles.gateDirRow}>
            <Ionicons name="navigate-outline" size={16} color={Colors.textSecondary} />
            <Text style={styles.gateDir}>{ubic.direccion} · {ubic.zona}</Text>
          </View>
        </View>

        <View style={styles.gateAviso}>
          <Ionicons name="lock-closed-outline" size={15} color={Colors.textSecondary} />
          <Text style={styles.gateAvisoText}>No podrás llenar esta parte antes de estar en su ubicación.</Text>
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
        <Text style={styles.enSitioText}>En la ubicación · {m.label.toLowerCase()}</Text>
      </View>

      <Text style={styles.title}>{servicio.cliente.nombre}</Text>
      <Text style={styles.subtitle}>{ubic.direccion} · {ubic.zona}</Text>

      {yaCompletada && (
        <View style={styles.yaOk}>
          <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
          <Text style={styles.yaOkText}>Esta parte ya fue completada. Puedes revisarla o volver.</Text>
        </View>
      )}

      {esDom ? (
        <>
          {/* Editar datos de la casa/cliente */}
          <ClienteEditableFields valores={cli.valores} setCampo={cli.setCampo} huboCambios={cli.huboCambios} />

          <Text style={styles.sectionLabel}>DATOS DE LA VIVIENDA</Text>
          <FormInput label="¿Se confirma que reside allí?" placeholder="Sí / No y detalle" value={campoA} onChangeText={setCampoA} />
          <FormInput label="Tipo de vivienda" placeholder="Propia / Alquilada / Familiar" value={campoB} onChangeText={setCampoB} />
          <FormInput label="Tiempo de residir" placeholder="Ej: 5 años" value={campoC} onChangeText={setCampoC} />

          <Text style={styles.sectionLabel}>FOTOGRAFÍAS DE LA VIVIENDA</Text>
          <Text style={styles.fotosAyuda}>Adjunta las 4 fotos: frente, ambos lados y el contador de luz.</Text>
          {FOTOS_DOMICILIAR.map((f) => (
            <DocumentUploader key={f.key} titulo={f.titulo} descripcion={f.desc} obligatorio onChange={(uri) => setFoto(f.key, uri)} />
          ))}
        </>
      ) : (
        <>
          {/* Editar la dirección del TRABAJO (independiente de la casa) */}
          <Text style={styles.sectionLabel}>DIRECCIÓN DEL TRABAJO</Text>
          <Text style={styles.fotosAyuda}>Si la dirección del trabajo cambió, corrígela aquí.</Text>
          <FormInput label="Dirección del trabajo" placeholder={ubic.direccion} value={dirLaboral} onChangeText={setDirLaboral} />
          <FormInput label="Zona del trabajo" placeholder={ubic.zona} value={zonaLaboral} onChangeText={setZonaLaboral} />

          <Text style={styles.sectionLabel}>DATOS LABORALES</Text>
          <FormInput label="Producto / actividad del negocio" placeholder="Ej: venta de ropa, taller mecánico…" value={campoA} onChangeText={setCampoA} />
          <FormInput label="¿Se confirma que trabaja allí?" placeholder="Sí / No y detalle" value={campoB} onChangeText={setCampoB} />
          <FormInput label="Tiempo en el negocio" placeholder="Ej: 3 años" value={campoC} onChangeText={setCampoC} />

          <Text style={styles.sectionLabel}>FOTOGRAFÍAS DEL NEGOCIO</Text>
          <Text style={styles.fotosAyuda}>La foto del producto y el frente del negocio son obligatorias.</Text>
          {FOTOS_LABORAL.map((f) => (
            <DocumentUploader key={f.key} titulo={f.titulo} descripcion={f.desc} obligatorio={f.key !== 'puesto'} onChange={(uri) => setFoto(f.key, uri)} />
          ))}
        </>
      )}

      <Text style={styles.sectionLabel}>DICTAMEN DE ESTA PARTE</Text>
      <View style={styles.dictamenRow}>
        {DICTAMENES.map((d) => {
          const activo = dictamen === d.id;
          return (
              <Pressable
              key={d.id}
              style={[styles.dictamenCard, { backgroundColor: activo ? d.bg : Colors.surface }, activo && { borderColor: d.color, borderWidth: 2 }]}
              onPress={() => setDictamen(d.id)}
            >
              <Ionicons name={d.icon as any} size={22} color={d.color} />
              <Text style={[styles.dictamenText, { color: activo ? d.color : Colors.textSecondary }]}>{d.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <FormInput label="Observaciones de esta parte" placeholder="Hallazgos, referencias de vecinos, comentarios…" value={observaciones} onChangeText={setObservaciones} />

      <PrimaryButton label={enviando ? 'Enviando…' : `Enviar parte ${esDom ? 'domiciliar' : 'laboral'}`} onPress={enviar} loading={enviando} style={{ marginTop: Spacing.md }} />
      <View style={{ height: Spacing.xxl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.xl, paddingBottom: Spacing.xxxl },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.lg },
  backText: { ...Typography.caption, color: Colors.primary, fontWeight: '600' },

  title: { ...Typography.title, color: Colors.textPrimary },
  subtitle: { ...Typography.caption, color: Colors.textSecondary, marginBottom: Spacing.lg },

  // Hub
  progresoBar: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.infoMuted, alignSelf: 'flex-start', paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: Radius.pill, marginBottom: Spacing.md },
  progresoText: { ...Typography.caption, color: Colors.info, fontWeight: '700' },
  hubAviso: { ...Typography.caption, color: Colors.textSecondary, marginBottom: Spacing.lg },
  parteCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, marginBottom: Spacing.sm },
  parteIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: Colors.primaryMuted, alignItems: 'center', justifyContent: 'center' },
  parteLabel: { ...Typography.subtitle, color: Colors.textPrimary, fontWeight: '700' },
  parteLugar: { ...Typography.micro, color: Colors.textMuted, textTransform: 'none', letterSpacing: 0, marginTop: 1 },
  parteDir: { ...Typography.caption, color: Colors.textSecondary, marginTop: 4 },
  parteEstado: { alignSelf: 'flex-start', paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: Radius.pill, marginTop: 6 },
  estOk: { backgroundColor: Colors.successMuted },
  estSitio: { backgroundColor: Colors.infoMuted },
  estPend: { backgroundColor: Colors.surfaceAlt },
  parteEstadoText: { ...Typography.micro, fontWeight: '700', textTransform: 'none', letterSpacing: 0 },
  hubOk: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.successMuted, borderRadius: Radius.md, padding: Spacing.md, marginTop: Spacing.md },
  hubOkText: { ...Typography.caption, color: '#065F46', fontWeight: '600', flex: 1 },

  // Candado
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
  yaOk: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.successMuted, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.md },
  yaOkText: { ...Typography.caption, color: '#065F46', flex: 1 },

  card: { backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 0.5, borderColor: Colors.border, padding: Spacing.md, marginBottom: Spacing.lg },
  cardTitle: { ...Typography.micro, color: Colors.textMuted, letterSpacing: 0.6, marginBottom: Spacing.sm },

  sectionLabel: { ...Typography.micro, color: Colors.textMuted, letterSpacing: 0.8, marginBottom: Spacing.sm, marginTop: Spacing.md },
  fotosAyuda: { ...Typography.caption, color: Colors.textMuted, marginBottom: Spacing.md },

  dictamenRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  dictamenCard: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: Spacing.md, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border },
  dictamenText: { ...Typography.micro, fontWeight: '700', textTransform: 'none', letterSpacing: 0, textAlign: 'center' },

  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.background },
  notFoundText: { ...Typography.subtitle, color: Colors.textSecondary },
});