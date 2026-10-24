/**
 * components/mapa/MapaSeguimiento.web.tsx
 * Variante WEB (Leaflet + OpenStreetMap) del mapa de seguimiento. Metro
 * resuelve este archivo solo en plataforma web; en nativo se usa
 * MapaSeguimiento.tsx (react-native-maps).
 *
 * Leaflet se importa de forma dinámica dentro de useEffect: nunca se ejecuta
 * durante el SSG (web.output: static), así que `window`/`document` no estallan
 * en el render del servidor.
 */

import { COLOR_ESTADO, MapaProps } from '@/components/mapa/mapa-comun';
import { Colors } from '@/constants/DesignTokens';
import { useEffect, useRef } from 'react';

const CSS_LEAFLET = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';

function escapar(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function icono(color: string, texto: string): import('leaflet').DivIconOptions['html'] {
  return `<div style="width:22px;height:22px;border-radius:11px;background:${color};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4);color:#fff;font:700 11px/18px system-ui;display:flex;align-items:center;justify-content:center">${texto}</div>`;
}

export default function MapaSeguimiento(props: MapaProps) {
  const contRef = useRef<HTMLDivElement | null>(null);
  const mapaRef = useRef<import('leaflet').Map | null>(null);
  const capasRef = useRef<{ grupo: import('leaflet').LayerGroup } | null>(null);
  const propsRef = useRef(props);
  const primerEncuadreRef = useRef(false);
  const dibujarRef = useRef<(() => void) | null>(null);

  // Mantener la referencia fresca fuera del render (regla de refs).
  useEffect(() => {
    propsRef.current = props;
  });

  // Init (una sola vez, solo en el cliente).
  useEffect(() => {
    let cancelado = false;

    (async () => {
      const mod = await import('leaflet');
      const L: typeof import('leaflet') = (mod as any).default ?? mod;
      if (cancelado || !contRef.current) return;

      if (!document.querySelector(`link[href="${CSS_LEAFLET}"]`)) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = CSS_LEAFLET;
        document.head.appendChild(link);
      }

      const mapa = L.map(contRef.current, {
        scrollWheelZoom: false,
        attributionControl: true,
      });
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap',
      }).addTo(mapa);
      const grupo = L.layerGroup().addTo(mapa);
      mapaRef.current = mapa;
      capasRef.current = { grupo };

      dibujarRef.current = () => {
        const act = propsRef.current;
        const g = capasRef.current?.grupo;
        if (!mapaRef.current || !g) return;
        g.clearLayers();

        const rutaHecha = act.paradas
          .filter((x) => x.estado === 'completado' || x.estado === 'no_localizado')
          .map((x) => [x.lat, x.lng] as [number, number]);
        const rutaPendiente = act.paradas
          .filter((x) => x.estado !== 'completado' && x.estado !== 'no_localizado')
          .map((x) => [x.lat, x.lng] as [number, number]);

        if (rutaHecha.length > 1) {
          L.polyline(rutaHecha, { color: Colors.success, weight: 3 }).addTo(g);
        }
        if (rutaPendiente.length > 0) {
          L.polyline([[act.actual.lat, act.actual.lng], ...rutaPendiente], {
            color: Colors.textMuted,
            weight: 2,
            dashArray: '6 6',
          }).addTo(g);
        }

        act.paradas.forEach((x) => {
          L.marker([x.lat, x.lng], {
            icon: L.divIcon({
              className: '',
              html: icono(COLOR_ESTADO[x.estado], String(x.orden)),
              iconSize: [22, 22],
              iconAnchor: [11, 11],
            }),
          })
            .addTo(g)
            .bindPopup(
              `<b>${escapar(`${x.orden}. ${x.cliente}`)}</b><br>${escapar(`${x.direccion}, ${x.zona}`)}`,
            );
        });

        // Gestor (punto azul con el nombre en popup)
        L.marker([act.actual.lat, act.actual.lng], {
          icon: L.divIcon({
            className: '',
            html: icono(Colors.info, '★'),
            iconSize: [22, 22],
            iconAnchor: [11, 11],
          }),
          zIndexOffset: 1000,
        })
          .addTo(g)
          .bindPopup(`<b>${escapar(act.nombreGestor)}</b><br>Ubicación actual`);

        // Encuadre automático solo la primera vez (no interrumpir al usuario).
        const todos: [number, number][] = [
          ...act.paradas.map((x) => [x.lat, x.lng] as [number, number]),
          [act.actual.lat, act.actual.lng],
        ];
        if (!primerEncuadreRef.current && todos.length > 0) {
          primerEncuadreRef.current = true;
          mapa.fitBounds(L.latLngBounds(todos), { padding: [24, 24] });
        }
        mapa.invalidateSize();
      };

      dibujarRef.current();
    })();

    return () => {
      cancelado = true;
      mapaRef.current?.remove();
      mapaRef.current = null;
      capasRef.current = null;
      dibujarRef.current = null;
    };
  }, []);

  // Redibujar cuando cambian los datos.
  useEffect(() => {
    dibujarRef.current?.();
  }, [props.paradas, props.actual, props.nombreGestor]);

  return (
    <div
      ref={contRef}
      style={{
        width: props.ancho,
        height: props.alto ?? 220,
        borderRadius: 6,
        border: '0.5px solid #E2E8F0',
        margin: '12px 0',
        overflow: 'hidden',
        position: 'relative',
        zIndex: 0,
      }}
    />
  );
}
