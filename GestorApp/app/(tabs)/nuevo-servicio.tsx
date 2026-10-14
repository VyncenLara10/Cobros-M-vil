import FormInput from '@/components/(auth)/FormInput';
import PrimaryButton from '@/components/(auth)/PrimaryButton';
import { Colors, Radius, Spacing, Typography } from '@/constants/DesignTokens';
import { buscarClienteDB, ClienteBusqueda, crearServicio } from '@/domain/servicios/servicios';
import { useBottomInset } from '@/hooks/useBottomInset';
import { ROL_LABEL, ROLES_ELEGIBLES, SubtipoVerificacion, TipoServicio } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

// ─── Tipos ──────────────────────────────────────────────────────────────────

type TipoGestionLegal = 'carta_prejuridica' | 'demanda_civil' | 'embargo' | 'notificacion_legal';

interface DatosCliente {
  clienteId: string; // ID interno si vino de la BD
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
  clienteId: '', nombre: '', apellido: '', dpi: '', telefono: '',
  direccion: '', colonia: '', municipio: '', referencia: '', monto_deuda: '', notas: '',
};

// ─── Configuración de tipos de servicio (con reglas de rol) ─────────────────

const TIPOS_SERVICIO: {
  id: TipoServicio;
  label: string;
  icon: string;
  descripcion: string;
  color: string;
  colorBg: string;
}[] = [
  {
    id: 'cobro',
    label: 'Cobro de campo',
    icon: 'cash-outline',
    descripcion: 'Un cobrador capacitado visita al cliente y recupera el pago. Maneja deuda y días de mora.',
    color: Colors.warning,
    colorBg: Colors.warningMuted,
  },
  {
    id: 'notificacion',
    label: 'Notificación',
    icon: 'document-text-outline',
    descripcion: 'Solo se deja la notificación y se consigue un número del cliente. La puede tomar cualquier gestor.',
    color: Colors.info,
    colorBg: Colors.infoMuted,
  },
  {
    id: 'verificacion',
    label: 'Verificación',
    icon: 'search-outline',
    descripcion: 'Verificación domiciliar o laboral. Abierta a los 3 roles: se la queda el primero que la acepte.',
    color: Colors.success,
    colorBg: Colors.successMuted,
  },
  {
    id: 'legal',
    label: 'Gestión legal',
    icon: 'briefcase-outline',
    descripcion: 'Gestión jurídica formal. Solo la puede aceptar un abogado con número de colegiado.',
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

const SUBTIPOS_VERIFICACION: { id: SubtipoVerificacion; label: string; desc: string }[] = [
  { id: 'domiciliar', label: 'Domiciliar', desc: 'Fotos de la casa (frente, izq., der.) y contador de luz.' },
  { id: 'laboral', label: 'Laboral', desc: 'Foto del producto / negocio / puesto de trabajo.' },
];

// Texto de quién puede aceptar cada tipo
function rolesElegiblesTexto(tipo: TipoServicio): string {
  const roles = ROLES_ELEGIBLES[tipo].map((r) => ROL_LABEL[r]);
  return roles.length === 3 ? 'Cualquier gestor' : roles.join(' · ');
}

// ─── Notificación simulada ──────────────────────────────────────────────────

function generarNotificacion(
  tipo: TipoServicio,
  cliente: DatosCliente,
  opciones?: { tipoLegal?: TipoGestionLegal; comisionPct?: number; subtipos?: SubtipoVerificacion[] },
) {
  const tipoLegal = opciones?.tipoLegal;
  const pct = opciones?.comisionPct ?? 15;
  const saldo = parseFloat(cliente.monto_deuda || '0');
  const comisionMax = saldo * (pct / 100);
  const subtiposLabel = (opciones?.subtipos ?? [])
    .map((s) => (s === 'laboral' ? 'Laboral' : 'Domiciliar'))
    .join(' + ') || 'Domiciliar';
  const nombre = `${cliente.nombre} ${cliente.apellido}`.trim() || 'Cliente';
  const direccion = [cliente.direccion, cliente.colonia, cliente.municipio].filter(Boolean).join(', ');
  const monto = cliente.monto_deuda ? `Q ${parseFloat(cliente.monto_deuda).toLocaleString('es-GT')}` : 'monto no especificado';
  const hora = new Date().toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' });
  const fecha = new Date().toLocaleDateString('es-GT', { day: 'numeric', month: 'long' });

  const base = {
    cobro: {
      titulo: '💰 Nueva solicitud de cobro', receptor: 'Cobrador', icono: 'cash', color: Colors.warning,
      pasos: [`Visitar a ${nombre}`, `Dirección: ${direccion || 'Ver detalles'}`, `Monto a cobrar: ${monto}`, `Comisión: ${pct}% sobre lo recuperado (máx. Q ${comisionMax.toLocaleString('es-GT', { minimumFractionDigits: 2 })})`, `Teléfono: ${cliente.telefono || 'No indicado'}`],
      mensaje: `Tienes una nueva solicitud de cobro para el ${fecha} a las ${hora}. Solo cobradores pueden aceptarla.`,
    },
    notificacion: {
      titulo: '📄 Nueva notificación', receptor: 'Cualquier gestor', icono: 'document-text', color: Colors.info,
      pasos: [`Entregar notificación a ${nombre}`, `Dirección: ${direccion || 'Ver detalles'}`, `Conseguir un número de contacto del cliente`, `Tomar foto de evidencia`],
      mensaje: `Notificación disponible para el ${fecha}. La puede aceptar cualquiera de los 3 roles. Solo dejar el documento y conseguir el número.`,
    },
    verificacion: {
      titulo: '🔍 Nueva verificación', receptor: 'Cualquier gestor', icono: 'search', color: Colors.success,
      pasos: [`Verificar a: ${nombre}`, `Tipo: ${subtiposLabel}`, `Dirección: ${direccion || 'Ver detalles'}`, `Completar formulario en el lugar`, `Subir fotografías requeridas`],
      mensaje: `Verificación (${subtiposLabel}) disponible el ${fecha}. Se la queda el primer gestor que la acepte. El formulario se completa estando en la ubicación.`,
    },
    legal: {
      titulo: '⚖️ Nueva gestión legal', receptor: 'Abogado (colegiado)', icono: 'briefcase', color: '#9B7BF0',
      pasos: [`Cliente: ${nombre}`, `Gestión: ${GESTIONES_LEGALES.find((g) => g.id === tipoLegal)?.label || 'No especificada'}`, `Tarifa: Q ${GESTIONES_LEGALES.find((g) => g.id === tipoLegal)?.tarifa?.toLocaleString('es-GT') || '—'}`, `DPI: ${cliente.dpi || 'No indicado'}`, `Monto en disputa: ${monto}`],
      mensaje: `Gestión legal para el ${fecha}. SOLO abogados con colegiado pueden aceptarla.`,
    },
  };
  return base[tipo];
}

// ─── Modal: buscador de cliente ─────────────────────────────────────────────

function ModalBuscarCliente({
  visible,
  onCerrar,
  onSeleccionar,
}: {
  visible: boolean;
  onCerrar: () => void;
  onSeleccionar: (cliente: ClienteBusqueda) => void;
}) {
  const [query, setQuery] = useState('');
  const [buscado, setBuscado] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [resultados, setResultados] = useState<ClienteBusqueda[]>([]);

  const ejecutarBusqueda = async () => {
    if (query.trim().length < 3) {
      setResultados([]);
      setBuscado(true);
      return;
    }
    setBuscando(true);
    const r = await buscarClienteDB(query);
    setResultados(r);
    setBuscado(true);
    setBuscando(false);
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.buscarHeader}>
            <Text style={styles.modalTitulo}>Buscar cliente</Text>
            <Pressable onPress={onCerrar} hitSlop={10}>
              <Ionicons name="close" size={24} color={Colors.textSecondary} />
            </Pressable>
          </View>
          <Text style={styles.buscarSub}>Busca por DPI o nombre en la base de datos.</Text>

          <View style={styles.buscarRow}>
            <TextInput
              style={styles.buscarInput}
              placeholder="Ej: 1234567890101, Carlos…"
              placeholderTextColor={Colors.textMuted}
              value={query}
              onChangeText={(t) => { setQuery(t); setBuscado(false); setResultados([]); }}
              autoCapitalize="none"
              onSubmitEditing={ejecutarBusqueda}
              returnKeyType="search"
            />
            <Pressable style={styles.buscarBtn} onPress={ejecutarBusqueda}>
              {buscando ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="search" size={20} color="#fff" />}
            </Pressable>
          </View>

          <ScrollView style={styles.buscarResultados} keyboardShouldPersistTaps="handled">
            {buscado && !buscando && resultados.length === 0 && (
              <View style={styles.buscarVacio}>
                <Ionicons name="person-outline" size={32} color={Colors.textMuted} />
                <Text style={styles.buscarVacioText}>
                  {query.trim().length < 3 ? 'Escribe al menos 3 caracteres' : 'Sin coincidencias en la BD'}
                </Text>
              </View>
            )}

            {resultados.map((c) => (
              <Pressable key={c.id} style={styles.resultadoCard} onPress={() => onSeleccionar(c)}>
                <View style={styles.resultadoAvatar}>
                  <Text style={styles.resultadoAvatarText}>{c.nombre.charAt(0)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.resultadoNombre}>{c.nombre}</Text>
                  {c.dpi && <Text style={styles.resultadoMeta}>DPI {c.dpi}</Text>}
                  <Text style={styles.resultadoMeta}>{c.direccion}, {c.municipio} · {c.zona}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
              </Pressable>
            ))}
          </ScrollView>

          <Pressable style={styles.buscarManual} onPress={onCerrar}>
            <Text style={styles.buscarManualText}>No está en la BD · ingresar manualmente</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ─── Componente principal ───────────────────────────────────────────────────

export default function NuevoServicioScreen() {
  const bottomInset = useBottomInset();
  const [paso, setPaso] = useState<'tipo' | 'cliente'>('tipo');
  const [tipoSeleccionado, setTipoSeleccionado] = useState<TipoServicio | null>(null);
  const [tipoLegal, setTipoLegal] = useState<TipoGestionLegal | null>(null);
  const [subtiposVerif, setSubtiposVerif] = useState<SubtipoVerificacion[]>(['domiciliar']);
  const [comisionPctInput, setComisionPctInput] = useState('15');
  const [datos, setDatos] = useState<DatosCliente>(datosVacios);
  const [errores, setErrores] = useState<Partial<DatosCliente>>({});
  const [enviando, setEnviando] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalBuscar, setModalBuscar] = useState(false);
  const [clienteVinculado, setClienteVinculado] = useState<ClienteBusqueda | null>(null);
  const [notif, setNotif] = useState<ReturnType<typeof generarNotificacion> | null>(null);
  const [ubicacionActual, setUbicacionActual] = useState<{ lat: number; lng: number } | null>(null);
  const [obteniendoUbicacion, setObteniendoUbicacion] = useState(false);

  const cambiarCampo = (campo: keyof DatosCliente, valor: string) => {
    setDatos((prev) => ({ ...prev, [campo]: valor }));
    if (errores[campo]) setErrores((prev) => ({ ...prev, [campo]: undefined }));
  };

  const toggleSubtipo = (s: SubtipoVerificacion) => {
    setSubtiposVerif((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  };

  // Comisión saneada (0–100) y montos derivados
  const comisionPct = Math.min(100, Math.max(0, parseFloat(comisionPctInput || '0') || 0));
  const saldoNum = parseFloat(datos.monto_deuda || '0') || 0;
  const comisionMaxima = saldoNum * (comisionPct / 100);

  // Autollenar desde la BD al seleccionar un cliente
  const vincularCliente = (c: ClienteBusqueda) => {
    setClienteVinculado(c);
    setDatos({
      clienteId: c.id,
      nombre: c.nombre,
      apellido: '',
      dpi: c.dpi ?? '',
      telefono: c.telefono,
      direccion: c.direccion,
      colonia: '',
      municipio: c.municipio,
      referencia: '',
      monto_deuda: c.deudaTotal ? String(c.deudaTotal) : '',
      notas: '',
    });
    setModalBuscar(false);
  };

  const desvincularCliente = () => {
    setClienteVinculado(null);
    setDatos(datosVacios);
  };

  const usarMiUbicacion = async () => {
    setObteniendoUbicacion(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Activa el permiso de ubicación para marcar dónde está el cliente.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setUbicacionActual({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    } catch {
      Alert.alert('No se pudo obtener tu ubicación', 'Verifica que el GPS esté activado e intenta de nuevo.');
    } finally {
      setObteniendoUbicacion(false);
    }
  };

  const validarCliente = () => {
    const e: Partial<DatosCliente> = {};
    if (!datos.nombre.trim()) e.nombre = 'El nombre es obligatorio';
    if (!datos.direccion.trim()) e.direccion = 'La dirección es obligatoria';
    if (!datos.municipio.trim()) e.municipio = 'El municipio es obligatorio';
    if (tipoSeleccionado === 'cobro' && !datos.monto_deuda) e.monto_deuda = 'Ingresa el monto de la deuda';
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const simularEnvio = async () => {
    if (!validarCliente() || !tipoSeleccionado) return;
    setEnviando(true);
    const tipoLegalInfo = GESTIONES_LEGALES.find((g) => g.id === tipoLegal);
    const resultado = await crearServicio({
      tipo: tipoSeleccionado,
      cliente: {
        clienteId: clienteVinculado?.id,
        nombre: datos.nombre,
        apellido: datos.apellido,
        dpi: datos.dpi,
        telefono: datos.telefono,
        direccion: datos.direccion,
        colonia: datos.colonia,
        municipio: datos.municipio,
        referencia: datos.referencia,
      },
      deudaTotal: tipoSeleccionado === 'cobro' ? saldoNum : undefined,
      comisionPct: tipoSeleccionado === 'cobro' ? comisionPct : undefined,
      notas: datos.notas,
      tipoGestionLegal: tipoSeleccionado === 'legal' ? tipoLegalInfo?.label : undefined,
      tarifaLegal: tipoSeleccionado === 'legal' ? tipoLegalInfo?.tarifa : undefined,
      subtiposVerificacion: tipoSeleccionado === 'verificacion' ? subtiposVerif : undefined,
      ubicacion: ubicacionActual ?? undefined,
    });
    setEnviando(false);
    if (!resultado.ok) {
      Alert.alert('No se pudo publicar la solicitud', resultado.error ?? 'Intenta de nuevo.');
      return;
    }
    setNotif(generarNotificacion(tipoSeleccionado, datos, {
      tipoLegal: tipoLegal ?? undefined,
      comisionPct,
      subtipos: subtiposVerif,
    }));
    setModalVisible(true);
  };

  const reiniciar = () => {
    setModalVisible(false);
    setPaso('tipo');
    setTipoSeleccionado(null);
    setTipoLegal(null);
    setSubtiposVerif(['domiciliar']);
    setComisionPctInput('15');
    setDatos(datosVacios);
    setClienteVinculado(null);
    setUbicacionActual(null);
    setErrores({});
    setNotif(null);
  };

  // ── Paso 1: tipo ────────────────────────────────────────────────────────
  if (paso === 'tipo') {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.pageTitle}>Nueva solicitud</Text>
        <Text style={styles.pageSubtitle}>¿Qué tipo de servicio necesitas?</Text>

        {TIPOS_SERVICIO.map((tipo) => {
          const sel = tipoSeleccionado === tipo.id;
          return (
            <Pressable
              key={tipo.id}
              style={[styles.tipoCard, sel && { borderColor: tipo.color, borderWidth: 2 }]}
              onPress={() => setTipoSeleccionado(tipo.id)}
            >
              <View style={[styles.tipoIconCircle, { backgroundColor: tipo.colorBg }]}>
                <Ionicons name={tipo.icon as any} size={22} color={tipo.color} />
              </View>
              <View style={styles.tipoTextos}>
                <Text style={styles.tipoLabel}>{tipo.label}</Text>
                <Text style={styles.tipoDesc}>{tipo.descripcion}</Text>
                <View style={[styles.tipoRolBadge, { backgroundColor: tipo.colorBg }]}>
                  <Ionicons name="people-outline" size={11} color={tipo.color} />
                  <Text style={[styles.tipoRolText, { color: tipo.color }]}>
                    Puede aceptar: {rolesElegiblesTexto(tipo.id)}
                  </Text>
                </View>
              </View>
              {sel && <Ionicons name="checkmark-circle" size={22} color={tipo.color} style={{ marginLeft: 8 }} />}
            </Pressable>
          );
        })}

        {/* Subtipo legal */}
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

        {/* Subtipo verificación (se puede elegir domiciliar, laboral o AMBAS) */}
        {tipoSeleccionado === 'verificacion' && (
          <View style={styles.subtipoSection}>
            <Text style={styles.subtipoTitle}>Tipo de verificación</Text>
            <Text style={styles.subtipoHint}>Puedes seleccionar una o ambas.</Text>
            {SUBTIPOS_VERIFICACION.map((s) => {
              const activo = subtiposVerif.includes(s.id);
              return (
                <Pressable
                  key={s.id}
                  style={[styles.subtipoCard, activo && { borderColor: Colors.success, borderWidth: 2, backgroundColor: Colors.successMuted }]}
                  onPress={() => toggleSubtipo(s.id)}
                >
                  <View style={[styles.checkbox, activo && { backgroundColor: Colors.success, borderColor: Colors.success }]}>
                    {activo && <Ionicons name="checkmark" size={14} color="#fff" />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.subtipoLabel}>{s.label}</Text>
                    <Text style={styles.subtipoDesc}>{s.desc}</Text>
                  </View>
                </Pressable>
              );
            })}
            {subtiposVerif.length === 2 && (
              <View style={styles.ambasBadge}>
                <Ionicons name="layers-outline" size={13} color={Colors.success} />
                <Text style={styles.ambasText}>Verificación completa: domiciliar + laboral</Text>
              </View>
            )}
          </View>
        )}

        <PrimaryButton
          label="Continuar con datos del cliente →"
          onPress={() => {
            if (!tipoSeleccionado) return Alert.alert('Selecciona un tipo de servicio');
            if (tipoSeleccionado === 'legal' && !tipoLegal) return Alert.alert('Selecciona el tipo de gestión legal');
            if (tipoSeleccionado === 'verificacion' && subtiposVerif.length === 0) return Alert.alert('Selecciona al menos un tipo de verificación');
            setPaso('cliente');
          }}
          style={styles.botonPrincipal}
        />
      </ScrollView>
    );
  }

  // ── Paso 2: cliente ───────────────────────────────────────────────────────
  const tipoConfig = TIPOS_SERVICIO.find((t) => t.id === tipoSeleccionado)!;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent}>
        <Pressable style={styles.backRow} onPress={() => setPaso('tipo')}>
          <Ionicons name="chevron-back" size={18} color={Colors.primary} />
          <Text style={styles.backText}>Cambiar tipo</Text>
        </Pressable>

        <View style={[styles.tipoBanner, { backgroundColor: tipoConfig.colorBg }]}>
          <Ionicons name={tipoConfig.icon as any} size={18} color={tipoConfig.color} />
          <Text style={[styles.tipoBannerText, { color: tipoConfig.color }]}>
            {tipoConfig.label}
            {tipoSeleccionado === 'legal' && tipoLegal ? ` · ${GESTIONES_LEGALES.find((g) => g.id === tipoLegal)?.label}` : ''}
            {tipoSeleccionado === 'verificacion' ? ` · ${subtiposVerif.map((s) => (s === 'laboral' ? 'Laboral' : 'Domiciliar')).join(' + ')}` : ''}
          </Text>
        </View>

        {/* ── BOTÓN BUSCAR CLIENTE ── */}
        <Pressable style={styles.buscarClienteBtn} onPress={() => setModalBuscar(true)}>
          <Ionicons name="search" size={18} color={Colors.primary} />
          <Text style={styles.buscarClienteText}>Buscar cliente por ID o DPI</Text>
          <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
        </Pressable>

        {clienteVinculado && (
          <View style={styles.vinculadoBox}>
            <Ionicons name="link" size={15} color={Colors.success} />
            <Text style={styles.vinculadoText}>
              {clienteVinculado.nombre} vinculado desde la BD
            </Text>
            <Pressable onPress={desvincularCliente} hitSlop={8}>
              <Text style={styles.vinculadoQuitar}>Quitar</Text>
            </Pressable>
          </View>
        )}

        <Text style={styles.pageTitle}>Datos del cliente</Text>
        <Text style={styles.pageSubtitle}>
          Esta información le llegará al gestor que acepte la solicitud
        </Text>

        <Text style={styles.sectionLabel}>DATOS PERSONALES</Text>
        <View style={styles.row}>
          <View style={styles.rowHalf}>
            <FormInput label="Nombre *" placeholder="Juan" value={datos.nombre} onChangeText={(t) => cambiarCampo('nombre', t)} error={errores.nombre} />
          </View>
          <View style={styles.rowHalf}>
            <FormInput label="Apellido" placeholder="Pérez" value={datos.apellido} onChangeText={(t) => cambiarCampo('apellido', t)} />
          </View>
        </View>

        <FormInput label="DPI" placeholder="0000 00000 0000" keyboardType="number-pad" value={datos.dpi} onChangeText={(t) => cambiarCampo('dpi', t)} />
        <FormInput label="Teléfono" placeholder="0000-0000" keyboardType="phone-pad" value={datos.telefono} onChangeText={(t) => cambiarCampo('telefono', t)} />

        <Text style={[styles.sectionLabel, { marginTop: Spacing.lg }]}>UBICACIÓN PARA VISITA</Text>
        <FormInput label="Dirección *" placeholder="3a Calle 4-20, Col. La Paz" value={datos.direccion} onChangeText={(t) => cambiarCampo('direccion', t)} error={errores.direccion} />
        <View style={styles.row}>
          <View style={styles.rowHalf}>
            <FormInput label="Colonia / Barrio" placeholder="Col. Vista Hermosa" value={datos.colonia} onChangeText={(t) => cambiarCampo('colonia', t)} />
          </View>
          <View style={styles.rowHalf}>
            <FormInput label="Municipio *" placeholder="Mixco" value={datos.municipio} onChangeText={(t) => cambiarCampo('municipio', t)} error={errores.municipio} />
          </View>
        </View>
        <FormInput label="Referencia de ubicación" placeholder='Casa azul con portón negro, frente a la tienda "La Fe"' value={datos.referencia} onChangeText={(t) => cambiarCampo('referencia', t)} />

        <Pressable style={styles.buscarClienteBtn} onPress={usarMiUbicacion} disabled={obteniendoUbicacion}>
          {obteniendoUbicacion ? (
            <ActivityIndicator color={Colors.primary} size="small" />
          ) : (
            <Ionicons name={ubicacionActual ? 'checkmark-circle' : 'locate-outline'} size={18} color={ubicacionActual ? Colors.success : Colors.primary} />
          )}
          <Text style={[styles.buscarClienteText, ubicacionActual && { color: Colors.success }]}>
            {obteniendoUbicacion ? 'Obteniendo ubicación…' : ubicacionActual ? 'Ubicación del cliente capturada' : 'Usar mi ubicación actual (si estás en el sitio)'}
          </Text>
        </Pressable>

        {tipoSeleccionado === 'cobro' && (
          <>
            <Text style={[styles.sectionLabel, { marginTop: Spacing.lg }]}>INFORMACIÓN FINANCIERA</Text>
            <FormInput label="Saldo a recuperar (Q) *" placeholder="0.00" keyboardType="decimal-pad" value={datos.monto_deuda} onChangeText={(t) => cambiarCampo('monto_deuda', t)} error={errores.monto_deuda} />

            <FormInput
              label="Porcentaje de comisión (%)"
              placeholder="15"
              keyboardType="decimal-pad"
              value={comisionPctInput}
              onChangeText={setComisionPctInput}
              hint="Modificable. Cada banco puede pactarse distinto."
            />

            {/* Comisión rápida con chips */}
            <View style={styles.pctChips}>
              {[10, 12, 15, 20].map((p) => (
                <Pressable
                  key={p}
                  style={[styles.pctChip, comisionPct === p && styles.pctChipActivo]}
                  onPress={() => setComisionPctInput(String(p))}
                >
                  <Text style={[styles.pctChipText, comisionPct === p && styles.pctChipTextActivo]}>{p}%</Text>
                </Pressable>
              ))}
            </View>

            {saldoNum > 0 && (
              <View style={styles.comisionBox}>
                <View style={styles.comisionRowTop}>
                  <Text style={styles.comisionBoxLabel}>Comisión máxima (si recupera todo)</Text>
                  <Text style={styles.comisionBoxMonto}>
                    Q {comisionMaxima.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                </View>
                <Text style={styles.comisionBoxDetalle}>
                  {comisionPct}% de Q {saldoNum.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                </Text>
                <View style={styles.comisionNota}>
                  <Ionicons name="information-circle-outline" size={13} color={Colors.info} />
                  <Text style={styles.comisionNotaText}>
                    El cobrador gana el {comisionPct}% solo sobre el monto que efectivamente recupere; si recupera una parte, la comisión se calcula sobre esa parte.
                  </Text>
                </View>
              </View>
            )}
          </>
        )}

        <Text style={[styles.sectionLabel, { marginTop: Spacing.lg }]}>NOTAS INTERNAS</Text>
        <FormInput label="Instrucciones adicionales" placeholder="Ej: 2do intento, cliente tiene acuerdo verbal..." value={datos.notas} onChangeText={(t) => cambiarCampo('notas', t)} />

        <PrimaryButton label={enviando ? 'Enviando solicitud...' : 'Publicar solicitud'} onPress={simularEnvio} loading={enviando} style={styles.botonPrincipal} />

        <Text style={styles.footerNota}>
          Al publicar, el sistema notificará a los gestores elegibles ({rolesElegiblesTexto(tipoConfig.id)}) según su zona de cobertura.
        </Text>
      </ScrollView>

      {/* Modal buscador */}
      <ModalBuscarCliente visible={modalBuscar} onCerrar={() => setModalBuscar(false)} onSeleccionar={vincularCliente} />

      {/* Modal confirmación */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomInset }}>
              <View style={styles.modalHeader}>
                <View style={[styles.modalIconCircle, { backgroundColor: notif ? `${notif.color}22` : Colors.primaryMuted }]}>
                  <Ionicons name={(notif?.icono ?? 'notifications') as any} size={28} color={notif?.color ?? Colors.primary} />
                </View>
                <Text style={styles.modalTitulo}>{notif?.titulo}</Text>
                <View style={styles.modalRolBadge}>
                  <Text style={styles.modalRolText}>Disponible para: {notif?.receptor}</Text>
                </View>
              </View>

              <View style={styles.modalMensajeBox}>
                <Text style={styles.modalMensaje}>{notif?.mensaje}</Text>
              </View>

              <Text style={styles.modalSeccion}>Lo que verá el gestor:</Text>
              {notif?.pasos.map((p, i) => (
                <View key={i} style={styles.modalPasoRow}>
                  <View style={[styles.modalPasoDot, { backgroundColor: notif.color }]} />
                  <Text style={styles.modalPasoText}>{p}</Text>
                </View>
              ))}

              <View style={styles.modalDivider} />
              <Text style={styles.modalExito}>✅ Solicitud publicada. El sistema buscará gestores elegibles en la zona.</Text>

              <PrimaryButton label="Crear otra solicitud" onPress={reiniciar} style={{ marginTop: Spacing.lg }} />
              <Pressable onPress={() => setModalVisible(false)} style={styles.modalVerDetalle}>
                <Text style={styles.modalVerDetalleText}>Cerrar</Text>
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
  scrollContent: { padding: Spacing.xl, paddingBottom: Spacing.xxxl },
  pageTitle: { ...Typography.title, color: Colors.textPrimary, marginBottom: Spacing.xs },
  pageSubtitle: { ...Typography.caption, color: Colors.textSecondary, marginBottom: Spacing.xl },

  tipoCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface,
    borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, marginBottom: Spacing.sm,
  },
  tipoIconCircle: { width: 44, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md },
  tipoTextos: { flex: 1 },
  tipoLabel: { ...Typography.subtitle, color: Colors.textPrimary, marginBottom: 2 },
  tipoDesc: { ...Typography.caption, color: Colors.textSecondary, marginBottom: Spacing.sm },
  tipoRolBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: Radius.pill },
  tipoRolText: { ...Typography.micro, fontWeight: '700', textTransform: 'none', letterSpacing: 0 },

  subtipoSection: { marginTop: Spacing.md, marginBottom: Spacing.sm },
  subtipoTitle: { ...Typography.caption, color: Colors.textSecondary, fontWeight: '600', marginBottom: Spacing.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
  subtipoCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, marginBottom: Spacing.xs },
  subtipoCardSeleccionado: { borderColor: '#9B7BF0', borderWidth: 2, backgroundColor: 'rgba(155,123,240,0.08)' },
  subtipoLabel: { ...Typography.body, color: Colors.textPrimary, fontWeight: '600' },
  subtipoDesc: { ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },
  subtipoTarifa: { ...Typography.caption, color: Colors.textSecondary, fontWeight: '600' },
  subtipoHint: { ...Typography.caption, color: Colors.textMuted, marginBottom: Spacing.sm },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: Colors.borderStrong,
    alignItems: 'center', justifyContent: 'center', marginRight: Spacing.sm,
  },
  ambasBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.successMuted,
    borderRadius: Radius.sm, paddingVertical: 6, paddingHorizontal: Spacing.sm, marginTop: 4,
  },
  ambasText: { ...Typography.caption, color: '#065F46', fontWeight: '600' },

  // Comisión editable (cobro)
  pctChips: { flexDirection: 'row', gap: Spacing.sm, marginTop: -Spacing.xs, marginBottom: Spacing.md },
  pctChip: {
    paddingVertical: 6, paddingHorizontal: Spacing.md, borderRadius: Radius.pill,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface,
  },
  pctChipActivo: { borderColor: Colors.warning, backgroundColor: Colors.warningMuted },
  pctChipText: { ...Typography.caption, color: Colors.textSecondary, fontWeight: '600' },
  pctChipTextActivo: { color: '#92400E' },
  comisionBox: {
    backgroundColor: Colors.warningMuted, borderRadius: Radius.md, padding: Spacing.md,
    marginTop: -Spacing.xs, marginBottom: Spacing.md,
  },
  comisionRowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  comisionBoxLabel: { ...Typography.caption, color: '#92400E', fontWeight: '600', flex: 1 },
  comisionBoxMonto: { ...Typography.subtitle, color: '#92400E', fontWeight: '800' },
  comisionBoxDetalle: { ...Typography.caption, color: '#B45309', marginTop: 2 },
  comisionNota: { flexDirection: 'row', gap: 6, marginTop: Spacing.sm, alignItems: 'flex-start' },
  comisionNotaText: { ...Typography.micro, color: '#92400E', flex: 1, textTransform: 'none', letterSpacing: 0, lineHeight: 15 },

  backRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.lg },
  backText: { ...Typography.caption, color: Colors.primary, fontWeight: '600', marginLeft: 4 },
  tipoBanner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.sm, borderRadius: Radius.sm, marginBottom: Spacing.lg },
  tipoBannerText: { ...Typography.caption, fontWeight: '600' },

  // Botón buscar cliente
  buscarClienteBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.primary,
    borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.md,
  },
  buscarClienteText: { ...Typography.body, color: Colors.primary, fontWeight: '600', flex: 1 },
  vinculadoBox: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.successMuted, borderRadius: Radius.sm, padding: Spacing.sm, marginBottom: Spacing.lg,
  },
  vinculadoText: { ...Typography.caption, color: '#065F46', fontWeight: '600', flex: 1 },
  vinculadoQuitar: { ...Typography.caption, color: Colors.danger, fontWeight: '700' },

  sectionLabel: { ...Typography.micro, color: Colors.textMuted, letterSpacing: 0.8, marginBottom: Spacing.sm },
  row: { flexDirection: 'row', gap: Spacing.sm },
  rowHalf: { flex: 1 },
  comisionPreview: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, backgroundColor: Colors.infoMuted, borderRadius: Radius.sm, padding: Spacing.sm, marginTop: -Spacing.sm, marginBottom: Spacing.md },
  comisionText: { ...Typography.micro, color: Colors.info, flex: 1, textTransform: 'none', letterSpacing: 0 },
  botonPrincipal: { marginTop: Spacing.xl },
  footerNota: { ...Typography.micro, color: Colors.textMuted, textAlign: 'center', marginTop: Spacing.md, lineHeight: 16, textTransform: 'none', letterSpacing: 0 },

  // Modales
  modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  modalCard: { backgroundColor: Colors.surface, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing.xl, maxHeight: '90%' },
  modalHeader: { alignItems: 'center', marginBottom: Spacing.lg },
  modalIconCircle: { width: 64, height: 64, borderRadius: Radius.xl, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md },
  modalTitulo: { ...Typography.title, color: Colors.textPrimary, textAlign: 'center', marginBottom: Spacing.sm },
  modalRolBadge: { backgroundColor: Colors.primaryMuted, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radius.pill },
  modalRolText: { ...Typography.micro, color: Colors.primary, fontWeight: '600', textTransform: 'none', letterSpacing: 0 },
  modalMensajeBox: { backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.lg },
  modalMensaje: { ...Typography.body, color: Colors.textSecondary, lineHeight: 22 },
  modalSeccion: { ...Typography.micro, color: Colors.textMuted, letterSpacing: 0.6, marginBottom: Spacing.sm, marginTop: Spacing.md },
  modalPasoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, marginBottom: Spacing.xs },
  modalPasoDot: { width: 8, height: 8, borderRadius: Radius.pill, marginTop: 5 },
  modalPasoText: { ...Typography.caption, color: Colors.textSecondary, flex: 1, lineHeight: 20 },
  modalDivider: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.lg },
  modalExito: { ...Typography.caption, color: Colors.success, textAlign: 'center', fontWeight: '600' },
  modalVerDetalle: { alignItems: 'center', padding: Spacing.md, marginTop: Spacing.sm },
  modalVerDetalleText: { ...Typography.caption, color: Colors.textMuted, fontWeight: '600' },

  // Buscador
  buscarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  buscarSub: { ...Typography.caption, color: Colors.textSecondary, marginTop: Spacing.xs, marginBottom: Spacing.lg },
  buscarRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  buscarInput: { flex: 1, backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, color: Colors.textPrimary, fontSize: 15 },
  buscarBtn: { width: 48, borderRadius: Radius.md, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  buscarResultados: { maxHeight: 320 },
  buscarVacio: { alignItems: 'center', paddingVertical: Spacing.xl, gap: Spacing.sm },
  buscarVacioText: { ...Typography.caption, color: Colors.textMuted },
  resultadoCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm },
  resultadoAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.infoMuted, alignItems: 'center', justifyContent: 'center' },
  resultadoAvatarText: { ...Typography.caption, color: Colors.info, fontWeight: '700' },
  resultadoNombre: { ...Typography.subtitle, color: Colors.textPrimary },
  resultadoMeta: { ...Typography.micro, color: Colors.textSecondary, textTransform: 'none', letterSpacing: 0, marginTop: 1 },
  buscarManual: { alignItems: 'center', paddingVertical: Spacing.md, marginTop: Spacing.sm },
  buscarManualText: { ...Typography.caption, color: Colors.textMuted, fontWeight: '600' },
});