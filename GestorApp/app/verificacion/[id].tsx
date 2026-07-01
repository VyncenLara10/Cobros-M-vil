import DocumentUploader from '@/components/(auth)/Documentuploader';
import FormInput from '@/components/(auth)/FormInput';
import PrimaryButton from '@/components/(auth)/PrimaryButton';
import { Colors, Radius, Spacing, Typography } from '@/constants/DesignTokens';
import { CLIENTES_MOCK } from '@/data/clientesMock';
import { SERVICIOS_MOCK } from '@/data/mocks';
import { Servicio, SUBTIPO_VERIFICACION_LABEL } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

type Dictamen = 'aprobado' | 'observaciones' | 'rechazado';

const DICTAMENES: { id: Dictamen; label: string; icon: string; color: string; bg: string }[] = [
  { id: 'aprobado', label: 'Aprobar', icon: 'checkmark-circle', color: Colors.success, bg: Colors.successMuted },
  { id: 'observaciones', label: 'Con observaciones', icon: 'alert-circle', color: Colors.warning, bg: Colors.warningMuted },
  { id: 'rechazado', label: 'Rechazar', icon: 'close-circle', color: Colors.danger, bg: Colors.dangerMuted },
];

// Fotos requeridas según el subtipo
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

export default function FormularioVerificacionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const servicio: Servicio | undefined = SERVICIOS_MOCK.find((s) => s.id === id);
  const clienteDB = servicio?.cliente.clienteId
    ? CLIENTES_MOCK.find((c) => c.id === servicio.cliente.clienteId)
    : undefined;

  const esLaboral = servicio?.subtipoVerificacion === 'laboral';
  const fotosRequeridas = esLaboral ? FOTOS_LABORAL : FOTOS_DOMICILIAR;

  // Estado del formulario
  const [fotos, setFotos] = useState<Record<string, string | null>>({});
  const [confirmaResidencia, setConfirmaResidencia] = useState('');
  const [tipoVivienda, setTipoVivienda] = useState('');
  const [tiempoResidir, setTiempoResidir] = useState('');
  const [producto, setProducto] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [dictamen, setDictamen] = useState<Dictamen | null>(null);
  const [enviando, setEnviando] = useState(false);

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

  const setFoto = (key: string, uri: string | null) => setFotos((p) => ({ ...p, [key]: uri }));

  // Fotos obligatorias (todas menos la última opcional en laboral)
  const fotosObligatorias = esLaboral ? FOTOS_LABORAL.slice(0, 2) : FOTOS_DOMICILIAR;
  const faltanFotos = fotosObligatorias.filter((f) => !fotos[f.key]).map((f) => f.titulo);

  const enviar = () => {
    if (faltanFotos.length > 0) {
      Alert.alert('Faltan fotografías', `Adjunta: ${faltanFotos.join(', ')}`);
      return;
    }
    if (!dictamen) {
      Alert.alert('Falta el dictamen', 'Selecciona si apruebas, rechazas o marcas observaciones.');
      return;
    }
    setEnviando(true);
    // TODO: subir fotos (multipart / presigned S3) y POST /api/verificaciones/${id}
    setTimeout(() => {
      setEnviando(false);
      const label = DICTAMENES.find((d) => d.id === dictamen)?.label;
      Alert.alert('✅ Verificación enviada', `Dictamen: ${label}.\nLa solicitud de crédito continúa su proceso.`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    }, 1200);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Pressable style={styles.backRow} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={20} color={Colors.primary} />
        <Text style={styles.backText}>Cancelar verificación</Text>
      </Pressable>

      {/* Encabezado */}
      <View style={[styles.banner, { backgroundColor: esLaboral ? Colors.infoMuted : Colors.successMuted }]}>
        <Ionicons name={esLaboral ? 'briefcase' : 'home'} size={18} color={esLaboral ? Colors.info : Colors.success} />
        <Text style={[styles.bannerText, { color: esLaboral ? Colors.info : '#065F46' }]}>
          {servicio.subtipoVerificacion ? SUBTIPO_VERIFICACION_LABEL[servicio.subtipoVerificacion] : 'Verificación'}
        </Text>
      </View>

      <Text style={styles.title}>{servicio.cliente.nombre}</Text>
      <Text style={styles.subtitle}>{servicio.cliente.direccion} · {servicio.cliente.zona}</Text>

      {/* Datos del cliente (referencia) */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>DATOS DEL CLIENTE</Text>
        <Ref label="Teléfono" value={servicio.cliente.telefono} />
        {clienteDB && <Ref label="DPI" value={clienteDB.dpi} />}
        {clienteDB && <Ref label="Municipio" value={`${clienteDB.municipio} · ${clienteDB.zona}`} />}
        <Text style={styles.instruccion}>{servicio.notas}</Text>
      </View>

      {/* Confirmación de datos */}
      <Text style={styles.sectionLabel}>
        {esLaboral ? 'DATOS LABORALES' : 'DATOS DE LA VIVIENDA'}
      </Text>

      {esLaboral ? (
        <>
          <FormInput label="Producto / actividad del negocio" placeholder="Ej: venta de ropa, taller mecánico…" value={producto} onChangeText={setProducto} />
          <FormInput label="¿Se confirma que trabaja allí?" placeholder="Sí / No y detalle" value={confirmaResidencia} onChangeText={setConfirmaResidencia} />
          <FormInput label="Tiempo en el negocio" placeholder="Ej: 3 años" value={tiempoResidir} onChangeText={setTiempoResidir} />
        </>
      ) : (
        <>
          <FormInput label="¿Se confirma que reside allí?" placeholder="Sí / No y detalle" value={confirmaResidencia} onChangeText={setConfirmaResidencia} />
          <FormInput label="Tipo de vivienda" placeholder="Propia / Alquilada / Familiar" value={tipoVivienda} onChangeText={setTipoVivienda} />
          <FormInput label="Tiempo de residir" placeholder="Ej: 5 años" value={tiempoResidir} onChangeText={setTiempoResidir} />
        </>
      )}

      {/* Fotografías */}
      <Text style={styles.sectionLabel}>FOTOGRAFÍAS {esLaboral ? '(del negocio/producto)' : '(de la vivienda)'}</Text>
      <Text style={styles.fotosAyuda}>
        {esLaboral
          ? 'Adjunta la evidencia del negocio. La foto del producto y el frente son obligatorias.'
          : 'Adjunta las 4 fotos: frente, ambos lados y el contador de luz.'}
      </Text>

      {fotosRequeridas.map((f) => (
        <DocumentUploader
          key={f.key}
          titulo={f.titulo}
          descripcion={f.desc}
          obligatorio={fotosObligatorias.some((o) => o.key === f.key)}
          onChange={(uri) => setFoto(f.key, uri)}
        />
      ))}

      {/* Dictamen */}
      <Text style={styles.sectionLabel}>DICTAMEN DE VERIFICACIÓN</Text>
      <Text style={styles.fotosAyuda}>Con base en lo verificado, ¿se aprueba la solicitud de crédito?</Text>
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

      <FormInput label="Observaciones" placeholder="Notas del verificador, hallazgos, referencias de vecinos…" value={observaciones} onChangeText={setObservaciones} />

      <PrimaryButton label={enviando ? 'Enviando verificación...' : 'Enviar verificación'} onPress={enviar} loading={enviando} style={{ marginTop: Spacing.md }} />
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

  banner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, alignSelf: 'flex-start', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.pill, marginBottom: Spacing.md },
  bannerText: { ...Typography.caption, fontWeight: '700' },
  title: { ...Typography.title, color: Colors.textPrimary },
  subtitle: { ...Typography.caption, color: Colors.textSecondary, marginBottom: Spacing.lg },

  card: { backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 0.5, borderColor: Colors.border, padding: Spacing.md, marginBottom: Spacing.lg },
  cardTitle: { ...Typography.micro, color: Colors.textMuted, letterSpacing: 0.6, marginBottom: Spacing.sm },
  refRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  refLabel: { ...Typography.caption, color: Colors.textSecondary },
  refValue: { ...Typography.caption, color: Colors.textPrimary, fontWeight: '600' },
  instruccion: { ...Typography.caption, color: Colors.textSecondary, marginTop: Spacing.sm, fontStyle: 'italic' },

  sectionLabel: { ...Typography.micro, color: Colors.textMuted, letterSpacing: 0.8, marginBottom: Spacing.sm, marginTop: Spacing.md },
  fotosAyuda: { ...Typography.caption, color: Colors.textMuted, marginBottom: Spacing.md },

  dictamenRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  dictamenCard: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: Spacing.md, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border },
  dictamenText: { ...Typography.micro, fontWeight: '700', textTransform: 'none', letterSpacing: 0, textAlign: 'center' },

  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.background },
  notFoundText: { ...Typography.subtitle, color: Colors.textSecondary },
});