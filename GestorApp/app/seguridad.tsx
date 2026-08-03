/**
 * app/seguridad.tsx
 * Configuración de seguridad de la cuenta, accesible desde Mi perfil.
 *  - Verificación en dos pasos (TOTP) -> domain/auth/mfa.ts (Supabase Auth MFA real).
 *  - Desbloqueo con Face ID / huella -> domain/auth/biometria.ts (preferencia
 *    local del dispositivo + hardware disponible).
 */

import { Colors, Radius, Spacing, Typography } from '@/constants/DesignTokens';
import {
  autenticarConBiometria,
  biometriaActivadaPorUsuario,
  biometriaDisponible,
  DisponibilidadBiometria,
  establecerBiometriaActivada,
} from '@/domain/auth/biometria';
import {
  confirmarEnrolamientoTotp,
  eliminarFactorMfa,
  EnrolamientoTotp,
  factoresMfa,
  FactorMfa,
  iniciarEnrolamientoTotp,
} from '@/domain/auth/mfa';
import { useHaySesionGuardada } from '@/domain/auth/sesion';
import { supabaseConfigurado } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

export default function SeguridadScreen() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <SeccionMfa />
      <SeccionBiometria />
    </ScrollView>
  );
}

// ─── Sección: verificación en dos pasos (TOTP) ───────────────────────────────

function SeccionMfa() {
  const [cargando, setCargando] = useState(true);
  const [factores, setFactores] = useState<FactorMfa[]>([]);
  const [enrolando, setEnrolando] = useState<EnrolamientoTotp | null>(null);
  const [codigo, setCodigo] = useState('');
  const [procesando, setProcesando] = useState(false);

  const cargar = async () => {
    setCargando(true);
    setFactores(await factoresMfa());
    setCargando(false);
  };

  useEffect(() => {
    if (supabaseConfigurado) cargar();
    else setCargando(false);
  }, []);

  const iniciar = async () => {
    setProcesando(true);
    const r = await iniciarEnrolamientoTotp();
    setProcesando(false);
    if (!r.ok) {
      Alert.alert('No se pudo iniciar', r.error);
      return;
    }
    setEnrolando(r.data);
  };

  const confirmar = async () => {
    if (!enrolando) return;
    if (!codigo.trim()) {
      Alert.alert('Falta el código', 'Escribe el código de 6 dígitos de tu app de autenticación.');
      return;
    }
    setProcesando(true);
    const r = await confirmarEnrolamientoTotp(enrolando.factorId, codigo);
    setProcesando(false);
    if (!r.ok) {
      Alert.alert('Código incorrecto', r.error);
      return;
    }
    setEnrolando(null);
    setCodigo('');
    Alert.alert('Listo', 'La verificación en dos pasos quedó activada.');
    cargar();
  };

  const quitar = (f: FactorMfa) => {
    Alert.alert('Quitar verificación en dos pasos', '¿Seguro que quieres desactivarla en este método?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Quitar',
        style: 'destructive',
        onPress: async () => {
          setProcesando(true);
          const r = await eliminarFactorMfa(f.id);
          setProcesando(false);
          if (!r.ok) Alert.alert('No se pudo quitar', r.error);
          else cargar();
        },
      },
    ]);
  };

  return (
    <View style={styles.seccion}>
      <Text style={styles.tituloSeccion}>Verificación en dos pasos</Text>
      <Text style={styles.ayuda}>
        Pide un código de 6 dígitos de una app como Google Authenticator o Authy al iniciar sesión, además de tu
        contraseña o enlace de correo.
      </Text>

      {!supabaseConfigurado && (
        <View style={styles.card}>
          <Text style={styles.cardTexto}>Conecta Supabase primero (ver .env.example) para poder activarla.</Text>
        </View>
      )}

      {supabaseConfigurado && cargando && (
        <View style={styles.card}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      )}

      {supabaseConfigurado && !cargando && (
        <>
          {(() => {
            const factorActivo = factores.find((f) => f.status === 'verified');

            if (factorActivo && !enrolando) {
              return (
                <View style={styles.card}>
                  <View style={styles.filaActivo}>
                    <Ionicons name="shield-checkmark" size={20} color={Colors.success} />
                    <Text style={styles.activoTexto}>Verificación en dos pasos activada</Text>
                  </View>
                  <Pressable
                    style={[styles.botonSecundario, procesando && styles.deshabilitado]}
                    onPress={() => quitar(factorActivo)}
                    disabled={procesando}
                  >
                    <Text style={styles.botonSecundarioTexto}>Quitar</Text>
                  </Pressable>
                </View>
              );
            }

            if (!factorActivo && !enrolando) {
              return (
                <View style={styles.card}>
                  <Text style={styles.cardTexto}>Todavía no tienes verificación en dos pasos activa.</Text>
                  <Pressable style={[styles.boton, procesando && styles.deshabilitado]} onPress={iniciar} disabled={procesando}>
                    <Text style={styles.botonTexto}>{procesando ? 'Preparando…' : 'Activar'}</Text>
                  </Pressable>
                </View>
              );
            }

            if (enrolando) {
              return (
                <View style={styles.card}>
                  <Text style={styles.cardTitulo}>1. Agrega esta cuenta a tu app de autenticación</Text>
                  <Text style={styles.cardTexto}>
                    Abre Google Authenticator, Authy o similar → &quot;Agregar cuenta&quot; → &quot;Ingresar clave
                    manualmente&quot;, y escribe este código secreto:
                  </Text>
                  <View style={styles.secretoBox}>
                    <Text selectable style={styles.secretoTexto}>{enrolando.secreto}</Text>
                  </View>
                  {Platform.OS === 'web' && (
                    <Text style={styles.cardTextoChico}>
                      (En el teléfono normalmente también puedes escanear un código QR; por ahora usa la clave manual
                      de arriba.)
                    </Text>
                  )}

                  <Text style={[styles.cardTitulo, { marginTop: Spacing.lg }]}>2. Escribe el código de 6 dígitos que te muestra la app</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="123456"
                    keyboardType="number-pad"
                    maxLength={6}
                    value={codigo}
                    onChangeText={setCodigo}
                    placeholderTextColor={Colors.textMuted}
                  />
                  <Pressable style={[styles.boton, procesando && styles.deshabilitado]} onPress={confirmar} disabled={procesando}>
                    <Text style={styles.botonTexto}>{procesando ? 'Verificando…' : 'Confirmar y activar'}</Text>
                  </Pressable>
                  <Pressable onPress={() => { setEnrolando(null); setCodigo(''); }} style={styles.cancelar}>
                    <Text style={styles.cancelarTexto}>Cancelar</Text>
                  </Pressable>
                </View>
              );
            }

            return null;
          })()}
        </>
      )}
    </View>
  );
}

// ─── Sección: desbloqueo con Face ID / huella ────────────────────────────────

function SeccionBiometria() {
  const haySesionGuardada = useHaySesionGuardada();
  const [disponibilidad, setDisponibilidad] = useState<DisponibilidadBiometria | null>(null);
  const [activada, setActivada] = useState(true);
  const [cargando, setCargando] = useState(true);
  const [cambiando, setCambiando] = useState(false);

  useEffect(() => {
    (async () => {
      setDisponibilidad(await biometriaDisponible());
      setActivada(await biometriaActivadaPorUsuario());
      setCargando(false);
    })();
  }, []);

  const alternar = async (valor: boolean) => {
    if (valor && disponibilidad?.soportado && !disponibilidad.enrolado) {
      Alert.alert(
        'No hay huella/rostro configurado',
        'Primero agrégalo en los ajustes de tu teléfono (Face ID / huella) y vuelve aquí.',
      );
      return;
    }
    // Si se está prendiendo, confirmamos con una verificación real antes de guardarlo.
    if (valor) {
      const r = await autenticarConBiometria();
      if (!r.ok) {
        if (r.error) Alert.alert('No se pudo verificar', r.error);
        return;
      }
    }
    setCambiando(true);
    await establecerBiometriaActivada(valor);
    setActivada(valor);
    setCambiando(false);
  };

  const etiquetaTipo = disponibilidad?.tipo === 'rostro' ? 'Face ID' : disponibilidad?.tipo === 'huella' ? 'huella' : 'biometría';

  return (
    <View style={styles.seccion}>
      <Text style={styles.tituloSeccion}>Desbloqueo con {etiquetaTipo}</Text>
      <Text style={styles.ayuda}>
        Con esto puedes volver a entrar a GestorApp en este teléfono sin escribir tu contraseña cada vez.
      </Text>

      <View style={styles.card}>
        {Platform.OS === 'web' ? (
          <Text style={styles.cardTexto}>No disponible en la versión web — solo en la app del teléfono.</Text>
        ) : cargando ? (
          <ActivityIndicator color={Colors.primary} />
        ) : !disponibilidad?.soportado ? (
          <Text style={styles.cardTexto}>Tu teléfono no tiene sensor de huella ni reconocimiento facial.</Text>
        ) : (
          <>
            <View style={styles.filaSwitch}>
              <View style={{ flex: 1 }}>
                <Text style={styles.activoTexto}>Usar {etiquetaTipo} para entrar</Text>
                {!disponibilidad.enrolado && (
                  <Text style={styles.cardTextoChico}>Configura tu {etiquetaTipo} en los ajustes del sistema primero.</Text>
                )}
                {!haySesionGuardada && (
                  <Text style={styles.cardTextoChico}>Inicia sesión una vez con tu contraseña para poder activarlo.</Text>
                )}
              </View>
              <Switch
                value={activada && disponibilidad.enrolado}
                onValueChange={alternar}
                disabled={cambiando || !disponibilidad.enrolado || !haySesionGuardada}
                trackColor={{ true: Colors.primary, false: Colors.border }}
                thumbColor="#fff"
              />
            </View>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.xl, maxWidth: 560, width: '100%', alignSelf: 'center', gap: Spacing.xl },

  seccion: { gap: Spacing.sm },
  tituloSeccion: { ...Typography.subtitle, color: Colors.textPrimary, fontWeight: '700' },
  ayuda: { ...Typography.caption, color: Colors.textSecondary },

  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 0.5, borderColor: Colors.border, padding: Spacing.lg, gap: Spacing.md },
  cardTitulo: { ...Typography.subtitle, color: Colors.textPrimary, fontWeight: '700' },
  cardTexto: { ...Typography.caption, color: Colors.textSecondary },
  cardTextoChico: { ...Typography.micro, color: Colors.textMuted, textTransform: 'none', letterSpacing: 0, marginTop: 2 },

  filaActivo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  filaSwitch: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  activoTexto: { ...Typography.subtitle, color: Colors.textPrimary, fontWeight: '600' },

  secretoBox: { backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  secretoTexto: { fontFamily: 'monospace', fontSize: 16, letterSpacing: 1, color: Colors.textPrimary, textAlign: 'center' },

  input: { backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, color: Colors.textPrimary, fontSize: 18, letterSpacing: 4, textAlign: 'center' },

  boton: { backgroundColor: Colors.primary, borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center' },
  botonTexto: { color: '#fff', fontWeight: '700' },
  botonSecundario: { borderWidth: 1, borderColor: Colors.danger, borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center' },
  botonSecundarioTexto: { color: Colors.danger, fontWeight: '700' },
  deshabilitado: { opacity: 0.6 },

  cancelar: { alignItems: 'center', paddingTop: Spacing.xs },
  cancelarTexto: { ...Typography.caption, color: Colors.textMuted },
});