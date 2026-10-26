/**
 * Pantalla de acceso.
 *  - Con Supabase configurado: login por correo+contraseña, o por enlace
 *    mágico (sin contraseña) — ver domain/auth/magicLink.ts y
 *    app/auth/callback.tsx. Si el usuario tiene MFA (TOTP) activo, se pide
 *    el código de la app de autenticación antes de entrar.
 *  - Sin Supabase configurado (.env vacío): cae al modo demo con 4 accesos
 *    rápidos, igual que antes, para poder seguir mostrando avances de UI.
 */

import FormInput from '@/components/(auth)/FormInput';
import PrimaryButton from '@/components/(auth)/PrimaryButton';
import { Colors, Radius, Spacing, Typography } from '@/constants/DesignTokens';
import { autenticarConBiometria, biometriaActivadaPorUsuario, biometriaDisponible, DisponibilidadBiometria } from '@/domain/auth/biometria';
import { enviarEnlaceMagico } from '@/domain/auth/magicLink';
import { faltaSegundoFactor } from '@/domain/auth/mfa';
import { CUENTAS_DEMO, ROL_APP_LABEL, RolApp, useHaySesionGuardada, useSesion } from '@/domain/auth/sesion';
import { MAX, textoSeguro } from '@/domain/validators';
import { useBottomInset } from '@/hooks/useBottomInset';
import { supabaseConfigurado } from '@/lib/supabase';
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

type Modo = 'password' | 'magic-pedir' | 'magic-enviado' | 'mfa';

export default function LoginScreen() {
  const bottomInset = useBottomInset();
  const { iniciarSesion, completarSegundoFactor, entrarComo, restaurarSesionGuardada } = useSesion();
  const haySesionGuardada = useHaySesionGuardada();

  const [modo, setModo] = useState<Modo>('password');
  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState('');
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [cargando, setCargando] = useState(false);
  const [biometria, setBiometria] = useState<DisponibilidadBiometria | null>(null);
  const [biometriaPreferida, setBiometriaPreferida] = useState(true);
  const [verificando, setVerificando] = useState(false);

  useEffect(() => {
    biometriaDisponible().then(setBiometria);
    biometriaActivadaPorUsuario().then(setBiometriaPreferida);
  }, []);

  // Si venimos de tocar el enlace mágico y a esa cuenta le falta el código
  // MFA, app/auth/callback.tsx nos manda de vuelta aquí: mostramos ese paso
  // directo en vez del formulario de contraseña.
  useEffect(() => {
    if (!supabaseConfigurado) return;
    faltaSegundoFactor().then((falta) => {
      if (falta) setModo('mfa');
    });
  }, []);

  const mostrarBiometria = haySesionGuardada && biometria?.soportado && biometria.enrolado && biometriaPreferida;

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

  const entrarConClave = async () => {
    setError(undefined);
    if (!correo.trim() || !clave) {
      setError('Ingresa tu correo y contraseña');
      return;
    }
    setCargando(true);
    const r = await iniciarSesion(correo, clave);
    setCargando(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    if (r.requiereMfa) {
      setModo('mfa');
      return;
    }
    router.replace('/(tabs)');
  };

  const pedirEnlaceMagico = async () => {
    setError(undefined);
    if (!correo.trim()) {
      setError('Ingresa tu correo');
      return;
    }
    setCargando(true);
    const r = await enviarEnlaceMagico(correo);
    setCargando(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setModo('magic-enviado');
  };

  const verificarMfa = async () => {
    setError(undefined);
    if (!codigo.trim()) {
      setError('Escribe el código de tu app de autenticación');
      return;
    }
    setCargando(true);
    const r = await completarSegundoFactor(codigo);
    setCargando(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    router.replace('/(tabs)');
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

        {mostrarBiometria && modo === 'password' && (
          <Pressable style={styles.biometriaBtn} onPress={entrarConBiometria} disabled={verificando}>
            <Ionicons name={biometria?.tipo === 'rostro' ? 'scan-outline' : 'finger-print-outline'} size={22} color={Colors.primary} />
            <Text style={styles.biometriaText}>
              {verificando ? 'Verificando…' : `Entrar con ${biometria?.tipo === 'rostro' ? 'Face ID' : 'huella'}`}
            </Text>
          </Pressable>
        )}

        <View style={styles.card}>
          {modo === 'password' && (
            <>
              <FormInput
                label="Correo electrónico"
                placeholder="tucorreo@ejemplo.com"
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                maxLength={MAX.generico}
                value={correo}
                onChangeText={(t) => setCorreo(textoSeguro(t))}
              />
              <FormInput
                label="Contraseña"
                placeholder="••••••••"
                secureTextEntry
                maxLength={72}
                value={clave}
                onChangeText={setClave}
                error={error}
              />
              <PrimaryButton label={cargando ? 'Entrando…' : 'Iniciar sesión'} onPress={entrarConClave} loading={cargando} />

              {supabaseConfigurado && (
                <Pressable
                  onPress={() => {
                    setError(undefined);
                    setModo('magic-pedir');
                  }}
                  style={styles.linkCentrado}
                >
                  <Text style={styles.linkCentradoText}>Entrar con un enlace por correo (sin contraseña)</Text>
                </Pressable>
              )}
            </>
          )}

          {modo === 'magic-pedir' && (
            <>
              <Text style={styles.pasoTitulo}>Enlace mágico</Text>
              <Text style={styles.pasoAyuda}>Te mandamos un enlace a tu correo; solo tócalo desde tu teléfono o ábrelo en este mismo navegador para entrar.</Text>
              <FormInput
                label="Correo electrónico"
                placeholder="tucorreo@ejemplo.com"
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                maxLength={MAX.generico}
                value={correo}
                onChangeText={(t) => setCorreo(textoSeguro(t))}
                error={error}
              />
              <PrimaryButton label={cargando ? 'Enviando…' : 'Enviar enlace'} onPress={pedirEnlaceMagico} loading={cargando} />
              <Pressable onPress={() => { setError(undefined); setModo('password'); }} style={styles.linkCentrado}>
                <Text style={styles.linkCentradoText}>Volver a entrar con contraseña</Text>
              </Pressable>
            </>
          )}

          {modo === 'magic-enviado' && (
            <View style={styles.enviadoBox}>
              <Ionicons name="mail-open-outline" size={32} color={Colors.primary} />
              <Text style={styles.pasoTitulo}>Revisa tu correo</Text>
              <Text style={styles.pasoAyuda}>Te enviamos un enlace a {correo}. Ábrelo desde este dispositivo para entrar. Revisa también spam.</Text>
              <Pressable onPress={pedirEnlaceMagico} style={styles.linkCentrado} disabled={cargando}>
                <Text style={styles.linkCentradoText}>{cargando ? 'Reenviando…' : 'Reenviar enlace'}</Text>
              </Pressable>
              <Pressable onPress={() => { setError(undefined); setModo('password'); }} style={styles.linkCentrado}>
                <Text style={styles.linkCentradoText}>Volver a entrar con contraseña</Text>
              </Pressable>
            </View>
          )}

          {modo === 'mfa' && (
            <>
              <Text style={styles.pasoTitulo}>Verificación en dos pasos</Text>
              <Text style={styles.pasoAyuda}>Escribe el código actual de tu app de autenticación (Google Authenticator, Authy, etc.).</Text>
              <FormInput
                label="Código de 6 dígitos"
                placeholder="123456"
                keyboardType="number-pad"
                maxLength={6}
                value={codigo}
                onChangeText={setCodigo}
                error={error}
              />
              <PrimaryButton label={cargando ? 'Verificando…' : 'Confirmar'} onPress={verificarMfa} loading={cargando} />
              <Pressable
                onPress={() => {
                  setError(undefined);
                  setCodigo('');
                  setModo('password');
                }}
                style={styles.linkCentrado}
              >
                <Text style={styles.linkCentradoText}>Volver a entrar con contraseña</Text>
              </Pressable>
            </>
          )}
        </View>

        <Pressable onPress={() => router.push('/(auth)/registro')} style={styles.registroLink}>
          <Text style={styles.registroLinkText}>¿Eres nuevo gestor? <Text style={styles.registroLinkStrong}>Regístrate aquí</Text></Text>
        </Pressable>

        {!supabaseConfigurado && (
          <>
            <View style={styles.divisor}>
              <View style={styles.linea} />
              <Text style={styles.divisorText}>ACCESOS DE DEMO</Text>
              <View style={styles.linea} />
            </View>

            <Text style={styles.demoHint}>
              Supabase no está configurado (falta el .env) — entra directo con cualquiera de los 4 roles.
            </Text>

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

            <Text style={styles.foot}>Credenciales de demostración. Desaparecen solas al llenar el .env con tu proyecto de Supabase.</Text>
          </>
        )}
        <View style={{ height: Spacing.xxl + bottomInset }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.xl, paddingTop: Spacing.xxxl, maxWidth: 480, width: '100%', alignSelf: 'center' },
  logo: { alignSelf: 'center', width: 64, height: 64, borderRadius: 20, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md },
  title: { ...Typography.title, color: Colors.textPrimary, textAlign: 'center' },
  subtitle: { ...Typography.caption, color: Colors.textSecondary, textAlign: 'center', marginBottom: Spacing.xl },

  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 0.5, borderColor: Colors.border, padding: Spacing.lg },

  pasoTitulo: { ...Typography.subtitle, color: Colors.textPrimary, fontWeight: '700', marginBottom: Spacing.xs, textAlign: 'center' },
  pasoAyuda: { ...Typography.caption, color: Colors.textSecondary, marginBottom: Spacing.lg, textAlign: 'center' },
  enviadoBox: { alignItems: 'center', gap: Spacing.xs },

  biometriaBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, backgroundColor: Colors.primaryMuted, borderRadius: Radius.lg, paddingVertical: Spacing.md, marginBottom: Spacing.lg },
  biometriaText: { ...Typography.subtitle, color: Colors.primary, fontWeight: '700' },

  linkCentrado: { alignItems: 'center', paddingTop: Spacing.md },
  linkCentradoText: { ...Typography.caption, color: Colors.info, fontWeight: '600' },

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