/**
 * app/(tabs)/mi-perfil.tsx
 * Vista del GESTOR (usuario). Separa claramente DOS momentos:
 *
 *   1) ACEPTAR  → en "Solicitudes disponibles". Al aceptar, el servicio queda
 *                 asignado al gestor en fase 'aceptado'. NO se llena nada aún.
 *   2) COMPLETAR → en "Mis servicios activos". Solo desde aquí se va al
 *                 formulario, y el formulario exige estar en la ubicación.
 *
 * La identidad (nombre, rol, zona) viene de la sesión (login); ya no hay un
 * selector de rol de demo aquí, eso se decide al iniciar sesión.
 */

import { BadgeTipo } from '@/components/UI';
import { Colors, Radius, Spacing, Typography } from '@/constants/DesignTokens';
import { CLIENTES_MOCK } from '@/data/clientesMock';
import {
  aceptarServicio,
  gestorPorId,
  puntosGestor,
  serviciosDeGestor,
  serviciosDisponiblesPara,
} from '@/data/mocks';
import { useSesion } from '@/domain/auth/sesion';
import { notificarLocal } from '@/domain/notificaciones/push';
import { useBottomInset } from '@/hooks/useBottomInset';
import {
  comisionMaxCredito,
  comisionMaxTotal,
  CreditoCliente,
  FASE_TRABAJO_LABEL,
  ROL_LABEL,
  RolGestor,
  saldoTotalCreditos,
  Servicio,
  subtiposTexto,
  TIPO_SERVICIO_LABEL,
} from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export default function MiPerfilScreen() {
  const { usuario, cerrarSesion } = useSesion();
  const bottomInset = useBottomInset();
  // Guardas defensivas: esta pantalla solo es visible para roles de gestor
  // (el tab se oculta para admin), pero los hooks deben llamarse siempre.
  const rol: RolGestor = usuario && usuario.rol !== 'admin' ? usuario.rol : 'verificador';
  const gestor = usuario ? gestorPorId(usuario.id) : undefined;

  const [disponible, setDisponible] = useState(gestor?.disponible ?? true);
  const [seleccion, setSeleccion] = useState<Servicio | null>(null);
  // Fuerza recomputar los feeds tras mutar los mocks (aceptar/completar).
  const [tick, setTick] = useState(0);
  const refrescar = () => setTick((t) => t + 1);

  // Al volver de un formulario de completado, recomputar los feeds.
  useFocusEffect(useCallback(() => { setTick((t) => t + 1); }, []));

  const pendientes = useMemo(() => serviciosDisponiblesPara(rol), [rol, tick]);
  const activos = useMemo(() => (usuario ? serviciosDeGestor(usuario.id) : []), [usuario, tick]);
  const puntos = usuario ? puntosGestor(usuario.id) : 0;

  // Notifica cuando aparecen solicitudes nuevas (comparado contra la última
  // vez que se calculó la lista), no en el primer render.
  const pendientesPrevias = useRef<number | null>(null);
  useEffect(() => {
    const anterior = pendientesPrevias.current;
    if (anterior !== null && pendientes.length > anterior) {
      const nuevas = pendientes.length - anterior;
      notificarLocal(
        '📋 Nueva solicitud disponible',
        `Tienes ${nuevas} solicitud${nuevas === 1 ? '' : 'es'} nueva${nuevas === 1 ? '' : 's'} para tu rol.`,
      );
    }
    pendientesPrevias.current = pendientes.length;
  }, [pendientes.length]);

  const salir = () => {
    cerrarSesion();
    router.replace('/login');
  };

  if (!usuario) return null;

  const clienteDB = seleccion?.cliente.clienteId
    ? CLIENTES_MOCK.find((c) => c.id === seleccion.cliente.clienteId)
    : undefined;

  // ── ACEPTAR: asigna y cierra. NO abre formulario. ──
  const aceptar = (s: Servicio) => {
    aceptarServicio(s.id, usuario.id, usuario.nombre);
    setSeleccion(null);
    refrescar();
    Alert.alert(
      '✅ Servicio aceptado',
      `${TIPO_SERVICIO_LABEL[s.tipo]} de ${s.cliente.nombre} quedó asignado a ti.\n\nDirígete a la ubicación. Podrás completar el formulario cuando confirmes que llegaste al lugar.`,
    );
    // TODO: await fetch(`/api/casos/${s.id}/aceptar`, { method: 'POST' })
  };

  const rechazar = (s: Servicio) => {
    setSeleccion(null);
    Alert.alert('Solicitud rechazada', 'Volverá a estar disponible para otros gestores.');
    // TODO: await fetch(`/api/casos/${s.id}/rechazar`, { method: 'POST' })
  };

  // ── COMPLETAR: solo desde "Mis servicios activos". Cada tipo tiene su form. ──
  const irACompletar = (s: Servicio) => {
    if (s.tipo === 'verificacion') router.push(`/verificacion/${s.id}`);
    else if (s.tipo === 'cobro') router.push(`/cobro/${s.id}`);
    else if (s.tipo === 'notificacion') router.push(`/notificacion/${s.id}`);
    else if (s.tipo === 'legal') router.push(`/legal/${s.id}`);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* ── Encabezado de perfil ── */}
      <View style={styles.perfilCard}>
        <View style={styles.perfilTop}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{usuario.avatar}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.perfilNombre}>{usuario.nombre}</Text>
            <View style={styles.perfilRolRow}>
              <View style={styles.rolBadge}>
                <Text style={styles.rolBadgeText}>{ROL_LABEL[rol]}</Text>
              </View>
              <Text style={styles.perfilRating}>★ {(gestor?.calificacion ?? 0).toFixed(1)}</Text>
            </View>
            <Text style={styles.perfilZona}>📍 {usuario.zona}</Text>
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
            <Text style={[styles.statValue, { color: Colors.primary }]}>{puntos}</Text>
            <Text style={styles.statLabel}>Puntos</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{gestor?.serviciosCompletados ?? 0}</Text>
            <Text style={styles.statLabel}>Completados</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: Colors.info }]}>{activos.length}</Text>
            <Text style={styles.statLabel}>En curso</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: Colors.warning }]}>{pendientes.length}</Text>
            <Text style={styles.statLabel}>Disponibles</Text>
          </View>
        </View>

        <Pressable style={styles.salirBtn} onPress={salir}>
          <Ionicons name="log-out-outline" size={15} color={Colors.danger} />
          <Text style={styles.salirText}>Cerrar sesión</Text>
        </Pressable>
      </View>

      {/* ══ MIS SERVICIOS ACTIVOS (ya aceptados → completar) ══ */}
      {activos.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Mis servicios activos</Text>
          <Text style={styles.sectionSub}>Ya son tuyos. Completa el formulario al llegar a la ubicación.</Text>

          {activos.map((s) => {
            const enSitio = s.fase === 'en_sitio';
            return (
              <View key={s.id} style={[styles.activoCard, enSitio && { borderColor: Colors.success }]}>
                <View style={styles.solicitudTop}>
                  <BadgeTipo tipo={s.tipo} />
                  {s.tipo === 'verificacion' && s.subtiposVerificacion && (
                    <View style={styles.subChip}>
                      <Text style={styles.subChipText}>{subtiposTexto(s.subtiposVerificacion)}</Text>
                    </View>
                  )}
                  <Text style={styles.solicitudId}>{s.id}</Text>
                </View>

                <Text style={styles.solicitudNombre}>{s.cliente.nombre}</Text>
                <Text style={styles.solicitudDir}>📍 {s.cliente.direccion} · {s.cliente.zona}</Text>

                <View style={[styles.faseBadge, enSitio ? styles.faseEnSitio : styles.faseAceptado]}>
                  <Ionicons
                    name={enSitio ? 'location' : 'walk-outline'}
                    size={13}
                    color={enSitio ? Colors.success : Colors.info}
                  />
                  <Text style={[styles.faseText, { color: enSitio ? Colors.success : Colors.info }]}>
                    {FASE_TRABAJO_LABEL[s.fase ?? 'aceptado']}
                  </Text>
                </View>

                <Pressable style={styles.btnCompletar} onPress={() => irACompletar(s)}>
                  <Ionicons name="clipboard-outline" size={16} color="#fff" />
                  <Text style={styles.btnCompletarText}>Ir a completar</Text>
                </Pressable>
              </View>
            );
          })}

          <View style={{ height: Spacing.xl }} />
        </>
      )}

      {/* ══ SOLICITUDES DISPONIBLES (aceptar) ══ */}
      <Text style={styles.sectionTitle}>Solicitudes disponibles</Text>
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
              {s.tipo === 'verificacion' && s.subtiposVerificacion && (
                <View style={styles.subChip}>
                  <Text style={styles.subChipText}>{subtiposTexto(s.subtiposVerificacion)}</Text>
                </View>
              )}
              <Text style={styles.solicitudId}>{s.id}</Text>
            </View>

            <Text style={styles.solicitudNombre}>{s.cliente.nombre}</Text>
            <Text style={styles.solicitudDir}>📍 {s.cliente.direccion} · {s.cliente.zona}</Text>

            <View style={styles.solicitudFooter}>
              <Text style={styles.solicitudMonto}>
                {s.tipo === 'cobro'
                  ? `Saldo Q ${s.deudaTotal.toLocaleString('es-GT')}`
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
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomInset }}>
                <View style={styles.modalHeader}>
                  <BadgeTipo tipo={seleccion.tipo} />
                  <Pressable onPress={() => setSeleccion(null)} hitSlop={10}>
                    <Ionicons name="close" size={24} color={Colors.textSecondary} />
                  </Pressable>
                </View>

                <Text style={styles.modalNombre}>{seleccion.cliente.nombre}</Text>
                {seleccion.tipo === 'verificacion' && seleccion.subtiposVerificacion && (
                  <Text style={styles.modalSubtipo}>
                    Verificación {subtiposTexto(seleccion.subtiposVerificacion)}
                  </Text>
                )}

                {/* Info de cliente */}
                <Text style={styles.modalSeccion}>INFORMACIÓN DEL CLIENTE</Text>
                <InfoRow icon="call-outline" label="Teléfono" value={seleccion.cliente.telefono} />
                <InfoRow icon="location-outline" label="Dirección" value={`${seleccion.cliente.direccion}, ${seleccion.cliente.zona}`} />
                {(seleccion.cliente.dpi || clienteDB?.dpi) && (
                  <InfoRow icon="card-outline" label="DPI" value={seleccion.cliente.dpi ?? clienteDB!.dpi} />
                )}
                {(seleccion.cliente.municipio || clienteDB?.municipio) && (
                  <InfoRow icon="business-outline" label="Municipio" value={`${seleccion.cliente.municipio ?? clienteDB?.municipio}`} />
                )}
                {seleccion.cliente.trabajo && (
                  <InfoRow icon="briefcase-outline" label="Trabajo" value={seleccion.cliente.cargo ? `${seleccion.cliente.trabajo} · ${seleccion.cliente.cargo}` : seleccion.cliente.trabajo} />
                )}
                {seleccion.cliente.salario != null && (
                  <InfoRow icon="wallet-outline" label="Salario" value={`Q ${seleccion.cliente.salario.toLocaleString('es-GT')}`} />
                )}

                {/* Referencias telefónicas */}
                {seleccion.cliente.referencias && seleccion.cliente.referencias.length > 0 && (
                  <>
                    <Text style={styles.modalSeccion}>REFERENCIAS / CONTACTOS</Text>
                    {seleccion.cliente.referencias.map((r, i) => (
                      <InfoRow
                        key={i}
                        icon="people-outline"
                        label={r.parentesco ?? 'Contacto'}
                        value={`${r.nombre} · ${r.telefono}`}
                      />
                    ))}
                  </>
                )}

                {/* Info financiera solo para cobro: créditos por banco */}
                {seleccion.tipo === 'cobro' && seleccion.creditos && seleccion.creditos.length > 0 && (
                  <>
                    <Text style={styles.modalSeccion}>DEUDAS POR BANCO</Text>
                    <Text style={styles.cobroHint}>
                      El cliente debe en {seleccion.creditos.length} banco{seleccion.creditos.length > 1 ? 's' : ''}; cada uno con su propia comisión.
                    </Text>
                    {seleccion.creditos.map((c) => (
                      <CreditoRow key={c.id} c={c} />
                    ))}

                    <View style={styles.totalBox}>
                      <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Saldo total a recuperar</Text>
                        <Text style={styles.totalSaldo}>
                          Q {saldoTotalCreditos(seleccion.creditos).toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                        </Text>
                      </View>
                      <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Tu comisión máxima (si recuperas todo)</Text>
                        <Text style={styles.totalComision}>
                          Q {comisionMaxTotal(seleccion.creditos).toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                        </Text>
                      </View>
                      <Text style={styles.totalNota}>
                        La comisión se paga solo sobre lo que efectivamente recuperes de cada banco.
                      </Text>
                    </View>
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

                {/* Aviso de flujo: aceptar ≠ completar */}
                <View style={styles.flujoAviso}>
                  <Ionicons name="lock-closed-outline" size={14} color={Colors.textSecondary} />
                  <Text style={styles.flujoAvisoText}>
                    Al aceptar, el servicio queda asignado a ti. El formulario se completa después, ya en la ubicación.
                  </Text>
                </View>

                {/* Acciones */}
                <View style={styles.accionesRow}>
                  <Pressable style={styles.btnRechazar} onPress={() => rechazar(seleccion)}>
                    <Ionicons name="close-circle-outline" size={18} color={Colors.danger} />
                    <Text style={styles.btnRechazarText}>Rechazar</Text>
                  </Pressable>
                  <Pressable style={styles.btnAceptar} onPress={() => aceptar(seleccion)}>
                    <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                    <Text style={styles.btnAceptarText}>Aceptar servicio</Text>
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

function CreditoRow({ c }: { c: CreditoCliente }) {
  return (
    <View style={styles.creditoCard}>
      <View style={styles.creditoHeader}>
        <Text style={styles.creditoBanco}>{c.banco}</Text>
        <Text style={styles.creditoPct}>{c.porcentajeComision}%</Text>
      </View>
      <Text style={styles.creditoNum}>{c.numeroCredito} · {c.tipoCredito}</Text>
      <View style={styles.creditoGrid}>
        <View style={styles.creditoCell}>
          <Text style={styles.creditoCellLabel}>Saldo</Text>
          <Text style={styles.creditoCellValue}>Q {c.saldoReal.toLocaleString('es-GT', { minimumFractionDigits: 2 })}</Text>
        </View>
        {c.diasAtraso != null && (
          <View style={styles.creditoCell}>
            <Text style={styles.creditoCellLabel}>Mora</Text>
            <Text style={styles.creditoCellValue}>{c.diasAtraso} días</Text>
          </View>
        )}
        <View style={styles.creditoCell}>
          <Text style={styles.creditoCellLabel}>Comisión máx.</Text>
          <Text style={[styles.creditoCellValue, { color: Colors.success }]}>
            Q {comisionMaxCredito(c).toLocaleString('es-GT', { minimumFractionDigits: 2 })}
          </Text>
        </View>
      </View>
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

  salirBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: Spacing.md, paddingVertical: Spacing.sm },
  salirText: { ...Typography.caption, color: Colors.danger, fontWeight: '600' },

  sectionTitle: { ...Typography.subtitle, color: Colors.textPrimary, fontWeight: '700', marginBottom: 2 },
  sectionSub: { ...Typography.caption, color: Colors.textSecondary, marginBottom: Spacing.lg },

  emptyState: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.sm },
  emptyText: { ...Typography.caption, color: Colors.textMuted, textAlign: 'center', maxWidth: 260 },

  solicitudCard: { backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 0.5, borderColor: Colors.border, padding: Spacing.md, marginBottom: Spacing.sm },
  activoCard: { backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.info, padding: Spacing.md, marginBottom: Spacing.sm },
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

  // Fase + botón completar (servicios activos)
  faseBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: Radius.pill, marginBottom: Spacing.sm },
  faseAceptado: { backgroundColor: Colors.infoMuted },
  faseEnSitio: { backgroundColor: Colors.successMuted },
  faseText: { ...Typography.micro, fontWeight: '700', textTransform: 'none', letterSpacing: 0 },
  btnCompletar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, paddingVertical: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.primary },
  btnCompletarText: { ...Typography.subtitle, color: '#fff', fontWeight: '600' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  modalCard: { backgroundColor: Colors.surface, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing.xl, maxHeight: '90%' },
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

  // Créditos por banco
  cobroHint: { ...Typography.caption, color: Colors.textSecondary, marginBottom: Spacing.sm },
  creditoCard: { backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, borderWidth: 0.5, borderColor: Colors.border, padding: Spacing.md, marginBottom: Spacing.sm },
  creditoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  creditoBanco: { ...Typography.body, color: Colors.textPrimary, fontWeight: '700' },
  creditoPct: { ...Typography.caption, color: Colors.warning, fontWeight: '800' },
  creditoNum: { ...Typography.micro, color: Colors.textMuted, marginTop: 2, marginBottom: Spacing.sm, textTransform: 'none', letterSpacing: 0 },
  creditoGrid: { flexDirection: 'row', gap: Spacing.md },
  creditoCell: { flex: 1 },
  creditoCellLabel: { ...Typography.micro, color: Colors.textMuted, textTransform: 'none', letterSpacing: 0 },
  creditoCellValue: { ...Typography.caption, color: Colors.textPrimary, fontWeight: '700', marginTop: 2 },

  totalBox: { backgroundColor: Colors.primaryMuted, borderRadius: Radius.md, padding: Spacing.md, marginTop: Spacing.xs },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  totalLabel: { ...Typography.caption, color: Colors.textSecondary, flex: 1 },
  totalSaldo: { ...Typography.subtitle, color: Colors.textPrimary, fontWeight: '800' },
  totalComision: { ...Typography.subtitle, color: Colors.success, fontWeight: '800' },
  totalNota: { ...Typography.micro, color: Colors.textSecondary, marginTop: 4, textTransform: 'none', letterSpacing: 0 },

  flujoAviso: { flexDirection: 'row', gap: Spacing.sm, backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, padding: Spacing.md, marginTop: Spacing.lg, alignItems: 'flex-start' },
  flujoAvisoText: { ...Typography.micro, color: Colors.textSecondary, flex: 1, textTransform: 'none', letterSpacing: 0, lineHeight: 15 },

  accionesRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg },
  btnRechazar: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, paddingVertical: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.dangerMuted },
  btnRechazarText: { ...Typography.subtitle, color: Colors.danger, fontWeight: '600' },
  btnAceptar: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, paddingVertical: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.success },
  btnAceptarText: { ...Typography.subtitle, color: '#fff', fontWeight: '600' },
});