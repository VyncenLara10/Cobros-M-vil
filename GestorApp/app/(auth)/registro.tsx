/**
 * app/(auth)/registro.tsx
 *
 * Orquestador del wizard de registro de gestores.
 * Importa todos los componentes de components/registro/
 * y maneja el estado global del formulario + navegación entre pasos.
 */

import { ZonaCobertura } from '@/components/(auth)/Coverageareapicker';
import PrimaryButton from '@/components/(auth)/PrimaryButton';
import PasoAcuerdo from '@/components/(auth)/registro/PasoAcuerdo';
import { RolGestor } from '@/components/(auth)/Roleselector';
import { DatosRegistro } from '@/components/(auth)/tipos-registro';
import PasoCuentaBancaria from '@/components/registro/PasoCuentaBancaria';
import PasoDatosPersonales from '@/components/registro/PasoDatosPersonales';
import PasoDatosRol from '@/components/registro/PasoDatosRol';
import PasoDocumentos from '@/components/registro/PasoDocumentos';
import PasoRol from '@/components/registro/PasoRol';
import PasoZonaCobertura from '@/components/registro/PasoZonaCobertura';
import Progress from '@/components/registro/Progress';
import { Colors, Spacing, Typography } from '@/constants/DesignTokens';
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

// ─── Definición de los pasos ────────────────────────────────────────────────

const ETIQUETAS_PASOS = [
  'Rol',
  'Datos',
  'Perfil',
  'Zona',
  'Docs',
  'Cuenta',
  'Acuerdo',
];

const TOTAL_PASOS = ETIQUETAS_PASOS.length;

// ─── Datos iniciales vacíos ─────────────────────────────────────────────────

const datosIniciales: DatosRegistro = {
  nombre: '',
  apellido: '',
  dpi: '',
  telefono: '',
  email: '',
  fechaNacimiento: '',
  direccion: '',
  // Rol
  rol: null,
  // Datos según rol
  numeroColegiado: '',        // abogado
  especialidad: '',           // abogado
  aniosExperiencia: '',       // cobrador/verificador
  vehiculo: false,            // cobrador
  // Zona
  zonaCobertura: null,
  // Documentos
  fotoDpi: null,
  fotoRostro: null,
  documentoRol: null,        // título/colegiado según rol
  // Cuenta bancaria
  banco: '',
  tipoCuenta: 'monetaria',
  numeroCuenta: '',
  nombreCuenta: '',
  // Acuerdo
  aceptaTerminos: false,
};

// ─── Componente principal ────────────────────────────────────────────────────

export default function RegistroScreen() {
  const [pasoActual, setPasoActual] = useState(1);
  const [datos, setDatos] = useState<DatosRegistro>(datosIniciales);
  const [errores, setErrores] = useState<Partial<Record<keyof DatosRegistro, string>>>({});
  const [enviando, setEnviando] = useState(false);

  // Actualizar cualquier campo del formulario
  const cambiarCampo = <K extends keyof DatosRegistro>(
    campo: K,
    valor: DatosRegistro[K]
  ) => {
    setDatos((prev) => ({ ...prev, [campo]: valor }));
    if (errores[campo]) {
      setErrores((prev) => ({ ...prev, [campo]: undefined }));
    }
  };

  // ── Validación por paso ────────────────────────────────────────────────

  const validarPaso = (): boolean => {
    const nuevosErrores: Partial<Record<keyof DatosRegistro, string>> = {};

    switch (pasoActual) {
      case 1: // Rol
        if (!datos.rol) {
          Alert.alert('Selecciona tu rol para continuar');
          return false;
        }
        break;

      case 2: // Datos personales
        if (!datos.nombre.trim()) nuevosErrores.nombre = 'El nombre es obligatorio';
        if (!datos.apellido.trim()) nuevosErrores.apellido = 'El apellido es obligatorio';
        if (!datos.dpi.trim()) nuevosErrores.dpi = 'El DPI es obligatorio';
        if (!datos.telefono.trim()) nuevosErrores.telefono = 'El teléfono es obligatorio';
        if (!datos.email.trim()) nuevosErrores.email = 'El correo es obligatorio';
        break;

      case 3: // Datos según rol
        if (datos.rol === 'abogado' && !datos.numeroColegiado?.trim()) {
          nuevosErrores.numeroColegiado = 'El número de colegiado es obligatorio';
        }
        if (datos.rol !== 'abogado' && !datos.aniosExperiencia?.trim()) {
          nuevosErrores.aniosExperiencia = 'Ingresa tus años de experiencia';
        }
        break;

      case 4: // Zona de cobertura
        if (!datos.zonaCobertura) {
          Alert.alert('Selecciona al menos una zona de cobertura');
          return false;
        }
        break;

      case 5: // Documentos
        if (!datos.fotoDpi) {
          Alert.alert('Sube una foto de tu DPI para continuar');
          return false;
        }
        break;

      case 6: // Cuenta bancaria
        if (!datos.banco.trim()) nuevosErrores.banco = 'Selecciona tu banco';
        if (!datos.numeroCuenta.trim()) nuevosErrores.numeroCuenta = 'El número de cuenta es obligatorio';
        if (!datos.nombreCuenta.trim()) nuevosErrores.nombreCuenta = 'El nombre de la cuenta es obligatorio';
        break;

      case 7: // Acuerdo
        if (!datos.aceptaTerminos) {
          Alert.alert('Debes aceptar los términos para continuar');
          return false;
        }
        break;
    }

    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  // ── Navegación ─────────────────────────────────────────────────────────

  const irAtras = () => {
    if (pasoActual > 1) setPasoActual((p) => p - 1);
    else router.back();
  };

  const irAdelante = () => {
    if (!validarPaso()) return;
    if (pasoActual < TOTAL_PASOS) {
      setPasoActual((p) => p + 1);
    } else {
      enviarRegistro();
    }
  };

  // ── Envío final ────────────────────────────────────────────────────────

  const enviarRegistro = () => {
    setEnviando(true);
    // TODO: reemplazar con llamada real a tu API
    // await fetch('/api/gestores/registro', { method: 'POST', body: JSON.stringify(datos) })
    setTimeout(() => {
      setEnviando(false);
      router.replace('/(auth)/registro-enviado'); // o la ruta de confirmación
    }, 1500);
  };

  // ── Etiqueta del botón según paso ──────────────────────────────────────

  const labelBoton = () => {
    if (enviando) return 'Enviando solicitud...';
    if (pasoActual === TOTAL_PASOS) return 'Enviar solicitud';
    return 'Continuar';
  };

  // ── Renderizado del paso actual ────────────────────────────────────────

  const renderPaso = () => {
    switch (pasoActual) {
      case 1:
        return (
          <PasoRol
            rol={datos.rol}
            onChange={(rol: RolGestor) => cambiarCampo('rol', rol)}
          />
        );
      case 2:
        return (
          <PasoDatosPersonales
            datos={datos}
            errores={errores}
            onCambiarCampo={cambiarCampo}
          />
        );
      case 3:
        return (
          <PasoDatosRol
            datos={datos}
            errores={errores}
            onCambiarCampo={cambiarCampo}
          />
        );
      case 4:
        return (
          <PasoZonaCobertura
            zona={datos.zonaCobertura}
            onChange={(zona: ZonaCobertura) => cambiarCampo('zonaCobertura', zona)}
          />
        );
      case 5:
        return <PasoDocumentos onCambiarCampo={cambiarCampo} />;
      case 6:
        return (
          <PasoCuentaBancaria
            datos={datos}
            errores={errores}
            onCambiarCampo={cambiarCampo}
          />
        );
      case 7:
        return (
          <PasoAcuerdo
            aceptado={datos.aceptaTerminos}
            onChange={(val: boolean) => cambiarCampo('aceptaTerminos', val)}
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
      {/* Header con back + progreso */}
      <View style={styles.header}>
        <Pressable onPress={irAtras} style={styles.backBtn} hitSlop={12}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Registro de gestor</Text>
          <Text style={styles.headerSub}>
            Paso {pasoActual} de {TOTAL_PASOS}
          </Text>
        </View>
        <View style={styles.backBtn} /> {/* spacer */}
      </View>

      {/* Barra de progreso */}
      <Progress
        pasoActual={pasoActual}
        totalPasos={TOTAL_PASOS}
        etiquetas={ETIQUETAS_PASOS}
      />

      {/* Contenido del paso */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        {renderPaso()}

        {/* Botón de avance */}
        <PrimaryButton
          label={labelBoton()}
          onPress={irAdelante}
          loading={enviando}
          style={styles.boton}
        />

        {pasoActual === 1 && (
          <Pressable onPress={() => router.push('/(auth)/login')} style={styles.loginLink}>
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
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    ...Typography.subtitle,
    color: Colors.textPrimary,
  },
  headerSub: {
    ...Typography.micro,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  scroll: { flex: 1 },
  scrollContent: {
    padding: Spacing.xl,
    paddingBottom: Spacing.xxxl,
  },

  boton: {
    marginTop: Spacing.xl,
  },

  loginLink: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  loginLinkText: {
    ...Typography.caption,
    color: Colors.textMuted,
  },
});