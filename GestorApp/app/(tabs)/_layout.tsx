/**
 * app/(tabs)/_layout.tsx
 * Tab bar con las 4 pantallas principales.
 * Reemplaza el _layout.tsx que tienes actualmente.
 */

import { Colors } from '@/constants/DesignTokens';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: Colors.surface },
        headerTintColor: Colors.textPrimary,
        headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: 0.5,
          height: 60,
          paddingBottom: 8,
          paddingTop: 4,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
      }}>

      {/* 1. Panel de servicios */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Servicios',
          headerTitle: 'Panel de servicios',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="briefcase-outline" size={size} color={color} />
          ),
        }}
      />

      {/* 2. Solicitar nueva visita */}
      <Tabs.Screen
        name="nuevo-servicio"
        options={{
          title: 'Solicitar',
          headerTitle: 'Nueva solicitud',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="add-circle-outline" size={size} color={color} />
          ),
        }}
      />

      {/* Ocultar el archivo viejo con typo si lo tienes */}
      <Tabs.Screen
        name="nuevo-servico"
        options={{ href: null }} // No aparece en el tab bar
      />

      {/* 3. Gestores */}
      <Tabs.Screen
        name="gestores"
        options={{
          title: 'Gestores',
          headerTitle: 'Gestores afiliados',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />

      {/* 4. Reportes */}
      <Tabs.Screen
        name="reportes"
        options={{
          title: 'Reportes',
          headerTitle: 'Reportes',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bar-chart-outline" size={size} color={color} />
          ),
        }}
      />

      {/* Ocultar pantalla two del template original */}
      <Tabs.Screen
        name="two"
        options={{ href: null }}
      />
    </Tabs>
  );
}