/**
 * app/(tabs)/index.tsx
 * Panel principal: lista de servicios con filtros y métricas del día
 */

import ServiceCard from '@/components/ServiceCard';
import { Colors as COLORS, Spacing as SPACING } from '@/constants/DesignTokens';
import { useSesion } from '@/domain/auth/sesion';
import { contarNoLeidas } from '@/domain/notificaciones/notificaciones';
import { aceptarServicio } from '@/domain/servicios/servicios';
import { useServiciosEnTiempoReal, useServiciosVisibles } from '@/hooks/useServicios';
import { rolPuedeAceptar, RolGestor, Servicio, TipoServicio } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

// ─── Tabs de filtro ──────────────────────────────────────────────────────────

type FiltroTab = 'todos' | TipoServicio;

const FILTROS: { id: FiltroTab; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'cobro', label: 'Cobros' },
  { id: 'notificacion', label: 'Notif.' },
  { id: 'verificacion', label: 'Verif.' },
  { id: 'legal', label: 'Legal' },
];

/**
 * El admin ve todos los filtros (con "Todos"); cada gestor solo ve las
 * pestañas de los tipos que su rol puede aceptar, sin "Todos".
 */
function filtrosDeRol(rol: string | undefined): { id: FiltroTab; label: string }[] {
  if (!rol || rol === 'admin') return FILTROS;
  return FILTROS.filter(
    (f) => f.id !== 'todos' && rolPuedeAceptar(rol as RolGestor, f.id as TipoServicio),
  );
}

// ─── Componente de métricas ──────────────────────────────────────────────────

function MetricasBar({ servicios }: { servicios: Servicio[] }) {
  const total = servicios.length;
  const activos = servicios.filter((s) => s.estado === 'activo').length;
  const pendientes = servicios.filter((s) => s.estado === 'pendiente').length;
  const completadosHoy = servicios.filter((s) => s.estado === 'completado');
  const recuperado = completadosHoy.reduce((acc, s) => acc + s.montoGestion, 0);
  const comisiones = completadosHoy.reduce((acc, s) => acc + s.comisionCalculada, 0);

  return (
    <View style={styles.metricasContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.metricasScroll}>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{total}</Text>
          <Text style={styles.metricLabel}>Total</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={[styles.metricValue, { color: COLORS.success }]}>{activos}</Text>
          <Text style={styles.metricLabel}>Activos</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={[styles.metricValue, { color: COLORS.warning }]}>{pendientes}</Text>
          <Text style={styles.metricLabel}>Pendientes</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={[styles.metricValue, { color: COLORS.info }]}>
            Q {recuperado.toLocaleString('es-GT')}
          </Text>
          <Text style={styles.metricLabel}>Gestión</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={[styles.metricValue, { color: '#9B7BF0' }]}>
            Q {comisiones.toLocaleString('es-GT')}
          </Text>
          <Text style={styles.metricLabel}>Comisiones</Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Empty state ─────────────────────────────────────────────────────────────

function EmptyServicios({ filtro }: { filtro: FiltroTab }) {
  const { usuario } = useSesion();
  const esAdmin = usuario?.rol === 'admin';
  return (
    <View style={styles.emptyState}>
      <Ionicons name="folder-open-outline" size={48} color={COLORS.textMuted} />
      <Text style={styles.emptyTitle}>
        {filtro === 'todos' ? 'Sin servicios hoy' : `Sin servicios de tipo "${filtro}"`}
      </Text>
      <Text style={styles.emptySub}>
        {esAdmin
          ? 'Crea una nueva solicitud desde la pestaña \u201CSolicitar\u201D'
          : 'Tus servicios asignados aparecerán aquí en cuanto el admin los cree'}
      </Text>
    </View>
  );
}

// ─── Pantalla principal ──────────────────────────────────────────────────────

export default function PanelServiciosScreen() {
  const { usuario } = useSesion();
  const [filtroSel, setFiltroSel] = useState<FiltroTab | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [aceptandoId, setAceptandoId] = useState<string | null>(null);
  const [noLeidas, setNoLeidas] = useState(0);

  // Cada quien ve solo lo suyo: el admin ve todo, un gestor ve sus propios
  // servicios (cualquier estado) + lo pendiente elegible para su rol.
  const { servicios: visibles, cargando, refrescar } = useServiciosVisibles(usuario);

  // Aparece un servicio nuevo elegible → notificación local + refetch.
  useServiciosEnTiempoReal(usuario, refrescar);

  // Campana: contador de no leídas al entrar a la pantalla (callback estable).
  const refrescarNoLeidas = useCallback(() => {
    contarNoLeidas().then(setNoLeidas).catch(() => setNoLeidas(0));
  }, []);
  useFocusEffect(refrescarNoLeidas);

  // Filtros: admin = todos; gestor = solo los tipos de su rol (sin "Todos").
  const filtros = useMemo(() => filtrosDeRol(usuario?.rol), [usuario?.rol]);
  const filtroActivo: FiltroTab = useMemo(() => {
    if (filtroSel && filtros.some((f) => f.id === filtroSel)) return filtroSel;
    return filtros[0]?.id ?? 'todos';
  }, [filtroSel, filtros]);

  const serviciosFiltrados = useMemo<Servicio[]>(() => {
    if (filtroActivo === 'todos') return visibles;
    return visibles.filter((s) => s.tipo === filtroActivo);
  }, [filtroActivo, visibles]);

  const esGestor = !!usuario && usuario.rol !== 'admin';

  const onRefresh = () => {
    setRefreshing(true);
    refrescar();
    refrescarNoLeidas();
    setTimeout(() => setRefreshing(false), 600);
  };

  const irADetalle = (id: string) => router.push(`/servicio/${id}`);

  const aceptar = async (s: Servicio) => {
    if (!usuario || usuario.rol === 'admin') return;
    setAceptandoId(s.id);
    const r = await aceptarServicio(s.id, usuario.id, usuario.nombre);
    setAceptandoId(null);
    if (!r.ok) {
      Alert.alert('No se pudo aceptar', r.error ?? 'Intenta de nuevo.');
      return;
    }
    refrescar();
    Alert.alert(
      '✅ Servicio aceptado',
      `${s.cliente.nombre} quedó asignado a ti. Dirígete a la ubicación para completarlo.`,
    );
  };

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Panel de servicios</Text>
          <Text style={styles.headerSub}>
            {new Date().toLocaleDateString('es-GT', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </Text>
        </View>
        <Pressable
          style={styles.notifBtn}
          onPress={() => {
            router.push('/notificaciones');
            setTimeout(refrescarNoLeidas, 400);
          }}>
          <Ionicons name="notifications-outline" size={22} color={COLORS.textPrimary} />
          {noLeidas > 0 && (
            <View style={styles.notifDot}>
              <Text style={styles.notifDotText}>{noLeidas > 9 ? '9+' : noLeidas}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Métricas (calculadas de los servicios reales cargados) */}
      <MetricasBar servicios={visibles} />

      {/* Tabs de filtro */}
      <View style={styles.tabsRow}>
        {filtros.map((f) => (
          <Pressable
            key={f.id}
            style={[styles.tab, filtroActivo === f.id && styles.tabActive]}
            onPress={() => setFiltroSel(f.id)}>
            <Text style={[styles.tabText, filtroActivo === f.id && styles.tabTextActive]}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Lista de servicios */}
      {cargando && serviciosFiltrados.length === 0 ? (
        <View style={styles.emptyState}>
          <ActivityIndicator color={COLORS.info} />
        </View>
      ) : (
        <FlatList
          data={serviciosFiltrados}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const puedeAceptar =
              esGestor &&
              item.estado === 'pendiente' &&
              item.gestorId == null &&
              rolPuedeAceptar(usuario!.rol as RolGestor, item.tipo);
            return (
              <ServiceCard
                servicio={item}
                onPress={irADetalle}
                onAceptar={puedeAceptar ? aceptar : undefined}
                aceptando={aceptandoId === item.id}
              />
            );
          }}
          contentContainerStyle={styles.lista}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.info} />
          }
          ListEmptyComponent={<EmptyServicios filtro={filtroActivo} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  headerSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  notifBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifDot: {
    position: 'absolute',
    top: 3,
    right: 1,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    backgroundColor: COLORS.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifDotText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  metricasContainer: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
  },
  metricasScroll: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  metricCard: {
    backgroundColor: COLORS.background,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    minWidth: 90,
    borderWidth: 0.5,
    borderColor: COLORS.border,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  metricLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    gap: SPACING.xs,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceAlt,
  },
  tabActive: {
    backgroundColor: COLORS.info,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  lista: {
    padding: SPACING.md,
    paddingBottom: 100,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  emptySub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    maxWidth: 260,
  },
});