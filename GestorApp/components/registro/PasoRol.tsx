import RoleSelector, { RolGestor } from '@/components/(auth)/Roleselector';
import { Colors, Spacing, Typography } from '@/constants/DesignTokens';
import { StyleSheet, Text, View } from 'react-native';

interface PasoRolProps {
  rol: RolGestor | null;
  onChange: (rol: RolGestor) => void;
}

export default function PasoRol({ rol, onChange }: PasoRolProps) {
  return (
    <View>
      <Text style={styles.titulo}>Que tipo de gestor eres</Text>
      <Text style={styles.subtitulo}>
        El rol determina los documentos y datos que se solicitan a
        continuacion
      </Text>
      <RoleSelector value={rol} onChange={onChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  titulo: {
    ...Typography.title,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  subtitulo: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.xl,
  },
});