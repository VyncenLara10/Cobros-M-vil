/**
 * components/mapa/mapa-comun.ts
 * Tipos y colores compartidos por las variantes nativa (react-native-maps)
 * y web (Leaflet) de los mapas. Este archivo no importa ninguna librería
 * de mapas: es seguro en ambas plataformas (y en el SSG de web).
 */

import { Colors } from '@/constants/DesignTokens';
import { EstadoParada, Parada } from '@/data/seguimiento';

export const COLOR_ESTADO: Record<EstadoParada, string> = {
  completado: Colors.success,
  no_localizado: Colors.danger,
  en_sitio: Colors.info,
  en_camino: Colors.warning,
  pendiente: Colors.textMuted,
};

/** Mapa de seguimiento: ruta de un gestor + su posición actual. */
export interface MapaProps {
  paradas: Parada[];
  actual: { lat: number; lng: number };
  nombreGestor: string;
  alto?: number;
  ancho: number;
}

/** Un pin genérico (mapa de directorio de gestores, etc.). */
export interface PinMapa {
  id: string;
  lat: number;
  lng: number;
  titulo: string;
  descripcion?: string;
  color: string;
}

/** Mapa con varios pines sin ruta. */
export interface MapaPinsProps {
  puntos: PinMapa[];
  alto?: number;
  ancho: number;
}
