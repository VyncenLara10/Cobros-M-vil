import FormInput from '@/components/(auth)/FormInput';
import PrimaryButton from '@/components/(auth)/PrimaryButton';
import { Colors, Radius, Spacing, Typography } from '@/constants/DesignTokens';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

/**
 * Pantalla de inicio de sesion para gestores (verificador, cobrador,
 * abogado). Esta version es solo de interfaz: no hay llamada a
 * backend, el boton de ingresar simplemente simula una carga breve
 * y navega a la app. Conectar a /auth/login cuando exista el API.
 */
export default function LoginScreen() {
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [errores, setErrores] = useState<{ correo?: string; password?: string }>({});

  const validar = () => {
    const nuevosErrores: { correo?: string; password?: string } = {};
    if (!correo.trim()) nuevosErrores.correo = 'Ingresa tu correo';
    else if (!/^\S+@\S+\.\S+$/.test(correo)) nuevosErrores.correo = 'Correo no valido';
    if (!password) nuevosErrores.password = 'Ingresa tu contrasena';
    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const manejarIngreso = () => {
    if (!validar()) return;
    setCargando(true);
    // Simulacion de llamada a backend. Reemplazar por la peticion
    // real a POST /auth/login cuando el API este disponible.
    setTimeout(() => {
      setCargando(false);
      router.replace('/(tabs)');
    }, 900);
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoWrap}>
          <View style={styles.logoCircle}>
            <Ionicons name="shield-checkmark" size={30} color={Colors.primary} />
          </View>
          <Text style={styles.appName}>Gestor de Servicios</Text>
          <Text style={styles.appTagline}>Acceso para gestores afiliados</Text>
        </View>

        <View style={styles.form}>
          <FormInput
            label="Correo electronico"
            placeholder="nombre@correo.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={correo}
            onChangeText={setCorreo}
            error={errores.correo}
          />

          <View>
            <FormInput
              label="Contrasena"
              placeholder="Ingresa tu contrasena"
              secureTextEntry={!mostrarPassword}
              value={password}
              onChangeText={setPassword}
              error={errores.password}
            />
            <Pressable
              style={styles.toggleVerPassword}
              onPress={() => setMostrarPassword(!mostrarPassword)}
            >
              <Ionicons
                name={mostrarPassword ? 'eye-off-outline' : 'eye-outline'}
                size={18}
                color={Colors.textMuted}
              />
            </Pressable>
          </View>

          <Pressable style={styles.olvideContainer}>
            <Text style={styles.olvideTexto}>Olvide mi contrasena</Text>
          </Pressable>

          <PrimaryButton
            label="Ingresar"
            onPress={manejarIngreso}
            loading={cargando}
            style={styles.botonIngresar}
          />

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>o</Text>
            <View style={styles.dividerLine} />
          </View>

          <PrimaryButton
            label="Crear cuenta de gestor"
            onPress={() => router.push('/auth/registro')}
            variant="secondary"
          />
        </View>

        <Text style={styles.footerNota}>
          Al ingresar confirmas que tu cuenta fue aprobada por el equipo
          de verificacion
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxxl,
    paddingBottom: Spacing.xxl,
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: Spacing.xxxl,
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: Radius.xl,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  appName: {
    ...Typography.title,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  appTagline: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  form: {
    width: '100%',
  },
  toggleVerPassword: {
    position: 'absolute',
    right: Spacing.lg,
    top: 38,
  },
  olvideContainer: {
    alignSelf: 'flex-end',
    marginBottom: Spacing.xl,
    marginTop: -Spacing.sm,
  },
  olvideTexto: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '600',
  },
  botonIngresar: {
    marginBottom: Spacing.xl,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xl,
    gap: Spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    ...Typography.caption,
    color: Colors.textMuted,
  },
  footerNota: {
    ...Typography.caption,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
  },
});