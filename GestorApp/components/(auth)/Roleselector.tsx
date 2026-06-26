import { Colors, Radius, RoleColors, Spacing, Typography } from '@/constants/DesignTokens';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export type RolGestor = 'verificador' | 'cobrador' | 'abogado';

interface RoleOption {
  value: RolGestor;
  titulo: string;
  descripcion: string;
  icono: keyof typeof Ionicons.glyphMap;
}

const OPCIONES: RoleOption[] = [
  {
    value: 'verificador',
    titulo: 'Verificador',
    descripcion: 'Confirma domicilios y datos en campo',
    icono: 'location-outline',
  },
  {
    value: 'cobrador',
    titulo: 'Cobrador',
    descripcion: 'Gestiona cobros y recuperacion',
    icono: 'cash-outline',
  },
  {
    value: 'abogado',
    titulo: 'Abogado',
    descripcion: 'Notificaciones y gestiones legales',
    icono: 'briefcase-outline',
  },
];

interface RoleSelectorProps {
  value: RolGestor | null;
  onChange: (rol: RolGestor) => void;
}

/**
 * Selector de rol de gestor (verificador, cobrador, abogado).
 * El rol elegido determina que formulario de datos especificos
 * y que documentos se solicitan en el resto del registro.
 */
export default function RoleSelector({ value, onChange }: RoleSelectorProps) {
  return (
    <View style={styles.container}>
      {OPCIONES.map((opcion) => {
        const selected = value === opcion.value;
        const roleColor = RoleColors[opcion.value];
        return (
          <Pressable
            key={opcion.value}
            onPress={() => onChange(opcion.value)}
            style={[styles.card, selected && styles.cardSelected]}
          >
            <View
              style={[
                styles.iconWrap,
                { backgroundColor: selected ? roleColor.bg : Colors.surfaceAlt },
              ]}
            >
              <Ionicons
                name={opcion.icono}
                size={22}
                color={selected ? roleColor.fg : Colors.textSecondary}
              />
            </View>
            <View style={styles.textWrap}>
              <Text style={styles.titulo}>{opcion.titulo}</Text>
              <Text style={styles.descripcion}>{opcion.descripcion}</Text>
            </View>
            <View style={[styles.radio, selected && styles.radioSelected]}>
              {selected ? <View style={styles.radioDot} /> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  cardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.surfaceAlt,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.lg,
  },
  textWrap: {
    flex: 1,
  },
  titulo: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
    fontWeight: '600',
    marginBottom: 2,
  },
  descripcion: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: Radius.pill,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: Colors.primary,
  },
  radioDot: {
    width: 11,
    height: 11,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primary,
  },
});