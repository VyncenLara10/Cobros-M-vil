/**
 * components/mapa/MapaPins.web.tsx
 * Variante WEB (Leaflet + OpenStreetMap) del mapa de varios pines. Mismo
 * patrón que MapaSeguimiento.web.tsx: import dinámico de Leaflet dentro de
 * useEffect (SSG-safe) y capas redibujadas cuando cambian los datos.
 */

import { MapaPinsProps } from '@/components/mapa/mapa-comun';
import { useEffect, useRef } from 'react';

const CSS_LEAFLET = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';

function escapar(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export default function MapaPinsWeb(props: MapaPinsProps) {
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

      const mapa = L.map(contRef.current, { scrollWheelZoom: false });
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

        act.puntos.forEach((pin) => {
          L.marker([pin.lat, pin.lng], {
            icon: L.divIcon({
              className: '',
              html: `<div style="width:18px;height:18px;border-radius:9px;background:${pin.color};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>`,
              iconSize: [18, 18],
              iconAnchor: [9, 9],
            }),
          })
            .addTo(g)
            .bindPopup(
              `<b>${escapar(pin.titulo)}</b>${pin.descripcion ? `<br>${escapar(pin.descripcion)}` : ''}`,
            );
        });

        if (act.puntos.length > 0 && !primerEncuadreRef.current) {
          primerEncuadreRef.current = true;
          mapa.fitBounds(
            L.latLngBounds(act.puntos.map((pin) => [pin.lat, pin.lng] as [number, number])),
            { padding: [28, 28] },
          );
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

  useEffect(() => {
    dibujarRef.current?.();
  }, [props.puntos]);

  return (
    <div
      ref={contRef}
      style={{
        width: props.ancho,
        height: props.alto ?? 240,
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
