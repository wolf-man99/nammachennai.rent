'use client';

import { useEffect, useRef, useState } from 'react';
import type { Map as MapLibreMap, GeoJSONSource, Marker, StyleSpecification } from 'maplibre-gl';
import type { MapPoint } from '@/types';
import type { LocalityPuck } from './types';
import { basemapStyle, CHENNAI_BOUNDS, FALLBACK_STYLE, KIND_COLORS } from './mapStyle';
import 'maplibre-gl/dist/maplibre-gl.css';

/**
 * Two layers of information, separated by zoom:
 *  - zoomed out, each locality is a puck showing its median rent;
 *  - zoomed in, every individual report, listing and board appears.
 *
 * Pucks are HTML markers rather than symbol layers so they carry the product's
 * own type and colour, and so the map still works when a basemap's glyph server
 * is unreachable. If the basemap itself fails to load we fall back to a plain
 * ground colour — the data is the point, the tiles are the backdrop.
 */
export function RentMap({
  points,
  pucks,
  onSelectPoint,
  onSelectLocality,
  focus,
}: {
  points: MapPoint[];
  pucks: LocalityPuck[];
  onSelectPoint: (point: MapPoint) => void;
  onSelectLocality: (slug: string) => void;
  focus: { lat: number; lng: number; zoom: number } | null;
}) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const markers = useRef<Marker[]>([]);
  const styleReady = useRef(false);
  const usedFallback = useRef(false);
  const [basemapFailed, setBasemapFailed] = useState(false);

  // Handlers change every render; refs keep the map listeners stable.
  const handlers = useRef({ onSelectPoint, onSelectLocality });
  handlers.current = { onSelectPoint, onSelectLocality };

  const latest = useRef({ points, pucks });
  latest.current = { points, pucks };

  useEffect(() => {
    if (!container.current || map.current) return;
    let cancelled = false;

    (async () => {
      const maplibregl = await import('maplibre-gl');
      if (cancelled || !container.current) return;

      const instance = new maplibregl.Map({
        container: container.current,
        style: basemapStyle(),
        bounds: CHENNAI_BOUNDS,
        fitBoundsOptions: { padding: 48 },
        attributionControl: { compact: true },
        maxZoom: 17,
        minZoom: 9,
      });

      instance.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
      instance.addControl(new maplibregl.GeolocateControl({ trackUserLocation: false }), 'bottom-right');

      // A blocked or offline tile CDN must not leave a blank screen.
      instance.on('error', (e) => {
        const message = String((e as { error?: Error }).error?.message ?? '');
        const styleFailed = !instance.isStyleLoaded() || message.toLowerCase().includes('style');
        if (styleFailed && !usedFallback.current) {
          usedFallback.current = true;
          setBasemapFailed(true);
          instance.setStyle(FALLBACK_STYLE as StyleSpecification);
        }
      });

      // Fires on first load and again after any setStyle, so layers survive a swap.
      instance.on('style.load', () => {
        installLayers(instance);
        styleReady.current = true;
        syncPoints(instance, latest.current.points);
        syncPucks(maplibregl, instance, markers, latest.current.pucks, (slug) =>
          handlers.current.onSelectLocality(slug),
        );
      });

      instance.on('click', 'points', (e) => {
        const raw = e.features?.[0]?.properties?.payload;
        if (typeof raw === 'string') handlers.current.onSelectPoint(JSON.parse(raw) as MapPoint);
      });
      instance.on('mouseenter', 'points', () => {
        instance.getCanvas().style.cursor = 'pointer';
      });
      instance.on('mouseleave', 'points', () => {
        instance.getCanvas().style.cursor = '';
      });

      map.current = instance;
    })();

    return () => {
      cancelled = true;
      markers.current.forEach((m) => m.remove());
      markers.current = [];
      map.current?.remove();
      map.current = null;
      styleReady.current = false;
    };
  }, []);

  useEffect(() => {
    const instance = map.current;
    if (!instance || !styleReady.current) return;
    syncPoints(instance, points);
    void import('maplibre-gl').then((maplibregl) =>
      syncPucks(maplibregl, instance, markers, pucks, (slug) => handlers.current.onSelectLocality(slug)),
    );
  }, [points, pucks]);

  useEffect(() => {
    if (map.current && focus) {
      map.current.flyTo({ center: [focus.lng, focus.lat], zoom: focus.zoom, duration: 900 });
    }
  }, [focus]);

  return (
    <>
      <div ref={container} className="h-full w-full bg-ground" aria-label="Map of Chennai rent data" role="application" />
      {basemapFailed ? (
        <p className="pointer-events-none absolute bottom-4 left-4 z-10 max-w-xs rounded-pill bg-ink/85 px-4 py-2 text-xs text-white backdrop-blur">
          Basemap unavailable on this network — rent data is still plotted.
        </p>
      ) : null}
    </>
  );
}

/* ------------------------------------------------------------------ */

function installLayers(instance: MapLibreMap) {
  if (!instance.getSource('points')) {
    instance.addSource('points', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  }

  if (!instance.getLayer('points-halo')) {
    instance.addLayer({
      id: 'points-halo',
      type: 'circle',
      source: 'points',
      minzoom: 11.5,
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 8, 16, 16],
        'circle-color': ['get', 'color'],
        'circle-opacity': 0.16,
      },
    });
  }

  if (!instance.getLayer('points')) {
    instance.addLayer({
      id: 'points',
      type: 'circle',
      source: 'points',
      minzoom: 11.5,
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 4.5, 16, 8],
        'circle-color': ['get', 'color'],
        'circle-stroke-width': 1.5,
        'circle-stroke-color': '#ffffff',
      },
    });
  }
}

function syncPoints(instance: MapLibreMap, points: MapPoint[]) {
  const source = instance.getSource('points') as GeoJSONSource | undefined;
  source?.setData({
    type: 'FeatureCollection',
    features: points.map((p) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [p.lng, p.lat] },
      properties: { color: KIND_COLORS[p.kind], payload: JSON.stringify(p) },
    })),
  });
}

type MapLibreModule = typeof import('maplibre-gl');

function syncPucks(
  maplibregl: MapLibreModule,
  instance: MapLibreMap,
  store: { current: Marker[] },
  pucks: LocalityPuck[],
  onSelect: (slug: string) => void,
) {
  store.current.forEach((m) => m.remove());
  store.current = [];

  for (const puck of pucks) {
    const hasData = puck.label !== null;

    const el = document.createElement('button');
    el.type = 'button';
    el.setAttribute('aria-label', `${puck.name} rent data`);
    el.className =
      'group flex cursor-pointer flex-col items-center gap-1 transition-transform duration-200 ease-[var(--ease-out-soft)] hover:scale-105';

    const pill = document.createElement('span');
    if (hasData) {
      // A locality with published data leads with its median.
      pill.className =
        'rounded-pill bg-ink px-2.5 py-1 text-[11px] font-semibold tabular-nums text-white shadow-[0_6px_18px_rgb(20_20_20/0.25)] ring-2 ring-data/25';
      pill.textContent = puck.label;
    } else {
      // Without a publishable median there is nothing honest to print, so the
      // marker stays a quiet dot rather than showing a zero.
      pill.className =
        'block h-3 w-3 rounded-full border-2 border-line-strong bg-surface shadow-[0_2px_8px_rgb(20_20_20/0.12)] transition-colors group-hover:border-ink';
    }

    const name = document.createElement('span');
    name.className = `rounded-pill bg-surface/85 px-1.5 text-[10px] font-medium leading-4 backdrop-blur-sm transition-opacity duration-200 ${
      hasData ? 'text-muted' : 'text-faint opacity-0 group-hover:opacity-100'
    }`;
    name.textContent = puck.name;

    el.append(pill, name);
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      onSelect(puck.slug);
    });

    store.current.push(
      new maplibregl.Marker({ element: el }).setLngLat([puck.lng, puck.lat]).addTo(instance),
    );
  }
}
