/**
 * app/(auth)/registro-enviado.tsx
 * Pantalla de confirmación después de enviar el registro del gestor.
 * Mueve aquí el archivo registro-enviado.tsx de "sin orden".
 */

import PrimaryButton from '@/components/(auth)/PrimaryButton';
import { Colors, Radius, Spacing, Typography } from '@/constants/DesignTokens';
import { useBottomInset } from '@/hooks/useBottomInset';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

export default function RegistroEnviadoScreen() {
  const bottomInset = useBottomInset();
  return (
    <View style={[styles.container, { paddingBottom: Spacing.xl + bottomInset }]}>
      {/* Ícono de éxito */}
      <View style={styles.iconCircle}>
        <Ionicons name="checkmark-circle" size={64} color={Colors.success} />
      </View>

      <Text style={styles.titulo}>¡Solicitud enviada!</Text>
      <Text style={styles.subtitulo}>
        Tu registro como gestor fue enviado correctamente. El equipo revisará tu información y te notificará en menos de 24 horas.
      </Text>

      {/* ¿Qué sigue? */}
      <View style={styles.pasosList}>
        {[
          { icon: 'document-text-outline', text: 'Revisamos tus documentos' },
          { icon: 'call-outline', text: 'Te contactamos para validar tu perfil' },
          { icon: 'checkmark-done-outline', text: 'Activan tu cuenta y empiezas a recibir casos' },
        ].map((paso, i) => (
          <View key={i} style={styles.pasoRow}>
            <View style={styles.pasoIconCircle}>
              <Ionicons name={paso.icon as any} size={18} color={Colors.primary} />
            </View>
            <Text style={styles.pasoText}>{paso.text}</Text>
          </View>
        ))}
      </View>

      <PrimaryButton
        label="Entendido"
        onPress={() => router.replace('/login')}
        style={styles.boton}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: `${Colors.success}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  titulo: {
    ...Typography.title,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  subtitulo: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  pasosList: {
    alignSelf: 'stretch',
    gap: Spacing.md,
    marginBottom: Spacing.xxl,
  },
  pasoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  pasoIconCircle: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pasoText: {
    ...Typography.body,
    color: Colors.textPrimary,
    flex: 1,
  },
  boton: { alignSelf: 'stretch' },
});