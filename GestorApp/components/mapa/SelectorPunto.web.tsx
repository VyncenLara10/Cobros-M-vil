/**
 * Selector web: Leaflet/OpenStreetMap. No utiliza Places, Geocoding ni Routes.
 * En Android/iOS la resolución nativa usa SelectorPunto.tsx.
 */
import type { SelectorPuntoProps } from './SelectorPunto';
import { useEffect, useRef } from 'react';

const CSS_LEAFLET = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';

export default function SelectorPuntoWeb({ valor, onCambiar, alto = 310 }: SelectorPuntoProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import('leaflet').Map | null>(null);
  const markerRef = useRef<import('leaflet').Marker | null>(null);
  const pointRef = useRef(valor);
  const callbackRef = useRef(onCambiar);

  useEffect(() => {
    pointRef.current = valor;
    callbackRef.current = onCambiar;
    if (mapRef.current && markerRef.current && valor) {
      markerRef.current.setLatLng([valor.lat, valor.lng]);
    }
  }, [valor, onCambiar]);

  useEffect(() => {
    let disposed = false;
    (async () => {
      const mod = await import('leaflet');
      const L: typeof import('leaflet') = (mod as any).default ?? mod;
      if (disposed || !containerRef.current) return;

      if (!document.querySelector(`link[href="${CSS_LEAFLET}"]`)) {
        const css = document.createElement('link');
        css.rel = 'stylesheet';
        css.href = CSS_LEAFLET;
        document.head.appendChild(css);
      }
      const point = pointRef.current ?? { lat: 14.8340, lng: -91.5180 };
      const map = L.map(containerRef.current, { scrollWheelZoom: false })
        .setView([point.lat, point.lng], 13);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19, attribution: '© OpenStreetMap',
      }).addTo(map);
      mapRef.current = map;
      if (pointRef.current) markerRef.current = L.marker([point.lat, point.lng]).addTo(map);
      map.on('click', (ev: import('leaflet').LeafletMouseEvent) => {
        const nuevo = { lat: ev.latlng.lat, lng: ev.latlng.lng };
        if (!markerRef.current) markerRef.current = L.marker([nuevo.lat, nuevo.lng]).addTo(map);
        else markerRef.current.setLatLng([nuevo.lat, nuevo.lng]);
        callbackRef.current(nuevo);
      });
      map.invalidateSize();
    })().catch((error) => console.warn('[mapa] selector no disponible', error));
    return () => {
      disposed = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', margin: '8px 0' }}>
      <div ref={containerRef} style={{ height: alto, borderRadius: 10, overflow: 'hidden' }} />
      <div style={{
        position: 'absolute', top: 10, left: 10, zIndex: 500,
        background: 'white', borderRadius: 6, padding: '5px 10px',
        fontWeight: 600, fontSize: 12,
      }}>Haz clic para fijar el destino</div>
    </div>
  );
}
