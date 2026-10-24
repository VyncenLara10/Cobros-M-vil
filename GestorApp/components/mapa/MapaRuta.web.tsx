/**
 * components/mapa/MapaRuta.web.tsx
 * Variante WEB (Leaflet + OpenStreetMap) de la ruta "tú → servicio".
 * Mismo patrón que MapaPins.web.tsx: import dinámico de Leaflet dentro de
 * useEffect (SSG-safe) y capas redibujadas cuando cambian los datos.
 */

import { MapaRutaProps } from '@/components/mapa/mapa-comun';
import { useEffect, useRef } from 'react';

const CSS_LEAFLET = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';

function escapar(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export default function MapaRutaWeb(props: MapaRutaProps) {
  const contRef = useRef<HTMLDivElement | null>(null);
  const mapaRef = useRef<import('leaflet').Map | null>(null);
  const capasRef = useRef<{ grupo: import('leaflet').LayerGroup } | null>(null);
  const propsRef = useRef(props);
  const dibujarRef = useRef<(() => void) | null>(null);

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

      const icono = (color: string) =>
        L.divIcon({
          className: '',
          html: `<div style="width:18px;height:18px;border-radius:9px;background:${color};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>`,
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        });

      dibujarRef.current = () => {
        const act = propsRef.current;
        const g = capasRef.current?.grupo;
        if (!mapaRef.current || !g) return;
        g.clearLayers();

        if (act.origen) {
          L.marker([act.origen.lat, act.origen.lng], { icon: icono('#2563EB') })
            .addTo(g)
            .bindPopup('<b>Tú</b>');
          L.polyline(
            [
              [act.origen.lat, act.origen.lng],
              [act.destino.lat, act.destino.lng],
            ],
            { color: '#0EA5E9', weight: 3, dashArray: '8 6' },
          ).addTo(g);
        }
        L.marker([act.destino.lat, act.destino.lng], { icon: icono('#EF4444') })
          .addTo(g)
          .bindPopup(
            `<b>${escapar(act.destino.titulo)}</b>${act.destino.descripcion ? `<br>${escapar(act.destino.descripcion)}` : ''}`,
          );

        const puntos: [number, number][] = act.origen
          ? [
              [act.origen.lat, act.origen.lng],
              [act.destino.lat, act.destino.lng],
            ]
          : [[act.destino.lat, act.destino.lng]];
        mapa.fitBounds(L.latLngBounds(puntos), { padding: [28, 28] });
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
  }, [props.origen, props.destino]);

  return (
    <div
      ref={contRef}
      style={{
        width: props.ancho,
        height: props.alto ?? 220,
        borderRadius: 6,
        border: '0.5px solid #E2E8F0',
        overflow: 'hidden',
        position: 'relative',
        zIndex: 0,
      }}
    />
  );
}
