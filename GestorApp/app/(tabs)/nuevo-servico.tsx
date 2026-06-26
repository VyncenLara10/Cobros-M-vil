import FormInput from '@/components/(auth)/FormInput';
import PrimaryButton from '@/components/(auth)/PrimaryButton';
import { Colors, Radius, Spacing, Typography } from '@/constants/DesignTokens';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

// ─── Tipos ──────────────────────────────────────────────────────────────────

type TipoServicio = 'cobro' | 'notificacion' | 'verificacion' | 'legal';
type TipoGestionLegal = 'carta_prejuridica' | 'demanda_civil' | 'embargo' | 'notificacion_legal';

interface DatosCliente {
  nombre: string;
  apellido: string;
  dpi: string;
  telefono: string;
  direccion: string;
  colonia: string;
  municipio: string;
  referencia: string;
  monto_deuda: string;
  notas: string;
}

const datosVacios: DatosCliente = {
  nombre: '',
  apellido: '',
  dpi: '',
  telefono: '',
  direccion: '',
  colonia: '',
  municipio: '',
  referencia: '',
  monto_deuda: '',
  notas: '',
};

// ─── Configuración de tipos de servicio ────────────────────────────────────

const TIPOS_SERVICIO: {
  id: TipoServicio;
  label: string;
  icon: string;
  descripcion: string;
  roleDestino: string;
  color: string;
  colorBg: string;
}[] = [
  {
    id: 'cobro',
    label: 'Cobro de campo',
    icon: 'cash-outline',
    descripcion: 'El cobrador visita al cliente y recupera el pago.',
    roleDestino: 'Cobrador',
    color: Colors.warning,
    colorBg: Colors.warningMuted,
  },
  {
    id: 'notificacion',
    label: 'Notificación',
    icon: 'document-text-outline',
    descripcion: 'Se entrega un documento oficial al cliente.',
    roleDestino: 'Notificador',
    color: Colors.info,
    colorBg: Colors.infoMuted,
  },
  {
    id: 'verificacion',
    label: 'Verificación',
    icon: 'search-outline',
    descripcion: 'Se verifica domicilio o datos laborales del cliente.',
    roleDestino: 'Verificador',
    color: Colors.success,
    colorBg: Colors.successMuted,
  },
  {
    id: 'legal',
    label: 'Gestión legal',
    icon: 'briefcase-outline',
    descripcion: 'El abogado realiza una gestión jurídica formal.',
    roleDestino: 'Abogado',
    color: '#9B7BF0',
    colorBg: 'rgba(155,123,240,0.14)',
  },
];

const GESTIONES_LEGALES: { id: TipoGestionLegal; label: string; tarifa: number }[] = [
  { id: 'carta_prejuridica', label: 'Carta pre-jurídica', tarifa: 200 },
  { id: 'demanda_civil', label: 'Demanda civil', tarifa: 800 },
  { id: 'embargo', label: 'Embargo precautorio', tarifa: 1200 },
  { id: 'notificacion_legal', label: 'Notificación con firma', tarifa: 150 },
];

// ─── Generador de notificación simulada ─────────────────────────────────────

function generarNotificacion(
  tipo: TipoServicio,
  cliente: DatosCliente,
  tipoLegal?: TipoGestionLegal
) {
  const nombre = `${cliente.nombre} ${cliente.apellido}`.trim() || 'Cliente';
  const direccion = [cliente.direccion, cliente.colonia, cliente.municipio]
    .filter(Boolean)
    .join(', ');
  const monto = cliente.monto_deuda
    ? `Q ${parseFloat(cliente.monto_deuda).toLocaleString('es-GT')}`
    : 'monto no especificado';
  const hora = new Date().toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' });
  const fecha = new Date().toLocaleDateString('es-GT', { day: 'numeric', month: 'long' });

  const base = {
    cobro: {
      titulo: '💰 Nueva solicitud de cobro',
      receptor: 'Cobrador',
      icono: 'cash',
      color: Colors.warning,
      pasos: [
        `Visitar a ${nombre}`,
        `Dirección: ${direccion || 'Ver detalles'}`,
        `Referencia: ${cliente.referencia || 'No indicada'}`,
        `Monto a cobrar: ${monto}`,
        `Comisión: 15% sobre lo recuperado`,
        `Teléfono del cliente: ${cliente.telefono || 'No indicado'}`,
      ],
      mensaje: `Tienes una nueva solicitud de cobro para el ${fecha} a las ${hora}. Revisa los detalles y acepta para que el caso quede asignado a ti.`,
    },
    notificacion: {
      titulo: '📄 Nueva solicitud de notificación',
      receptor: 'Notificador',
      icono: 'document-text',
      color: Colors.info,
      pasos: [
        `Entregar notificación a ${nombre}`,
        `Dirección: ${direccion || 'Ver detalles'}`,
        `Referencia: ${cliente.referencia || 'No indicada'}`,
        `Teléfono: ${cliente.telefono || 'No indicado'}`,
        `Obtener firma de recibido si es posible`,
        `Tomar foto de evidencia en el lugar`,
      ],
      mensaje: `Se te ha asignado una notificación para entregar el ${fecha}. El cliente debe recibir el documento en mano. Sube foto de evidencia al completar.`,
    },
    verificacion: {
      titulo: '🔍 Nueva solicitud de verificación',
      receptor: 'Verificador',
      icono: 'search',
      color: Colors.success,
      pasos: [
        `Verificar datos de: ${nombre}`,
        `Dirección a verificar: ${direccion || 'Ver detalles'}`,
        `Confirmar que el cliente reside o trabaja allí`,
        `Tomar foto del inmueble o local`,
        `Reportar si hay vecinos que confirmen`,
        `Reportar si la dirección es incorrecta`,
      ],
      mensaje: `Nueva verificación de campo el ${fecha}. Tu objetivo es confirmar si el cliente efectivamente se encuentra en la dirección indicada.`,
    },
    legal: {
      titulo: '⚖️ Nueva gestión legal',
      receptor: 'Abogado',
      icono: 'briefcase',
      color: '#9B7BF0',
      pasos: [
        `Cliente: ${nombre}`,
        `Gestión: ${GESTIONES_LEGALES.find((g) => g.id === tipoLegal)?.label || 'No especificada'}`,
        `Tarifa: Q ${GESTIONES_LEGALES.find((g) => g.id === tipoLegal)?.tarifa?.toLocaleString('es-GT') || '—'}`,
        `Dirección: ${direccion || 'Ver detalles'}`,
        `DPI del cliente: ${cliente.dpi || 'No indicado'}`,
        `Monto en disputa: ${monto}`,
      ],
      mensaje: `Se requiere tu gestión legal para el ${fecha}. Revisa el expediente completo antes de presentarte. El pago se liquida al reportar la gestión completada.`,
    },
  };

  return base[tipo];
}

// ─── Componente principal ───────────────────────────────────────────────────

export default function NuevoServicioScreen() {
  const [paso, setPaso] = useState<'tipo' | 'cliente' | 'confirmacion'>('tipo');
  const [tipoSeleccionado, setTipoSeleccionado] = useState<TipoServicio | null>(null);
  const [tipoLegal, setTipoLegal] = useState<TipoGestionLegal | null>(null);
  const [datos, setDatos] = useState<DatosCliente>(datosVacios);
  const [errores, setErrores] = useState<Partial<DatosCliente>>({});
  const [enviando, setEnviando] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [notificacionSimulada, setNotificacionSimulada] = useState<ReturnType<typeof generarNotificacion> | null>(null);

  const cambiarCampo = (campo: keyof DatosCliente, valor: string) => {
    setDatos((prev) => ({ ...prev, [campo]: valor }));
    if (errores[campo]) setErrores((prev) => ({ ...prev, [campo]: undefined }));
  };

  const validarCliente = () => {
    const nuevosErrores: Partial<DatosCliente> = {};
    if (!datos.nombre.trim()) nuevosErrores.nombre = 'El nombre es obligatorio';
    if (!datos.direccion.trim()) nuevosErrores.direccion = 'La dirección es obligatoria';
    if (!datos.municipio.trim()) nuevosErrores.municipio = 'El municipio es obligatorio';
    if (tipoSeleccionado === 'cobro' && !datos.monto_deuda)
      nuevosErrores.monto_deuda = 'Ingresa el monto de la deuda';
    if (tipoSeleccionado === 'legal' && !tipoLegal)
      Alert.alert('Falta seleccionar el tipo de gestión legal');
    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const simularEnvio = () => {
    if (!validarCliente() || !tipoSeleccionado) return;
    setEnviando(true);

    // Aquí irá: await fetch('/api/casos', { method: 'POST', body: payload })
    setTimeout(() => {
      setEnviando(false);
      const notif = generarNotificacion(tipoSeleccionado, datos, tipoLegal ?? undefined);
      setNotificacionSimulada(notif);
      setModalVisible(true);
    }, 1200);
  };

  const reiniciar = () => {
    setModalVisible(false);
    setPaso('tipo');
    setTipoSeleccionado(null);
    setTipoLegal(null);
    setDatos(datosVacios);
    setErrores({});
    setNotificacionSimulada(null);
  };

  // ── Paso 1: elegir tipo ────────────────────────────────────────────────
  if (paso === 'tipo') {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.pageTitle}>Nueva solicitud</Text>
        <Text style={styles.pageSubtitle}>¿Qué tipo de servicio necesitas?</Text>

        {TIPOS_SERVICIO.map((tipo) => {
          const seleccionado = tipoSeleccionado === tipo.id;
          return (
            <Pressable
              key={tipo.id}
              style={[styles.tipoCard, seleccionado && { borderColor: tipo.color, borderWidth: 2 }]}
              onPress={() => setTipoSeleccionado(tipo.id)}
            >
              <View style={[styles.tipoIconCircle, { backgroundColor: tipo.colorBg }]}>
                <Ionicons name={tipo.icon as any} size={22} color={tipo.color} />
              </View>
              <View style={styles.tipoTextos}>
                <Text style={styles.tipoLabel}>{tipo.label}</Text>
                <Text style={styles.tipoDesc}>{tipo.descripcion}</Text>
                <View style={styles.tipoRolBadge}>
                  <Text style={[styles.tipoRolText, { color: tipo.color }]}>
                    Asignado a: {tipo.roleDestino}
                  </Text>
                </View>
              </View>
              {seleccionado && (
                <Ionicons name="checkmark-circle" size={22} color={tipo.color} style={{ marginLeft: 8 }} />
              )}
            </Pressable>
          );
        })}

        {/* Subtipo legal si aplica */}
        {tipoSeleccionado === 'legal' && (
          <View style={styles.subtipoSection}>
            <Text style={styles.subtipoTitle}>Tipo de gestión legal</Text>
            {GESTIONES_LEGALES.map((g) => (
              <Pressable
                key={g.id}
                style={[styles.subtipoCard, tipoLegal === g.id && styles.subtipoCardSeleccionado]}
                onPress={() => setTipoLegal(g.id)}
              >
                <Text style={styles.subtipoLabel}>{g.label}</Text>
                <Text style={styles.subtipoTarifa}>Q {g.tarifa.toLocaleString('es-GT')}</Text>
              </Pressable>
            ))}
          </View>
        )}

        <PrimaryButton
          label="Continuar con datos del cliente →"
          onPress={() => {
            if (!tipoSeleccionado) {
              Alert.alert('Selecciona un tipo de servicio');
              return;
            }
            if (tipoSeleccionado === 'legal' && !tipoLegal) {
              Alert.alert('Selecciona el tipo de gestión legal');
              return;
            }
            setPaso('cliente');
          }}
          style={styles.botonPrincipal}
        />
      </ScrollView>
    );
  }

  // ── Paso 2: datos del cliente ──────────────────────────────────────────
  const tipoConfig = TIPOS_SERVICIO.find((t) => t.id === tipoSeleccionado)!;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent}>
        {/* Header con tipo seleccionado */}
        <Pressable style={styles.backRow} onPress={() => setPaso('tipo')}>
          <Ionicons name="chevron-back" size={18} color={Colors.primary} />
          <Text style={styles.backText}>Cambiar tipo</Text>
        </Pressable>

        <View style={[styles.tipoBanner, { backgroundColor: tipoConfig.colorBg }]}>
          <Ionicons name={tipoConfig.icon as any} size={18} color={tipoConfig.color} />
          <Text style={[styles.tipoBannerText, { color: tipoConfig.color }]}>
            {tipoConfig.label}
            {tipoSeleccionado === 'legal' && tipoLegal
              ? ` · ${GESTIONES_LEGALES.find((g) => g.id === tipoLegal)?.label}`
              : ''}
          </Text>
        </View>

        <Text style={styles.pageTitle}>Datos del cliente</Text>
        <Text style={styles.pageSubtitle}>
          Esta información le llegará al {tipoConfig.roleDestino.toLowerCase()} asignado
        </Text>

        {/* Datos personales */}
        <Text style={styles.sectionLabel}>DATOS PERSONALES</Text>

        <View style={styles.row}>
          <View style={styles.rowHalf}>
            <FormInput
              label="Nombre *"
              placeholder="Juan"
              value={datos.nombre}
              onChangeText={(t) => cambiarCampo('nombre', t)}
              error={errores.nombre}
            />
          </View>
          <View style={styles.rowHalf}>
            <FormInput
              label="Apellido"
              placeholder="Pérez"
              value={datos.apellido}
              onChangeText={(t) => cambiarCampo('apellido', t)}
            />
          </View>
        </View>

        <FormInput
          label="DPI"
          placeholder="0000 00000 0000"
          keyboardType="number-pad"
          value={datos.dpi}
          onChangeText={(t) => cambiarCampo('dpi', t)}
        />

        <FormInput
          label="Teléfono"
          placeholder="0000-0000"
          keyboardType="phone-pad"
          value={datos.telefono}
          onChangeText={(t) => cambiarCampo('telefono', t)}
        />

        {/* Ubicación */}
        <Text style={[styles.sectionLabel, { marginTop: Spacing.lg }]}>UBICACIÓN PARA VISITA</Text>

        <FormInput
          label="Dirección *"
          placeholder="3a Calle 4-20, Col. La Paz"
          value={datos.direccion}
          onChangeText={(t) => cambiarCampo('direccion', t)}
          error={errores.direccion}
        />

        <View style={styles.row}>
          <View style={styles.rowHalf}>
            <FormInput
              label="Colonia / Barrio"
              placeholder="Col. Vista Hermosa"
              value={datos.colonia}
              onChangeText={(t) => cambiarCampo('colonia', t)}
            />
          </View>
          <View style={styles.rowHalf}>
            <FormInput
              label="Municipio *"
              placeholder="Mixco"
              value={datos.municipio}
              onChangeText={(t) => cambiarCampo('municipio', t)}
              error={errores.municipio}
            />
          </View>
        </View>

        <FormInput
          label="Referencia de ubicación"
          placeholder='Casa azul con portón negro, frente a la tienda "La Fe"'
          value={datos.referencia}
          onChangeText={(t) => cambiarCampo('referencia', t)}
        />

        {/* Información financiera solo para cobro */}
        {tipoSeleccionado === 'cobro' && (
          <>
            <Text style={[styles.sectionLabel, { marginTop: Spacing.lg }]}>INFORMACIÓN FINANCIERA</Text>
            <FormInput
              label="Monto de la deuda (Q) *"
              placeholder="0.00"
              keyboardType="decimal-pad"
              value={datos.monto_deuda}
              onChangeText={(t) => cambiarCampo('monto_deuda', t)}
              error={errores.monto_deuda}
            />
            {datos.monto_deuda ? (
              <View style={styles.comisionPreview}>
                <Ionicons name="information-circle-outline" size={14} color={Colors.info} />
                <Text style={styles.comisionText}>
                  Comisión estimada del cobrador: Q{' '}
                  {(parseFloat(datos.monto_deuda || '0') * 0.15).toLocaleString('es-GT', {
                    minimumFractionDigits: 2,
                  })}{' '}
                  (15%)
                </Text>
              </View>
            ) : null}
          </>
        )}

        {/* Notas internas */}
        <Text style={[styles.sectionLabel, { marginTop: Spacing.lg }]}>NOTAS INTERNAS</Text>
        <FormInput
          label="Instrucciones adicionales"
          placeholder="Ej: 2do intento, cliente tiene acuerdo verbal de pago parcial..."
          value={datos.notas}
          onChangeText={(t) => cambiarCampo('notas', t)}
        />

        <PrimaryButton
          label={enviando ? 'Enviando solicitud...' : 'Publicar solicitud'}
          onPress={simularEnvio}
          loading={enviando}
          style={styles.botonPrincipal}
        />

        <Text style={styles.footerNota}>
          Al publicar, el sistema notificará a los gestores disponibles más cercanos según su zona de cobertura.
        </Text>
      </ScrollView>

      {/* ── Modal de notificación simulada ─────────────────────────────── */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Encabezado */}
              <View style={styles.modalHeader}>
                <View style={[styles.modalIconCircle, { backgroundColor: notificacionSimulada ? `${notificacionSimulada.color}22` : Colors.primaryMuted }]}>
                  <Ionicons
                    name={(notificacionSimulada?.icono ?? 'notifications') as any}
                    size={28}
                    color={notificacionSimulada?.color ?? Colors.primary}
                  />
                </View>
                <Text style={styles.modalTitulo}>{notificacionSimulada?.titulo}</Text>
                <View style={styles.modalRolBadge}>
                  <Text style={styles.modalRolText}>
                    Notificación para: {notificacionSimulada?.receptor}
                  </Text>
                </View>
              </View>

              {/* Mensaje principal */}
              <View style={styles.modalMensajeBox}>
                <Text style={styles.modalMensaje}>{notificacionSimulada?.mensaje}</Text>
              </View>

              {/* Pasos / checklist */}
              <Text style={styles.modalSeccion}>Lo que verá el gestor:</Text>
              {notificacionSimulada?.pasos.map((paso, i) => (
                <View key={i} style={styles.modalPasoRow}>
                  <View style={[styles.modalPasoDot, { backgroundColor: notificacionSimulada.color }]} />
                  <Text style={styles.modalPasoText}>{paso}</Text>
                </View>
              ))}

              {/* Acciones que tendría el gestor */}
              <Text style={styles.modalSeccion}>Botones que vería el gestor:</Text>
              <View style={styles.modalBotonesGestor}>
                <View style={[styles.modalBotonGestor, { backgroundColor: Colors.successMuted }]}>
                  <Ionicons name="checkmark-circle-outline" size={16} color={Colors.success} />
                  <Text style={[styles.modalBotonGestorText, { color: Colors.success }]}>Aceptar caso</Text>
                </View>
                <View style={[styles.modalBotonGestor, { backgroundColor: Colors.dangerMuted }]}>
                  <Ionicons name="close-circle-outline" size={16} color={Colors.danger} />
                  <Text style={[styles.modalBotonGestorText, { color: Colors.danger }]}>Rechazar</Text>
                </View>
              </View>

              {/* Separador */}
              <View style={styles.modalDivider} />

              <Text style={styles.modalExito}>
                ✅ Solicitud publicada correctamente. El sistema buscará gestores disponibles en la zona.
              </Text>

              <PrimaryButton label="Crear otra solicitud" onPress={reiniciar} style={{ marginTop: Spacing.lg }} />
              <Pressable onPress={() => setModalVisible(false)} style={styles.modalVerDetalle}>
                <Text style={styles.modalVerDetalleText}>Ver mis servicios</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

// ─── Estilos ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: Colors.background },
  scrollContent: {
    padding: Spacing.xl,
    paddingBottom: Spacing.xxxl,
  },
  pageTitle: {
    ...Typography.title,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  pageSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.xl,
  },

  // Tarjetas de tipo
  tipoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  tipoIconCircle: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  tipoTextos: { flex: 1 },
  tipoLabel: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  tipoDesc: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  tipoRolBadge: {
    alignSelf: 'flex-start',
    borderRadius: Radius.pill,
  },
  tipoRolText: {
    ...Typography.micro,
    fontWeight: '600',
  },

  // Subtipos legal
  subtipoSection: {
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  subtipoTitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subtipoCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.xs,
  },
  subtipoCardSeleccionado: {
    borderColor: '#9B7BF0',
    borderWidth: 2,
    backgroundColor: 'rgba(155,123,240,0.08)',
  },
  subtipoLabel: {
    ...Typography.body,
    color: Colors.textPrimary,
  },
  subtipoTarifa: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '600',
  },

  // Paso 2: cliente
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  backText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '600',
    marginLeft: 4,
  },
  tipoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radius.sm,
    marginBottom: Spacing.lg,
  },
  tipoBannerText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  sectionLabel: {
    ...Typography.micro,
    color: Colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  rowHalf: { flex: 1 },
  comisionPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.infoMuted,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    marginTop: -Spacing.sm,
    marginBottom: Spacing.md,
  },
  comisionText: {
    ...Typography.micro,
    color: Colors.info,
    flex: 1,
  },
  botonPrincipal: { marginTop: Spacing.xl },
  footerNota: {
    ...Typography.micro,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.md,
    lineHeight: 16,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.xl,
    maxHeight: '90%',
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  modalIconCircle: {
    width: 64,
    height: 64,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  modalTitulo: {
    ...Typography.title,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  modalRolBadge: {
    backgroundColor: Colors.primaryMuted,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.pill,
  },
  modalRolText: {
    ...Typography.micro,
    color: Colors.primary,
    fontWeight: '600',
  },
  modalMensajeBox: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  modalMensaje: {
    ...Typography.body,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  modalSeccion: {
    ...Typography.micro,
    color: Colors.textMuted,
    letterSpacing: 0.6,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  modalPasoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  modalPasoDot: {
    width: 8,
    height: 8,
    borderRadius: Radius.pill,
    marginTop: 5,
  },
  modalPasoText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 20,
  },
  modalBotonesGestor: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  modalBotonGestor: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: Radius.md,
  },
  modalBotonGestorText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  modalDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.lg,
  },
  modalExito: {
    ...Typography.caption,
    color: Colors.success,
    textAlign: 'center',
    fontWeight: '600',
  },
  modalVerDetalle: {
    alignItems: 'center',
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  modalVerDetalleText: {
    ...Typography.caption,
    color: Colors.textMuted,
    fontWeight: '600',
  },
});