/**
 * app/(tabs)/gestores.tsx
 * Lista de gestores afiliados con estado, calificación y comisiones
 */

import { Avatar } from '@/components/UI';
import { Colors as COLORS, Radius as RADIUS, Spacing as SPACING } from '@/constants/DesignTokens';
import { GESTORES_MOCK } from '@/data/mocks';
import { Gestor, GESTOR_TIPO_LABEL, TipoGestor } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

// ─── Filtros por tipo ────────────────────────────────────────────────────────

type FiltroGestor = 'todos' | TipoGestor;

const FILTROS: { id: FiltroGestor; label: string; icon: string }[] = [
  { id: 'todos', label: 'Todos', icon: 'people-outline' },
  { id: 'cobrador', label: 'Cobradores', icon: 'cash-outline' },
  { id: 'verificador', label: 'Verificadores', icon: 'search-outline' },
  { id: 'abogado', label: 'Abogados', icon: 'briefcase-outline' },
];

// ─── Tarjeta de gestor ───────────────────────────────────────────────────────

function GestorCard({ gestor, onPress }: { gestor: Gestor; onPress: () => void }) {
  const rolColor =
    gestor.tipo === 'cobrador'
      ? COLORS.warning
      : gestor.tipo === 'verificador'
      ? COLORS.success
      : '#9B7BF0';

  return (
    <Pressable style={styles.card} onPress={onPress} android_ripple={{ color: COLORS.border }}>
      {/* Fila principal */}
      <View style={styles.cardRow}>
        {/* Avatar + disponibilidad */}
        <View style={styles.avatarWrapper}>
          <Avatar initials={gestor.avatar} size={46} />
          <View
            style={[
              styles.disponibleDot,
              { backgroundColor: gestor.disponible ? COLORS.success : COLORS.textMuted },
            ]}
          />
        </View>

        {/* Info */}
        <View style={styles.cardInfo}>
          <View style={styles.cardTopRow}>
            <Text style={styles.cardNombre}>{gestor.nombre}</Text>
            <View style={[styles.rolBadge, { backgroundColor: `${rolColor}18` }]}>
              <Text style={[styles.rolText, { color: rolColor }]}>
                {GESTOR_TIPO_LABEL[gestor.tipo]}
              </Text>
            </View>
          </View>

          <View style={styles.cardMetaRow}>
            <Ionicons name="location-outline" size={12} color={COLORS.textMuted} />
            <Text style={styles.cardMeta}>{gestor.zona}</Text>
          </View>

          <View style={styles.cardMetaRow}>
            <Ionicons name="call-outline" size={12} color={COLORS.textMuted} />
            <Text style={styles.cardMeta}>{gestor.telefono}</Text>
          </View>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Ionicons name="star" size={12} color="#F59E0B" />
          <Text style={styles.statValue}>{gestor.calificacion.toFixed(1)}</Text>
          <Text style={styles.statLabel}>Calificación</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{gestor.serviciosCompletados}</Text>
          <Text style={styles.statLabel}>Completados</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: COLORS.success }]}>
            Q {gestor.comisionesAcumuladas.toLocaleString('es-GT')}
          </Text>
          <Text style={styles.statLabel}>Comisiones</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <View
            style={[
              styles.disponibleChip,
              {
                backgroundColor: gestor.disponible
                  ? `${COLORS.success}18`
                  : `${COLORS.textMuted}18`,
              },
            ]}>
            <Text
              style={[
                styles.disponibleText,
                { color: gestor.disponible ? COLORS.success : COLORS.textMuted },
              ]}>
              {gestor.disponible ? 'Disponible' : 'Ocupado'}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

// ─── Pantalla principal ──────────────────────────────────────────────────────

export default function GestoresScreen() {
  const [filtro, setFiltro] = useState<FiltroGestor>('todos');
  const [busqueda, setBusqueda] = useState('');

  const gestoresFiltrados = GESTORES_MOCK.filter((g) => {
    const matchFiltro = filtro === 'todos' || g.tipo === filtro;
    const matchBusqueda =
      busqueda.trim() === '' ||
      g.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      g.zona.toLowerCase().includes(busqueda.toLowerCase());
    return matchFiltro && matchBusqueda;
  });

  const disponibles = gestoresFiltrados.filter((g) => g.disponible).length;

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Gestores afiliados</Text>
        <Text style={styles.headerSub}>
          {disponibles} disponibles · {gestoresFiltrados.length} en total
        </Text>
      </View>

      {/* Buscador */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={16} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nombre o zona..."
            placeholderTextColor={COLORS.textMuted}
            value={busqueda}
            onChangeText={setBusqueda}
          />
          {busqueda.length > 0 && (
            <Pressable onPress={() => setBusqueda('')}>
              <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Tabs de filtro por tipo */}
      <View style={styles.filterRow}>
        {FILTROS.map((f) => (
          <Pressable
            key={f.id}
            style={[styles.filterTab, filtro === f.id && styles.filterTabActive]}
            onPress={() => setFiltro(f.id)}>
            <Ionicons
              name={f.icon as any}
              size={14}
              color={filtro === f.id ? COLORS.info : COLORS.textSecondary}
            />
            <Text
              style={[
                styles.filterTabText,
                filtro === f.id && styles.filterTabTextActive,
              ]}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Lista */}
      <FlatList
        data={gestoresFiltrados}
        keyExtractor={(g) => g.id}
        renderItem={({ item }) => (
          <GestorCard
            gestor={item}
            onPress={() => {
              // TODO: router.push(`/gestor/${item.id}`)
            }}
          />
        )}
        contentContainerStyle={styles.lista}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={40} color={COLORS.textMuted} />
            <Text style={styles.emptyText}>No se encontraron gestores</Text>
          </View>
        }
      />
    </View>
  );
}

// ─── Estilos ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },

  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary },
  headerSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },

  searchRow: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
    borderWidth: 0.5,
    borderColor: COLORS.border,
  },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.textPrimary },

  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.xs,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surfaceAlt,
  },
  filterTabActive: { backgroundColor: COLORS.infoMuted },
  filterTabText: { fontSize: 11, fontWeight: '500', color: COLORS.textSecondary },
  filterTabTextActive: { color: COLORS.info, fontWeight: '600' },

  lista: { padding: SPACING.md, paddingBottom: 100 },

  // Tarjeta
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  cardRow: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.md },
  avatarWrapper: { position: 'relative' },
  disponibleDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  cardInfo: { flex: 1 },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardNombre: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
  rolBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.pill },
  rolText: { fontSize: 11, fontWeight: '600' },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  cardMeta: { fontSize: 12, color: COLORS.textSecondary },

  // Stats footer
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: SPACING.sm,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.border,
  },
  statItem: { flex: 1, alignItems: 'center', gap: 2 },    
  statDivider: { width: 0.5, height: 28, backgroundColor: COLORS.border },
  statValue: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
  statLabel: { fontSize: 10, color: COLORS.textMuted },
  disponibleChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.pill },
  disponibleText: { fontSize: 10, fontWeight: '600' },

  // Empty
  empty: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { fontSize: 14, color: COLORS.textSecondary },
});