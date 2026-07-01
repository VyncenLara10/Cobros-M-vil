import { Colors, Radius, Spacing } from '@/constants/DesignTokens';
import { TipoServicio } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

const TIPOS = [
  {
    id: 'cobro' as TipoServicio,
    label: 'Cobro de campo',
    icon: 'cash-outline',
    descripcion: 'El cobrador visita al cliente y recupera el pago en efectivo o acuerdo.',
    rol: 'Cobrador',
    color: Colors.warning,
    bg: Colors.warningMuted,
    datosExtra: ['Monto de deuda', 'Cuenta origen', 'Días en mora', 'Comisión por recuperación'],
  },
  {
    id: 'notificacion' as TipoServicio,
    label: 'Notificación',
    icon: 'mail-outline',
    descripcion: 'Se deja una notificación al cliente y se consigue un número de contacto. La puede tomar cualquier gestor disponible.',
    rol: 'Cualquier gestor',
    color: Colors.info,
    bg: Colors.infoMuted,
    datosExtra: ['Dirección', 'Mensaje a entregar', 'Teléfono del cliente'],
  },
  {
    id: 'verificacion' as TipoServicio,
    label: 'Verificación de campo',
    icon: 'search-outline',
    descripcion: 'Se confirma que el cliente reside o trabaja en la dirección indicada. La toma el primer gestor que la acepte.',
    rol: 'Cualquier gestor',
    color: Colors.success,
    bg: Colors.successMuted,
    datosExtra: ['Dirección a verificar', 'Referencia de ubicación', 'Foto del inmueble'],
  },
  {
    id: 'legal' as TipoServicio,
    label: 'Gestión legal',
    icon: 'briefcase-outline',
    descripcion: 'El abogado realiza una gestión jurídica formal: demanda, embargo o gestión prejurídica.',
    rol: 'Abogado',
    color: '#9B7BF0',
    bg: 'rgba(155,123,240,0.14)',
    datosExtra: ['Tipo de gestión legal', 'Expediente', 'Monto en disputa', 'DPI obligatorio'],
  },
];

interface Props {
  seleccionado: TipoServicio | null;
  onChange: (tipo: TipoServicio) => void;
}

export default function PasoTipoServicio({ seleccionado, onChange }: Props) {
  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.titulo}>¿Qué tipo de servicio necesitas?</Text>
      <Text style={styles.subtitulo}>
        Según el tipo, el formulario mostrará solo los datos relevantes para el gestor asignado.
      </Text>

      {TIPOS.map((tipo) => {
        const activo = seleccionado === tipo.id;
        return (
          <Pressable
            key={tipo.id}
            style={[styles.card, activo && { borderColor: tipo.color, borderWidth: 2 }]}
            onPress={() => onChange(tipo.id)}>

            {/* Ícono + header */}
            <View style={styles.cardHeader}>
              <View style={[styles.iconCircle, { backgroundColor: tipo.bg }]}>
                <Ionicons name={tipo.icon as any} size={22} color={tipo.color} />
              </View>
              <View style={styles.cardTitles}>
                <Text style={styles.cardLabel}>{tipo.label}</Text>
                <View style={[styles.rolBadge, { backgroundColor: tipo.bg }]}>
                  <Text style={[styles.rolText, { color: tipo.color }]}>
                    Atiende: {tipo.rol}
                  </Text>
                </View>
              </View>
              {activo && (
                <Ionicons name="checkmark-circle" size={22} color={tipo.color} />
              )}
            </View>

            <Text style={styles.cardDesc}>{tipo.descripcion}</Text>

            {/* Datos que se mostrarán */}
            <View style={styles.datosRow}>
              {tipo.datosExtra.map((d) => (
                <View key={d} style={[styles.datoChip, { backgroundColor: tipo.bg }]}>
                  <Text style={[styles.datoText, { color: tipo.color }]}>{d}</Text>
                </View>
              ))}
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingBottom: Spacing.xl },
  titulo: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  subtitulo: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: Spacing.xl,
    lineHeight: 19,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitles: { flex: 1, gap: 4 },
  cardLabel: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  rolBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  rolText: { fontSize: 11, fontWeight: '600' },
  cardDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
    marginBottom: Spacing.md,
  },
  datosRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  datoChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  },
  datoText: { fontSize: 11, fontWeight: '500' },
});