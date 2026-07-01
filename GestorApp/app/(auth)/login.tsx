import FormInput from '@/components/(auth)/FormInput';
import PrimaryButton from '@/components/(auth)/PrimaryButton';
import { Colors, Radius, Spacing } from '@/constants/DesignTokens';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

export default function LoginScreen() {
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleLogin = () => {
    if (!correo.trim() || !password.trim()) {
      Alert.alert('Campos requeridos', 'Ingresa tu correo y contraseña.');
      return;
    }
    setCargando(true);
    // TODO: reemplazar con fetch real a tu API
    // const res = await fetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ correo, password }) })
    setTimeout(() => {
      setCargando(false);
      router.replace('/(tabs)');
    }, 1200);
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        {/* Logo / marca */}
        <View style={styles.logoArea}>
          <View style={styles.logoCircle}>
            <Ionicons name="briefcase" size={36} color={Colors.primary} />
          </View>
          <Text style={styles.appNombre}>GestorApp</Text>
          <Text style={styles.appSlogan}>Plataforma de gestión en campo</Text>
        </View>

        {/* Card del formulario */}
        <View style={styles.card}>
          <Text style={styles.cardTitulo}>Iniciar sesión</Text>

          <FormInput
            label="Correo electrónico"
            placeholder="nombre@correo.com"
            required
            keyboardType="email-address"
            autoCapitalize="none"
            value={correo}
            onChangeText={setCorreo}
          />

          <FormInput
            label="Contraseña"
            placeholder="Tu contraseña"
            required
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <Pressable style={styles.olvidaste}>
            <Text style={styles.olvidasteText}>¿Olvidaste tu contraseña?</Text>
          </Pressable>

          <PrimaryButton
            label={cargando ? 'Ingresando...' : 'Ingresar'}
            onPress={handleLogin}
            loading={cargando}
          />
        </View>

        {/* Registro */}
        <View style={styles.registroRow}>
          <Text style={styles.registroText}>¿Eres nuevo gestor? </Text>
          <Pressable onPress={() => router.push('/(auth)/registro')}>
            <Text style={styles.registroLink}>Regístrate aquí</Text>
          </Pressable>
        </View>

        {/* Dev shortcut - quitar en producción */}
        <Pressable
          style={styles.devBtn}
          onPress={() => router.replace('/(tabs)')}>
          <Text style={styles.devText}>⚡ Entrar sin login (dev)</Text>
        </Pressable>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  container: {
    flexGrow: 1,
    padding: Spacing.xl,
    justifyContent: 'center',
  },

  logoArea: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  appNombre: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  appSlogan: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
  },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    borderWidth: 0.5,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
  },
  cardTitulo: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.lg,
  },

  olvidaste: {
    alignSelf: 'flex-end',
    marginBottom: Spacing.lg,
    marginTop: -Spacing.sm,
  },
  olvidasteText: {
    fontSize: 13,
    color: Colors.info,
    fontWeight: '500',
  },

  registroRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registroText: { fontSize: 14, color: Colors.textSecondary },
  registroLink: { fontSize: 14, color: Colors.info, fontWeight: '600' },

  devBtn: {
    marginTop: Spacing.xl,
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.warningMuted,
  },
  devText: { fontSize: 12, color: Colors.warning, fontWeight: '600' },
});