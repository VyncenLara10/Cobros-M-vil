import { Colors } from '@/constants/DesignTokens';
import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.background } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="servicio/[id]"
        options={{
          headerShown: true,
          headerTitle: 'Detalle del servicio',
          headerStyle: { backgroundColor: Colors.surface },
          headerTintColor: Colors.textPrimary,
          headerShadowVisible: false,
        }}
      />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}