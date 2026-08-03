/**
 * app/auth/callback.tsx
 * A donde vuelve el enlace mágico del correo (ver domain/auth/magicLink.ts).
 * Funciona igual en web (abre esta URL en el navegador) y en nativo (el
 * enlace abre la app directo en esta pantalla gracias al scheme "gestorapp"
 * configurado en app.json).
 */

import { Colors, Spacing, Typography } from '@/constants/DesignTokens';
import { useSesion } from '@/domain/auth/sesion';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

export default function AuthCallbackScreen() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  const { completarMagicLink } = useSesion();
  const [error, setError] = useState<string | undefined>();
  const yaProcesado = useRef(false);

  useEffect(() => {
    if (yaProcesado.current) return;
    yaProcesado.current = true;

    (async () => {
      if (!code) {
        setError('Este enlace no es válido. Pide uno nuevo desde la pantalla de inicio de sesión.');
        return;
      }
      const r = await completarMagicLink(code);
      if (!r.ok) {
        setError(r.error ?? 'No se pudo completar el ingreso.');
        return;
      }
      if (r.requiereMfa) {
        // Ya se validó el enlace; falta el código de la app de autenticación.
        router.replace('/login');
        return;
      }
      router.replace('/(tabs)');
    })();
  }, [code, completarMagicLink]);

  return (
    <View style={styles.screen}>
      {error ? (
        <>
          <Text style={styles.titulo}>No se pudo entrar</Text>
          <Text style={styles.texto}>{error}</Text>
          <Pressable style={styles.boton} onPress={() => router.replace('/login')}>
            <Text style={styles.botonTexto}>Volver a intentar</Text>
          </Pressable>
        </>
      ) : (
        <>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.texto}>Entrando…</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background, padding: Spacing.xl, gap: Spacing.md },
  titulo: { ...Typography.subtitle, color: Colors.textPrimary, fontWeight: '700', textAlign: 'center' },
  texto: { ...Typography.caption, color: Colors.textSecondary, textAlign: 'center' },
  boton: { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl, marginTop: Spacing.sm },
  botonTexto: { color: '#fff', fontWeight: '700' },
});