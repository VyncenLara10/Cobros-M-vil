import { ZonaCobertura } from '@/components/(auth)/Coverageareapicker';
import PrimaryButton from '@/components/(auth)/PrimaryButton';
import PasoAcuerdo from '@/components/(auth)/registro/PasoAcuerdo';
import { RolGestor } from '@/components/(auth)/Roleselector';
import { DatosRegistro, datosRegistroVacios } from '@/components/(auth)/tipos-registro';
import PasoCuentaBancaria from '@/components/registro/PasoCuentaBancaria';
import PasoDatosPersonales from '@/components/registro/PasoDatosPersonales';
import PasoDatosRol from '@/components/registro/PasoDatosRol';
import PasoDocumentos from '@/components/registro/PasoDocumentos';
import PasoRol from '@/components/registro/PasoRol';
import PasoZonaCobertura from '@/components/registro/PasoZonaCobertura';
import Progress from '@/components/registro/Progress';
import { Colors, Spacing, Typography } from '@/constants/DesignTokens';
import { enviarSolicitudRegistro } from '@/data/solicitudesRegistro';
import { enviarRegistroReal } from '@/domain/auth/registro';
import { validarColegiado, validarDPI, validarEmail, validarNombre, validarNumeroCuenta, validarPassword, validarPlaca, validarTelefono } from '@/domain/validators';
import { useBottomInset } from '@/hooks/useBottomInset';
import { supabaseConfigurado } from '@/lib/supabase';
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

const ETIQUETAS_PASOS = ['Rol', 'Datos', 'Perfil', 'Zona', 'Docs', 'Cuenta', 'Acuerdo'];
const TOTAL_PASOS = ETIQUETAS_PASOS.length;

export default function RegistroScreen() {
  const bottomInset = useBottomInset();
  const [pasoActual, setPasoActual] = useState(1);

  // ✅ FIX: usar datosRegistroVacios que ya tiene los campos correctos
  const [datos, setDatos] = useState<DatosRegistro>(datosRegistroVacios);
  const [errores, setErrores] = useState<Partial<Record<keyof DatosRegistro, string>>>({});
  const [enviando, setEnviando] = useState(false);

  const cambiarCampo = <K extends keyof DatosRegistro>(campo: K, valor: DatosRegistro[K]) => {
    setDatos((prev) => ({ ...prev, [campo]: valor }));
    if (errores[campo]) setErrores((prev) => ({ ...prev, [campo]: undefined }));
  };

  // ── Validación ──────────────────────────────────────────────────────────
  const validarPaso = (): boolean => {
    const e: Partial<Record<keyof DatosRegistro, string>> = {};

    switch (pasoActual) {
      case 1:
        if (!datos.rol) {
          Alert.alert('Selecciona tu rol para continuar');
          return false;
        }
        break;

      case 2: {
        const rNombre = validarNombre(datos.nombreCompleto, 'El nombre completo');
        if (!rNombre.ok) e.nombreCompleto = rNombre.error;

        const rDpi = validarDPI(datos.dpiNumero);
        if (!rDpi.ok) e.dpiNumero = rDpi.error;

        const rCorreo = validarEmail(datos.correo, true);
        if (!rCorreo.ok) e.correo = rCorreo.error;

        const rTelefono = validarTelefono(datos.telefono);
        if (!rTelefono.ok) e.telefono = rTelefono.error;

        const rPassword = validarPassword(datos.password, { correo: datos.correo });
        if (!rPassword.ok) e.password = rPassword.error;
        break;
      }

      case 3:
        if (datos.rol === 'abogado') {
          const rColegiado = validarColegiado(datos.numeroColegiado);
          if (!rColegiado.ok) e.numeroColegiado = rColegiado.error;
        } else {
          if (!datos.tipoVehiculo.trim()) e.tipoVehiculo = 'El tipo de vehículo es obligatorio';
          const rPlaca = validarPlaca(datos.placaVehiculo);
          if (!rPlaca.ok) e.placaVehiculo = rPlaca.error;
        }
        break;

      case 4:
        // Documentos - fotoDPI obligatorio
        if (!datos.dpiFrenteUri) {
          Alert.alert('Documentos requeridos', 'Sube la foto del frente de tu DPI para continuar.');
          return false;
        }
        break;

      case 5:
        if (!datos.zonaCobertura) {
          Alert.alert('Zona de cobertura', 'Selecciona al menos una zona de cobertura.');
          return false;
        }
        break;

      case 6: {
        if (!datos.banco.trim()) e.banco = 'Selecciona tu banco';
        const rCuenta = validarNumeroCuenta(datos.numeroCuenta);
        if (!rCuenta.ok) e.numeroCuenta = rCuenta.error;
        const rTitular = validarNombre(datos.nombreTitular, 'El nombre del titular');
        if (!rTitular.ok) e.nombreTitular = rTitular.error;
        break;
      }

      case 7:
        // ✅ FIX: campo correcto es acuerdoAceptado, no aceptaTerminos
        if (!datos.acuerdoAceptado) {
          Alert.alert('Acuerdo requerido', 'Debes aceptar los términos para continuar.');
          return false;
        }
        break;
    }

    setErrores(e);
    return Object.keys(e).length === 0;
  };

  // ── Navegación ──────────────────────────────────────────────────────────
  const irAtras = () => {
    if (pasoActual > 1) setPasoActual((p) => p - 1);
    else router.back();
  };

  const irAdelante = () => {
    if (!validarPaso()) return;
    if (pasoActual < TOTAL_PASOS) setPasoActual((p) => p + 1);
    else enviarRegistro();
  };

  const enviarRegistro = async () => {
    setEnviando(true);

    if (supabaseConfigurado) {
      const r = await enviarRegistroReal(datos);
      setEnviando(false);
      if (!r.ok) {
        Alert.alert('No se pudo enviar la solicitud', r.error ?? 'Intenta de nuevo.');
        return;
      }
      router.replace('/(auth)/registro-enviado');
      return;
    }

    // Sin Supabase configurado: queda el flujo de demo en memoria.
    setTimeout(() => {
      enviarSolicitudRegistro(datos);
      setEnviando(false);
      router.replace('/(auth)/registro-enviado');
    }, 1500);
  };

  // ── Render pasos ────────────────────────────────────────────────────────
  const renderPaso = () => {
    switch (pasoActual) {
      case 1:
        return <PasoRol rol={datos.rol} onChange={(r: RolGestor) => cambiarCampo('rol', r)} />;
      case 2:
        return <PasoDatosPersonales datos={datos} errores={errores} onCambiarCampo={cambiarCampo} />;
      case 3:
        return <PasoDatosRol datos={datos} errores={errores} onCambiarCampo={cambiarCampo} />;
      case 4:
        return <PasoDocumentos onCambiarCampo={cambiarCampo} />;
      case 5:
        return (
          <PasoZonaCobertura
            zona={datos.zonaCobertura}
            onChange={(z: ZonaCobertura) => cambiarCampo('zonaCobertura', z)}
          />
        );
      case 6:
        return <PasoCuentaBancaria datos={datos} errores={errores} onCambiarCampo={cambiarCampo} />;
      case 7:
        return (
          <PasoAcuerdo
            aceptado={datos.acuerdoAceptado}
            onChange={(v: boolean) => cambiarCampo('acuerdoAceptado', v)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={irAtras} style={styles.backBtn} hitSlop={12}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Registro de gestor</Text>
          <Text style={styles.headerSub}>Paso {pasoActual} de {TOTAL_PASOS}</Text>
        </View>
        <View style={styles.backBtn} />
      </View>

      <Progress pasoActual={pasoActual} totalPasos={TOTAL_PASOS} etiquetas={ETIQUETAS_PASOS} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomInset + 36 }]}
        keyboardShouldPersistTaps="handled">
        {renderPaso()}

        <PrimaryButton
          label={enviando ? 'Enviando...' : pasoActual === TOTAL_PASOS ? 'Enviar solicitud' : 'Continuar'}
          onPress={irAdelante}
          loading={enviando}
          style={styles.boton}
        />

        {pasoActual === 1 && (
          <Pressable onPress={() => router.push('/login')} style={styles.loginLink}>
            <Text style={styles.loginLinkText}>¿Ya tienes cuenta? Inicia sesión</Text>
          </Pressable>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { ...Typography.subtitle, color: Colors.textPrimary },
  headerSub: { ...Typography.micro, color: Colors.textSecondary, marginTop: 2 },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.xl, paddingBottom: 60 },
  boton: { marginTop: Spacing.xl },
  loginLink: { alignItems: 'center', paddingVertical: Spacing.lg },
  loginLinkText: { ...Typography.caption, color: Colors.textMuted },
});