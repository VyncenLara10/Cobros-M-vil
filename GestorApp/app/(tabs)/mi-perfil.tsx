import { BadgeTipo } from '@/components/UI';
import { Colors, Radius, Spacing, Typography } from '@/constants/DesignTokens';
import { CLIENTES_MOCK } from '@/data/clientesMock';
import { serviciosDisponiblesPara, USUARIO_ACTUAL } from '@/data/mocks';
import {
    ROL_LABEL,
    RolGestor,
    Servicio,
    SUBTIPO_VERIFICACION_LABEL,
    TIPO_SERVICIO_LABEL,
} from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
    Alert,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

const ROLES: RolGestor[] = ['verificador', 'cobrador', 'abogado'];

export default function MiPerfilScreen() {
  // Rol activo (demo: se puede cambiar para ver el feed de cada rol)
  const [rol, setRol] = useState<RolGestor>(USUARIO_ACTUAL.tipo);
  const [disponible, setDisponible] = useState(USUARIO_ACTUAL.disponible);
  const [seleccion, setSeleccion] = useState<Servicio | null>(null);

  const pendientes = useMemo(() => serviciosDisponiblesPara(rol), [rol]);

  // Info ampliada del cliente (si el servicio está enlazado a la BD)
  const clienteDB = seleccion?.cliente.clienteId
    ? CLIENTES_MOCK.find((c) => c.id === seleccion.cliente.clienteId)
    : undefined;

  const aceptar = (s: Servicio) => {
    setSeleccion(null);
    if (s.tipo === 'verificacion') {
      // Abre el formulario de verificación con fotos
      router.push(`/verificacion/${s.id}`);
      return;
    }
    Alert.alert(
      'Solicitud aceptada',
      `Aceptaste ${TIPO_SERVICIO_LABEL[s.tipo]} de ${s.cliente.nombre}. Queda asignada a ti.`,
    );
    // TODO: await fetch(`/api/casos/${s.id}/aceptar`, { method: 'POST' })
  };

  const rechazar = (s: Servicio) => {
    setSeleccion(null);
    Alert.alert('Solicitud rechazada', 'Volverá a estar disponible para otros gestores.');
    // TODO: await fetch(`/api/casos/${s.id}/rechazar`, { method: 'POST' })
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* ── Encabezado de perfil ── */}
      <View style={styles.perfilCard}>
        <View style={styles.perfilTop}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{USUARIO_ACTUAL.avatar}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.perfilNombre}>{USUARIO_ACTUAL.nombre}</Text>
            <View style={styles.perfilRolRow}>
              <View style={styles.rolBadge}>
                <Text style={styles.rolBadgeText}>{ROL_LABEL[rol]}</Text>
              </View>
              <Text style={styles.perfilRating}> {USUARIO_ACTUAL.calificacion.toFixed(1)}</Text>
            </View>
            <Text style={styles.perfilZona}> {USUARIO_ACTUAL.zona}</Text>
          </View>
          <Pressable
            style={[styles.dispChip, disponible ? styles.dispOn : styles.dispOff]}
            onPress={() => setDisponible((d) => !d)}
          >
            <View style={[styles.dispDot, { backgroundColor: disponible ? Colors.success : Colors.textMuted }]} />
            <Text style={[styles.dispText, { color: disponible ? Colors.success : Colors.textMuted }]}>
              {disponible ? 'Disponible' : 'Ausente'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{USUARIO_ACTUAL.serviciosCompletados}</Text>
            <Text style={styles.statLabel}>Completados</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: Colors.success }]}>
              Q {USUARIO_ACTUAL.comisionesAcumuladas.toLocaleString('es-GT')}
            </Text>
            <Text style={styles.statLabel}>Comisiones</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: Colors.warning }]}>{pendientes.length}</Text>
            <Text style={styles.statLabel}>Pendientes</Text>
          </View>
        </View>
      </View>

      {/* ── Selector de rol (demo) ── */}
      <Text style={styles.demoLabel}>Ver solicitudes como (demo)</Text>
      <View style={styles.rolesRow}>
        {ROLES.map((r) => {
          const activo = rol === r;
          return (
            <Pressable key={r} style={[styles.rolPill, activo && styles.rolPillActivo]} onPress={() => setRol(r)}>
              <Text style={[styles.rolPillText, activo && styles.rolPillTextActivo]}>{ROL_LABEL[r]}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* ── Feed de solicitudes pendientes ── */}
      <Text style={styles.sectionTitle}>Solicitudes pendientes</Text>
      <Text style={styles.sectionSub}>
        {rol === 'abogado'
          ? 'Como abogado ves notificaciones, verificaciones y gestiones legales.'
          : rol === 'cobrador'
            ? 'Como cobrador ves cobros, notificaciones y verificaciones.'
            : 'Como verificador ves notificaciones y verificaciones.'}
      </Text>

      {pendientes.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="checkmark-done-outline" size={40} color={Colors.textMuted} />
          <Text style={styles.emptyText}>No hay solicitudes disponibles para tu rol ahora mismo.</Text>
        </View>
      ) : (
        pendientes.map((s) => (
          <Pressable key={s.id} style={styles.solicitudCard} onPress={() => setSeleccion(s)}>
            <View style={styles.solicitudTop}>
              <BadgeTipo tipo={s.tipo} />
              {s.tipo === 'verificacion' && s.subtipoVerificacion && (
                <View style={styles.subChip}>
                  <Text style={styles.subChipText}>
                    {s.subtipoVerificacion === 'laboral' ? 'Laboral' : 'Domiciliar'}
                  </Text>
                </View>
              )}
              <Text style={styles.solicitudId}>{s.id}</Text>
            </View>

            <Text style={styles.solicitudNombre}>{s.cliente.nombre}</Text>
            <Text style={styles.solicitudDir}>📍 {s.cliente.direccion} · {s.cliente.zona}</Text>

            <View style={styles.solicitudFooter}>
              <Text style={styles.solicitudMonto}>
                {s.tipo === 'cobro'
                  ? `Deuda Q ${s.deudaTotal.toLocaleString('es-GT')}`
                  : `Pago Q ${s.montoGestion.toLocaleString('es-GT')}`}
              </Text>
              <View style={styles.verChip}>
                <Text style={styles.verChipText}>Ver detalle →</Text>
              </View>
            </View>
          </Pressable>
        ))
      )}

      <View style={{ height: Spacing.xxl }} />

      {/* ── Modal: info del cliente + aceptar / rechazar ── */}
      <Modal visible={!!seleccion} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {seleccion && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.modalHeader}>
                  <BadgeTipo tipo={seleccion.tipo} />
                  <Pressable onPress={() => setSeleccion(null)} hitSlop={10}>
                    <Ionicons name="close" size={24} color={Colors.textSecondary} />
                  </Pressable>
                </View>

                <Text style={styles.modalNombre}>{seleccion.cliente.nombre}</Text>
                {seleccion.tipo === 'verificacion' && seleccion.subtipoVerificacion && (
                  <Text style={styles.modalSubtipo}>
                    {SUBTIPO_VERIFICACION_LABEL[seleccion.subtipoVerificacion]}
                  </Text>
                )}

                {/* Info de cliente */}
                <Text style={styles.modalSeccion}>INFORMACIÓN DEL CLIENTE</Text>
                <InfoRow icon="call-outline" label="Teléfono" value={seleccion.cliente.telefono} />
                <InfoRow icon="location-outline" label="Dirección" value={`${seleccion.cliente.direccion}, ${seleccion.cliente.zona}`} />
                {clienteDB && (
                  <>
                    <InfoRow icon="card-outline" label="DPI" value={clienteDB.dpi} />
                    <InfoRow icon="business-outline" label="Municipio" value={`${clienteDB.municipio} · ${clienteDB.zona}`} />
                  </>
                )}

                {/* Info financiera solo para cobro (rol capacitado) */}
                {seleccion.tipo === 'cobro' && (
                  <>
                    <Text style={styles.modalSeccion}>INFORMACIÓN DE COBRO</Text>
                    <InfoRow icon="cash-outline" label="Deuda total" value={`Q ${seleccion.deudaTotal.toLocaleString('es-GT')}`} valueColor={Colors.danger} />
                    {clienteDB?.cuentaOrigen && <InfoRow icon="document-outline" label="Origen" value={clienteDB.cuentaOrigen} />}
                    {clienteDB?.diasMora != null && <InfoRow icon="time-outline" label="Días de mora" value={`${clienteDB.diasMora} días`} />}
                    <InfoRow icon="pricetag-outline" label="Comisión" value={`${seleccion.comisionPct}% · Q ${seleccion.comisionCalculada.toLocaleString('es-GT')}`} valueColor={Colors.success} />
                  </>
                )}

                {/* Notificación: recordatorio */}
                {seleccion.tipo === 'notificacion' && (
                  <View style={styles.avisoBox}>
                    <Ionicons name="information-circle-outline" size={16} color={Colors.info} />
                    <Text style={styles.avisoText}>Solo deja la notificación y consigue un número de contacto del cliente.</Text>
                  </View>
                )}

                {/* Legal: gestión */}
                {seleccion.tipo === 'legal' && seleccion.tipoGestionLegal && (
                  <>
                    <Text style={styles.modalSeccion}>GESTIÓN LEGAL</Text>
                    <InfoRow icon="briefcase-outline" label="Tipo" value={seleccion.tipoGestionLegal} />
                    {seleccion.tarifaLegal && <InfoRow icon="cash-outline" label="Tarifa" value={`Q ${seleccion.tarifaLegal.toLocaleString('es-GT')}`} valueColor={Colors.success} />}
                  </>
                )}

                {/* Notas */}
                <Text style={styles.modalSeccion}>NOTAS</Text>
                <Text style={styles.notasText}>{seleccion.notas}</Text>

                {/* Acciones */}
                <View style={styles.accionesRow}>
                  <Pressable style={styles.btnRechazar} onPress={() => rechazar(seleccion)}>
                    <Ionicons name="close-circle-outline" size={18} color={Colors.danger} />
                    <Text style={styles.btnRechazarText}>Rechazar</Text>
                  </Pressable>
                  <Pressable style={styles.btnAceptar} onPress={() => aceptar(seleccion)}>
                    <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                    <Text style={styles.btnAceptarText}>
                      {seleccion.tipo === 'verificacion' ? 'Aceptar y llenar' : 'Aceptar caso'}
                    </Text>
                  </Pressable>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function InfoRow({ icon, label, value, valueColor }: { icon: any; label: string; value: string; valueColor?: string }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={16} color={Colors.textMuted} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, valueColor ? { color: valueColor } : {}]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },

  perfilCard: { backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 0.5, borderColor: Colors.border, padding: Spacing.lg, marginBottom: Spacing.lg },
  perfilTop: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.primaryMuted, alignItems: 'center', justifyContent: 'center' },
  avatarText: { ...Typography.subtitle, color: Colors.primary, fontWeight: '700' },
  perfilNombre: { ...Typography.subtitle, color: Colors.textPrimary, fontWeight: '700' },
  perfilRolRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: 4 },
  rolBadge: { backgroundColor: Colors.primaryMuted, paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: Radius.pill },
  rolBadgeText: { ...Typography.micro, color: Colors.primary, fontWeight: '700', textTransform: 'none', letterSpacing: 0 },
  perfilRating: { ...Typography.caption, color: Colors.warning, fontWeight: '700' },
  perfilZona: { ...Typography.caption, color: Colors.textSecondary, marginTop: 4 },
  dispChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: Spacing.sm, paddingVertical: 5, borderRadius: Radius.pill, borderWidth: 1 },
  dispOn: { borderColor: Colors.success, backgroundColor: Colors.successMuted },
  dispOff: { borderColor: Colors.border, backgroundColor: Colors.surfaceAlt },
  dispDot: { width: 7, height: 7, borderRadius: 4 },
  dispText: { ...Typography.micro, fontWeight: '700', textTransform: 'none', letterSpacing: 0 },

  statsRow: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.lg, borderTopWidth: 0.5, borderTopColor: Colors.border, paddingTop: Spacing.md },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { ...Typography.subtitle, color: Colors.textPrimary, fontWeight: '700' },
  statLabel: { ...Typography.micro, color: Colors.textSecondary, marginTop: 2, textTransform: 'none', letterSpacing: 0 },
  statDivider: { width: 0.5, height: 32, backgroundColor: Colors.border },

  demoLabel: { ...Typography.micro, color: Colors.textMuted, letterSpacing: 0.6, marginBottom: Spacing.sm },
  rolesRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xl },
  rolPill: { flex: 1, alignItems: 'center', paddingVertical: Spacing.sm, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  rolPillActivo: { borderColor: Colors.primary, backgroundColor: Colors.primary },
  rolPillText: { ...Typography.caption, color: Colors.textSecondary, fontWeight: '600' },
  rolPillTextActivo: { color: '#fff', fontWeight: '700' },

  sectionTitle: { ...Typography.subtitle, color: Colors.textPrimary, fontWeight: '700', marginBottom: 2 },
  sectionSub: { ...Typography.caption, color: Colors.textSecondary, marginBottom: Spacing.lg },

  emptyState: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.sm },
  emptyText: { ...Typography.caption, color: Colors.textMuted, textAlign: 'center', maxWidth: 260 },

  solicitudCard: { backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 0.5, borderColor: Colors.border, padding: Spacing.md, marginBottom: Spacing.sm },
  solicitudTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  subChip: { backgroundColor: Colors.successMuted, paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: Radius.pill },
  subChipText: { ...Typography.micro, color: '#065F46', fontWeight: '700', textTransform: 'none', letterSpacing: 0 },
  solicitudId: { ...Typography.micro, color: Colors.textMuted, marginLeft: 'auto', fontFamily: 'monospace' },
  solicitudNombre: { ...Typography.subtitle, color: Colors.textPrimary, marginBottom: 2 },
  solicitudDir: { ...Typography.caption, color: Colors.textSecondary, marginBottom: Spacing.sm },
  solicitudFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: Spacing.sm, borderTopWidth: 0.5, borderTopColor: Colors.border },
  solicitudMonto: { ...Typography.caption, color: Colors.textPrimary, fontWeight: '700' },
  verChip: { backgroundColor: Colors.surfaceAlt, paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: Radius.pill },
  verChipText: { ...Typography.micro, color: Colors.textSecondary, fontWeight: '600', textTransform: 'none', letterSpacing: 0 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  modalCard: { backgroundColor: Colors.surface, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing.xl, maxHeight: '88%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  modalNombre: { ...Typography.title, color: Colors.textPrimary },
  modalSubtipo: { ...Typography.caption, color: Colors.success, fontWeight: '600', marginTop: 2 },
  modalSeccion: { ...Typography.micro, color: Colors.textMuted, letterSpacing: 0.6, marginTop: Spacing.lg, marginBottom: Spacing.sm },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  infoLabel: { ...Typography.caption, color: Colors.textSecondary, width: 92 },
  infoValue: { ...Typography.caption, color: Colors.textPrimary, fontWeight: '600', flex: 1, textAlign: 'right' },
  avisoBox: { flexDirection: 'row', gap: Spacing.sm, backgroundColor: Colors.infoMuted, borderRadius: Radius.md, padding: Spacing.md, marginTop: Spacing.md },
  avisoText: { ...Typography.caption, color: Colors.info, flex: 1 },
  notasText: { ...Typography.body, color: Colors.textSecondary, lineHeight: 20 },

  accionesRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xl },
  btnRechazar: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, paddingVertical: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.dangerMuted },
  btnRechazarText: { ...Typography.subtitle, color: Colors.danger, fontWeight: '600' },
  btnAceptar: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, paddingVertical: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.success },
  btnAceptarText: { ...Typography.subtitle, color: '#fff', fontWeight: '600' },
});