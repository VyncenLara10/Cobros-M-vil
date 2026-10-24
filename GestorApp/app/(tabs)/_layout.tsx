import { Colors } from '@/constants/DesignTokens';
import { puedeVer, useSesion } from '@/domain/auth/sesion';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const { usuario } = useSesion();
  const ver = (ruta: string) => (usuario ? puedeVer(usuario.rol, ruta) : false);
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        // Sin barra nativa arriba: cada pantalla muestra su propio título en
        // el contenido (evita el título duplicado).
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: 0.5,
          // El sistema (barra de gestos/botones de Android) puede tapar la
          // barra de pestañas si no se le suma su propio inset de abajo.
          height: 60 + insets.bottom,
          paddingBottom: 8 + insets.bottom,
          paddingTop: 4,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
      }}>

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

      <Tabs.Screen
        name="nuevo-servicio"
        options={{
          title: 'Solicitar',
          headerTitle: 'Nueva solicitud',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="add-circle-outline" size={size} color={color} />
          ),
          href: ver('nuevo-servicio') ? undefined : null,
        }}
      />

      <Tabs.Screen
        name="mi-perfil"
        options={{
          title: 'Mi perfil',
          headerTitle: 'Mi perfil',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
          href: ver('mi-perfil') ? undefined : null,
        }}
      />

      <Tabs.Screen
        name="admin"
        options={{
          title: 'Seguimiento',
          headerTitle: 'Seguimiento del equipo',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="navigate-outline" size={size} color={color} />
          ),
          href: ver('admin') ? undefined : null,
        }}
      />

      <Tabs.Screen
        name="aprobaciones"
        options={{
          title: 'Aprobar',
          headerTitle: 'Aprobación de gestores',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="shield-checkmark-outline" size={size} color={color} />
          ),
          href: ver('aprobaciones') ? undefined : null,
        }}
      />

      <Tabs.Screen
        name="gestores"
        options={{
          title: 'Gestores',
          headerTitle: 'Gestores afiliados',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
          href: ver('gestores') ? undefined : null,
        }}
      />

      <Tabs.Screen
        name="reportes"
        options={{
          title: 'Reportes',
          headerTitle: 'Reportes',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bar-chart-outline" size={size} color={color} />
          ),
          href: ver('reportes') ? undefined : null,
        }}
      />

      {/* Ocultar pantallas del template original */}
      <Tabs.Screen name="two" options={{ href: null }} />
    </Tabs>
  );
}