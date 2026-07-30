/**
 * Pantalla de acceso. Además del formulario, ofrece 4 ACCESOS RÁPIDOS estáticos
 * (admin, verificador, cobrador, abogado) para poder mostrar avances en el APK
 * sin backend. Al conectar la API, se quita el bloque de accesos rápidos.
 */

import FormInput from '@/components/(auth)/FormInput';
import PrimaryButton from '@/components/(auth)/PrimaryButton';
import { Colors, Radius, Spacing, Typography } from '@/constants/DesignTokens';
import { autenticarConBiometria, biometriaDisponible, DisponibilidadBiometria } from '@/domain/auth/biometria';
import { CUENTAS_DEMO, ROL_APP_LABEL, RolApp, useHaySesionGuardada, useSesion } from '@/domain/auth/sesion';
import { MAX, textoSeguro } from '@/domain/validators';
import { useBottomInset } from '@/hooks/useBottomInset';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
const ACCESOS: { rol: RolApp; icon: string; color: string; desc: string }[] = [
  { rol: 'admin', icon: 'shield-checkmark-outline', color: Colors.primary, desc: 'Panel, seguimiento y reportes' },
  { rol: 'verificador', icon: 'search-outline', color: Colors.success, desc: 'Verificaciones domiciliar y laboral' },
  { rol: 'cobrador', icon: 'cash-outline', color: Colors.warning, desc: 'Cobros y recuperación' },
  { rol: 'abogado', icon: 'briefcase-outline', color: '#9B7BF0', desc: 'Gestiones legales' },
];

export default function LoginScreen() {
  const bottomInset = useBottomInset();
  const { iniciarSesion, entrarComo, restaurarSesionGuardada } = useSesion();
  const haySesionGuardada = useHaySesionGuardada();
  const [usuario, setUsuario] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [cargando, setCargando] = useState(false);
  const [biometria, setBiometria] = useState<DisponibilidadBiometria | null>(null);
  const [verificando, setVerificando] = useState(false);

  useEffect(() => {
    biometriaDisponible().then(setBiometria);
  }, []);

  const mostrarBiometria = haySesionGuardada && biometria?.soportado && biometria.enrolado;

  const entrarConBiometria = async () => {
    setVerificando(true);
    const r = await autenticarConBiometria();
    if (r.ok) {
      await restaurarSesionGuardada();
      router.replace('/(tabs)');
    } else if (r.error) {
      setError(r.error);
    }
    setVerificando(false);
  };

  const entrar = () => {
    setError(undefined);
    if (!usuario.trim() || !clave) {
      setError('Ingresa usuario y contraseña');
      return;
    }
    setCargando(true);
    setTimeout(() => {
      const r = iniciarSesion(usuario, clave);
      setCargando(false);
      if (!r.ok) setError(r.error);
      else router.replace('/(tabs)');
    }, 500);
  };

  const acceso = (rol: RolApp) => {
    entrarComo(rol);
    router.replace('/(tabs)');
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <View style={styles.logo}>
          <Ionicons name="briefcase" size={30} color="#fff" />
        </View>
        <Text style={styles.title}>Gestión de Campo</Text>
        <Text style={styles.subtitle}>Cobranza y verificación de crédito</Text>

        {mostrarBiometria && (
          <Pressable style={styles.biometriaBtn} onPress={entrarConBiometria} disabled={verificando}>
            <Ionicons name={biometria?.tipo === 'rostro' ? 'scan-outline' : 'finger-print-outline'} size={22} color={Colors.primary} />
            <Text style={styles.biometriaText}>
              {verificando ? 'Verificando…' : `Entrar con ${biometria?.tipo === 'rostro' ? 'Face ID' : 'huella'}`}
            </Text>
          </Pressable>
        )}

        {/* Login normal */}
        <View style={styles.card}>
          <FormInput
            label="Usuario"
            placeholder="usuario"
            autoCapitalize="none"
            maxLength={MAX.generico}
            value={usuario}
            onChangeText={(t) => setUsuario(textoSeguro(t))}
          />
          <FormInput
            label="Contraseña"
            placeholder="••••••••"
            secureTextEntry
            maxLength={64}
            value={clave}
            onChangeText={setClave}
            error={error}
          />
          <PrimaryButton label={cargando ? 'Entrando…' : 'Iniciar sesión'} onPress={entrar} loading={cargando} />
        </View>

        <Pressable onPress={() => router.push('/(auth)/registro')} style={styles.registroLink}>
          <Text style={styles.registroLinkText}>¿Eres nuevo gestor? <Text style={styles.registroLinkStrong}>Regístrate aquí</Text></Text>
        </Pressable>

        {/* Accesos rápidos de demo */}
        <View style={styles.divisor}>
          <View style={styles.linea} />
          <Text style={styles.divisorText}>ACCESOS DE DEMO</Text>
          <View style={styles.linea} />
        </View>

        <Text style={styles.demoHint}>Entra directo con cualquiera de los 4 roles.</Text>

        {ACCESOS.map((a) => {
          const cuenta = CUENTAS_DEMO.find((c) => c.perfil.rol === a.rol)!;
          return (
            <Pressable key={a.rol} style={styles.accesoCard} onPress={() => acceso(a.rol)}>
              <View style={[styles.accesoIcon, { backgroundColor: a.color + '1F' }]}>
                <Ionicons name={a.icon as any} size={20} color={a.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.accesoRol}>{ROL_APP_LABEL[a.rol]}</Text>
                <Text style={styles.accesoDesc}>{a.desc}</Text>
                <Text style={styles.accesoCred}>{cuenta.usuario} / {cuenta.clave}</Text>
              </View>
              <Ionicons name="arrow-forward-circle" size={22} color={a.color} />
            </Pressable>
          );
        })}

        <Text style={styles.foot}>Credenciales de demostración. Se eliminan al conectar el backend.</Text>
        <View style={{ height: Spacing.xxl + bottomInset }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.xl, paddingTop: Spacing.xxxl },
  logo: { alignSelf: 'center', width: 64, height: 64, borderRadius: 20, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md },
  title: { ...Typography.title, color: Colors.textPrimary, textAlign: 'center' },
  subtitle: { ...Typography.caption, color: Colors.textSecondary, textAlign: 'center', marginBottom: Spacing.xl },

  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 0.5, borderColor: Colors.border, padding: Spacing.lg },

  biometriaBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, backgroundColor: Colors.primaryMuted, borderRadius: Radius.lg, paddingVertical: Spacing.md, marginBottom: Spacing.lg },
  biometriaText: { ...Typography.subtitle, color: Colors.primary, fontWeight: '700' },

  registroLink: { alignItems: 'center', paddingVertical: Spacing.lg },
  registroLinkText: { ...Typography.caption, color: Colors.textSecondary },
  registroLinkStrong: { color: Colors.info, fontWeight: '700' },

  divisor: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginVertical: Spacing.xl },
  linea: { flex: 1, height: 0.5, backgroundColor: Colors.border },
  divisorText: { ...Typography.micro, color: Colors.textMuted, letterSpacing: 0.8 },
  demoHint: { ...Typography.caption, color: Colors.textSecondary, marginBottom: Spacing.md },

  accesoCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 0.5, borderColor: Colors.border, padding: Spacing.md, marginBottom: Spacing.sm },
  accesoIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  accesoRol: { ...Typography.subtitle, color: Colors.textPrimary, fontWeight: '700' },
  accesoDesc: { ...Typography.caption, color: Colors.textSecondary, marginTop: 1 },
  accesoCred: { ...Typography.micro, color: Colors.textMuted, textTransform: 'none', letterSpacing: 0, marginTop: 3, fontFamily: 'monospace' },

  foot: { ...Typography.micro, color: Colors.textMuted, textAlign: 'center', textTransform: 'none', letterSpacing: 0, marginTop: Spacing.md },
});