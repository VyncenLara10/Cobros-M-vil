/** Confirma el correo sin abrir localhost: usa el OTP de Supabase Auth. */
import { Colors, Spacing, Typography } from '@/constants/DesignTokens';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

export default function ConfirmarCorreoScreen() {
  const params = useLocalSearchParams<{ correo?: string }>();
  const [correo, setCorreo] = useState(typeof params.correo === 'string' ? params.correo : '');
  const [codigo, setCodigo] = useState('');
  const [cargando, setCargando] = useState(false);
  const [reenviando, setReenviando] = useState(false);

  const confirmar = async () => {
    const email = correo.trim().toLowerCase();
    if (!email.includes('@') || !/^\d{6,8}$/.test(codigo.trim())) {
      Alert.alert('Datos incompletos', 'Escribe tu correo y el código numérico recibido.');
      return;
    }
    setCargando(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: codigo.trim(),
        type: 'signup',
      });
      if (error) throw error;
      if (!data.session) {
        Alert.alert('Correo confirmado', 'Tu correo está verificado. Inicia sesión para terminar tu solicitud.');
        router.replace('/login');
        return;
      }
      Alert.alert('Correo confirmado', 'Inicia o termina tu solicitud de trabajador para que administración pueda revisarla.');
      router.replace('/estado-cuenta');
    } catch (error) {
      Alert.alert('No se pudo confirmar',
        error instanceof Error ? error.message : 'Comprueba el código o solicita otro.');
    } finally {
      setCargando(false);
    }
  };

  const reenviar = async () => {
    const email = correo.trim().toLowerCase();
    if (!email.includes('@')) {
      Alert.alert('Correo requerido', 'Indica el correo utilizado durante el registro.');
      return;
    }
    setReenviando(true);
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email });
      if (error) throw error;
      Alert.alert('Correo solicitado', 'Si la cuenta está pendiente, recibirás otro código. Revisa también spam.');
    } catch (error) {
      Alert.alert('No se pudo reenviar', error instanceof Error ? error.message : 'Inténtalo más tarde.');
    } finally {
      setReenviando(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.background }}
      contentContainerStyle={{ padding: Spacing.xl, paddingTop: 72, gap: 16 }}>
      <Ionicons name="mail-unread-outline" size={44} color={Colors.primary} />
      <Text style={[Typography.title, { color: Colors.textPrimary }]}>Confirma tu correo</Text>
      <Text style={{ color: Colors.textSecondary }}>
        No necesitas abrir localhost ni tener un dominio. Usa el código de confirmación
        recibido en tu email. Después podrás completar la papelería de tu solicitud.
      </Text>
      <Text style={{ color: Colors.textPrimary }}>Correo electrónico</Text>
      <TextInput autoCapitalize="none" autoComplete="email" keyboardType="email-address"
        value={correo} onChangeText={setCorreo} maxLength={254}
        style={{ borderWidth: 1, borderColor: Colors.border, borderRadius: 10,
          color: Colors.textPrimary, padding: 13, backgroundColor: Colors.surface }}/>
      <Text style={{ color: Colors.textPrimary }}>Código recibido</Text>
      <TextInput autoComplete="one-time-code" textContentType="oneTimeCode"
        keyboardType="number-pad" maxLength={8} value={codigo} onChangeText={setCodigo}
        placeholder="Código del correo" placeholderTextColor={Colors.textMuted}
        style={{ borderWidth: 1, borderColor: Colors.border, borderRadius: 10,
          color: Colors.textPrimary, padding: 13, backgroundColor: Colors.surface }}/>
      <Pressable disabled={cargando || reenviando} onPress={() => void confirmar()}
        style={{ backgroundColor: Colors.primary, padding: 15, borderRadius: 10,
          alignItems: 'center', opacity: cargando ? 0.5 : 1 }}>
        {cargando ? <ActivityIndicator color="#fff" /> :
          <Text style={{ color: '#fff', fontWeight: '700' }}>Confirmar correo</Text>}
      </Pressable>
      <Pressable disabled={cargando || reenviando} onPress={() => void reenviar()}
        style={{ padding: 12, alignItems: 'center' }}>
        <Text style={{ color: Colors.primary }}>
          {reenviando ? 'Solicitando correo…' : 'Reenviar código de confirmación'}
        </Text>
      </Pressable>
      <Pressable onPress={() => router.replace('/login')} style={{ padding: 12, alignItems: 'center' }}>
        <Text style={{ color: Colors.textSecondary }}>Ya confirmé: iniciar sesión</Text>
      </Pressable>
    </ScrollView>
  );
}
