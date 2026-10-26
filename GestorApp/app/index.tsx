
import { Colors } from '@/constants/DesignTokens';
import { useSesion } from '@/domain/auth/sesion';
import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

export default function Index() {
  // Guard: esperar a que SesionProvider restaure la sesión (Supabase
  // persiste el token; en la recarga no hay que volver a pedir login).
  const { usuario, cargando } = useSesion();

  if (cargando) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background }}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  return <Redirect href={usuario ? '/(tabs)' : '/login'} />;
}
