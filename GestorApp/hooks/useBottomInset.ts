import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Padding inferior seguro para el último elemento de una pantalla (botón,
 * acción, etc.), sumando el inset del sistema (barra de gestos/navegación
 * de Android) al espacio que ya se quería dejar por diseño.
 */
export function useBottomInset(extra = 24): number {
  const insets = useSafeAreaInsets();
  return extra + insets.bottom;
}
